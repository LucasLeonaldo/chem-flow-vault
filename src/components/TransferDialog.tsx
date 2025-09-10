import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRightLeft } from "lucide-react";

interface Location {
  id: string;
  name: string;
  type: string;
}

interface Product {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

interface TransferDialogProps {
  onTransferComplete?: () => void;
}

export function TransferDialog({ onTransferComplete }: TransferDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    productId: "",
    fromLocationId: "",
    toLocationId: "",
    quantity: "",
    notes: ""
  });

  useEffect(() => {
    if (open) {
      fetchLocations();
      fetchProducts();
    }
  }, [open]);

  const fetchLocations = async () => {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('name');

    if (!error && data) {
      setLocations(data);
    }
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, quantity, unit')
      .eq('status', 'approved')
      .order('name');

    if (!error && data) {
      setProducts(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId || !formData.fromLocationId || !formData.toLocationId || !formData.quantity) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Create movement record
      const { error: movementError } = await supabase
        .from('product_movements')
        .insert({
          product_id: formData.productId,
          movement_type: 'transfer',
          quantity: parseFloat(formData.quantity),
          from_location_id: formData.fromLocationId,
          to_location_id: formData.toLocationId,
          notes: formData.notes,
          created_by: user?.id
        });

      if (movementError) throw movementError;

      // Update product location if transferring all quantity
      const selectedProduct = products.find(p => p.id === formData.productId);
      if (selectedProduct && parseFloat(formData.quantity) === selectedProduct.quantity) {
        await supabase
          .from('products')
          .update({ location_id: formData.toLocationId })
          .eq('id', formData.productId);
      }

      toast({
        title: "Sucesso",
        description: "Transferência registrada com sucesso"
      });

      setFormData({
        productId: "",
        fromLocationId: "",
        toLocationId: "",
        quantity: "",
        notes: ""
      });
      setOpen(false);
      onTransferComplete?.();
    } catch (error) {
      console.error('Error creating transfer:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar transferência",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <ArrowRightLeft className="h-4 w-4" />
          Nova Transferência
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Transferência</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product">Produto *</Label>
            <Select value={formData.productId} onValueChange={(value) => setFormData(prev => ({ ...prev, productId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name} ({product.quantity} {product.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromLocation">De *</Label>
              <Select value={formData.fromLocationId} onValueChange={(value) => setFormData(prev => ({ ...prev, fromLocationId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="toLocation">Para *</Label>
              <Select value={formData.toLocationId} onValueChange={(value) => setFormData(prev => ({ ...prev, toLocationId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Destino" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade *</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              placeholder="Ex: 10.5"
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Motivo da transferência..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Processando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}