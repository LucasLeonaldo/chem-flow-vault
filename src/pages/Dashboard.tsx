import { useState, useEffect } from "react";
import { StatCard } from "@/components/StatCard";
import { ProductCard } from "@/components/ProductCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Package, 
  AlertTriangle, 
  FlaskConical, 
  Warehouse,
  TrendingUp,
  Calendar
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    expiringSoon: 0,
    inWarehouse: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch products with supplier and location data
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          suppliers(name),
          locations(name, type)
        `)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      // Calculate stats
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      const total = productsData?.length || 0;
      const pending = productsData?.filter(p => p.status === 'pending').length || 0;
      const expiringSoon = productsData?.filter(p => 
        new Date(p.expiry_date) <= thirtyDaysFromNow && new Date(p.expiry_date) > now
      ).length || 0;
      const inWarehouse = productsData?.filter(p => 
        p.locations?.type === 'warehouse'
      ).length || 0;

      setProducts(productsData || []);
      setStats({ total, pending, expiringSoon, inWarehouse });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do dashboard",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Produto aprovado com sucesso"
      });

      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error approving product:', error);
      toast({
        title: "Erro",
        description: "Erro ao aprovar produto",
        variant: "destructive"
      });
    }
  };

  const handleMoveProduct = (id: string) => {
    // TODO: Implement product movement functionality
    toast({
      title: "Em desenvolvimento",
      description: "Funcionalidade de movimentação em desenvolvimento"
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Visão geral do sistema de gestão de estoque químico
        </p>
      </div>

      {/* Estatísticas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Produtos"
          value={loading ? 0 : stats.total}
          icon={Package}
        />
        <StatCard
          title="Pendentes Análise"
          value={loading ? 0 : stats.pending}
          icon={FlaskConical}
          variant="warning"
        />
        <StatCard
          title="Vencimento Próximo"
          value={loading ? 0 : stats.expiringSoon}
          icon={AlertTriangle}
          variant="destructive"
        />
        <StatCard
          title="No Almoxarifado"
          value={loading ? 0 : stats.inWarehouse}
          icon={Warehouse}
          variant="success"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Produtos Pendentes */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-warning" />
                Produtos Pendentes de Análise
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Carregando produtos...</p>
                </div>
              ) : products.filter(p => p.status === 'pending').length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum produto pendente</p>
                </div>
              ) : (
                products.filter(p => p.status === 'pending').map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={{
                      id: product.id,
                      name: product.name,
                      supplier: product.suppliers?.name || 'N/A',
                      quantity: product.quantity,
                      unit: product.unit,
                      expiryDate: product.expiry_date,
                      manufacturingDate: product.manufacturing_date,
                      batch: product.batch,
                      invoice: product.invoice,
                      status: product.status,
                      location: product.locations?.type || 'laboratory'
                    }}
                    onApprove={handleApproveProduct}
                    onMove={handleMoveProduct}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resumo de Alertas */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Alertas Importantes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div>
                    <p className="font-medium text-sm">Produtos Vencidos</p>
                    <p className="text-xs text-muted-foreground">Requer ação imediata</p>
                  </div>
                  <Badge variant="destructive">
                    {products.filter(p => new Date(p.expiry_date) < new Date()).length}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg border border-warning/20">
                  <div>
                    <p className="font-medium text-sm">Vencimento em 30 dias</p>
                    <p className="text-xs text-muted-foreground">Programar uso</p>
                  </div>
                  <Badge className="bg-warning text-warning-foreground">
                    {stats.expiringSoon}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-info/10 rounded-lg border border-info/20">
                  <div>
                    <p className="font-medium text-sm">Pendentes Análise</p>
                    <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
                  </div>
                  <Badge className="bg-info text-info-foreground">
                    {stats.pending}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Movimentações Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Movimentações Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { type: "Entrada", product: "Ácido Clorídrico", quantity: "10L", time: "2 horas atrás", user: "João Silva" },
              { type: "Aprovação", product: "Etanol 99%", quantity: "20L", time: "4 horas atrás", user: "Maria Santos" },
              { type: "Transferência", product: "Acetona", quantity: "5L", time: "6 horas atrás", user: "Pedro Costa" },
            ].map((movement, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div>
                    <p className="font-medium text-sm">{movement.type}: {movement.product}</p>
                    <p className="text-xs text-muted-foreground">
                      {movement.quantity} • {movement.user}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{movement.time}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}