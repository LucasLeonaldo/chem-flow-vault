import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Factory, MapPin, FileText, Package } from "lucide-react";

interface Product {
  id: string;
  name: string;
  supplier: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  manufacturingDate: string;
  batch: string;
  invoice: string;
  status: "pending" | "approved" | "expired";
  location: "laboratory" | "warehouse";
}

interface ProductCardProps {
  product: Product;
  onApprove?: (id: string) => void;
  onMove?: (id: string) => void;
}

export function ProductCard({ product, onApprove, onMove }: ProductCardProps) {
  const statusStyles = {
    pending: "bg-warning text-warning-foreground",
    approved: "bg-success text-success-foreground", 
    expired: "bg-destructive text-destructive-foreground"
  };

  const statusLabels = {
    pending: "Pendente",
    approved: "Aprovado",
    expired: "Vencido"
  };

  const locationLabels = {
    laboratory: "Laboratório",
    warehouse: "Almoxarifado"
  };

  const isExpiringSoon = () => {
    const expiryDate = new Date(product.expiryDate);
    const today = new Date();
    const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return daysToExpiry <= 30 && daysToExpiry > 0;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{product.name}</CardTitle>
            <p className="text-sm text-muted-foreground">ID: {product.id}</p>
          </div>
          <div className="flex gap-2">
            <Badge className={statusStyles[product.status]}>
              {statusLabels[product.status]}
            </Badge>
            {isExpiringSoon() && (
              <Badge variant="outline" className="text-warning border-warning">
                Vence em breve
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Factory className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Fornecedor:</span>
            <span className="font-medium">{product.supplier}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Quantidade:</span>
            <span className="font-medium">{product.quantity} {product.unit}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Fabricação:</span>
            <span className="font-medium">{new Date(product.manufacturingDate).toLocaleDateString('pt-BR')}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Validade:</span>
            <span className="font-medium">{new Date(product.expiryDate).toLocaleDateString('pt-BR')}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Lote:</span>
            <span className="font-medium">{product.batch}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Local:</span>
            <span className="font-medium">{locationLabels[product.location]}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Nota Fiscal:</span>
          <span className="font-medium">{product.invoice}</span>
        </div>
        
        {product.status === "pending" && product.location === "laboratory" && onApprove && (
          <div className="flex gap-2 pt-2">
            <Button onClick={() => onApprove(product.id)} className="flex-1">
              Aprovar para Uso
            </Button>
          </div>
        )}
        
        {product.status === "approved" && product.location === "laboratory" && onMove && (
          <div className="flex gap-2 pt-2">
            <Button onClick={() => onMove(product.id)} variant="outline" className="flex-1">
              Mover para Almoxarifado
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}