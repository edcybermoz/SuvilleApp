import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Printer,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Filter,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Loader2,
  AreaChart as AreaChartIcon,
  Lock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  listenVendas,
  listenProdutos,
  listenClientes,
  Venda,
  Produto,
  Cliente,
} from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  eachMonthOfInterval,
  startOfDay,
  endOfDay,
  differenceInCalendarDays,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const COLORS = {
  primary: "hsl(210, 80%, 50%)",
  success: "hsl(160, 55%, 42%)",
  warning: "hsl(40, 90%, 55%)",
  danger: "hsl(0, 70%, 55%)",
  info: "hsl(280, 60%, 55%)",
  chart: [
    "hsl(210, 80%, 50%)",
    "hsl(160, 55%, 42%)",
    "hsl(40, 90%, 55%)",
    "hsl(280, 60%, 55%)",
    "hsl(0, 70%, 55%)",
  ],
};

interface DateRange {
  from: Date;
  to: Date;
}

type TipoGrafico = "barras" | "linha" | "area";
type Agrupamento = "dia" | "semana" | "mes";

const Relatorios = () => {
  const { toast } = useToast();
  const { firebaseUser, isVendedor } = useAuth();
  const {
    blocked,
    canViewReports,
    canExportData,
    currentPlan,
    currentStatus,
    daysLeft,
  } = usePlanAccess();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>("barras");
  const [agrupamento, setAgrupamento] = useState<Agrupamento>("dia");

  const vendedorUid = firebaseUser?.uid ?? null;

  useEffect(() => {
    let carregados = {
      vendas: false,
      produtos: false,
      clientes: false,
    };

    let erroMostrado = false;

    const verificarFim = () => {
      if (carregados.vendas && carregados.produtos && carregados.clientes) {
        setLoading(false);
      }
    };

    const tratarErro = (label: keyof typeof carregados) => {
      carregados[label] = true;
      verificarFim();

      if (!erroMostrado) {
        erroMostrado = true;
        toast({
          title: "Permissão insuficiente",
          description:
            "Não foi possível carregar todos os dados do relatório. Verifique o login Firebase e o documento usuarios/{uid}.",
          variant: "destructive",
        });
      }
    };

    const unsubVendas = listenVendas(
      (data) => {
        setVendas(data);
        carregados.vendas = true;
        verificarFim();
      },
      () => tratarErro("vendas")
    );

    const unsubProdutos = listenProdutos(
      (data) => {
        setProdutos(data);
        carregados.produtos = true;
        verificarFim();
      },
      () => tratarErro("produtos")
    );

    const unsubClientes = listenClientes(
      (data) => {
        setClientes(data);
        carregados.clientes = true;
        verificarFim();
      },
      () => tratarErro("clientes")
    );

    return () => {
      unsubVendas();
      unsubProdutos();
      unsubClientes();
    };
  }, [toast]);

  const getVendaDate = (venda: Venda) => {
    try {
      return venda.createdAt?.toDate?.() ?? null;
    } catch {
      return null;
    }
  };

  const formatarMoeda = (valor: number) => {
    return (
      Number(valor || 0).toLocaleString("pt-MZ", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " MZN"
    );
  };

  const vendasFiltradas = useMemo(() => {
    const inicio = startOfDay(dateRange.from);
    const fim = endOfDay(dateRange.to);

    let vendasPeriodo = vendas.filter((venda) => {
      const dataVenda = getVendaDate(venda);
      return dataVenda && dataVenda >= inicio && dataVenda <= fim;
    });

    if (isVendedor && vendedorUid) {
      vendasPeriodo = vendasPeriodo.filter((v) => v.vendedorId === vendedorUid);
    }

    return vendasPeriodo;
  }, [vendas, dateRange, isVendedor, vendedorUid]);

  const vendasConcluidas = useMemo(() => {
    return vendasFiltradas.filter((v) => v.status === "concluida");
  }, [vendasFiltradas]);

  const stats = useMemo(() => {
    const totalVendas = vendasConcluidas.length;
    const valorTotal = vendasConcluidas.reduce((acc, v) => acc + (v.total || 0), 0);

    const clientesUnicos = new Set(
      vendasConcluidas.map((v) => v.clienteId).filter(Boolean)
    );

    const totalClientes = clientesUnicos.size;
    const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;

    const diasNoPeriodo = differenceInCalendarDays(dateRange.to, dateRange.from) + 1;
    const mediaDiaria = diasNoPeriodo > 0 ? valorTotal / diasNoPeriodo : 0;

    const vendasCanceladas = vendasFiltradas.filter((v) => v.status === "cancelada").length;
    const taxaCancelamento =
      vendasFiltradas.length > 0 ? (vendasCanceladas / vendasFiltradas.length) * 100 : 0;

    return {
      totalVendas,
      valorTotal,
      totalClientes,
      ticketMedio,
      mediaDiaria,
      diasNoPeriodo,
      vendasCanceladas,
      taxaCancelamento,
    };
  }, [vendasConcluidas, vendasFiltradas, dateRange]);

  const dadosVendasPorPeriodo = useMemo(() => {
    if (agrupamento === "dia") {
      const dias = eachDayOfInterval({
        start: startOfDay(dateRange.from),
        end: startOfDay(dateRange.to),
      });

      return dias.map((dia) => {
        const vendasDoDia = vendasConcluidas.filter((v) => {
          const dataVenda = getVendaDate(v);
          return dataVenda && format(dataVenda, "yyyy-MM-dd") === format(dia, "yyyy-MM-dd");
        });

        return {
          data: format(dia, "dd/MM", { locale: ptBR }),
          vendas: vendasDoDia.length,
          valor: vendasDoDia.reduce((acc, v) => acc + (v.total || 0), 0),
        };
      });
    }

    if (agrupamento === "semana") {
      const semanas = eachWeekOfInterval(
        {
          start: startOfWeek(dateRange.from, { locale: ptBR }),
          end: endOfWeek(dateRange.to, { locale: ptBR }),
        },
        { locale: ptBR }
      );

      return semanas.map((inicioSemana) => {
        const fimSemana = endOfWeek(inicioSemana, { locale: ptBR });

        const vendasDaSemana = vendasConcluidas.filter((v) => {
          const dataVenda = getVendaDate(v);
          return dataVenda && dataVenda >= inicioSemana && dataVenda <= fimSemana;
        });

        return {
          data: `${format(inicioSemana, "dd/MM")} - ${format(fimSemana, "dd/MM")}`,
          vendas: vendasDaSemana.length,
          valor: vendasDaSemana.reduce((acc, v) => acc + (v.total || 0), 0),
        };
      });
    }

    const meses = eachMonthOfInterval({
      start: dateRange.from,
      end: dateRange.to,
    });

    return meses.map((mes) => {
      const nomeMes = format(mes, "MMM/yyyy", { locale: ptBR });

      const vendasDoMes = vendasConcluidas.filter((v) => {
        const dataVenda = getVendaDate(v);
        return dataVenda && format(dataVenda, "yyyy-MM") === format(mes, "yyyy-MM");
      });

      return {
        data: nomeMes,
        vendas: vendasDoMes.length,
        valor: vendasDoMes.reduce((acc, v) => acc + (v.total || 0), 0),
      };
    });
  }, [vendasConcluidas, dateRange, agrupamento]);

  const metodosPagamento = useMemo(() => {
    const metodos: { [key: string]: number } = {};

    vendasConcluidas.forEach((v) => {
      metodos[v.metodoPagamento] = (metodos[v.metodoPagamento] || 0) + (v.total || 0);
    });

    const total = Object.values(metodos).reduce((acc, val) => acc + val, 0);

    return Object.entries(metodos)
      .map(([name, value]) => ({
        name:
          name === "dinheiro"
            ? "Dinheiro"
            : name === "cartao"
              ? "Cartão"
              : name === "transferencia"
                ? "Transferência"
                : name,
        value: total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0,
        valor: value,
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [vendasConcluidas]);

  const produtosMaisVendidos = useMemo(() => {
    const produtosMap: { [key: string]: { nome: string; quantidade: number; valor: number } } =
      {};

    vendasConcluidas.forEach((venda) => {
      venda.produtos.forEach((produto) => {
        if (!produtosMap[produto.produtoId]) {
          produtosMap[produto.produtoId] = {
            nome: produto.nome,
            quantidade: 0,
            valor: 0,
          };
        }

        produtosMap[produto.produtoId].quantidade += produto.quantidade;
        produtosMap[produto.produtoId].valor += produto.subtotal || 0;
      });
    });

    return Object.values(produtosMap)
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }, [vendasConcluidas]);

  const vendasPorDiaSemana = useMemo(() => {
    const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const valores = new Array(7).fill(0);
    const contagens = new Array(7).fill(0);

    vendasConcluidas.forEach((v) => {
      const data = getVendaDate(v);
      if (!data) return;

      const dia = data.getDay();
      valores[dia] += v.total || 0;
      contagens[dia] += 1;
    });

    return dias.map((dia, index) => ({
      dia,
      valor: valores[index],
      vendas: contagens[index],
      media: contagens[index] > 0 ? valores[index] / contagens[index] : 0,
    }));
  }, [vendasConcluidas]);

  const analiseResumo = useMemo(() => {
    const melhorDia = [...vendasPorDiaSemana].sort((a, b) => b.valor - a.valor)[0];

    const metodoPreferido = metodosPagamento[0]?.name || "-";
    const produtoMaisVendido = produtosMaisVendidos[0]?.nome || "-";

    const periodoAnteriorFim = subDays(startOfDay(dateRange.from), 1);
    const periodoAnteriorInicio = subDays(periodoAnteriorFim, stats.diasNoPeriodo - 1);

    const vendasPeriodoAnterior = vendas.filter((v) => {
      const data = getVendaDate(v);
      if (!data || v.status !== "concluida") return false;

      const vendedorOk = !isVendedor || !vendedorUid || v.vendedorId === vendedorUid;
      return vendedorOk && data >= periodoAnteriorInicio && data <= endOfDay(periodoAnteriorFim);
    });

    const valorPeriodoAnterior = vendasPeriodoAnterior.reduce(
      (acc, v) => acc + (v.total || 0),
      0
    );

    const crescimento =
      valorPeriodoAnterior > 0
        ? ((stats.valorTotal - valorPeriodoAnterior) / valorPeriodoAnterior) * 100
        : stats.valorTotal > 0
          ? 100
          : 0;

    const taxaConversao =
      clientes.length > 0 ? (stats.totalClientes / clientes.length) * 100 : 0;

    return {
      melhorDia: melhorDia?.dia || "-",
      metodoPreferido,
      produtoMaisVendido,
      crescimento,
      taxaConversao,
      valorPeriodoAnterior,
    };
  }, [
    vendas,
    clientes.length,
    vendasPorDiaSemana,
    metodosPagamento,
    produtosMaisVendidos,
    stats.valorTotal,
    stats.totalClientes,
    stats.diasNoPeriodo,
    dateRange.from,
    isVendedor,
    vendedorUid,
  ]);

  const handleExportar = () => {
    if (!canExportData) {
      toast({
        title: "Plano expirado",
        description: "Renove o plano para exportar relatórios.",
        variant: "destructive",
      });
      return;
    }

    const linhas = [
      ["Indicador", "Valor"],
      ["Total de Vendas", String(stats.totalVendas)],
      ["Valor Total", formatarMoeda(stats.valorTotal)],
      ["Ticket Médio", formatarMoeda(stats.ticketMedio)],
      ["Média Diária", formatarMoeda(stats.mediaDiaria)],
      ["Clientes que Compraram", String(stats.totalClientes)],
      ["Taxa de Cancelamento", `${stats.taxaCancelamento.toFixed(1)}%`],
      ["Melhor Dia", analiseResumo.melhorDia],
      ["Produto Mais Vendido", analiseResumo.produtoMaisVendido],
      ["Método Preferido", analiseResumo.metodoPreferido],
      ["Crescimento vs período anterior", `${analiseResumo.crescimento.toFixed(1)}%`],
    ];

    const csv = linhas
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "relatorio-analitico.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Exportação concluída",
      description: "O relatório foi exportado com sucesso.",
    });
  };

  const handleImprimir = () => {
    if (!canExportData) {
      toast({
        title: "Plano expirado",
        description: "Renove o plano para imprimir relatórios.",
        variant: "destructive",
      });
      return;
    }

    window.print();
  };

  const handleRefresh = () => {
    setRefreshing(true);

    setTimeout(() => {
      setRefreshing(false);
      toast({
        title: "Atualizado",
        description: "Dados atualizados com sucesso.",
      });
    }, 900);
  };

  const renderGraficoVendas = () => {
    switch (tipoGrafico) {
      case "linha":
        return (
          <LineChart data={dadosVendasPorPeriodo}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 25% 90%)" />
            <XAxis dataKey="data" fontSize={12} />
            <YAxis yAxisId="left" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" fontSize={12} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "valor") return [formatarMoeda(value), "Valor"];
                return [value, "Vendas"];
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="vendas"
              stroke={COLORS.primary}
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Nº de Vendas"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="valor"
              stroke={COLORS.success}
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Valor (MZN)"
            />
          </LineChart>
        );

      case "area":
        return (
          <AreaChart data={dadosVendasPorPeriodo}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 25% 90%)" />
            <XAxis dataKey="data" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip formatter={(value: number) => formatarMoeda(value)} />
            <Legend />
            <Area
              type="monotone"
              dataKey="valor"
              stroke={COLORS.primary}
              fill={COLORS.primary}
              fillOpacity={0.25}
              name="Valor (MZN)"
            />
          </AreaChart>
        );

      default:
        return (
          <BarChart data={dadosVendasPorPeriodo}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 25% 90%)" />
            <XAxis dataKey="data" fontSize={12} />
            <YAxis yAxisId="left" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" fontSize={12} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "valor") return [formatarMoeda(value), "Valor"];
                return [value, "Vendas"];
              }}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="vendas"
              fill={COLORS.primary}
              radius={[4, 4, 0, 0]}
              name="Nº de Vendas"
            />
            <Bar
              yAxisId="right"
              dataKey="valor"
              fill={COLORS.success}
              radius={[4, 4, 0, 0]}
              name="Valor (MZN)"
            />
          </BarChart>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canViewReports) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-1">
            <span className="font-medium">Relatórios bloqueados</span>
            <span>
              O plano atual ({currentPlan}) está {currentStatus}.
              {typeof daysLeft === "number" && currentPlan === "trial"
                ? ` Dias restantes: ${daysLeft}.`
                : ""}
            </span>
            <span>Renove o plano para voltar a acessar os relatórios.</span>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {blocked && (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-1">
            <span className="font-medium">Modo restrito de relatórios</span>
            <span>
              O plano atual ({currentPlan}) está {currentStatus}.
              {typeof daysLeft === "number" && currentPlan === "trial"
                ? ` Dias restantes: ${daysLeft}.`
                : ""}
            </span>
            <span>Algumas ações como exportar e imprimir podem estar bloqueadas.</span>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios Analíticos</h1>
          <p className="text-sm text-muted-foreground">
            Análise detalhada das vendas e desempenho do negócio
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>

          <Button size="sm" onClick={handleImprimir} disabled={!canExportData}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>

          <Button variant="destructive" size="sm" onClick={handleExportar} disabled={!canExportData}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {isVendedor && (
        <div>
          <Badge variant="outline" className="bg-accent/10">
            Mostrando apenas suas vendas
          </Badge>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={format(dateRange.from, "yyyy-MM-dd")}
                onChange={(e) =>
                  setDateRange((prev) => ({
                    ...prev,
                    from: new Date(e.target.value),
                  }))
                }
              />
            </div>

            <div>
              <Label>Data Final</Label>
              <Input
                type="date"
                value={format(dateRange.to, "yyyy-MM-dd")}
                onChange={(e) =>
                  setDateRange((prev) => ({
                    ...prev,
                    to: new Date(e.target.value),
                  }))
                }
              />
            </div>

            <div>
              <Label>Agrupar por</Label>
              <Select value={agrupamento} onValueChange={(v: Agrupamento) => setAgrupamento(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dia">Dia</SelectItem>
                  <SelectItem value="semana">Semana</SelectItem>
                  <SelectItem value="mes">Mês</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button className="w-full" type="button">
                <Calendar className="mr-2 h-4 w-4" />
                Filtros Ativos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVendas}</div>
            <p className="text-xs text-muted-foreground">No período selecionado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarMoeda(stats.valorTotal)}</div>
            <p className="text-xs text-muted-foreground">{stats.diasNoPeriodo} dias analisados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarMoeda(stats.ticketMedio)}</div>
            <p className="text-xs text-muted-foreground">Por venda</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média Diária</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarMoeda(stats.mediaDiaria)}</div>
            <p className="text-xs text-muted-foreground">Por dia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClientes}</div>
            <p className="text-xs text-muted-foreground">Que compraram</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="vendas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vendas">
            <BarChart3 className="mr-2 h-4 w-4" />
            Vendas
          </TabsTrigger>
          <TabsTrigger value="produtos">
            <Package className="mr-2 h-4 w-4" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="pagamentos">
            <PieChartIcon className="mr-2 h-4 w-4" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="analise">
            <LineChartIcon className="mr-2 h-4 w-4" />
            Análise
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Vendas por Período</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={tipoGrafico === "barras" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTipoGrafico("barras")}
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={tipoGrafico === "linha" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTipoGrafico("linha")}
                  >
                    <LineChartIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={tipoGrafico === "area" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTipoGrafico("area")}
                  >
                    <AreaChartIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                {renderGraficoVendas()}
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vendas por Dia da Semana</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={vendasPorDiaSemana}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 25% 90%)" />
                  <XAxis dataKey="dia" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(value: number) => formatarMoeda(value)} />
                  <Bar dataKey="valor" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="produtos">
          <Card>
            <CardHeader>
              <CardTitle>Produtos Mais Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {produtosMaisVendidos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum dado disponível no período.</p>
                ) : (
                  produtosMaisVendidos.map((produto, index) => (
                    <div key={produto.nome} className="space-y-2">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="font-medium">{produto.nome}</span>
                        <span className="text-muted-foreground">
                          {produto.quantidade} unidades
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(produto.quantidade / produtosMaisVendidos[0].quantidade) * 100}%`,
                            backgroundColor: COLORS.chart[index % COLORS.chart.length],
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Valor: {formatarMoeda(produto.valor)}</span>
                        <span>
                          {(
                            (produto.quantidade /
                              produtosMaisVendidos.reduce((acc, p) => acc + p.quantidade, 0)) *
                            100
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagamentos">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Método de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metodosPagamento}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {metodosPagamento.map((_, i) => (
                        <Cell key={i} fill={COLORS.chart[i % COLORS.chart.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalhamento por Método</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metodosPagamento.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum dado disponível no período.</p>
                  ) : (
                    metodosPagamento.map((metodo, i) => (
                      <div
                        key={metodo.name}
                        className="flex items-center justify-between rounded-lg bg-muted/30 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: COLORS.chart[i % COLORS.chart.length] }}
                          />
                          <span className="font-medium">{metodo.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{metodo.value}%</p>
                          <p className="text-xs text-muted-foreground">
                            {formatarMoeda(metodo.valor || 0)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analise">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Indicadores de Desempenho</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>Taxa de Conversão de Clientes</span>
                      <span className="font-semibold">{analiseResumo.taxaConversao.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(analiseResumo.taxaConversao, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>Crescimento vs período anterior</span>
                      <span
                        className={`font-semibold ${
                          analiseResumo.crescimento >= 0 ? "text-accent" : "text-destructive"
                        }`}
                      >
                        {analiseResumo.crescimento >= 0 ? "+" : ""}
                        {analiseResumo.crescimento.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${
                          analiseResumo.crescimento >= 0 ? "bg-accent" : "bg-destructive"
                        }`}
                        style={{ width: `${Math.min(Math.abs(analiseResumo.crescimento), 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>Taxa de Cancelamento</span>
                      <span className="font-semibold">{stats.taxaCancelamento.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-warning"
                        style={{ width: `${Math.min(stats.taxaCancelamento, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo do Período</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between border-b py-2">
                    <span className="text-muted-foreground">Total de vendas:</span>
                    <span className="font-semibold">{stats.totalVendas}</span>
                  </div>
                  <div className="flex justify-between border-b py-2">
                    <span className="text-muted-foreground">Valor médio por venda:</span>
                    <span className="font-semibold">{formatarMoeda(stats.ticketMedio)}</span>
                  </div>
                  <div className="flex justify-between border-b py-2">
                    <span className="text-muted-foreground">Dia com mais vendas:</span>
                    <span className="font-semibold">{analiseResumo.melhorDia}</span>
                  </div>
                  <div className="flex justify-between border-b py-2">
                    <span className="text-muted-foreground">Produto mais vendido:</span>
                    <span className="font-semibold">{analiseResumo.produtoMaisVendido}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Método preferido:</span>
                    <span className="font-semibold">{analiseResumo.metodoPreferido}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Relatorios;