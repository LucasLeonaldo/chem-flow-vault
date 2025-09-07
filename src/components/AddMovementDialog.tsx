import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRightLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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

interface AddMovementDialogProps {
  onMovementAdded?: () => void;
}

export function AddMovementDialog({ onMovementAdded }: AddMovementDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    product_id: "",
    movement_type: "" as "entry" | "exit" | "transfer",
    from_location_id: "",
    to_location_id: "",
    quantity: "",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      fetchLocations();
      fetchProducts();
    }
  }, [open]);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name, type")
        .order("name");

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, quantity, unit")
        .eq("status", "approved")
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: "",
      movement_type: "" as "entry" | "exit" | "transfer",
      from_location_id: "",
      to_location_id: "",
      quantity: "",
      notes: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      // Insert movement record
      const { error: movementError } = await supabase
        .from("product_movements")
        .insert({
          product_id: formData.product_id,
          movement_type: formData.movement_type,
          from_location_id: formData.from_location_id || null,
          to_location_id: formData.to_location_id || null,
          quantity: parseFloat(formData.quantity),
          notes: formData.notes || null,
          created_by: user.id,
        });

      if (movementError) throw movementError;

      // Update product location if it's a transfer
      if (formData.movement_type === "transfer" && formData.to_location_id) {
        const { error: updateError } = await supabase
          .from("products")
          .update({ location_id: formData.to_location_id })
          .eq("id", formData.product_id);

        if (updateError) throw updateError;
      }

      toast({
        title: "Movimentação registrada",
        description: "A movimentação foi registrada com sucesso.",
      });

      resetForm();
      setOpen(false);
      onMovementAdded?.();
    } catch (error) {
      console.error("Error adding movement:", error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar a movimentação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getLocationsByType = (type: string) => {
    return locations.filter(location => location.type === type);
  };

  const getMovementTypeLabel = (type: string) => {
    switch (type) {
      case "entry": return "Entrada";
      case "exit": return "Saída";
      case "transfer": return "Transferência";
      default: return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <ArrowRightLeft className="h-4 w-4" />
          Nova Movimentação
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Movimentação</DialogTitle>
          <DialogDescription>
            Registre uma nova movimentação de produto no sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product">Produto *</Label>
              <Select
                value={formData.product_id}
                onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - {product.quantity} {product.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="movement_type">Tipo de Movimentação *</Label>
              <Select
                value={formData.movement_type}
                onValueChange={(value: "entry" | "exit" | "transfer") => 
                  setFormData({ ...formData, movement_type: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entrada</SelectItem>
                  <SelectItem value="exit">Saída</SelectItem>
                  <SelectItem value="transfer">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(formData.movement_type === "exit" || formData.movement_type === "transfer") && (
              <div className="space-y-2">
                <Label htmlFor="from_location">Origem {formData.movement_type === "transfer" ? "*" : ""}</Label>
                <Select
                  value={formData.from_location_id}
                  onValueChange={(value) => setFormData({ ...formData, from_location_id: value })}
                  required={formData.movement_type === "transfer"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a origem" />
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
            )}

            {(formData.movement_type === "entry" || formData.movement_type === "transfer") && (
              <div className="space-y-2">
                <Label htmlFor="to_location">Destino {formData.movement_type === "transfer" ? "*" : ""}</Label>
                <Select
                  value={formData.to_location_id}
                  onValueChange={(value) => setFormData({ ...formData, to_location_id: value })}
                  required={formData.movement_type === "transfer"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o destino" />
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
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade *</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="Ex: 100"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações adicionais sobre a movimentação"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Registrando..." : "Registrar Movimentação"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}