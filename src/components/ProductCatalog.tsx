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
import { cn } from "@/lib/utils";

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
    try {
      // Fetch unique products from invoice_items
      const { data, error } = await supabase
        .from("invoice_items")
        .select("product_code, product_name, unit")
        .order("product_name");

      if (error) throw error;
      
      // Create unique products map
      const uniqueProducts = new Map<string, ProductCatalogItem>();
      data?.forEach(item => {
        const key = `${item.product_name}-${item.product_code || ""}`;
        if (!uniqueProducts.has(key)) {
          uniqueProducts.set(key, {
            id: key,
            product_code: item.product_code || "",
            product_name: item.product_name,
            unit: item.unit,
            created_at: new Date().toISOString(),
          });
        }
      });
      
      setProducts(Array.from(uniqueProducts.values()));
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os produtos.",
        variant: "destructive",
      });
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

    // For now, just add to local state since product_catalog table doesn't exist
    const newItem: ProductCatalogItem = {
      id: `${newProduct.product_name}-${newProduct.product_code}`,
      product_code: newProduct.product_code,
      product_name: newProduct.product_name,
      unit: newProduct.unit,
      created_at: new Date().toISOString(),
    };

    setProducts(prev => [...prev, newItem]);
    setNewProduct({ product_code: "", product_name: "", unit: "" });
    setShowAddForm(false);

    toast({
      title: "Sucesso",
      description: "Produto adicionado ao catálogo local.",
    });
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
          Buscar no Catálogo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Catálogo de Produtos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Add New Product Form */}
          {showAddForm && (
            <form onSubmit={handleAddProduct} className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <h4 className="font-medium text-sm">Adicionar Novo Produto</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product_code">Código</Label>
                  <Input
                    id="product_code"
                    value={newProduct.product_code}
                    onChange={(e) => setNewProduct({ ...newProduct, product_code: e.target.value })}
                    placeholder="12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product_name">Nome</Label>
                  <Input
                    id="product_name"
                    value={newProduct.product_name}
                    onChange={(e) => setNewProduct({ ...newProduct, product_name: e.target.value })}
                    placeholder="Nome do produto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unidade</Label>
                  <Select
                    value={newProduct.unit}
                    onValueChange={(value) => setNewProduct({ ...newProduct, unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="l">L</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="un">unidade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">Adicionar</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {/* Products List */}
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum produto encontrado</p>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-accent",
                    selectedProduct?.id === product.id && "border-primary bg-accent"
                  )}
                  onClick={() => handleSelectProduct(product)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{product.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Código: {product.product_code || "N/A"} | Unidade: {product.unit}
                        </p>
                      </div>
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}