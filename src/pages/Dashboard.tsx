import { Users, Package, UserCog, ShoppingCart, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/StatCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const salesData = [
  { dia: "Seg", vendas: 4, valor: 2400 },
  { dia: "Ter", vendas: 3, valor: 1398 },
  { dia: "Qua", vendas: 7, valor: 5800 },
  { dia: "Qui", vendas: 2, valor: 908 },
  { dia: "Sex", vendas: 5, valor: 4800 },
  { dia: "Sáb", vendas: 8, valor: 7200 },
  { dia: "Dom", vendas: 1, valor: 500 },
];

const lowStockProducts = [
  { name: "Arroz 25kg", stock: 3 },
  { name: "Óleo de Cozinha 5L", stock: 5 },
  { name: "Açúcar 1kg", stock: 2 },
];

const Dashboard = () => {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
        <div className="flex gap-3">
          <Button variant="default" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Clientes Registados"
          value={48}
          change="12% desde ontem"
          changeType="up"
          icon={Users}
          borderColor="border-t-primary"
        />
        <StatCard
          title="Produtos em Stock"
          value={156}
          change="8% desde semana passada"
          changeType="up"
          icon={Package}
          borderColor="border-t-accent"
        />
        <StatCard
          title="Utilizadores do Sistema"
          value={5}
          change="2% desde o mês passado"
          changeType="up"
          icon={UserCog}
          borderColor="border-t-warning"
        />
        <StatCard
          title="Vendas Concluídas"
          value={234}
          change="15% desde ontem"
          changeType="up"
          icon={ShoppingCart}
          borderColor="border-t-[hsl(280,60%,55%)]"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="col-span-2 rounded-lg bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-card-foreground">
              Vendas nos Últimos 7 Dias
            </h2>
            <div className="flex gap-1">
              <Button variant="outline" size="sm">Hoje</Button>
              <Button variant="outline" size="sm">7 Dias</Button>
              <Button variant="default" size="sm">Mês</Button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 25% 90%)" />
              <XAxis dataKey="dia" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="vendas" stroke="hsl(210 80% 50%)" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="valor" stroke="hsl(160 55% 42%)" strokeWidth={2} dot={{ r: 4 }} yAxisId={0} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">
              Produtos com Baixo Estoque
            </h2>
            {lowStockProducts.length > 0 ? (
              <ul className="space-y-3">
                {lowStockProducts.map((p) => (
                  <li key={p.name} className="flex items-center justify-between text-sm">
                    <span className="text-card-foreground">{p.name}</span>
                    <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                      {p.stock} un.
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum produto com estoque baixo.</p>
            )}
            <Button variant="outline" className="mt-4 w-full" size="sm">
              + Gerenciar Produtos
            </Button>
          </div>

          <div className="rounded-lg bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">
              Desempenho de Vendas
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Meta Mensal</span>
                <span className="font-medium text-card-foreground">65%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[65%] rounded-full bg-primary transition-all" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
