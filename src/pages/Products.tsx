import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/ProductCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { 
  Search, 
  Plus, 
  Filter,
  Download,
  Package
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  supplier: { name: string };
  quantity: number;
  unit: string;
  expiry_date: string;
  manufacturing_date: string;
  batch: string;
  invoice: string;
  status: "pending" | "approved" | "expired" | "rejected";
  location: { name: string; type: "laboratory" | "warehouse" };
}

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { hasPermission } = useUserRole();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          supplier:suppliers(name),
          location:locations(name, type)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os produtos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.supplier.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || product.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleApproveProduct = async (id: string) => {
    if (!hasPermission("analyst")) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para aprovar produtos",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("products")
        .update({ 
          status: "approved",
          approved_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Produto aprovado",
        description: "O produto foi aprovado com sucesso",
      });
      
      fetchProducts();
    } catch (error) {
      console.error("Error approving product:", error);
      toast({
        title: "Erro",
        description: "Não foi possível aprovar o produto",
        variant: "destructive",
      });
    }
  };

  const handleMoveProduct = async (id: string) => {
    if (!hasPermission("operator")) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para mover produtos",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get warehouse location
      const { data: warehouseLocation } = await supabase
        .from("locations")
        .select("id")
        .eq("type", "warehouse")
        .single();

      if (!warehouseLocation) {
        throw new Error("Warehouse location not found");
      }

      const { error } = await supabase
        .from("products")
        .update({ location_id: warehouseLocation.id })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Produto movido",
        description: "O produto foi movido para o almoxarifado",
      });
      
      fetchProducts();
    } catch (error) {
      console.error("Error moving product:", error);
      toast({
        title: "Erro",
        description: "Não foi possível mover o produto",
        variant: "destructive",
      });
    }
  };

  const statusCounts = {
    all: products.length,
    pending: products.filter(p => p.status === 'pending').length,
    approved: products.filter(p => p.status === 'approved').length,
    expired: products.filter(p => p.status === 'expired').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
          <p className="text-muted-foreground mt-2">
            Gerenciamento completo do estoque de produtos químicos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, ID ou fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              {[
                { key: "all", label: "Todos", variant: "secondary" as const },
                { key: "pending", label: "Pendentes", variant: "outline" as const },
                { key: "approved", label: "Aprovados", variant: "outline" as const },
                { key: "expired", label: "Vencidos", variant: "outline" as const },
              ].map(filter => (
                <Button
                  key={filter.key}
                  variant={statusFilter === filter.key ? "default" : filter.variant}
                  onClick={() => setStatusFilter(filter.key)}
                  className="gap-1"
                >
                  {filter.label}
                  <Badge variant="secondary" className="ml-1">
                    {statusCounts[filter.key as keyof typeof statusCounts]}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Produtos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.length > 0 ? (
          filteredProducts.map(product => (
            <ProductCard 
              key={product.id} 
              product={{
                ...product,
                supplier: product.supplier.name,
                expiryDate: product.expiry_date,
                manufacturingDate: product.manufacturing_date,
                location: product.location.type as "laboratory" | "warehouse"
              }}
              onApprove={handleApproveProduct}
              onMove={handleMoveProduct}
            />
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Nenhum produto encontrado
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Não foram encontrados produtos que correspondam aos filtros selecionados.
                Tente ajustar os critérios de busca.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Resumo */}
      {filteredProducts.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Mostrando {filteredProducts.length} de {products.length} produtos
              </span>
              <span>
                Última atualização: {new Date().toLocaleString('pt-BR')}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}