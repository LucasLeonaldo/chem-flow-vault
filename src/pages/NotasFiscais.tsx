import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, FileText } from "lucide-react";
import { AddInvoiceDialog } from "@/components/AddInvoiceDialog";
import { InvoiceDetailsDialog } from "@/components/InvoiceDetailsDialog";

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

export default function NotasFiscais() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const { data: invoices = [], isLoading, refetch } = useQuery({
    queryKey: ["invoices", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("invoices")
        .select(`
          *,
          suppliers (name)
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`invoice_number.ilike.%${searchTerm}%,suppliers.name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Invoice[];
    },
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

  const handleViewDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDetailsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notas Fiscais</h1>
          <p className="text-muted-foreground">
            Gerencie as notas fiscais de entrada de produtos químicos
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Nota Fiscal
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Buscar por número da NF ou fornecedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Invoices Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {invoices.map((invoice) => (
          <Card key={invoice.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {invoice.invoice_number}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {invoice.suppliers.name}
                  </p>
                </div>
                <Badge className={getStatusColor(invoice.status)}>
                  {getStatusText(invoice.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Data Emissão</p>
                  <p className="font-medium">
                    {new Date(invoice.issue_date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor Total</p>
                  <p className="font-medium">
                    R$ {invoice.total_value?.toLocaleString("pt-BR", { 
                      minimumFractionDigits: 2 
                    })}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-2"
                onClick={() => handleViewDetails(invoice)}
              >
                <Eye className="h-4 w-4" />
                Ver Detalhes
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {invoices.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma nota fiscal encontrada</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? "Tente buscar com outros termos" : "Comece cadastrando sua primeira nota fiscal"}
          </p>
          {!searchTerm && (
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Nota Fiscal
            </Button>
          )}
        </div>
      )}

      {/* Dialogs */}
      <AddInvoiceDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen}
        onSuccess={() => {
          refetch();
          setIsAddDialogOpen(false);
        }}
      />

      {selectedInvoice && (
        <InvoiceDetailsDialog
          open={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
          invoice={selectedInvoice}
          onSuccess={() => {
            refetch();
            setIsDetailsDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}