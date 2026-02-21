// src/pages/Dashboard.tsx
import { useEffect, useState, useMemo } from "react";
import { 
  Users, 
  Package, 
  UserCog, 
  ShoppingCart, 
  RefreshCw, 
  Download,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/StatCard";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  listenClientes,
  listenProdutos,
  listenVendas,
  listenCategorias,
  Cliente,
  Produto,
  Venda,
  Categoria
} from "@/lib/store";

// Cores para os gráficos
const COLORS = ['hsl(210, 80%, 50%)', 'hsl(160, 55%, 42%)', 'hsl(280, 60%, 55%)', 'hsl(35, 90%, 55%)', 'hsl(0, 70%, 55%)'];

const Dashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Dados
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  // Período selecionado para o gráfico
  const [periodo, setPeriodo] = useState<"hoje" | "7dias" | "mes">("7dias");

  // Carregar dados
  useEffect(() => {
    const unsubClientes = listenClientes(setClientes);
    const unsubProdutos = listenProdutos(setProdutos);
    const unsubVendas = listenVendas(setVendas);
    const unsubCategorias = listenCategorias(setCategorias);

    setLoading(false);

    return () => {
      unsubClientes();
      unsubProdutos();
      unsubVendas();
      unsubCategorias();
    };
  }, []);

  // Função para atualizar dados
  const handleRefresh = async () => {
    setRefreshing(true);
    // Os dados já são atualizados em tempo real pelo Firestore
    setTimeout(() => {
      setRefreshing(false);
      toast({
        title: "Sucesso",
        description: "Dados atualizados com sucesso",
      });
    }, 1000);
  };

  // Calcular estatísticas
  const stats = useMemo(() => {
    const totalClientes = clientes.length;
    const totalProdutos = produtos.length;
    const totalCategorias = categorias.length;
    
    // Vendas concluídas
    const vendasConcluidas = vendas.filter(v => v.status === "concluida");
    const totalVendas = vendasConcluidas.length;
    const valorTotalVendas = vendasConcluidas.reduce((acc, v) => acc + v.total, 0);
    
    // Vendas do dia
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vendasHoje = vendasConcluidas.filter(v => {
      const vendaDate = v.createdAt?.toDate();
      return vendaDate && vendaDate >= hoje;
    });
    
    // Vendas da semana
    const semana = new Date();
    semana.setDate(semana.getDate() - 7);
    const vendasSemana = vendasConcluidas.filter(v => {
      const vendaDate = v.createdAt?.toDate();
      return vendaDate && vendaDate >= semana;
    });

    // Produtos com baixo stock
    const produtosBaixoStock = produtos.filter(p => p.stock < 10);
    
    // Média de vendas
    const mediaVendas = vendasConcluidas.length > 0 
      ? valorTotalVendas / vendasConcluidas.length 
      : 0;

    return {
      totalClientes,
      totalProdutos,
      totalCategorias,
      totalVendas,
      valorTotalVendas,
      vendasHoje: vendasHoje.length,
      valorVendasHoje: vendasHoje.reduce((acc, v) => acc + v.total, 0),
      vendasSemana: vendasSemana.length,
      valorVendasSemana: vendasSemana.reduce((acc, v) => acc + v.total, 0),
      produtosBaixoStock: produtosBaixoStock.length,
      mediaVendas,
    };
  }, [clientes, produtos, vendas, categorias]);

  // Dados para o gráfico de vendas por período
  const vendasPorPeriodo = useMemo(() => {
    const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const hoje = new Date();
    let diasParaMostrar = 7;
    
    if (periodo === "hoje") diasParaMostrar = 1;
    if (periodo === "mes") diasParaMostrar = 30;

    const dados: { [key: string]: { dia: string; vendas: number; valor: number } } = {};

    for (let i = diasParaMostrar - 1; i >= 0; i--) {
      const data = new Date(hoje);
      data.setDate(data.getDate() - i);
      const chave = data.toISOString().split('T')[0];
      const nomeDia = dias[data.getDay()];
      
      dados[chave] = {
        dia: periodo === "mes" ? `${data.getDate()}/${data.getMonth() + 1}` : nomeDia,
        vendas: 0,
        valor: 0,
      };
    }

    vendas.filter(v => v.status === "concluida").forEach(venda => {
      if (venda.createdAt) {
        const dataVenda = venda.createdAt.toDate();
        const chave = dataVenda.toISOString().split('T')[0];
        
        if (dados[chave]) {
          dados[chave].vendas += 1;
          dados[chave].valor += venda.total;
        }
      }
    });

    return Object.values(dados);
  }, [vendas, periodo]);

  // Dados para gráfico de categorias
  const vendasPorCategoria = useMemo(() => {
    const categoriasMap: { [key: string]: number } = {};
    
    vendas.filter(v => v.status === "concluida").forEach(venda => {
      venda.produtos.forEach(produto => {
        const produtoInfo = produtos.find(p => p.id === produto.produtoId);
        if (produtoInfo) {
          categoriasMap[produtoInfo.categoria] = (categoriasMap[produtoInfo.categoria] || 0) + produto.subtotal;
        }
      });
    });

    return Object.entries(categoriasMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [vendas, produtos]);

  // Formatar moeda
  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString("pt-MZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " MZN";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral do seu negócio
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="default" 
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Atualizar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Clientes Registados"
          value={stats.totalClientes}
          change={`${stats.totalClientes} total`}
          changeType={stats.totalClientes > 0 ? "up" : "neutral"}
          icon={Users}
          borderColor="border-t-primary"
        />
        <StatCard
          title="Produtos em Stock"
          value={stats.totalProdutos}
          change={`${stats.produtosBaixoStock} com baixo stock`}
          changeType={stats.produtosBaixoStock > 0 ? "down" : "up"}
          icon={Package}
          borderColor="border-t-accent"
        />
        <StatCard
          title="Categorias"
          value={stats.totalCategorias}
          change="Organização"
          changeType="neutral"
          icon={UserCog}
          borderColor="border-t-warning"
        />
        <StatCard
          title="Vendas Concluídas"
          value={stats.totalVendas}
          change={`${stats.vendasHoje} hoje`}
          changeType={stats.vendasHoje > 0 ? "up" : "neutral"}
          icon={ShoppingCart}
          borderColor="border-t-[hsl(280,60%,55%)]"
        />
      </div>

      {/* Cards de Valores */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Vendas Hoje
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatarMoeda(stats.valorVendasHoje)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.vendasHoje} {stats.vendasHoje === 1 ? 'venda' : 'vendas'} hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Vendas da Semana
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatarMoeda(stats.valorVendasSemana)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.vendasSemana} vendas nos últimos 7 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ticket Médio
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatarMoeda(stats.mediaVendas)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor médio por venda
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Gráfico de Vendas */}
        <div className="col-span-2 rounded-lg bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-card-foreground">
              Vendas por Período
            </h2>
            <div className="flex gap-1">
              <Button 
                variant={periodo === "hoje" ? "default" : "outline"} 
                size="sm"
                onClick={() => setPeriodo("hoje")}
              >
                Hoje
              </Button>
              <Button 
                variant={periodo === "7dias" ? "default" : "outline"} 
                size="sm"
                onClick={() => setPeriodo("7dias")}
              >
                7 Dias
              </Button>
              <Button 
                variant={periodo === "mes" ? "default" : "outline"} 
                size="sm"
                onClick={() => setPeriodo("mes")}
              >
                Mês
              </Button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={vendasPorPeriodo}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 25% 90%)" />
              <XAxis dataKey="dia" fontSize={12} />
              <YAxis yAxisId="left" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" fontSize={12} />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === "valor") return [formatarMoeda(value), "Valor"];
                  return [value, "Vendas"];
                }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="vendas" 
                stroke="hsl(210 80% 50%)" 
                strokeWidth={2} 
                dot={{ r: 4 }}
                name="Vendas"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="valor" 
                stroke="hsl(160 55% 42%)" 
                strokeWidth={2} 
                dot={{ r: 4 }}
                name="Valor"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sidebar Direita */}
        <div className="space-y-6">
          {/* Produtos com Baixo Estoque */}
          <div className="rounded-lg bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">
              Produtos com Baixo Estoque
              {stats.produtosBaixoStock > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {stats.produtosBaixoStock}
                </Badge>
              )}
            </h2>
            {produtos.filter(p => p.stock < 10).length > 0 ? (
              <ul className="space-y-3 max-h-[200px] overflow-y-auto">
                {produtos
                  .filter(p => p.stock < 10)
                  .sort((a, b) => a.stock - b.stock)
                  .slice(0, 5)
                  .map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-card-foreground truncate flex-1">
                        {p.nome}
                      </span>
                      <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive ml-2">
                        {p.stock} un.
                      </span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum produto com estoque baixo.</p>
            )}
            <Link to="/produtos">
              <Button variant="outline" className="mt-4 w-full" size="sm">
                Gerenciar Produtos
              </Button>
            </Link>
          </div>

          {/* Vendas por Categoria */}
          <div className="rounded-lg bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">
              Vendas por Categoria
            </h2>
            {vendasPorCategoria.length > 0 ? (
              <div className="space-y-3">
                {vendasPorCategoria.map((cat, index) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{cat.name}</span>
                      <span className="font-medium">{formatarMoeda(cat.value)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${(cat.value / vendasPorCategoria[0].value) * 100}%`,
                          backgroundColor: COLORS[index % COLORS.length]
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma venda registrada.</p>
            )}
          </div>

          {/* Meta Mensal */}
          <div className="rounded-lg bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">
              Meta Mensal
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium text-card-foreground">
                  {formatarMoeda(stats.valorVendasSemana)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div 
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min((stats.valorVendasSemana / 100000) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Meta: 100.000 MZN
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Últimas Vendas */}
      <div className="rounded-lg bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-card-foreground">
            Últimas Vendas
          </h2>
          <Link to="/vendas">
            <Button variant="ghost" size="sm">Ver todas</Button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="px-4 py-2 text-left text-muted-foreground">Cliente</th>
                <th className="px-4 py-2 text-left text-muted-foreground">Data</th>
                <th className="px-4 py-2 text-left text-muted-foreground">Total</th>
                <th className="px-4 py-2 text-left text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {vendas
                .filter(v => v.status === "concluida")
                .sort((a, b) => {
                  if (!a.createdAt || !b.createdAt) return 0;
                  return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime();
                })
                .slice(0, 5)
                .map((venda) => (
                  <tr key={venda.id} className="border-b last:border-0">
                    <td className="px-4 py-2">{venda.clienteNome}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {venda.createdAt?.toDate().toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-2 font-medium">{formatarMoeda(venda.total)}</td>
                    <td className="px-4 py-2">
                      <Badge variant="default" className="bg-accent/10 text-accent">
                        Concluída
                      </Badge>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;