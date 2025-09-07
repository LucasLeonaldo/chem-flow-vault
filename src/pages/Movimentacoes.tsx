import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AddMovementDialog } from "@/components/AddMovementDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { 
  ArrowRightLeft, 
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Package,
  ArrowUp,
  ArrowDown,
  ArrowRight
} from "lucide-react";

interface Movement {
  id: string;
  product_id: string;
  movement_type: "entry" | "exit" | "transfer";
  quantity: number;
  from_location_id?: string;
  to_location_id?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
  product: {
    name: string;
    unit: string;
  };
  from_location?: {
    name: string;
  } | null;
  to_location?: {
    name: string;
  } | null;
  creator?: {
    full_name: string;
  } | null;
}

function Movimentacoes() {
  const { hasPermission } = useUserRole();
  const { toast } = useToast();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    fetchMovements();
  }, []);

  const fetchMovements = async () => {
    try {
      const { data, error } = await supabase
        .from("product_movements")
        .select(`
          *,
          product:products(name, unit),
          from_location:locations!product_movements_from_location_id_fkey(name),
          to_location:locations!product_movements_to_location_id_fkey(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMovements((data || []) as any);
    } catch (error) {
      console.error("Error fetching movements:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as movimentações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredMovements = movements.filter(movement => {
    const matchesSearch = movement.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.product_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || movement.movement_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "entry": return <ArrowDown className="h-4 w-4 text-success" />;
      case "exit": return <ArrowUp className="h-4 w-4 text-destructive" />;
      case "transfer": return <ArrowRight className="h-4 w-4 text-info" />;
      default: return <ArrowRightLeft className="h-4 w-4" />;
    }
  };

  const getMovementBadge = (type: string) => {
    switch (type) {
      case "entry": return <Badge variant="outline" className="text-success border-success">Entrada</Badge>;
      case "exit": return <Badge variant="outline" className="text-destructive border-destructive">Saída</Badge>;
      case "transfer": return <Badge variant="outline" className="text-info border-info">Transferência</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const stats = {
    total: movements.length,
    entries: movements.filter(m => m.movement_type === "entry").length,
    exits: movements.filter(m => m.movement_type === "exit").length,
    transfers: movements.filter(m => m.movement_type === "transfer").length,
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
          <h1 className="text-3xl font-bold text-foreground">Movimentações</h1>
          <p className="text-muted-foreground mt-2">
            Histórico de entradas, saídas e transferências
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          {hasPermission('operator') && (
            <AddMovementDialog onMovementAdded={fetchMovements} />
          )}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <ArrowRightLeft className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Entradas</p>
                <p className="text-2xl font-bold text-success">{stats.entries}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Saídas</p>
                <p className="text-2xl font-bold text-destructive">{stats.exits}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Transferências</p>
                <p className="text-2xl font-bold text-info">{stats.transfers}</p>
              </div>
              <ArrowRight className="h-8 w-8 text-info" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por produto ou observações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Movimentação</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="entry">Entrada</SelectItem>
                  <SelectItem value="exit">Saída</SelectItem>
                  <SelectItem value="transfer">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Movimentações */}
      <div className="space-y-4">
        {filteredMovements.length > 0 ? (
          filteredMovements.map((movement) => (
            <Card key={movement.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      {getMovementIcon(movement.movement_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{movement.product.name}</h3>
                        {getMovementBadge(movement.movement_type)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {movement.quantity} {movement.product.unit}
                        {movement.movement_type === "transfer" && movement.from_location && movement.to_location && (
                          <span> • {movement.from_location.name} → {movement.to_location.name}</span>
                        )}
                        {movement.movement_type === "entry" && movement.to_location && (
                          <span> • Para: {movement.to_location.name}</span>
                        )}
                        {movement.movement_type === "exit" && movement.from_location && (
                          <span> • De: {movement.from_location.name}</span>
                        )}
                      </p>
                      {movement.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Obs: {movement.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {new Date(movement.created_at).toLocaleString('pt-BR')}
                    </p>
                    {movement.creator && (
                      <p className="text-xs text-muted-foreground">
                        por {movement.creator.full_name}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                Nenhuma movimentação encontrada
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Não foram encontradas movimentações que correspondam aos filtros selecionados.
                Tente ajustar os critérios de busca.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default Movimentacoes;