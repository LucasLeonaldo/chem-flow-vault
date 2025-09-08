import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Package, Calendar, DollarSign, Building, FileText } from "lucide-react";

interface Invoice {
  id: string;
  invoice_number: string;
  supplier_id: string;
  issue_date: string;
  receipt_date: string;
  total_value: number;
  status: string;
  notes: string;
  suppliers: {
    name: string;
  };
}

interface InvoiceItem {
  id: string;
  product_name: string;
  product_code: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  batch: string;
  manufacturing_date: string;
  expiry_date: string;
  unit: string;
}

interface InvoiceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
  onSuccess: () => void;
}

export function InvoiceDetailsDialog({ open, onOpenChange, invoice, onSuccess }: InvoiceDetailsDialogProps) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["invoice-items", invoice.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoice.id)
        .order("product_name");

      if (error) throw error;
      return data as InvoiceItem[];
    },
    enabled: !!invoice.id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "received": return "bg-blue-100 text-blue-800";
      case "processed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "received": return "Recebida";
      case "processed": return "Processada";
      case "cancelled": return "Cancelada";
      default: return status;
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = items.reduce((sum, item) => sum + (item.total_price || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhes da Nota Fiscal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{invoice.invoice_number}</CardTitle>
                  <p className="text-muted-foreground flex items-center gap-1 mt-1">
                    <Building className="h-4 w-4" />
                    {invoice.suppliers.name}
                  </p>
                </div>
                <Badge className={getStatusColor(invoice.status)}>
                  {getStatusText(invoice.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Emissão</p>
                    <p className="font-medium">
                      {new Date(invoice.issue_date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                
                {invoice.receipt_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Data de Recebimento</p>
                      <p className="font-medium">
                        {new Date(invoice.receipt_date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="font-medium">
                      R$ {invoice.total_value?.toLocaleString("pt-BR", { 
                        minimumFractionDigits: 2 
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {invoice.notes && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Observações</p>
                    <p className="text-sm">{invoice.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Items Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Itens da Nota Fiscal
                <Badge variant="secondary">{items.length} itens</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : items.length > 0 ? (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{item.product_name}</h4>
                          {item.product_code && (
                            <p className="text-sm text-muted-foreground">
                              Código: {item.product_code}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline">
                          {item.quantity} {item.unit}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Preço Unitário</p>
                          <p className="font-medium">
                            R$ {item.unit_price?.toFixed(2) || "0,00"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-medium">
                            R$ {item.total_price?.toFixed(2) || "0,00"}
                          </p>
                        </div>
                        {item.batch && (
                          <div>
                            <p className="text-muted-foreground">Lote</p>
                            <p className="font-medium">{item.batch}</p>
                          </div>
                        )}
                        {item.expiry_date && (
                          <div>
                            <p className="text-muted-foreground">Validade</p>
                            <p className="font-medium">
                              {new Date(item.expiry_date).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <Separator />
                  
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total: {totalItems} itens</span>
                    <span>
                      R$ {totalValue.toLocaleString("pt-BR", { 
                        minimumFractionDigits: 2 
                      })}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Nenhum item encontrado</h3>
                  <p className="text-muted-foreground">
                    Esta nota fiscal não possui itens cadastrados.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}