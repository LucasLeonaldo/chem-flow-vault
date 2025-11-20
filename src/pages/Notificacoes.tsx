import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Bell, Mail, Check, Trash2 } from "lucide-react";
import { NotificationPreferences, useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const severityColors = {
  info: "bg-blue-500",
  warning: "bg-yellow-500",
  error: "bg-red-500",
  success: "bg-green-500",
};

export default function Notificacoes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();

  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchPreferences();
  }, [user, navigate]);

  const fetchPreferences = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching preferences:", error);
      setLoading(false);
      return;
    }

    if (!data) {
      // Create default preferences
      const { data: newPrefs, error: insertError } = await supabase
        .from("notification_preferences")
        .insert({
          user_id: user.id,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating preferences:", insertError);
      } else {
        setPreferences(newPrefs);
      }
    } else {
      setPreferences(data);
    }
    setLoading(false);
  };

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!user || !preferences) return;

    const { error } = await supabase
      .from("notification_preferences")
      .update(updates)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error updating preferences:", error);
      toast.error("Erro ao atualizar preferências");
      return;
    }

    setPreferences({ ...preferences, ...updates } as NotificationPreferences);
    toast.success("Preferências atualizadas");
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notificações</h1>
          <p className="text-muted-foreground">
            Gerencie suas notificações e preferências
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Preferências */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Preferências de Notificações
            </CardTitle>
            <CardDescription>
              Configure quais alertas você deseja receber
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push">Notificações Push</Label>
                  <p className="text-xs text-muted-foreground">
                    Receber notificações no navegador
                  </p>
                </div>
                <Switch
                  id="push"
                  checked={preferences?.push_enabled}
                  onCheckedChange={(checked) =>
                    updatePreferences({ push_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email">Notificações por Email</Label>
                  <p className="text-xs text-muted-foreground">
                    Receber alertas por email
                  </p>
                </div>
                <Switch
                  id="email"
                  checked={preferences?.email_enabled}
                  onCheckedChange={(checked) =>
                    updatePreferences({ email_enabled: checked })
                  }
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Tipos de Alertas</h4>

              <div className="flex items-center justify-between">
                <Label htmlFor="expiry">Validade Próxima</Label>
                <Switch
                  id="expiry"
                  checked={preferences?.expiry_alerts}
                  onCheckedChange={(checked) =>
                    updatePreferences({ expiry_alerts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="low_stock">Estoque Baixo</Label>
                <Switch
                  id="low_stock"
                  checked={preferences?.low_stock_alerts}
                  onCheckedChange={(checked) =>
                    updatePreferences({ low_stock_alerts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="approval">Aprovações Pendentes</Label>
                <Switch
                  id="approval"
                  checked={preferences?.approval_alerts}
                  onCheckedChange={(checked) =>
                    updatePreferences({ approval_alerts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="movement">Movimentações</Label>
                <Switch
                  id="movement"
                  checked={preferences?.movement_alerts}
                  onCheckedChange={(checked) =>
                    updatePreferences({ movement_alerts: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="system">Alertas do Sistema</Label>
                <Switch
                  id="system"
                  checked={preferences?.system_alerts}
                  onCheckedChange={(checked) =>
                    updatePreferences({ system_alerts: checked })
                  }
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Limites de Alerta</h4>

              <div className="space-y-2">
                <Label htmlFor="expiry_threshold">
                  Alertar validade em (dias)
                </Label>
                <Input
                  id="expiry_threshold"
                  type="number"
                  min="1"
                  max="365"
                  value={preferences?.expiry_days_threshold}
                  onChange={(e) =>
                    updatePreferences({
                      expiry_days_threshold: parseInt(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock_threshold">
                  Alertar estoque abaixo de (unidades)
                </Label>
                <Input
                  id="stock_threshold"
                  type="number"
                  min="1"
                  max="1000"
                  value={preferences?.low_stock_threshold}
                  onChange={(e) =>
                    updatePreferences({
                      low_stock_threshold: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Notificações */}
        <Card>
          <CardHeader>
            <CardTitle>Notificações Recentes</CardTitle>
            <CardDescription>
              Suas últimas notificações e alertas
            </CardDescription>
            <div className="flex gap-2 mt-4">
              {notifications.some((n) => !n.read) && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  <Check className="h-4 w-4 mr-2" />
                  Marcar todas lidas
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllNotifications}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar tudo
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border ${
                      notification.read ? "bg-muted/30" : "bg-background"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`h-2 w-2 rounded-full mt-2 flex-shrink-0 ${
                          severityColors[notification.severity]
                        } ${notification.read ? "opacity-30" : ""}`}
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm font-medium ${
                              notification.read ? "text-muted-foreground" : ""
                            }`}
                          >
                            {notification.title}
                          </p>
                          <div className="flex gap-1">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => deleteNotification(notification.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p
                          className={`text-xs ${
                            notification.read
                              ? "text-muted-foreground/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {notification.type}
                          </Badge>
                          <p className="text-xs text-muted-foreground/60">
                            {formatDistanceToNow(
                              new Date(notification.created_at),
                              {
                                addSuffix: true,
                                locale: ptBR,
                              }
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
