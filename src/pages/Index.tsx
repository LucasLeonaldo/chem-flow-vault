import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FlaskConical, ArrowRight, BarChart3, Package, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

function Index() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <FlaskConical className="h-8 w-8 text-primary" />
          </div>
        </div>
        
        <div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            ChemStock
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Bem-vindo, {user?.user_metadata?.full_name || user?.email}! 
            Sistema completo de gerenciamento de estoque para produtos químicos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="gap-2">
              <Link to="/dashboard">
                <BarChart3 className="h-5 w-5" />
                Acessar Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link to="/produtos">
                <Package className="h-5 w-5" />
                Ver Produtos
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Dashboard Inteligente</CardTitle>
            <CardDescription>
              Visualize métricas em tempo real, produtos próximos ao vencimento e estatísticas completas do seu estoque.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild variant="outline" className="w-full">
              <Link to="/dashboard">Ver Dashboard</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <Package className="h-6 w-6 text-success" />
            </div>
            <CardTitle>Gestão de Produtos</CardTitle>
            <CardDescription>
              Controle completo do inventário, desde a entrada no laboratório até a aprovação para o almoxarifado.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild variant="outline" className="w-full">
              <Link to="/produtos">Gerenciar Produtos</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-warning" />
            </div>
            <CardTitle>Controle de Qualidade</CardTitle>
            <CardDescription>
              Sistema de aprovação com rastreabilidade completa, garantindo a segurança e qualidade dos produtos.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild variant="outline" className="w-full">
              <Link to="/laboratorio">Laboratório</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
