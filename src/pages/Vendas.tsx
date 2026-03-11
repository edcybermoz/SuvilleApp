import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  Eye,
  Printer,
  XCircle,
  Loader2,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  CalendarDays,
  BadgeDollarSign,
  Lock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import {
  listenVendas,
  listenVendasPorVendedor,
  updateVendaStatus,
  type Venda,
} from "@/lib/store";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

type SortField =
  | "createdAt"
  | "clienteNome"
  | "total"
  | "status"
  | "metodoPagamento";

type SortDirection = "asc" | "desc";
type QuickFilter = "todos" | "concluida" | "pendente" | "cancelada" | "hoje";
type PaymentFilter = "todos" | "dinheiro" | "cartao" | "transferencia";

const ITEMS_PER_PAGE = 8;

const Vendas = () => {
  const { firebaseUser, isAdmin, isVendedor } = useAuth();
  const { blocked, canCreateSales, currentPlan, currentStatus, daysLeft } = usePlanAccess();
  const { toast } = useToast();

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);

  const [cancelandoVenda, setCancelandoVenda] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [vendaToCancel, setVendaToCancel] = useState<Venda | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");

  const [quickFilter, setQuickFilter] = useState<QuickFilter>("todos");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("todos");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);

  const vendedorUid = firebaseUser?.uid ?? null;

  useEffect(() => {
    if (blocked) {
      setVendas([]);
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    setLoading(true);

    if (isAdmin) {
      unsubscribe = listenVendas(
        (vendasData) => {
          setVendas(vendasData);
          setLoading(false);
        },
        () => {
          setVendas([]);
          setLoading(false);
          toast({
            title: "Erro",
            description: "Não foi possível carregar as vendas.",
            variant: "destructive",
          });
        }
      );
    } else if (isVendedor) {
      if (!vendedorUid) {
        setVendas([]);
        setLoading(false);
        return;
      }

      unsubscribe = listenVendasPorVendedor(
        vendedorUid,
        (vendasData) => {
          setVendas(vendasData);
          setLoading(false);
        },
        () => {
          setVendas([]);
          setLoading(false);
          toast({
            title: "Erro",
            description: "Não foi possível carregar as suas vendas.",
            variant: "destructive",
          });
        }
      );
    } else {
      setVendas([]);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [blocked, isAdmin, isVendedor, vendedorUid, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [quickFilter, paymentFilter, sortField, sortDirection]);

  const formatarData = (timestamp?: Timestamp | null) => {
    if (!timestamp) return "Data não disponível";

    try {
      const date = timestamp.toDate();
      return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  const formatarMoeda = (valor: number) =>
    Number(valor || 0).toLocaleString("pt-MZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " MZN";

  const getTimestampMs = (timestamp?: Timestamp | null) => {
    try {
      return timestamp?.toDate()?.getTime() ?? 0;
    } catch {
      return 0;
    }
  };

  const stats = useMemo(() => {
    const concluidas = vendas.filter((v) => v.status === "concluida");
    const pendentes = vendas.filter((v) => v.status === "pendente");
    const canceladas = vendas.filter((v) => v.status === "cancelada");
    const hoje = vendas.filter((v) => {
      try {
        return v.createdAt ? isToday(v.createdAt.toDate()) : false;
      } catch {
        return false;
      }
    });

    const valorTotal = concluidas.reduce((acc, v) => acc + (v.total || 0), 0);
    const ticketMedio = concluidas.length > 0 ? valorTotal / concluidas.length : 0;
    const taxaConversao =
      vendas.length > 0 ? Number(((concluidas.length / vendas.length) * 100).toFixed(1)) : 0;

    return {
      total: vendas.length,
      concluidas: concluidas.length,
      pendentes: pendentes.length,
      canceladas: canceladas.length,
      hoje: hoje.length,
      valorTotal,
      ticketMedio,
      taxaConversao,
    };
  }, [vendas]);

  const vendasProcessadas = useMemo(() => {
    let lista = [...vendas];

    if (debouncedSearch) {
      lista = lista.filter((v) => {
        const cliente = v.clienteNome?.toLowerCase?.() ?? "";
        const id = v.id?.toLowerCase?.() ?? "";
        const valor = String(v.total ?? "");
        const metodo = v.metodoPagamento?.toLowerCase?.() ?? "";
        const status = v.status?.toLowerCase?.() ?? "";
        const motivo = v.motivoCancelamento?.toLowerCase?.() ?? "";

        return (
          cliente.includes(debouncedSearch) ||
          id.includes(debouncedSearch) ||
          valor.includes(debouncedSearch) ||
          metodo.includes(debouncedSearch) ||
          status.includes(debouncedSearch) ||
          motivo.includes(debouncedSearch)
        );
      });
    }

    if (quickFilter !== "todos") {
      if (quickFilter === "hoje") {
        lista = lista.filter((v) => {
          try {
            return v.createdAt ? isToday(v.createdAt.toDate()) : false;
          } catch {
            return false;
          }
        });
      } else {
        lista = lista.filter((v) => v.status === quickFilter);
      }
    }

    if (paymentFilter !== "todos") {
      lista = lista.filter((v) => v.metodoPagamento === paymentFilter);
    }

    lista.sort((a, b) => {
      const valueA =
        sortField === "createdAt"
          ? getTimestampMs(a.createdAt)
          : sortField === "total"
            ? a.total ?? 0
            : ((a[sortField] ?? "") as string | number);

      const valueB =
        sortField === "createdAt"
          ? getTimestampMs(b.createdAt)
          : sortField === "total"
            ? b.total ?? 0
            : ((b[sortField] ?? "") as string | number);

      if (typeof valueA === "string" && typeof valueB === "string") {
        return sortDirection === "asc"
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }

      return sortDirection === "asc"
        ? Number(valueA) - Number(valueB)
        : Number(valueB) - Number(valueA);
    });

    return lista;
  }, [vendas, debouncedSearch, quickFilter, paymentFilter, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(vendasProcessadas.length / ITEMS_PER_PAGE));

  const vendasPaginadas = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return vendasProcessadas.slice(start, start + ITEMS_PER_PAGE);
  }, [vendasProcessadas, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      concluida: {
        class: "bg-green-500/20 text-green-600 border-green-500/30",
        label: "Concluída",
        icon: "✅",
      },
      pendente: {
        class: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
        label: "Pendente",
        icon: "⏳",
      },
      cancelada: {
        class: "bg-red-500/20 text-red-600 border-red-500/30",
        label: "Cancelada",
        icon: "❌",
      },
    } as const;

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;

    return (
      <span className={`flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.class}`}>
        <span>{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const getMetodoPagamentoLabel = (metodo: string) => {
    if (metodo === "dinheiro") return "Dinheiro";
    if (metodo === "cartao") return "Cartão";
    return "Transferência";
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection(field === "createdAt" ? "desc" : "asc");
  };

  const renderSortButton = (label: string, field: SortField) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      className="inline-flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}
      <ArrowUpDown className="h-3.5 w-3.5" />
    </button>
  );

  const handleVerDetalhes = (venda: Venda) => {
    setVendaSelecionada(venda);
    setDialogAberto(true);
  };

  const handleCancelarClick = (venda: Venda) => {
    if (!canCreateSales) {
      toast({
        title: "Acesso restrito",
        description: "O seu plano atual não permite alterar vendas.",
        variant: "destructive",
      });
      return;
    }

    if (isVendedor && venda.status !== "pendente") {
      toast({
        title: "Permissão negada",
        description: "Vendedores só podem cancelar vendas pendentes.",
        variant: "destructive",
      });
      return;
    }

    setMotivoCancelamento("");
    setVendaToCancel(venda);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!vendaToCancel?.id || !canCreateSales) return;

    if (isVendedor && !motivoCancelamento.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo do cancelamento.",
        variant: "destructive",
      });
      return;
    }

    setCancelandoVenda(vendaToCancel.id);

    try {
      await updateVendaStatus(vendaToCancel.id, "cancelada", motivoCancelamento.trim());

      toast({
        title: "Sucesso",
        description: "Venda cancelada com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Erro ao cancelar venda.",
        variant: "destructive",
      });
    } finally {
      setCancelandoVenda(null);
      setCancelDialogOpen(false);
      setVendaToCancel(null);
      setMotivoCancelamento("");
    }
  };

  const handleImprimirRecibo = (venda: Venda) => {
    if (isVendedor && venda.vendedorId !== vendedorUid) {
      toast({
        title: "Permissão negada",
        description: "Você só pode imprimir recibos das suas próprias vendas.",
        variant: "destructive",
      });
      return;
    }

    setVendaSelecionada(venda);
    setDialogAberto(true);
    setTimeout(() => window.print(), 150);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-28 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="mb-2 h-8 w-20 rounded bg-muted" />
                <div className="h-3 w-24 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {blocked && (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-1">
            <span className="font-medium">Acesso restrito para vendas</span>
            <span>
              O plano atual ({currentPlan}) está {currentStatus}.
              {typeof daysLeft === "number" && currentPlan === "trial"
                ? ` Dias restantes: ${daysLeft}.`
                : ""}
            </span>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Vendas</h1>
          <p className="text-sm text-muted-foreground">
            {isVendedor ? "Gerencie suas vendas com mais controlo" : "Gerencie todas as vendas"}
          </p>
        </div>

        {!blocked && (
          <Link to="/vendas/nova">
            <Button size="sm" disabled={!canCreateSales}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Venda
            </Button>
          </Link>
        )}
      </div>

      <div className={`space-y-6 ${blocked ? "opacity-80" : ""}`}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-600">
                  {stats.concluidas} concluídas
                </Badge>
                <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-600">
                  {stats.pendentes} pendentes
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-accent">{formatarMoeda(stats.valorTotal)}</div>
              <p className="mt-1 text-xs text-muted-foreground">Em vendas concluídas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-primary">{formatarMoeda(stats.ticketMedio)}</div>
              <p className="mt-1 text-xs text-muted-foreground">Por venda concluída</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas de Hoje</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.hoje}</div>
              <p className="mt-1 text-xs text-muted-foreground">Registadas hoje</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversão</CardTitle>
              <BadgeDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.taxaConversao}%</div>
              <p className="mt-1 text-xs text-muted-foreground">{stats.canceladas} canceladas</p>
            </CardContent>
          </Card>
        </div>

        {!blocked && (
          <div className="space-y-3 rounded-lg bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por cliente, ID, valor, status ou pagamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={quickFilter === "todos" ? "default" : "outline"} className="cursor-pointer" onClick={() => setQuickFilter("todos")}>Todos</Badge>
                <Badge variant={quickFilter === "concluida" ? "default" : "outline"} className="cursor-pointer" onClick={() => setQuickFilter("concluida")}><Filter className="mr-1 h-3 w-3" />Concluídas</Badge>
                <Badge variant={quickFilter === "pendente" ? "default" : "outline"} className="cursor-pointer" onClick={() => setQuickFilter("pendente")}>Pendentes</Badge>
                <Badge variant={quickFilter === "cancelada" ? "default" : "outline"} className="cursor-pointer" onClick={() => setQuickFilter("cancelada")}>Canceladas</Badge>
                <Badge variant={quickFilter === "hoje" ? "default" : "outline"} className="cursor-pointer" onClick={() => setQuickFilter("hoje")}>Hoje</Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={paymentFilter === "todos" ? "default" : "outline"} className="cursor-pointer" onClick={() => setPaymentFilter("todos")}>Pagamento: todos</Badge>
              <Badge variant={paymentFilter === "dinheiro" ? "default" : "outline"} className="cursor-pointer" onClick={() => setPaymentFilter("dinheiro")}>Dinheiro</Badge>
              <Badge variant={paymentFilter === "cartao" ? "default" : "outline"} className="cursor-pointer" onClick={() => setPaymentFilter("cartao")}>Cartão</Badge>
              <Badge variant={paymentFilter === "transferencia" ? "default" : "outline"} className="cursor-pointer" onClick={() => setPaymentFilter("transferencia")}>Transferência</Badge>
            </div>

            <div className="text-sm text-muted-foreground">
              Exibindo <span className="font-medium text-foreground">{vendasProcessadas.length}</span>{" "}
              {vendasProcessadas.length === 1 ? "venda" : "vendas"}
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-lg bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Cliente", "clienteNome")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Data", "createdAt")}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Produtos</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Total", "total")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Pagamento", "metodoPagamento")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Status", "status")}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>

              <tbody>
                {vendasPaginadas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <CalendarDays className="h-8 w-8 opacity-50" />
                        <p className="font-medium">Nenhuma venda encontrada</p>
                      </div>
                    </td>
                  </tr>
                )}

                {vendasPaginadas.map((venda) => (
                  <tr key={venda.id} className="border-b transition-colors hover:bg-muted/30 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{venda.id ? `${venda.id.slice(0, 8)}...` : "-"}</td>
                    <td className="px-4 py-3 font-medium">{venda.clienteNome}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatarData(venda.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-1 text-xs">
                        {venda.produtos.length} {venda.produtos.length === 1 ? "item" : "itens"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatarMoeda(venda.total)}</td>
                    <td className="px-4 py-3">{getMetodoPagamentoLabel(venda.metodoPagamento)}</td>
                    <td className="px-4 py-3">{getStatusBadge(venda.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleVerDetalhes(venda)} title="Ver detalhes">
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleImprimirRecibo(venda)}
                          title="Imprimir recibo"
                          disabled={venda.status === "cancelada"}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>

                        {!blocked && venda.status !== "cancelada" && venda.status !== "concluida" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleCancelarClick(venda)}
                            disabled={!canCreateSales || cancelandoVenda === venda.id}
                            title="Cancelar venda"
                          >
                            {cancelandoVenda === venda.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!blocked && vendasProcessadas.length > 0 && (
            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Página <span className="font-medium text-foreground">{page}</span> de{" "}
                <span className="font-medium text-foreground">{totalPages}</span>
              </p>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Anterior
                </Button>

                <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page === totalPages}>
                  Próxima
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Venda</DialogTitle>
            <DialogDescription>Informações completas da venda selecionada</DialogDescription>
          </DialogHeader>

          {vendaSelecionada && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 rounded-lg bg-muted/30 p-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">ID da Venda</p>
                  <p className="font-mono text-sm">{vendaSelecionada.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p>{formatarData(vendaSelecionada.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{vendaSelecionada.clienteNome}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div>{getStatusBadge(vendaSelecionada.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pagamento</p>
                  <p>{getMetodoPagamentoLabel(vendaSelecionada.metodoPagamento)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Itens</p>
                  <p>{vendaSelecionada.produtos.length}</p>
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold">Produtos</h3>
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="py-2 text-left">Produto</th>
                      <th className="py-2 text-right">Qtd</th>
                      <th className="py-2 text-right">Preço Unit.</th>
                      <th className="py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendaSelecionada.produtos.map((produto, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="py-2">{produto.nome}</td>
                        <td className="py-2 text-right">{produto.quantidade}</td>
                        <td className="py-2 text-right">{formatarMoeda(produto.precoUnitario)}</td>
                        <td className="py-2 text-right font-medium">{formatarMoeda(produto.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>{formatarMoeda(vendaSelecionada.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IVA:</span>
                    <span>{formatarMoeda(vendaSelecionada.iva)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Desconto:</span>
                    <span>- {formatarMoeda(vendaSelecionada.desconto)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">{formatarMoeda(vendaSelecionada.total)}</span>
                  </div>
                </div>

                {vendaSelecionada.metodoPagamento === "dinheiro" && (
                  <div className="mt-4 rounded-lg bg-muted/30 p-3">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Valor Recebido:</span>{" "}
                      <span className="font-medium">{formatarMoeda(vendaSelecionada.valorRecebido || 0)}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Troco:</span>{" "}
                      <span className="font-medium text-green-600">{formatarMoeda(vendaSelecionada.troco || 0)}</span>
                    </p>
                  </div>
                )}

                {vendaSelecionada.motivoCancelamento && (
                  <div className="mt-4 rounded-lg bg-destructive/10 p-3">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Motivo do cancelamento:</span>{" "}
                      <span className="font-medium">{vendaSelecionada.motivoCancelamento}</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogAberto(false)}>
                  Fechar
                </Button>
                <Button
                  onClick={() => handleImprimirRecibo(vendaSelecionada)}
                  disabled={vendaSelecionada.status === "cancelada"}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir Recibo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cancelamento</AlertDialogTitle>
            <AlertDialogDescription>
              {isVendedor ? (
                <div className="space-y-4">
                  <p>
                    Tem certeza que deseja cancelar esta venda?
                    <br />
                    <span className="text-sm text-destructive">Esta ação não pode ser desfeita.</span>
                  </p>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Motivo do cancelamento *</label>
                    <Input
                      placeholder="Digite o motivo do cancelamento..."
                      value={motivoCancelamento}
                      onChange={(e) => setMotivoCancelamento(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              ) : (
                "Tem certeza que deseja cancelar esta venda? Esta ação não pode ser desfeita."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Vendas;