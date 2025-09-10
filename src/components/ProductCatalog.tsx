import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Search, Package, Plus } from "lucide-react";

interface ProductCatalogItem {
  id: string;
  product_code: string;
  product_name: string;
  unit: string;
  created_at: string;
}

interface ProductCatalogProps {
  onProductSelect?: (product: ProductCatalogItem) => void;
  selectedProduct?: ProductCatalogItem | null;
}

export function ProductCatalog({ onProductSelect, selectedProduct }: ProductCatalogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductCatalogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    product_code: "",
    product_name: "",
    unit: ""
  });

  useEffect(() => {
    if (open) {
      fetchProducts();
    }
  }, [open]);

  useEffect(() => {
    const filtered = products.filter(product =>
      product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.product_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [products, searchTerm]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('product_catalog')
      .select('*')
      .order('product_name');

    if (!error && data) {
      setProducts(data);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.product_code || !newProduct.product_name || !newProduct.unit) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    // Validate product code format (5-7 digits)
    if (!/^\d{5,7}$/.test(newProduct.product_code)) {
      toast({
        title: "Erro",
        description: "Código do produto deve conter entre 5 e 7 dígitos",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('product_catalog')
        .insert({
          product_code: newProduct.product_code,
          product_name: newProduct.product_name,
          unit: newProduct.unit
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Produto adicionado ao catálogo"
      });

      setNewProduct({ product_code: "", product_name: "", unit: "" });
      setShowAddForm(false);
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar produto",
        variant: "destructive"
      });
    }
  };

  const handleSelectProduct = (product: ProductCatalogItem) => {
    onProductSelect?.(product);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Search className="h-4 w-4" />
          {selectedProduct ? selectedProduct.product_name : "Selecionar do Catálogo"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Catálogo de Produtos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowAddForm(!showAddForm)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo
            </Button>
          </div>

          {showAddForm && (
            <Card>
              <CardContent className="p-4">
                <form onSubmit={handleAddProduct} className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="code">Código *</Label>
                      <Input
                        id="code"
                        placeholder="Ex: 12345"
                        value={newProduct.product_code}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, product_code: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="name">Nome do Produto *</Label>
                      <Input
                        id="name"
                        placeholder="Ex: Ácido Clorídrico"
                        value={newProduct.product_name}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, product_name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="unit">Unidade *</Label>
                      <Select value={newProduct.unit} onValueChange={(value) => setNewProduct(prev => ({ ...prev, unit: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Unidade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KG">KG</SelectItem>
                          <SelectItem value="Lts">Lts</SelectItem>
                          <SelectItem value="G">G</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowAddForm(false)} size="sm">
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm">
                      Adicionar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <Card 
                  key={product.id} 
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleSelectProduct(product)}
                >
                  <CardContent className="p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{product.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Código: {product.product_code} • Unidade: {product.unit}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        Selecionar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Nenhum produto encontrado</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}