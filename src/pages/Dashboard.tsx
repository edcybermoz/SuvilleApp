import { useEffect, useMemo, useState } from "react";
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
  Clock,
  Wallet,
  Lock,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

import { Button } from "@/components/ui/button";
import StatCard from "@/components/StatCard";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import AccessGuard from "@/components/AccessGuard";
import {
  listenClientes,
  listenProdutos,
  listenVendas,
  listenCategorias,
  Cliente,
  Produto,
  Venda,
  Categoria,
} from "@/lib/store";

const Dashboard = () => {
  const { toast } = useToast();
  const {
    blocked,
    canViewReports,
    canExportData,
    canManageProducts,
    canManageCustomers,
    canManageCategories,
    currentPlan,
    currentStatus,
    daysLeft,
  } = usePlanAccess();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  const [periodo, setPeriodo] = useState<"hoje" | "7dias" | "mes">("7dias");

  useEffect(() => {
    if (blocked) {
      setClientes([]);
      setProdutos([]);
      setVendas([]);
      setCategorias([]);
      setLoading(false);
      return;
    }

    let carregados = {
      clientes: false,
      produtos: false,
      vendas: false,
      categorias: false,
    };

    let erroMostrado = false;

    const verificarFim = () => {
      if (
        carregados.clientes &&
        carregados.produtos &&
        carregados.vendas &&
        carregados.categorias
      ) {
        setLoading(false);
      }
    };

    const tratarErro = (label: keyof typeof carregados) => {
      carregados[label] = true;
      verificarFim();

      if (!erroMostrado) {
        erroMostrado = true;
        toast({
          title: "Não foi possível carregar o painel",
          description: "Alguns dados do dashboard não puderam ser carregados.",
          variant: "destructive",
        });
      }
    };

    const unsubClientes = listenClientes(
      (data) => {
        setClientes(data);
        carregados.clientes = true;
        verificarFim();
      },
      () => tratarErro("clientes")
    );

    const unsubProdutos = listenProdutos(
      (data) => {
        setProdutos(data);
        carregados.produtos = true;
        verificarFim();
      },
      () => tratarErro("produtos")
    );

    const unsubVendas = listenVendas(
      (data) => {
        setVendas(data);
        carregados.vendas = true;
        verificarFim();
      },
      () => tratarErro("vendas")
    );

    const unsubCategorias = listenCategorias(
      (data) => {
        setCategorias(data);
        carregados.categorias = true;
        verificarFim();
      },
      () => tratarErro("categorias")
    );

    return () => {
      unsubClientes();
      unsubProdutos();
      unsubVendas();
      unsubCategorias();
    };
  }, [blocked, toast]);

  const formatarMoeda = (valor: number) => {
    return (
      Number(valor || 0).toLocaleString("pt-MZ", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " MZN"
    );
  };

  const getVendaDate = (venda: Venda) => {
    try {
      return venda.createdAt?.toDate?.() ?? null;
    } catch {
      return null;
    }
  };

  const handleRefresh = async () => {
    if (blocked) {
      toast({
        title: "Acesso restrito",
        description: "O seu plano atual não permite usar o painel.",
        variant: "destructive",
      });
      return;
    }

    setRefreshing(true);

    setTimeout(() => {
      setRefreshing(false);
      toast({
        title: "Sucesso",
        description: "Dados atualizados com sucesso.",
      });
    }, 800);
  };

  const exportarResumoCSV = () => {
    if (!canExportData) {
      toast({
        title: "Exportação indisponível",
        description: "O seu plano atual não permite exportar dados.",
        variant: "destructive",
      });
      return;
    }

    const linhas = [
      ["Indicador", "Valor"],
      ["Total de Clientes", String(stats.totalClientes)],
      ["Total de Produtos", String(stats.totalProdutos)],
      ["Total de Categorias", String(stats.totalCategorias)],
      ["Vendas Concluídas", String(stats.totalVendas)],
      ["Valor Total de Vendas", String(stats.valorTotalVendas)],
      ["Vendas Hoje", String(stats.vendasHoje)],
      ["Valor de Vendas Hoje", String(stats.valorVendasHoje)],
      ["Vendas Semana", String(stats.vendasSemana)],
      ["Valor de Vendas Semana", String(stats.valorVendasSemana)],
      ["Produtos com Baixo Stock", String(stats.produtosBaixoStock)],
      ["Ticket Médio", String(stats.mediaVendas)],
    ];

    const csv = linhas
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dashboard-resumo.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Exportação concluída",
      description: "Resumo do dashboard exportado com sucesso.",
    });
  };

  const stats = useMemo(() => {
    const totalClientes = clientes.length;
    const totalProdutos = produtos.length;
    const totalCategorias = categorias.length;

    const vendasConcluidas = vendas.filter((v) => v.status === "concluida");
    const totalVendas = vendasConcluidas.length;
    const valorTotalVendas = vendasConcluidas.reduce((acc, v) => acc + (v.total || 0), 0);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const inicioSemana = new Date();
    inicioSemana.setDate(inicioSemana.getDate() - 7);
    inicioSemana.setHours(0, 0, 0, 0);

    const inicioMes = new Date();
    inicioMes.setDate(inicioMes.getDate() - 30);
    inicioMes.setHours(0, 0, 0, 0);

    const vendasHoje = vendasConcluidas.filter((v) => {
      const data = getVendaDate(v);
      return data && data >= hoje;
    });

    const vendasSemana = vendasConcluidas.filter((v) => {
      const data = getVendaDate(v);
      return data && data >= inicioSemana;
    });

    const vendasMes = vendasConcluidas.filter((v) => {
      const data = getVendaDate(v);
      return data && data >= inicioMes;
    });

    const produtosBaixoStock = produtos.filter((p) => p.stock > 0 && p.stock < 10);
    const produtosSemStock = produtos.filter((p) => p.stock === 0);

    const mediaVendas =
      vendasConcluidas.length > 0 ? valorTotalVendas / vendasConcluidas.length : 0;

    const clientesAtivos = clientes.filter((c) => (c.totalCompras || 0) > 0).length;

    const valorEstoqueCusto = produtos.reduce(
      (acc, p) => acc + (p.precoCompra || 0) * (p.stock || 0),
      0
    );

    const valorEstoqueVenda = produtos.reduce(
      (acc, p) => acc + (p.precoVenda || 0) * (p.stock || 0),
      0
    );

    return {
      totalClientes,
      totalProdutos,
      totalCategorias,
      totalVendas,
      valorTotalVendas,
      vendasHoje: vendasHoje.length,
      valorVendasHoje: vendasHoje.reduce((acc, v) => acc + (v.total || 0), 0),
      vendasSemana: vendasSemana.length,
      valorVendasSemana: vendasSemana.reduce((acc, v) => acc + (v.total || 0), 0),
      vendasMes: vendasMes.length,
      valorVendasMes: vendasMes.reduce((acc, v) => acc + (v.total || 0), 0),
      produtosBaixoStock: produtosBaixoStock.length,
      produtosSemStock: produtosSemStock.length,
      mediaVendas,
      clientesAtivos,
      valorEstoqueCusto,
      valorEstoqueVenda,
    };
  }, [clientes, produtos, vendas, categorias]);

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
      data.setHours(0, 0, 0, 0);

      const chave = data.toISOString().split("T")[0];
      const nomeDia =
        periodo === "mes"
          ? `${String(data.getDate()).padStart(2, "0")}/${String(
              data.getMonth() + 1
            ).padStart(2, "0")}`
          : periodo === "hoje"
            ? "Hoje"
            : dias[data.getDay()];

      dados[chave] = {
        dia: nomeDia,
        vendas: 0,
        valor: 0,
      };
    }

    vendas
      .filter((v) => v.status === "concluida")
      .forEach((venda) => {
        const dataVenda = getVendaDate(venda);
        if (!dataVenda) return;

        const dataNormalizada = new Date(dataVenda);
        dataNormalizada.setHours(0, 0, 0, 0);
        const chave = dataNormalizada.toISOString().split("T")[0];

        if (dados[chave]) {
          dados[chave].vendas += 1;
          dados[chave].valor += venda.total || 0;
        }
      });

    return Object.values(dados);
  }, [vendas, periodo]);

  const ultimasVendas = useMemo(() => {
    return vendas
      .filter((v) => v.status === "concluida")
      .sort((a, b) => {
        const aTime = getVendaDate(a)?.getTime() || 0;
        const bTime = getVendaDate(b)?.getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [vendas]);

  const topProdutosCriticos = useMemo(() => {
    return produtos
      .filter((p) => p.stock < 10)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5);
  }, [produtos]);

  const percentualMeta = Math.min((stats.valorVendasMes / 100000) * 100, 100);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {blocked && (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-1">
            <span className="font-medium">Acesso restrito ao painel</span>
            <span>
              O plano atual ({currentPlan}) está {currentStatus}.
              {typeof daysLeft === "number" && currentPlan === "trial"
                ? ` Dias restantes: ${daysLeft}.`
                : ""}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {!canViewReports && !blocked && (
        <Alert>
          <AlertDescription>
            O seu plano atual tem acesso limitado ao dashboard.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground">Visão geral do seu negócio</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="default" size="sm" onClick={handleRefresh} disabled={refreshing || blocked}>
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Atualizar
          </Button>

          <Button variant="outline" size="sm" onClick={exportarResumoCSV} disabled={!canExportData}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <div className={`space-y-6 ${blocked ? "opacity-80" : ""}`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link to={canManageCustomers ? "/clientes" : "#"} className={!canManageCustomers ? "pointer-events-none" : ""}>
            <StatCard
              title="Clientes Registados"
              value={stats.totalClientes}
              change={`${stats.clientesAtivos} ativos`}
              changeType={stats.clientesAtivos > 0 ? "up" : "neutral"}
              icon={Users}
              borderColor="border-t-primary"
            />
          </Link>

          <Link to={canManageProducts ? "/produtos" : "#"} className={!canManageProducts ? "pointer-events-none" : ""}>
            <StatCard
              title="Produtos em Stock"
              value={stats.totalProdutos}
              change={`${stats.produtosBaixoStock} com baixo stock`}
              changeType={stats.produtosBaixoStock > 0 ? "down" : "up"}
              icon={Package}
              borderColor="border-t-accent"
            />
          </Link>

          <Link
            to={canManageCategories ? "/categorias" : "#"}
            className={!canManageCategories ? "pointer-events-none" : ""}
          >
            <StatCard
              title="Categorias"
              value={stats.totalCategorias}
              change="Organização"
              changeType="neutral"
              icon={UserCog}
              borderColor="border-t-warning"
            />
          </Link>

          <Link to={!blocked ? "/vendas" : "#"} className={blocked ? "pointer-events-none" : ""}>
            <StatCard
              title="Vendas Concluídas"
              value={stats.totalVendas}
              change={`${stats.vendasHoje} hoje`}
              changeType={stats.vendasHoje > 0 ? "up" : "neutral"}
              icon={ShoppingCart}
              borderColor="border-t-[hsl(280,60%,55%)]"
            />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatarMoeda(stats.valorVendasHoje)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.vendasHoje} {stats.vendasHoje === 1 ? "venda" : "vendas"} hoje
              </p>
            </CardContent>
          </Card>

          <AccessGuard allow={canViewReports} fallback={<Card><CardHeader><CardTitle className="text-sm">Vendas da Semana</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Disponível em plano superior.</p></CardContent></Card>}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vendas da Semana</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatarMoeda(stats.valorVendasSemana)}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.vendasSemana} vendas nos últimos 7 dias
                </p>
              </CardContent>
            </Card>
          </AccessGuard>

          <AccessGuard allow={canViewReports} fallback={<Card><CardHeader><CardTitle className="text-sm">Ticket Médio</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Disponível em plano superior.</p></CardContent></Card>}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatarMoeda(stats.mediaVendas)}</div>
                <p className="text-xs text-muted-foreground">Valor médio por venda</p>
              </CardContent>
            </Card>
          </AccessGuard>

          <AccessGuard allow={canViewReports} fallback={<Card><CardHeader><CardTitle className="text-sm">Valor em Estoque</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Disponível em plano superior.</p></CardContent></Card>}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor em Estoque</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatarMoeda(stats.valorEstoqueVenda)}</div>
                <p className="text-xs text-muted-foreground">
                  Custo: {formatarMoeda(stats.valorEstoqueCusto)}
                </p>
              </CardContent>
            </Card>
          </AccessGuard>
        </div>

        <AccessGuard
          allow={canViewReports}
          fallback={
            <Card>
              <CardHeader>
                <CardTitle>Relatórios indisponíveis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  O seu plano atual não permite acesso aos relatórios avançados do dashboard.
                </p>
              </CardContent>
            </Card>
          }
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="col-span-2 rounded-lg bg-card p-6 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold text-card-foreground">Vendas por Período</h2>

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

              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={vendasPorPeriodo}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 25% 90%)" />
                  <XAxis dataKey="dia" fontSize={12} />
                  <YAxis yAxisId="left" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" fontSize={12} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === "valor") return [formatarMoeda(value), "Valor"];
                      return [value, "Vendas"];
                    }}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="valor"
                    stroke="hsl(160 55% 42%)"
                    fill="hsl(160 55% 42% / 0.15)"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="vendas"
                    stroke="hsl(210 80% 50%)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-6">
              <div className="rounded-lg bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-card-foreground">
                  Produtos com Baixo Estoque
                  {stats.produtosBaixoStock > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {stats.produtosBaixoStock}
                    </Badge>
                  )}
                </h2>

                {topProdutosCriticos.length > 0 ? (
                  <ul className="max-h-[220px] space-y-3 overflow-y-auto">
                    {topProdutosCriticos.map((p) => (
                      <li key={p.id} className="flex items-center justify-between text-sm">
                        <span className="flex-1 truncate text-card-foreground">{p.nome}</span>
                        <span
                          className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            p.stock === 0
                              ? "bg-destructive/10 text-destructive"
                              : "bg-warning/10 text-warning"
                          }`}
                        >
                          {p.stock} un.
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum produto com estoque baixo.
                  </p>
                )}

                <Link to="/produtos">
                  <Button variant="outline" className="mt-4 w-full" size="sm">
                    Gerenciar Produtos
                  </Button>
                </Link>
              </div>

              <div className="rounded-lg bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-card-foreground">Meta Mensal</h2>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium text-card-foreground">
                      {formatarMoeda(stats.valorVendasMes)}
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${percentualMeta}%` }}
                    />
                  </div>

                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    {percentualMeta.toFixed(1)}% da meta de 100.000 MZN
                  </p>
                </div>
              </div>
            </div>
          </div>
        </AccessGuard>

        <div className="rounded-lg bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-card-foreground">Últimas Vendas</h2>
            {!blocked && (
              <Link to="/vendas">
                <Button variant="ghost" size="sm">
                  Ver todas
                </Button>
              </Link>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-muted-foreground">Cliente</th>
                  <th className="px-4 py-2 text-left text-muted-foreground">Data</th>
                  <th className="px-4 py-2 text-left text-muted-foreground">Itens</th>
                  <th className="px-4 py-2 text-left text-muted-foreground">Total</th>
                  <th className="px-4 py-2 text-left text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {ultimasVendas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhuma venda concluída encontrada.
                    </td>
                  </tr>
                ) : (
                  ultimasVendas.map((venda) => (
                    <tr key={venda.id} className="border-b last:border-0">
                      <td className="px-4 py-2">{venda.clienteNome}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {getVendaDate(venda)?.toLocaleDateString("pt-BR") || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {venda.produtos.length} {venda.produtos.length === 1 ? "item" : "itens"}
                      </td>
                      <td className="px-4 py-2 font-medium">{formatarMoeda(venda.total)}</td>
                      <td className="px-4 py-2">
                        <Badge variant="default" className="bg-accent/10 text-accent">
                          Concluída
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {stats.produtosSemStock > 0 && canManageProducts && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <h3 className="font-semibold text-destructive">Atenção ao estoque</h3>
                <p className="text-sm text-muted-foreground">
                  Existem {stats.produtosSemStock} produtos sem stock e{" "}
                  {stats.produtosBaixoStock} com baixo stock.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;