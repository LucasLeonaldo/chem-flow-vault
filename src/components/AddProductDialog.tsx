import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const productSchema = z.object({
  id: z.string().min(1, "ID é obrigatório").max(50, "ID deve ter no máximo 50 caracteres").regex(/^[A-Z0-9-]+$/, "ID deve conter apenas letras maiúsculas, números e hífens"),
  name: z.string().min(1, "Nome é obrigatório").max(200, "Nome deve ter no máximo 200 caracteres"),
  supplier_id: z.string().min(1, "Fornecedor é obrigatório"),
  quantity: z.number().positive("Quantidade deve ser maior que zero"),
  unit: z.string().min(1, "Unidade é obrigatória").max(20, "Unidade deve ter no máximo 20 caracteres"),
  batch: z.string().min(1, "Lote é obrigatório").max(50, "Lote deve ter no máximo 50 caracteres"),
  invoice: z.string().min(1, "Nota fiscal é obrigatória").max(50, "Nota fiscal deve ter no máximo 50 caracteres"),
  manufacturing_date: z.date({ required_error: "Data de fabricação é obrigatória" }),
  expiry_date: z.date({ required_error: "Data de validade é obrigatória" }),
  location_id: z.string().min(1, "Localização é obrigatória"),
}).refine((data) => data.manufacturing_date < data.expiry_date, {
  message: "Data de validade deve ser posterior à data de fabricação",
  path: ["expiry_date"],
});

type ProductFormData = z.infer<typeof productSchema>;

export function AddProductDialog({ onProductAdded }: AddProductDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState("");

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      id: "",
      name: "",
      supplier_id: "",
      quantity: 0,
      unit: "",
      batch: "",
      invoice: "",
      manufacturing_date: undefined,
      expiry_date: undefined,
      location_id: "",
    },
  });

  useEffect(() => {
    if (open) {
      fetchSuppliers();
      fetchLocations();
      fetchInvoices();
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

  const fetchInvoices = async () => {
    try {
      const { data, error} = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          suppliers (name)
        `)
        .eq("status", "received")
        .order("invoice_number");

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    }
  };

  const fetchInvoiceItems = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId);

      if (error) throw error;
      setInvoiceItems(data || []);
    } catch (error) {
      console.error("Error fetching invoice items:", error);
    }
  };

  const handleInvoiceSelect = (invoiceId: string) => {
    setSelectedInvoice(invoiceId);
    if (invoiceId) {
      fetchInvoiceItems(invoiceId);
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (invoice) {
        form.setValue("invoice", invoice.invoice_number);
      }
    } else {
      setInvoiceItems([]);
    }
  };

  const handleProductSelect = (productName: string) => {
    const item = invoiceItems.find(item => item.product_name === productName);
    if (item) {
      const timestamp = Date.now().toString(36);
      const randomStr = Math.random().toString(36).substring(2, 5);
      const autoId = `PROD-${timestamp}-${randomStr}`.toUpperCase();

      form.setValue("id", autoId);
      form.setValue("name", item.product_name);
      form.setValue("quantity", parseFloat(item.quantity) || 0);
      form.setValue("unit", item.unit);
      form.setValue("batch", item.batch || "");
      if (item.manufacturing_date) form.setValue("manufacturing_date", new Date(item.manufacturing_date));
      if (item.expiry_date) form.setValue("expiry_date", new Date(item.expiry_date));
    }
  };

  const resetForm = () => {
    setSelectedInvoice("");
    setInvoiceItems([]);
    form.reset();
  };

  const handleSubmit = async (data: ProductFormData) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("products")
        .insert({
          id: data.id,
          name: data.name,
          supplier_id: data.supplier_id,
          quantity: data.quantity,
          unit: data.unit,
          batch: data.batch,
          invoice: data.invoice,
          manufacturing_date: format(data.manufacturing_date, "yyyy-MM-dd"),
          expiry_date: format(data.expiry_date, "yyyy-MM-dd"),
          location_id: data.location_id,
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Auto-fill from Invoice */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <h4 className="font-medium text-sm">Preencher automaticamente com dados da Nota Fiscal</h4>
              
              <div className="space-y-2">
                <Select value={selectedInvoice} onValueChange={handleInvoiceSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma nota fiscal" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        NF {invoice.invoice_number} - {(invoice.suppliers as any)?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedInvoice && invoiceItems.length > 0 && (
                <div className="space-y-2">
                  <Select onValueChange={handleProductSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto da nota" />
                    </SelectTrigger>
                    <SelectContent>
                      {invoiceItems.map((item, index) => (
                        <SelectItem key={index} value={item.product_name}>
                          {item.product_name} - {item.quantity} {item.unit}
                          {item.batch && ` (Lote: ${item.batch})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código do Produto *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: PROD-ABC123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Produto *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Ácido Sulfúrico" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supplier_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o fornecedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localização *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a localização" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="Ex: 100"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a unidade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="l">L</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="un">unidade</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="batch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lote *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: L123456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nota Fiscal *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: NF-001234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="manufacturing_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Fabricação *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiry_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Validade *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setOpen(false);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Cadastrando..." : "Cadastrar Produto"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}