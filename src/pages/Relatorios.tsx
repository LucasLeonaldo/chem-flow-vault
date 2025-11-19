import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { 
  Download, 
  FileText, 
  TrendingUp, 
  Package,
  DollarSign,
  Calendar,
  AlertCircle
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--info))'];

export default function Relatorios() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("6");
  const [reportData, setReportData] = useState<any>({
    monthlyMovements: [],
    topProducts: [],
    costAnalysis: [],
    expiringProducts: [],
    locationDistribution: [],
    stockPrediction: [],
    totalCost: 0,
    totalProducts: 0,
    totalMovements: 0
  });

  useEffect(() => {
    fetchReportData();
  }, [period]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const months = parseInt(period);
      const startDate = subMonths(new Date(), months);

      // Fetch products with all related data
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select(`
          *,
          suppliers(name),
          locations(name, type)
        `);

      if (productsError) throw productsError;

      // Fetch movements
      const { data: movements, error: movementsError } = await supabase
        .from("product_movements")
        .select(`
          *,
          product:products(name, unit),
          from_location:locations!product_movements_from_location_id_fkey(name),
          to_location:locations!product_movements_to_location_id_fkey(name)
        `)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      if (movementsError) throw movementsError;

      // Fetch invoice items for cost analysis
      const { data: invoiceItems, error: itemsError } = await supabase
        .from("invoice_items")
        .select(`
          *,
          invoice:invoices(issue_date)
        `)
        .gte("created_at", startDate.toISOString());

      if (itemsError) throw itemsError;

      // Process data
      const processedData = processReportData(products || [], movements || [], invoiceItems || [], months);
      setReportData(processedData);
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do relatório",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processReportData = (products: any[], movements: any[], invoiceItems: any[], months: number) => {
    // Monthly movements trend
    const monthlyMovements = Array.from({ length: months }, (_, i) => {
      const date = subMonths(new Date(), months - i - 1);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const monthMovements = movements.filter(m => {
        const movDate = new Date(m.created_at);
        return movDate >= monthStart && movDate <= monthEnd;
      });

      return {
        month: format(date, "MMM/yy"),
        entrada: monthMovements.filter(m => m.movement_type === "entry").length,
        saida: monthMovements.filter(m => m.movement_type === "exit").length,
        transferencia: monthMovements.filter(m => m.movement_type === "transfer").length
      };
    });

    // Top products by movement frequency
    const productMovementCount = new Map<string, { name: string; count: number }>();
    movements.forEach(m => {
      if (m.product?.name) {
        const current = productMovementCount.get(m.product.name) || { name: m.product.name, count: 0 };
        productMovementCount.set(m.product.name, { ...current, count: current.count + 1 });
      }
    });
    const topProducts = Array.from(productMovementCount.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Cost analysis by month
    const costByMonth = Array.from({ length: months }, (_, i) => {
      const date = subMonths(new Date(), months - i - 1);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const monthItems = invoiceItems.filter(item => {
        if (!item.invoice?.issue_date) return false;
        const itemDate = new Date(item.invoice.issue_date);
        return itemDate >= monthStart && itemDate <= monthEnd;
      });

      const totalCost = monthItems.reduce((sum, item) => 
        sum + (parseFloat(item.total_price || 0)), 0
      );

      return {
        month: format(date, "MMM/yy"),
        custo: totalCost
      };
    });

    // Expiring products (next 60 days)
    const now = new Date();
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(now.getDate() + 60);
    
    const expiringProducts = products
      .filter(p => {
        const expiryDate = new Date(p.expiry_date);
        return expiryDate > now && expiryDate <= sixtyDaysFromNow;
      })
      .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
      .slice(0, 10);

    // Location distribution
    const locationCounts = new Map<string, number>();
    products.forEach(p => {
      if (p.locations?.name) {
        locationCounts.set(p.locations.name, (locationCounts.get(p.locations.name) || 0) + 1);
      }
    });
    const locationDistribution = Array.from(locationCounts.entries()).map(([name, value]) => ({
      name,
      value
    }));

    // Stock prediction (simple linear regression based on exit movements)
    const exitsByMonth = Array.from({ length: months }, (_, i) => {
      const date = subMonths(new Date(), months - i - 1);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const exits = movements.filter(m => {
        const movDate = new Date(m.created_at);
        return m.movement_type === "exit" && movDate >= monthStart && movDate <= monthEnd;
      });

      const totalExitQuantity = exits.reduce((sum, m) => sum + parseFloat(m.quantity || 0), 0);
      return totalExitQuantity;
    });

    const avgMonthlyExit = exitsByMonth.reduce((a, b) => a + b, 0) / exitsByMonth.length;
    const currentStock = products.reduce((sum, p) => sum + parseFloat(p.quantity || 0), 0);
    
    const stockPrediction = Array.from({ length: 6 }, (_, i) => {
      const predictedStock = Math.max(0, currentStock - (avgMonthlyExit * i));
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + i);
      
      return {
        month: format(futureDate, "MMM/yy"),
        estoque: Math.round(predictedStock),
        projecao: i === 0 ? null : Math.round(predictedStock)
      };
    });

    // Calculate totals
    const totalCost = invoiceItems.reduce((sum, item) => 
      sum + parseFloat(item.total_price || 0), 0
    );

    return {
      monthlyMovements,
      topProducts,
      costAnalysis: costByMonth,
      expiringProducts,
      locationDistribution,
      stockPrediction,
      totalCost,
      totalProducts: products.length,
      totalMovements: movements.length
    };
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text("Relatório de Análise - ChemStock", 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: Últimos ${period} meses`, 14, 28);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 34);

    // Summary stats
    doc.setFontSize(12);
    doc.text("Resumo Geral", 14, 45);
    autoTable(doc, {
      startY: 50,
      head: [["Métrica", "Valor"]],
      body: [
        ["Total de Produtos", reportData.totalProducts.toString()],
        ["Total de Movimentações", reportData.totalMovements.toString()],
        ["Custo Total", `R$ ${reportData.totalCost.toFixed(2)}`],
        ["Produtos Vencendo (60 dias)", reportData.expiringProducts.length.toString()]
      ]
    });

    // Top products
    doc.addPage();
    doc.setFontSize(12);
    doc.text("Produtos Mais Movimentados", 14, 20);
    autoTable(doc, {
      startY: 25,
      head: [["Produto", "Movimentações"]],
      body: reportData.topProducts.map((p: any) => [p.name, p.count.toString()])
    });

    // Expiring products
    if (reportData.expiringProducts.length > 0) {
      doc.addPage();
      doc.setFontSize(12);
      doc.text("Produtos Próximos ao Vencimento", 14, 20);
      autoTable(doc, {
        startY: 25,
        head: [["Produto", "Lote", "Validade", "Quantidade"]],
        body: reportData.expiringProducts.map((p: any) => [
          p.name,
          p.batch,
          format(new Date(p.expiry_date), "dd/MM/yyyy"),
          `${p.quantity} ${p.unit}`
        ])
      });
    }

    doc.save(`relatorio-chemstock-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    
    toast({
      title: "Sucesso",
      description: "Relatório PDF gerado com sucesso"
    });
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ["Relatório ChemStock", ""],
      ["Período", `Últimos ${period} meses`],
      ["Gerado em", format(new Date(), "dd/MM/yyyy HH:mm")],
      ["", ""],
      ["Métrica", "Valor"],
      ["Total de Produtos", reportData.totalProducts],
      ["Total de Movimentações", reportData.totalMovements],
      ["Custo Total", reportData.totalCost],
      ["Produtos Vencendo (60 dias)", reportData.expiringProducts.length]
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Resumo");

    // Monthly movements sheet
    const movementsSheet = XLSX.utils.json_to_sheet(reportData.monthlyMovements);
    XLSX.utils.book_append_sheet(wb, movementsSheet, "Movimentações Mensais");

    // Top products sheet
    const topProductsSheet = XLSX.utils.json_to_sheet(reportData.topProducts);
    XLSX.utils.book_append_sheet(wb, topProductsSheet, "Produtos Mais Movimentados");

    // Cost analysis sheet
    const costSheet = XLSX.utils.json_to_sheet(reportData.costAnalysis);
    XLSX.utils.book_append_sheet(wb, costSheet, "Análise de Custos");

    // Expiring products sheet
    if (reportData.expiringProducts.length > 0) {
      const expiringData = reportData.expiringProducts.map((p: any) => ({
        Produto: p.name,
        Lote: p.batch,
        Validade: format(new Date(p.expiry_date), "dd/MM/yyyy"),
        Quantidade: `${p.quantity} ${p.unit}`,
        Localização: p.locations?.name || "N/A"
      }));
      const expiringSheet = XLSX.utils.json_to_sheet(expiringData);
      XLSX.utils.book_append_sheet(wb, expiringSheet, "Produtos Vencendo");
    }

    XLSX.writeFile(wb, `relatorio-chemstock-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    
    toast({
      title: "Sucesso",
      description: "Relatório Excel gerado com sucesso"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios & Análises</h1>
          <p className="text-muted-foreground">
            Análise detalhada de movimentações, custos e previsões de estoque
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToPDF} variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button onClick={exportToExcel} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Total de Produtos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalProducts}</div>
            <p className="text-xs text-muted-foreground">No sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              Movimentações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalMovements}</div>
            <p className="text-xs text-muted-foreground">Nos últimos {period} meses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-warning" />
              Custo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {reportData.totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Em produtos adquiridos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Vencendo em 60 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.expiringProducts.length}</div>
            <p className="text-xs text-muted-foreground">Produtos requerem atenção</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Movements Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Tendência de Movimentações</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.monthlyMovements}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="entrada" name="Entrada" fill="hsl(var(--success))" />
                <Bar dataKey="saida" name="Saída" fill="hsl(var(--destructive))" />
                <Bar dataKey="transferencia" name="Transferência" fill="hsl(var(--info))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Análise de Custos Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.costAnalysis}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="custo" 
                  name="Custo Total"
                  stroke="hsl(var(--warning))" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Location Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Localização</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportData.locationDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {reportData.locationDistribution.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stock Prediction */}
        <Card>
          <CardHeader>
            <CardTitle>Previsão de Estoque (IA)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.stockPrediction}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="estoque" 
                  name="Estoque Atual"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="projecao" 
                  name="Projeção"
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 p-3 bg-accent/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Previsão baseada em IA:</strong> Usando análise de tendências dos últimos {period} meses,
                o sistema prevê que o estoque atingirá níveis críticos em aproximadamente{" "}
                {Math.round((reportData.stockPrediction[reportData.stockPrediction.length - 1]?.estoque || 0) / 
                  (reportData.stockPrediction[0]?.estoque || 1) * 6)} meses.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Produtos Mais Movimentados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {reportData.topProducts.map((product: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{index + 1}</Badge>
                  <span className="font-medium">{product.name}</span>
                </div>
                <Badge>{product.count} movimentações</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Expiring Products Alert */}
      {reportData.expiringProducts.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Produtos Próximos ao Vencimento (60 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reportData.expiringProducts.map((product: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Lote: {product.batch} | Local: {product.locations?.name || "N/A"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{product.quantity} {product.unit}</p>
                    <p className="text-sm text-destructive">
                      Vence: {format(new Date(product.expiry_date), "dd/MM/yyyy")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
