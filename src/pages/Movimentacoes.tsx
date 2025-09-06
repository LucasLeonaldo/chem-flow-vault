import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { 
  ArrowRightLeft, 
  Plus,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Package
} from "lucide-react";

export default function Movimentacoes() {
  const { user } = useAuth();
  const { hasPermission } = useUserRole();
  const { toast } = useToast();
  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [newMovement, setNewMovement] = useState({
    product_id: "",
    movement_type: "transfer" as "transfer" | "entry" | "exit",
    from_location_id: "",
    to_location_id: "",
    quantity: 0,
    notes: ""
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [movementsRes, productsRes, locationsRes] = await Promise.all([
        supabase
          .from('product_movements')
          .select(`
            *,
            products(name, batch, unit),
            from_location:locations!product_movements_from_location_id_fkey(name, type),
            to_location:locations!product_movements_to_location_id_fkey(name, type)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('products')
          .select('id, name, batch, quantity, unit')
          .eq('status', 'approved'),
        supabase.from('locations').select('*')
      ]);

      if (movementsRes.error) throw movementsRes.error;
      if (productsRes.error) throw productsRes.error;
      if (locationsRes.error) throw locationsRes.error;

      setMovements(movementsRes.data || []);
      setProducts(productsRes.data || []);
      setLocations(locationsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMovement = async () => {
    if (!hasPermission('operator')) {
      toast({
        title: "Acesso negado",
        description: "Apenas operadores e superiores podem criar movimentações",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('product_movements')
        .insert({
          ...newMovement,
          created_by: user?.id
        });

      if (error) throw error;

      // Update product location if it's a transfer
      if (newMovement.movement_type === 'transfer') {
        const { error: updateError } = await supabase
          .from('products')
          .update({ location_id: newMovement.to_location_id })
          .eq('id', newMovement.product_id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Sucesso",
        description: "Movimentação registrada com sucesso"
      });

      setIsAddDialogOpen(false);
      setNewMovement({
        product_id: "",
        movement_type: "transfer",
        from_location_id: "",
        to_location_id: "",
        quantity: 0,
        notes: ""
      });
      fetchData();
    } catch (error) {
      console.error('Error creating movement:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar movimentação",
        variant: "destructive"
      });
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'entry':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'exit':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'transfer':
        return <ArrowRightLeft className="h-4 w-4 text-blue-500" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getMovementTypeLabel = (type: string) => {
    switch (type) {
      case 'entry':
        return 'Entrada';
      case 'exit':
        return 'Saída';
      case 'transfer':
        return 'Transferência';
      default:
        return type;
    }
  };

  const filteredMovements = movements.filter(movement => {
    const matchesSearch = 
      movement.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.products?.batch?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || movement.movement_type === filterType;
    
    return matchesSearch && matchesType;
  });

  const stats = {
    total: movements.length,
    entries: movements.filter(m => m.movement_type === 'entry').length,
    exits: movements.filter(m => m.movement_type === 'exit').length,
    transfers: movements.filter(m => m.movement_type === 'transfer').length
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Movimentações</h1>
          <p className="text-muted-foreground mt-2">Carregando movimentações...</p>
        </div>
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
        {hasPermission('operator') && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Movimentação
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Movimentação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="product">Produto</Label>
                  <Select 
                    value={newMovement.product_id} 
                    onValueChange={(value) => setNewMovement(prev => ({ ...prev, product_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} - Lote: {product.batch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="movement_type">Tipo de Movimentação</Label>
                  <Select 
                    value={newMovement.movement_type} 
                    onValueChange={(value: "transfer" | "entry" | "exit") => setNewMovement(prev => ({ ...prev, movement_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entrada</SelectItem>
                      <SelectItem value="exit">Saída</SelectItem>
                      <SelectItem value="transfer">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(newMovement.movement_type === 'exit' || newMovement.movement_type === 'transfer') && (
                  <div>
                    <Label htmlFor="from_location">De (Localização Origem)</Label>
                    <Select 
                      value={newMovement.from_location_id} 
                      onValueChange={(value) => setNewMovement(prev => ({ ...prev, from_location_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar origem" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map(location => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name} ({location.type === 'laboratory' ? 'Laboratório' : 'Almoxarifado'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(newMovement.movement_type === 'entry' || newMovement.movement_type === 'transfer') && (
                  <div>
                    <Label htmlFor="to_location">Para (Localização Destino)</Label>
                    <Select 
                      value={newMovement.to_location_id} 
                      onValueChange={(value) => setNewMovement(prev => ({ ...prev, to_location_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar destino" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map(location => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name} ({location.type === 'laboratory' ? 'Laboratório' : 'Almoxarifado'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="quantity">Quantidade</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={newMovement.quantity}
                    onChange={(e) => setNewMovement(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    placeholder="Quantidade movimentada"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Input
                    id="notes"
                    value={newMovement.notes}
                    onChange={(e) => setNewMovement(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Adicione observações..."
                  />
                </div>

                <Button onClick={handleCreateMovement} className="w-full">
                  Registrar Movimentação
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <ArrowRightLeft className="h-8 w-8 text-primary" />
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Entradas</p>
                <p className="text-2xl font-bold text-green-600">{stats.entries}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Saídas</p>
                <p className="text-2xl font-bold text-red-600">{stats.exits}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Transferências</p>
                <p className="text-2xl font-bold text-blue-600">{stats.transfers}</p>
              </div>
              <ArrowRightLeft className="h-8 w-8 text-blue-500" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por produto, lote ou observações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            <SelectItem value="entry">Entradas</SelectItem>
            <SelectItem value="exit">Saídas</SelectItem>
            <SelectItem value="transfer">Transferências</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Movimentações */}
      <div className="space-y-4">
        {filteredMovements.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <ArrowRightLeft className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Nenhuma movimentação encontrada
                </h3>
                <p className="text-muted-foreground">
                  {hasPermission('operator') ? 'Registre a primeira movimentação' : 'Aguarde movimentações serem registradas'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredMovements.map(movement => (
            <Card key={movement.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getMovementIcon(movement.movement_type)}
                    <div>
                      <h4 className="font-medium">
                        {getMovementTypeLabel(movement.movement_type)}: {movement.products?.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Lote: {movement.products?.batch} • Quantidade: {movement.quantity} {movement.products?.unit}
                      </p>
                      {movement.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Obs: {movement.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={
                        movement.movement_type === 'entry' ? 'default' :
                        movement.movement_type === 'exit' ? 'destructive' : 'secondary'
                      }>
                        {getMovementTypeLabel(movement.movement_type)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(movement.created_at).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(movement.created_at).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                    {(movement.from_location?.name || movement.to_location?.name) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {movement.from_location?.name || 'Externa'} → {movement.to_location?.name || 'Externa'}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}