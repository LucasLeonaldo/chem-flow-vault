import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Supplier {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
  type: string;
}

interface AddProductDialogProps {
  onProductAdded?: () => void;
}

export function AddProductDialog({ onProductAdded }: AddProductDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    supplier_id: "",
    quantity: "",
    unit: "",
    batch: "",
    invoice: "",
    manufacturing_date: undefined as Date | undefined,
    expiry_date: undefined as Date | undefined,
    location_id: "",
  });

  useEffect(() => {
    if (open) {
      fetchSuppliers();
      fetchLocations();
    }
  }, [open]);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("id, name, type")
        .eq("type", "laboratory")
        .order("name");

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      supplier_id: "",
      quantity: "",
      unit: "",
      batch: "",
      invoice: "",
      manufacturing_date: undefined,
      expiry_date: undefined,
      location_id: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("products")
        .insert({
          id: formData.id,
          name: formData.name,
          supplier_id: formData.supplier_id,
          quantity: parseFloat(formData.quantity),
          unit: formData.unit,
          batch: formData.batch,
          invoice: formData.invoice,
          manufacturing_date: formData.manufacturing_date?.toISOString().split('T')[0],
          expiry_date: formData.expiry_date?.toISOString().split('T')[0],
          location_id: formData.location_id,
          status: "pending",
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: "Produto cadastrado",
        description: "O produto foi cadastrado com sucesso no laboratório.",
      });

      resetForm();
      setOpen(false);
      onProductAdded?.();
    } catch (error) {
      console.error("Error adding product:", error);
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar o produto. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Produto</DialogTitle>
          <DialogDescription>
            Preencha as informações do produto para cadastrá-lo no sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id">Código do Produto *</Label>
              <Input
                id="id"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="Ex: QU001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Ácido Sulfúrico"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Fornecedor *</Label>
              <Select
                value={formData.supplier_id}
                onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Localização *</Label>
              <Select
                value={formData.location_id}
                onValueChange={(value) => setFormData({ ...formData, location_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a localização" />
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="unit">Unidade *</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ml">ml</SelectItem>
                  <SelectItem value="l">L</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="un">un</SelectItem>
                  <SelectItem value="cx">cx</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batch">Lote *</Label>
              <Input
                id="batch"
                value={formData.batch}
                onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                placeholder="Ex: LT001-2024"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice">Nota Fiscal *</Label>
              <Input
                id="invoice"
                value={formData.invoice}
                onChange={(e) => setFormData({ ...formData, invoice: e.target.value })}
                placeholder="Ex: NF123456"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Fabricação *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !formData.manufacturing_date && "text-muted-foreground"
                    )}
                  >
                    {formData.manufacturing_date ? (
                      format(formData.manufacturing_date, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecione a data</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.manufacturing_date}
                    onSelect={(date) => setFormData({ ...formData, manufacturing_date: date })}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data de Validade *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !formData.expiry_date && "text-muted-foreground"
                    )}
                  >
                    {formData.expiry_date ? (
                      format(formData.expiry_date, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecione a data</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.expiry_date}
                    onSelect={(date) => setFormData({ ...formData, expiry_date: date })}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Cadastrando..." : "Cadastrar Produto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}