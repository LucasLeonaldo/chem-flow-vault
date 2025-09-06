import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  AlertTriangle, 
  Calendar, 
  Package,
  Clock,
  CheckCircle
} from "lucide-react";

interface Alert {
  id: string;
  type: 'expired' | 'expiring_soon' | 'low_stock' | 'pending_approval';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  product?: any;
  acknowledged: boolean;
  created_at: string;
}

export default function Alertas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
  }, [user]);

  const fetchAlerts = async () => {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          *,
          suppliers(name),
          locations(name, type)
        `);

      if (error) throw error;

      const generatedAlerts: Alert[] = [];
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      products?.forEach(product => {
        const expiryDate = new Date(product.expiry_date);
        
        // Produtos vencidos
        if (expiryDate < now) {
          generatedAlerts.push({
            id: `expired-${product.id}`,
            type: 'expired',
            title: 'Produto Vencido',
            description: `${product.name} venceu em ${expiryDate.toLocaleDateString('pt-BR')}`,
            severity: 'high',
            product,
            acknowledged: false,
            created_at: new Date().toISOString()
          });
        }
        // Produtos vencendo em 30 dias
        else if (expiryDate <= thirtyDaysFromNow) {
          generatedAlerts.push({
            id: `expiring-${product.id}`,
            type: 'expiring_soon',
            title: 'Produto Vencendo',
            description: `${product.name} vence em ${expiryDate.toLocaleDateString('pt-BR')}`,
            severity: 'medium',
            product,
            acknowledged: false,
            created_at: new Date().toISOString()
          });
        }

        // Estoque baixo (menos de 10 unidades)
        if (product.quantity < 10) {
          generatedAlerts.push({
            id: `low-stock-${product.id}`,
            type: 'low_stock',
            title: 'Estoque Baixo',
            description: `${product.name} tem apenas ${product.quantity} ${product.unit}`,
            severity: 'medium',
            product,
            acknowledged: false,
            created_at: new Date().toISOString()
          });
        }

        // Produtos pendentes de aprovação
        if (product.status === 'pending') {
          generatedAlerts.push({
            id: `pending-${product.id}`,
            type: 'pending_approval',
            title: 'Aprovação Pendente',
            description: `${product.name} aguarda aprovação`,
            severity: 'low',
            product,
            acknowledged: false,
            created_at: new Date().toISOString()
          });
        }
      });

      setAlerts(generatedAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar alertas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true }
          : alert
      )
    );
    toast({
      title: "Alerta confirmado",
      description: "Alerta marcado como visualizado"
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getSeverityIcon = (type: string) => {
    switch (type) {
      case 'expired':
      case 'expiring_soon':
        return AlertTriangle;
      case 'low_stock':
        return Package;
      case 'pending_approval':
        return Clock;
      default:
        return AlertTriangle;
    }
  };

  const filteredAlerts = alerts.filter(alert => !alert.acknowledged);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Alertas</h1>
          <p className="text-muted-foreground mt-2">Carregando alertas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Alertas</h1>
        <p className="text-muted-foreground mt-2">
          Monitore produtos vencidos, estoque baixo e aprovações pendentes
        </p>
      </div>

      {filteredAlerts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum alerta ativo
              </h3>
              <p className="text-muted-foreground">
                Todos os produtos estão em conformidade
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map(alert => {
            const Icon = getSeverityIcon(alert.type);
            return (
              <Card key={alert.id} className="border-l-4 border-l-destructive">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-destructive" />
                      <div>
                        <CardTitle className="text-lg">{alert.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {alert.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityColor(alert.severity) as any}>
                        {alert.severity === 'high' ? 'Alto' : 
                         alert.severity === 'medium' ? 'Médio' : 'Baixo'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        Confirmar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {alert.product && (
                  <CardContent className="pt-0">
                    <div className="bg-accent/50 rounded-lg p-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Lote:</span>
                          <p className="font-medium">{alert.product.batch}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Quantidade:</span>
                          <p className="font-medium">{alert.product.quantity} {alert.product.unit}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Localização:</span>
                          <p className="font-medium">{alert.product.locations?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <Badge variant="outline" className="text-xs">
                            {alert.product.status === 'pending' ? 'Pendente' :
                             alert.product.status === 'approved' ? 'Aprovado' :
                             alert.product.status === 'expired' ? 'Vencido' : 'Rejeitado'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}