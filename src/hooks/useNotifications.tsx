import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'expiry' | 'low_stock' | 'approval_pending' | 'movement' | 'system';
  severity: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  data: any;
  created_at: string;
  read_at: string | null;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  expiry_alerts: boolean;
  low_stock_alerts: boolean;
  approval_alerts: boolean;
  movement_alerts: boolean;
  system_alerts: boolean;
  expiry_days_threshold: number;
  low_stock_threshold: number;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching notifications:", error);
      return;
    }

    setNotifications((data as Notification[]) || []);
    setUnreadCount(data?.filter(n => !n.read).length || 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    // Subscribe to new notifications
    const channel = supabase
      .channel("notifications_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Show toast notification
          toast[newNotification.severity || 'info'](newNotification.title, {
            description: newNotification.message,
          });

          // Request notification permission if not granted
          if (Notification.permission === "default") {
            Notification.requestPermission();
          }

          // Show browser notification if permitted
          if (Notification.permission === "granted") {
            new Notification(newNotification.title, {
              body: newNotification.message,
              icon: "/favicon.ico",
              tag: newNotification.id,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error marking notification as read:", error);
      return;
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) {
      console.error("Error marking all notifications as read:", error);
      return;
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    toast.success("Todas as notificações foram marcadas como lidas");
  };

  const deleteNotification = async (notificationId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting notification:", error);
      return;
    }

    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    toast.success("Notificação excluída");
  };

  const clearAllNotifications = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error("Error clearing notifications:", error);
      return;
    }

    setNotifications([]);
    setUnreadCount(0);
    toast.success("Todas as notificações foram excluídas");
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    refetch: fetchNotifications,
  };
};
