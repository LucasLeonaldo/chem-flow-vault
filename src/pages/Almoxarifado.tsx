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
  Warehouse, 
  ArrowRightLeft,
  Search,
  Package,
  TrendingUp,
  TrendingDown
} from "lucide-react";

export default function Almoxarifado() {
  const { user } = useAuth();
  const { hasPermission } = useUserRole();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const [newMovement, setNewMovement] = useState({
    product_id: "",
    movement_type: "transfer" as const,
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
      const [productsRes, locationsRes, movementsRes] = await Promise.all([
        supabase
          .from('products')
          .select(`
            *,
            suppliers(name),
            locations(name, type)
          `)
          .eq('status', 'approved')
          .order('created_at', { ascending: false }),
        supabase.from('locations').select('*'),
        supabase
          .from('product_movements')
          .select(`
            *,
            products(name),
            from_location:locations!product_movements_from_location_id_fkey(name),
            to_location:locations!product_movements_to_location_id_fkey(name)
          `)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      if (productsRes.error) throw productsRes.error;
      if (locationsRes.error) throw locationsRes.error;
      if (movementsRes.error) throw movementsRes.error;

      setProducts(productsRes.data || []);
      setLocations(locationsRes.data || []);
      setMovements(movementsRes.data || []);
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
      const { error: movementError } = await supabase
        .from('product_movements')
        .insert({
          ...newMovement,
          created_by: user?.id
        });

      if (movementError) throw movementError;

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

      setIsMovementDialogOpen(false);
      setNewMovement({
        product_id: "",
        movement_type: "transfer",
        from_location_id: "",
        to_location_id: "",
        quantity: 0,
        notes: ""
      });
      setSelectedProduct(null);
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

  const openMovementDialog = (product: any) => {
    setSelectedProduct(product);
    setNewMovement(prev => ({
      ...prev,
      product_id: product.id,
      from_location_id: product.location_id || ""
    }));
    setIsMovementDialogOpen(true);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.batch.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const warehouseProducts = filteredProducts.filter(p => p.locations?.type === 'warehouse');
  const laboratoryProducts = filteredProducts.filter(p => p.locations?.type === 'laboratory');

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Almoxarifado</h1>
          <p className="text-muted-foreground mt-2">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Almoxarifado</h1>
          <p className="text-muted-foreground mt-2">
            Gestão de estoque e movimentações
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">No Almoxarifado</p>
                <p className="text-2xl font-bold">{warehouseProducts.length}</p>
              </div>
              <Warehouse className="h-8 w-8 text-primary" />
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">No Laboratório</p>
                <p className="text-2xl font-bold">{laboratoryProducts.length}</p>
              </div>
              <Package className="h-8 w-8 text-secondary" />
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Produtos</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
              <Package className="h-8 w-8 text-accent-foreground" />
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Movimentações</p>
                <p className="text-2xl font-bold">{movements.length}</p>
              </div>
              <ArrowRightLeft className="h-8 w-8 text-info" />
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
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Grid de Produtos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Produtos no Almoxarifado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              Almoxarifado ({warehouseProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {warehouseProducts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum produto no almoxarifado
              </p>
            ) : (
              warehouseProducts.map(product => (
                <div key={product.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Lote: {product.batch} • {product.quantity} {product.unit}
                      </p>
                    </div>
                    {hasPermission('operator') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openMovementDialog(product)}
                      >
                        <ArrowRightLeft className="h-4 w-4 mr-1" />
                        Mover
                      </Button>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Validade: {new Date(product.expiry_date).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Produtos no Laboratório */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Laboratório ({laboratoryProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {laboratoryProducts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum produto no laboratório
              </p>
            ) : (
              laboratoryProducts.map(product => (
                <div key={product.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Lote: {product.batch} • {product.quantity} {product.unit}
                      </p>
                    </div>
                    {hasPermission('operator') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openMovementDialog(product)}
                      >
                        <ArrowRightLeft className="h-4 w-4 mr-1" />
                        Mover
                      </Button>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Validade: {new Date(product.expiry_date).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Movimentações Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Movimentações Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma movimentação registrada
            </p>
          ) : (
            <div className="space-y-3">
              {movements.map(movement => (
                <div key={movement.id} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <div>
                      <p className="font-medium text-sm">
                        {movement.movement_type === 'transfer' ? 'Transferência' :
                         movement.movement_type === 'entry' ? 'Entrada' : 'Saída'}: {movement.products?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {movement.from_location?.name || 'N/A'} → {movement.to_location?.name || 'N/A'} • {movement.quantity} unidades
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(movement.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Movimentação */}
      <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Movimentação</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="p-3 bg-accent/50 rounded-lg">
                <h4 className="font-medium">{selectedProduct.name}</h4>
                <p className="text-sm text-muted-foreground">
                  Lote: {selectedProduct.batch} • Quantidade atual: {selectedProduct.quantity} {selectedProduct.unit}
                </p>
              </div>
              
              <div>
                <Label htmlFor="movement_type">Tipo de Movimentação</Label>
                <Select 
                  value={newMovement.movement_type} 
                  onValueChange={(value: any) => setNewMovement(prev => ({ ...prev, movement_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Transferência</SelectItem>
                    <SelectItem value="entry">Entrada</SelectItem>
                    <SelectItem value="exit">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="from_location">De (Localização Atual)</Label>
                <Select 
                  value={newMovement.from_location_id} 
                  onValueChange={(value) => setNewMovement(prev => ({ ...prev, from_location_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(location => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="to_location">Para (Nova Localização)</Label>
                <Select 
                  value={newMovement.to_location_id} 
                  onValueChange={(value) => setNewMovement(prev => ({ ...prev, to_location_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map(location => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}