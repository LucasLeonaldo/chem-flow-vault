import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/ProductCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus, 
  Filter,
  Download,
  Package
} from "lucide-react";

// Mock data expandido
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
    location: "warehouse" as const
  },
  {
    id: "QM003GHI",
    name: "Etanol 99.5%",
    supplier: "Destilaria Nacional",
    quantity: 100,
    unit: "L",
    expiryDate: "2024-09-30",
    manufacturingDate: "2024-01-20",
    batch: "ETH240120",
    invoice: "NF-11111",
    status: "expired" as const,
    location: "warehouse" as const
  },
  {
    id: "QM004JKL",
    name: "Acetona PA",
    supplier: "Solventes & Cia",
    quantity: 15,
    unit: "L",
    expiryDate: "2025-12-31",
    manufacturingDate: "2024-03-01",
    batch: "ACE240301",
    invoice: "NF-22222",
    status: "approved" as const,
    location: "laboratory" as const
  }
];

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredProducts = mockProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || product.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleApproveProduct = (id: string) => {
    console.log('Aprovar produto:', id);
    // Implementar com Supabase
  };

  const handleMoveProduct = (id: string) => {
    console.log('Mover produto:', id);
    // Implementar com Supabase
  };

  const statusCounts = {
    all: mockProducts.length,
    pending: mockProducts.filter(p => p.status === 'pending').length,
    approved: mockProducts.filter(p => p.status === 'approved').length,
    expired: mockProducts.filter(p => p.status === 'expired').length,
  };

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
              product={product}
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
                Mostrando {filteredProducts.length} de {mockProducts.length} produtos
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