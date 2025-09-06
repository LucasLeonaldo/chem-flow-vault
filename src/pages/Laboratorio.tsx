import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { 
  FlaskConical, 
  Plus, 
  Filter,
  Search,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";

export default function Laboratorio() {
  const { user } = useAuth();
  const { hasPermission } = useUserRole();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [newProduct, setNewProduct] = useState({
    id: "",
    name: "",
    batch: "",
    invoice: "",
    manufacturing_date: "",
    expiry_date: "",
    quantity: 0,
    unit: "",
    supplier_id: "",
    location_id: ""
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [productsRes, suppliersRes, locationsRes] = await Promise.all([
        supabase
          .from('products')
          .select(`
            *,
            suppliers(name),
            locations(name, type)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('suppliers').select('*'),
        supabase.from('locations').select('*').eq('type', 'laboratory')
      ]);

      if (productsRes.error) throw productsRes.error;
      if (suppliersRes.error) throw suppliersRes.error;
      if (locationsRes.error) throw locationsRes.error;

      setProducts(productsRes.data || []);
      setSuppliers(suppliersRes.data || []);
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

  const handleAddProduct = async () => {
    if (!hasPermission('analyst')) {
      toast({
        title: "Acesso negado",
        description: "Apenas analistas e administradores podem adicionar produtos",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .insert({
          ...newProduct,
          created_by: user?.id,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Produto adicionado com sucesso"
      });

      setIsAddDialogOpen(false);
      setNewProduct({
        id: "",
        name: "",
        batch: "",
        invoice: "",
        manufacturing_date: "",
        expiry_date: "",
        quantity: 0,
        unit: "",
        supplier_id: "",
        location_id: ""
      });
      fetchData();
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar produto",
        variant: "destructive"
      });
    }
  };

  const handleApproveProduct = async (productId: string) => {
    if (!hasPermission('analyst')) {
      toast({
        title: "Acesso negado",
        description: "Apenas analistas e administradores podem aprovar produtos",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Produto aprovado com sucesso"
      });

      fetchData();
    } catch (error) {
      console.error('Error approving product:', error);
      toast({
        title: "Erro",
        description: "Erro ao aprovar produto",
        variant: "destructive"
      });
    }
  };

  const handleRejectProduct = async (productId: string) => {
    if (!hasPermission('analyst')) {
      toast({
        title: "Acesso negado",
        description: "Apenas analistas e administradores podem rejeitar produtos",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({ status: 'rejected' })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Produto rejeitado"
      });

      fetchData();
    } catch (error) {
      console.error('Error rejecting product:', error);
      toast({
        title: "Erro",
        description: "Erro ao rejeitar produto",
        variant: "destructive"
      });
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesStatus = filterStatus === "all" || product.status === filterStatus;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.batch.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Laboratório</h1>
          <p className="text-muted-foreground mt-2">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Laboratório</h1>
          <p className="text-muted-foreground mt-2">
            Gestão de produtos químicos no laboratório
          </p>
        </div>
        {hasPermission('analyst') && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Produto</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="id">ID do Produto</Label>
                    <Input
                      id="id"
                      value={newProduct.id}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, id: e.target.value }))}
                      placeholder="QM001ABC"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ácido Sulfúrico 98%"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="batch">Lote</Label>
                    <Input
                      id="batch"
                      value={newProduct.batch}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, batch: e.target.value }))}
                      placeholder="ASH240115"
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice">Nota Fiscal</Label>
                    <Input
                      id="invoice"
                      value={newProduct.invoice}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, invoice: e.target.value }))}
                      placeholder="NF-12345"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="manufacturing_date">Data de Fabricação</Label>
                    <Input
                      id="manufacturing_date"
                      type="date"
                      value={newProduct.manufacturing_date}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, manufacturing_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiry_date">Data de Validade</Label>
                    <Input
                      id="expiry_date"
                      type="date"
                      value={newProduct.expiry_date}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, expiry_date: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantidade</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={newProduct.quantity}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                      placeholder="25"
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit">Unidade</Label>
                    <Select value={newProduct.unit} onValueChange={(value) => setNewProduct(prev => ({ ...prev, unit: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L">Litros (L)</SelectItem>
                        <SelectItem value="kg">Quilogramas (kg)</SelectItem>
                        <SelectItem value="g">Gramas (g)</SelectItem>
                        <SelectItem value="mL">Mililitros (mL)</SelectItem>
                        <SelectItem value="mg">Miligramas (mg)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="supplier">Fornecedor</Label>
                    <Select value={newProduct.supplier_id} onValueChange={(value) => setNewProduct(prev => ({ ...prev, supplier_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map(supplier => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="location">Localização</Label>
                  <Select value={newProduct.location_id} onValueChange={(value) => setNewProduct(prev => ({ ...prev, location_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar localização" />
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
                <Button onClick={handleAddProduct}>Adicionar Produto</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nome ou lote..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="rejected">Rejeitado</SelectItem>
            <SelectItem value="expired">Vencido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Produtos */}
      <div className="grid gap-4">
        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <FlaskConical className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Nenhum produto encontrado
                </h3>
                <p className="text-muted-foreground">
                  {hasPermission('analyst') ? 'Adicione o primeiro produto ao laboratório' : 'Aguarde a adição de produtos'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredProducts.map(product => {
            const isExpired = new Date(product.expiry_date) < new Date();
            const isExpiringSoon = new Date(product.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            
            return (
              <Card key={product.id} className={isExpired ? "border-destructive" : isExpiringSoon ? "border-warning" : ""}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        ID: {product.id} • Lote: {product.batch}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        product.status === 'approved' ? 'default' :
                        product.status === 'pending' ? 'secondary' :
                        product.status === 'rejected' ? 'destructive' : 'outline'
                      }>
                        {product.status === 'pending' ? 'Pendente' :
                         product.status === 'approved' ? 'Aprovado' :
                         product.status === 'rejected' ? 'Rejeitado' : 'Vencido'}
                      </Badge>
                      {product.status === 'pending' && hasPermission('analyst') && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveProduct(product.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectProduct(product.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Fornecedor:</span>
                      <p className="font-medium">{product.suppliers?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Quantidade:</span>
                      <p className="font-medium">{product.quantity} {product.unit}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Fabricação:</span>
                      <p className="font-medium">{new Date(product.manufacturing_date).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Validade:</span>
                      <p className={`font-medium ${isExpired ? 'text-destructive' : isExpiringSoon ? 'text-warning' : ''}`}>
                        {new Date(product.expiry_date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}