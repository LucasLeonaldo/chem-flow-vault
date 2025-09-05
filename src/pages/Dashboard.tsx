import { StatCard } from "@/components/StatCard";
import { ProductCard } from "@/components/ProductCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  AlertTriangle, 
  FlaskConical, 
  Warehouse,
  TrendingUp,
  Calendar
} from "lucide-react";

// Mock data - Em produção virá do Supabase
const mockProducts = [
  {
    id: "QM001ABC",
    name: "Ácido Sulfúrico 98%",
    supplier: "Química Industrial LTDA",
    quantity: 25,
    unit: "L",
    expiryDate: "2024-10-15",
    manufacturingDate: "2024-01-15",
    batch: "ASH240115",
    invoice: "NF-12345",
    status: "pending" as const,
    location: "laboratory" as const
  },
  {
    id: "QM002DEF", 
    name: "Hidróxido de Sódio",
    supplier: "ChemBrasil S.A.",
    quantity: 50,
    unit: "kg",
    expiryDate: "2025-06-20",
    manufacturingDate: "2024-02-10",
    batch: "NaOH240210",
    invoice: "NF-67890",
    status: "approved" as const,
    location: "laboratory" as const
  }
];

export default function Dashboard() {
  const handleApproveProduct = (id: string) => {
    console.log('Aprovar produto:', id);
    // Implementar com Supabase
  };

  const handleMoveProduct = (id: string) => {
    console.log('Mover produto:', id);
    // Implementar com Supabase
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
          value={156}
          icon={Package}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Pendentes Análise"
          value={8}
          icon={FlaskConical}
          variant="warning"
          trend={{ value: -5, isPositive: false }}
        />
        <StatCard
          title="Vencimento Próximo"
          value={3}
          icon={AlertTriangle}
          variant="destructive"
        />
        <StatCard
          title="No Almoxarifado"
          value={145}
          icon={Warehouse}
          variant="success"
          trend={{ value: 8, isPositive: true }}
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
              {mockProducts.filter(p => p.status === 'pending').map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product}
                  onApprove={handleApproveProduct}
                  onMove={handleMoveProduct}
                />
              ))}
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
                  <Badge variant="destructive">2</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg border border-warning/20">
                  <div>
                    <p className="font-medium text-sm">Vencimento em 30 dias</p>
                    <p className="text-xs text-muted-foreground">Programar uso</p>
                  </div>
                  <Badge className="bg-warning text-warning-foreground">5</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-info/10 rounded-lg border border-info/20">
                  <div>
                    <p className="font-medium text-sm">Estoque Baixo</p>
                    <p className="text-xs text-muted-foreground">Considerar reposição</p>
                  </div>
                  <Badge className="bg-info text-info-foreground">3</Badge>
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