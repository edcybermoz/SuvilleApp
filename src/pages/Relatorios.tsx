// src/pages/Relatorios.tsx
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
  LineChart as LineChartIcon
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
  AreaChart, // CORRIGIDO: importar AreaChart em vez de Area
  Area,
  Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { listenVendas, listenProdutos, listenClientes, Venda, Produto, Cliente } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

const COLORS = {
  primary: "hsl(210, 80%, 50%)",
  success: "hsl(160, 55%, 42%)",
  warning: "hsl(40, 90%, 55%)",
  danger: "hsl(0, 70%, 55%)",
  info: "hsl(280, 60%, 55%)",
  chart: ["hsl(210, 80%, 50%)", "hsl(160, 55%, 42%)", "hsl(40, 90%, 55%)", "hsl(280, 60%, 55%)", "hsl(0, 70%, 55%)"]
};

interface DateRange {
  from: Date;
  to: Date;
}

const Relatorios = () => {
  const { toast } = useToast();
  const { userData, isAdmin, isVendedor } = useAuth();
  const [loading, setLoading] = useState(false);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [tipoGrafico, setTipoGrafico] = useState<"barras" | "linha" | "area">("barras");
  const [agrupamento, setAgrupamento] = useState<"dia" | "semana" | "mes">("dia");

  useEffect(() => {
    const unsubVendas = listenVendas(setVendas);
    const unsubProdutos = listenProdutos(setProdutos);
    const unsubClientes = listenClientes(setClientes);

    return () => {
      unsubVendas();
      unsubProdutos();
      unsubClientes();
    };
  }, []);

  const vendasFiltradas = useMemo(() => {
    let vendasPeriodo = vendas.filter(venda => {
      if (!venda.createdAt) return false;
      const dataVenda = venda.createdAt.toDate();
      return dataVenda >= dateRange.from && dataVenda <= dateRange.to;
    });

    if (isVendedor && userData?.id) {
      vendasPeriodo = vendasPeriodo.filter(v => v.vendedorId === userData.id);
    }

    return vendasPeriodo;
  }, [vendas, dateRange, isVendedor, userData?.id]);

  const stats = useMemo(() => {
    const vendasConcluidas = vendasFiltradas.filter(v => v.status === "concluida");
    
    const totalVendas = vendasConcluidas.length;
    const valorTotal = vendasConcluidas.reduce((acc, v) => acc + v.total, 0);
    const totalClientes = new Set(vendasConcluidas.map(v => v.clienteId)).size;
    const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;
    
    const diasNoPeriodo = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const mediaDiaria = diasNoPeriodo > 0 ? valorTotal / diasNoPeriodo : 0;

    return {
      totalVendas,
      valorTotal,
      totalClientes,
      ticketMedio,
      mediaDiaria,
      diasNoPeriodo
    };
  }, [vendasFiltradas, dateRange]);

  const dadosVendasPorPeriodo = useMemo(() => {
    const dias = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    
    if (agrupamento === "dia") {
      return dias.map(dia => {
        const vendasDoDia = vendasFiltradas.filter(v => {
          if (!v.createdAt) return false;
          const dataVenda = v.createdAt.toDate();
          return format(dataVenda, 'yyyy-MM-dd') === format(dia, 'yyyy-MM-dd');
        });

        const vendasConcluidas = vendasDoDia.filter(v => v.status === "concluida");
        
        return {
          data: format(dia, 'dd/MM', { locale: ptBR }),
          vendas: vendasConcluidas.length,
          valor: vendasConcluidas.reduce((acc, v) => acc + v.total, 0),
          diaSemana: format(dia, 'EEE', { locale: ptBR })
        };
      });
    }

    return [];
  }, [vendasFiltradas, dateRange, agrupamento]);

  const metodosPagamento = useMemo(() => {
    const metodos: { [key: string]: number } = {};
    
    vendasFiltradas
      .filter(v => v.status === "concluida")
      .forEach(v => {
        metodos[v.metodoPagamento] = (metodos[v.metodoPagamento] || 0) + v.total;
      });

    const total = Object.values(metodos).reduce((acc, val) => acc + val, 0);

    return Object.entries(metodos).map(([name, value]) => ({
      name: name === "dinheiro" ? "Dinheiro" : 
            name === "cartao" ? "Cartão" : 
            name === "transferencia" ? "Transferência" : name,
      value: Number((value / total * 100).toFixed(1)),
      valor: value
    }));
  }, [vendasFiltradas]);

  const produtosMaisVendidos = useMemo(() => {
    const produtosMap: { [key: string]: { nome: string; quantidade: number; valor: number } } = {};

    vendasFiltradas
      .filter(v => v.status === "concluida")
      .forEach(venda => {
        venda.produtos.forEach(produto => {
          if (!produtosMap[produto.produtoId]) {
            produtosMap[produto.produtoId] = {
              nome: produto.nome,
              quantidade: 0,
              valor: 0
            };
          }
          produtosMap[produto.produtoId].quantidade += produto.quantidade;
          produtosMap[produto.produtoId].valor += produto.subtotal;
        });
      });

    return Object.values(produtosMap)
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }, [vendasFiltradas]);

  const vendasPorDiaSemana = useMemo(() => {
    const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const valores = new Array(7).fill(0);
    const contagens = new Array(7).fill(0);

    vendasFiltradas
      .filter(v => v.status === "concluida")
      .forEach(v => {
        if (v.createdAt) {
          const dia = v.createdAt.toDate().getDay();
          valores[dia] += v.total;
          contagens[dia] += 1;
        }
      });

    return dias.map((dia, index) => ({
      dia,
      valor: valores[index],
      vendas: contagens[index],
      media: contagens[index] > 0 ? valores[index] / contagens[index] : 0
    }));
  }, [vendasFiltradas]);

  const handleExportar = () => {
    toast({
      title: "Exportando...",
      description: "Seu relatório está sendo gerado."
    });
  };

  const handleImprimir = () => {
    window.print();
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Atualizado",
        description: "Dados atualizados com sucesso."
      });
    }, 1000);
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString("pt-MZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " MZN";
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
              formatter={(value: any, name: string) => {
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
            <Tooltip 
              formatter={(value: any) => formatarMoeda(value)}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="valor" 
              stroke={COLORS.primary} 
              fill={COLORS.primary} 
              fillOpacity={0.3}
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
              formatter={(value: any, name: string) => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatórios Analíticos</h1>
          <p className="text-sm text-muted-foreground">
            Análise detalhada das vendas e desempenho do negócio
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button size="sm" onClick={handleImprimir}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          <Button variant="destructive" size="sm" onClick={handleExportar}>
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>

      {isVendedor && (
        <div className="mb-4">
          <Badge variant="outline" className="bg-accent/10">
            Mostrando apenas suas vendas
          </Badge>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Data Inicial</Label>
              <Input 
                type="date" 
                value={format(dateRange.from, 'yyyy-MM-dd')}
                onChange={(e) => setDateRange(prev => ({ 
                  ...prev, 
                  from: new Date(e.target.value) 
                }))}
              />
            </div>
            <div>
              <Label>Data Final</Label>
              <Input 
                type="date"
                value={format(dateRange.to, 'yyyy-MM-dd')}
                onChange={(e) => setDateRange(prev => ({ 
                  ...prev, 
                  to: new Date(e.target.value) 
                }))}
              />
            </div>
            <div>
              <Label>Agrupar por</Label>
              <Select value={agrupamento} onValueChange={(v: any) => setAgrupamento(v)}>
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
              <Button className="w-full">
                <Calendar className="mr-2 h-4 w-4" />
                Aplicar Filtros
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
            <p className="text-xs text-muted-foreground">
              No período selecionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarMoeda(stats.valorTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.diasNoPeriodo} dias analisados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarMoeda(stats.ticketMedio)}</div>
            <p className="text-xs text-muted-foreground">
              Por venda
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média Diária</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarMoeda(stats.mediaDiaria)}</div>
            <p className="text-xs text-muted-foreground">
              Por dia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClientes}</div>
            <p className="text-xs text-muted-foreground">
              Que compraram
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="vendas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vendas">
            <BarChart3 className="h-4 w-4 mr-2" />
            Vendas
          </TabsTrigger>
          <TabsTrigger value="produtos">
            <Package className="h-4 w-4 mr-2" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="pagamentos">
            <PieChartIcon className="h-4 w-4 mr-2" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="analise">
            <LineChartIcon className="h-4 w-4 mr-2" />
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
                    <AreaChart className="h-4 w-4" /> {/* CORRIGIDO: usar AreaChartIcon */}
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
                  <Tooltip 
                    formatter={(value: any) => formatarMoeda(value)}
                  />
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
                {produtosMaisVendidos.map((produto, index) => (
                  <div key={produto.nome} className="space-y-2">
                    <div className="flex justify-between text-sm">
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
                          backgroundColor: COLORS.chart[index % COLORS.chart.length]
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Valor: {formatarMoeda(produto.valor)}</span>
                      <span>{(produto.quantidade / produtosMaisVendidos.reduce((acc, p) => acc + p.quantidade, 0) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
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
                    <Tooltip 
                      formatter={(value: any) => `${value}%`}
                    />
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
                  {metodosPagamento.map((metodo, i) => (
                    <div key={metodo.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
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
                  ))}
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
                    <div className="flex justify-between text-sm mb-1">
                      <span>Taxa de Conversão</span>
                      <span className="font-semibold">68%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: '68%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Crescimento Mensal</span>
                      <span className="font-semibold text-accent">+12%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-accent" style={{ width: '12%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Satisfação do Cliente</span>
                      <span className="font-semibold">4.5/5</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-warning" style={{ width: '90%' }} />
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
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Total de vendas:</span>
                    <span className="font-semibold">{stats.totalVendas}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Valor médio por venda:</span>
                    <span className="font-semibold">{formatarMoeda(stats.ticketMedio)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Dia com mais vendas:</span>
                    <span className="font-semibold">Sexta-feira</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Produto mais vendido:</span>
                    <span className="font-semibold">{produtosMaisVendidos[0]?.nome || "-"}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Método preferido:</span>
                    <span className="font-semibold">{metodosPagamento[0]?.name || "-"}</span>
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