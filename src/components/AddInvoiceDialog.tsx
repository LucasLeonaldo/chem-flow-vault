import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const invoiceSchema = z.object({
  invoice_number: z.string().min(1, "Número da NF é obrigatório"),
  supplier_id: z.string().min(1, "Fornecedor é obrigatório"),
  issue_date: z.date({ required_error: "Data de emissão é obrigatória" }),
  total_value: z.number().min(0, "Valor deve ser positivo").optional(),
  notes: z.string().optional(),
});

const itemSchema = z.object({
  product_name: z.string().min(1, "Nome do produto é obrigatório"),
  product_code: z.string().regex(/^\d{5,7}$/, "Código deve ter entre 5 e 7 números"),
  quantity: z.number().min(0.01, "Quantidade deve ser maior que 0"),
  unit_price: z.number().min(0, "Preço unitário deve ser positivo"),
  batch: z.string().min(1, "Lote é obrigatório"),
  manufacturing_date: z.date({ required_error: "Data de fabricação é obrigatória" }),
  expiry_date: z.date({ required_error: "Data de validade é obrigatória" }),
  unit: z.enum(["KG", "Lts", "G"], { required_error: "Selecione uma unidade válida" }),
});

type InvoiceForm = z.infer<typeof invoiceSchema>;
type ItemForm = z.infer<typeof itemSchema>;

interface AddInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddInvoiceDialog({ open, onOpenChange, onSuccess }: AddInvoiceDialogProps) {
  const [items, setItems] = useState<ItemForm[]>([]);
  const [currentItem, setCurrentItem] = useState<Partial<ItemForm>>({});

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoice_number: `NF-${Date.now()}`,
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceForm) => {
      // Calcular valor total baseado nos itens
      const calculatedTotal = items.reduce((sum, item) => 
        sum + (item.quantity * (item.unit_price || 0)), 0
      );

      const invoiceData = {
        invoice_number: data.invoice_number,
        supplier_id: data.supplier_id,
        issue_date: data.issue_date.toISOString().split('T')[0],
        receipt_date: data.issue_date.toISOString().split('T')[0], // Usar data de emissão como recebimento
        total_value: calculatedTotal,
        status: "received",
        notes: data.notes || null,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      };

      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert(invoiceData)
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      if (items.length > 0) {
        // Buscar localização "DEP. Analise"
        const { data: location } = await supabase
          .from("locations")
          .select("id")
          .eq("name", "DEP. Analise")
          .single();

        const itemsToInsert = items.map(item => ({
          invoice_id: invoice.id,
          product_name: item.product_name,
          product_code: item.product_code,
          quantity: item.quantity,
          unit_price: item.unit_price || 0,
          total_price: item.quantity * (item.unit_price || 0),
          batch: item.batch,
          manufacturing_date: item.manufacturing_date?.toISOString().split('T')[0],
          expiry_date: item.expiry_date?.toISOString().split('T')[0],
          unit: item.unit,
        }));

        const { error: itemsError } = await supabase
          .from("invoice_items")
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        // Criar produtos automaticamente e enviar para "DEP. Analise"
        const user = await supabase.auth.getUser();
        const productsToInsert = items.map(item => ({
          id: item.product_code,
          name: item.product_name,
          batch: item.batch,
          quantity: item.quantity,
          unit: item.unit,
          manufacturing_date: item.manufacturing_date?.toISOString().split('T')[0],
          expiry_date: item.expiry_date?.toISOString().split('T')[0],
          invoice: data.invoice_number,
          supplier_id: data.supplier_id,
          location_id: location?.id,
          status: "pending" as const,
          created_by: user.data.user?.id,
        }));

        const { error: productsError } = await supabase
          .from("products")
          .insert(productsToInsert);

        if (productsError) throw productsError;
      }

      return invoice;
    },
    onSuccess: () => {
      toast.success("Nota fiscal criada com sucesso!");
      reset();
      setItems([]);
      setCurrentItem({});
      onSuccess();
    },
    onError: (error) => {
      toast.error("Erro ao criar nota fiscal: " + error.message);
    },
  });

  const addItem = () => {
    const validatedItem = itemSchema.safeParse(currentItem);
    if (!validatedItem.success) {
      toast.error("Preencha todos os campos obrigatórios do item");
      return;
    }
    
    setItems([...items, validatedItem.data]);
    setCurrentItem({});
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const onSubmit = (data: InvoiceForm) => {
    if (items.length === 0) {
      toast.error("Adicione pelo menos um item à nota fiscal");
      return;
    }
    createInvoiceMutation.mutate(data);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * (item.unit_price || 0)), 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Nota Fiscal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Invoice Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_number">Número da NF *</Label>
              <Input
                id="invoice_number"
                {...register("invoice_number")}
                placeholder="NF-2024-001"
                readOnly
                className="bg-muted"
              />
              {errors.invoice_number && (
                <p className="text-sm text-destructive">{errors.invoice_number.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier_id">Fornecedor *</Label>
              <Select onValueChange={(value) => setValue("supplier_id", value)}>
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
              {errors.supplier_id && (
                <p className="text-sm text-destructive">{errors.supplier_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Data de Emissão *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watch("issue_date") && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watch("issue_date") ? format(watch("issue_date"), "dd/MM/yyyy") : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={watch("issue_date")}
                    onSelect={(date) => setValue("issue_date", date!)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.issue_date && (
                <p className="text-sm text-destructive">{errors.issue_date.message}</p>
              )}
            </div>


            <div className="space-y-2">
              <Label htmlFor="total_value">Valor Total</Label>
              <Input
                id="total_value"
                type="text"
                value={`R$ ${calculateTotal().toFixed(2)}`}
                readOnly
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Calculado automaticamente baseado nos itens</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Observações sobre a nota fiscal..."
              rows={3}
            />
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Itens da Nota Fiscal</h3>
            
            {/* Current Item Form */}
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">Adicionar Item</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Nome do produto *"
                  value={currentItem.product_name || ""}
                  onChange={(e) => setCurrentItem({ ...currentItem, product_name: e.target.value })}
                />
                <Input
                  placeholder="Código do produto (5-7 números) *"
                  value={currentItem.product_code || ""}
                  onChange={(e) => setCurrentItem({ ...currentItem, product_code: e.target.value })}
                />
                <Select onValueChange={(value: "KG" | "Lts" | "G") => setCurrentItem({ ...currentItem, unit: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unidade *" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KG">KG</SelectItem>
                    <SelectItem value="Lts">Lts</SelectItem>
                    <SelectItem value="G">G</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Quantidade *"
                  value={currentItem.quantity || ""}
                  onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseFloat(e.target.value) })}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Preço unitário *"
                  value={currentItem.unit_price || ""}
                  onChange={(e) => setCurrentItem({ ...currentItem, unit_price: parseFloat(e.target.value) })}
                />
                <Input
                  placeholder="Lote *"
                  value={currentItem.batch || ""}
                  onChange={(e) => setCurrentItem({ ...currentItem, batch: e.target.value })}
                />
                
                {/* Data de Fabricação */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !currentItem.manufacturing_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {currentItem.manufacturing_date ? format(currentItem.manufacturing_date, "dd/MM/yyyy") : "Data Fabricação *"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={currentItem.manufacturing_date}
                      onSelect={(date) => setCurrentItem({ ...currentItem, manufacturing_date: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                {/* Data de Validade */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !currentItem.expiry_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {currentItem.expiry_date ? format(currentItem.expiry_date, "dd/MM/yyyy") : "Data Validade *"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={currentItem.expiry_date}
                      onSelect={(date) => setCurrentItem({ ...currentItem, expiry_date: date })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button type="button" onClick={addItem} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Item
              </Button>
            </div>

            {/* Items List */}
            {items.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Itens Adicionados ({items.length})</h4>
                {items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Código: {item.product_code} • {item.quantity} {item.unit} • R$ {(item.unit_price || 0).toFixed(2)}/un
                        <br />
                        Lote: {item.batch} • Fabricação: {item.manufacturing_date ? format(item.manufacturing_date, "dd/MM/yyyy") : "N/A"}
                        <br />
                        Validade: {item.expiry_date ? format(item.expiry_date, "dd/MM/yyyy") : "N/A"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createInvoiceMutation.isPending}>
              {createInvoiceMutation.isPending ? "Criando..." : "Criar Nota Fiscal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}