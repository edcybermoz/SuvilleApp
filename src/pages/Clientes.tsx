import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  UserCircle,
  Phone,
  Mail,
  ShoppingBag,
  Loader2,
  Eye,
  EyeOff,
  TrendingUp,
  RefreshCw,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Users,
  Star,
  BadgeCheck,
  MapPin,
  FileText,
  CreditCard,
  Lock,
} from "lucide-react";
import ClienteModal from "@/components/ClienteModal";
import {
  listenClientes,
  listenClientesPorVendedor,
  deleteCliente,
  Cliente,
} from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { useToast } from "@/components/ui/use-toast";
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
  | "nome"
  | "telefone"
  | "email"
  | "totalCompras"
  | "numeroCompras"
  | "segmento"
  | "status"
  | "origem"
  | "limiteCredito";

type SortDirection = "asc" | "desc";

type QuickFilter =
  | "todos"
  | "ativos"
  | "sem-compras"
  | "vip"
  | "frequentes"
  | "com-email"
  | "sem-email"
  | "inativos"
  | "com-credito";

const ITEMS_PER_PAGE = 8;

const Clientes = () => {
  const { firebaseUser, isAdmin, isVendedor } = useAuth();
  const {
    blocked,
    canManageCustomers,
    currentPlan,
    currentStatus,
    daysLeft,
  } = usePlanAccess();
  const { toast } = useToast();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showAllClients, setShowAllClients] = useState(false);
  const [atualizandoTotais, setAtualizandoTotais] = useState(false);

  const [quickFilter, setQuickFilter] = useState<QuickFilter>("todos");
  const [sortField, setSortField] = useState<SortField>("nome");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);

  const vendedorUid = firebaseUser?.uid ?? null;

  useEffect(() => {
    if (blocked) {
      setClientes([]);
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    setLoading(true);

    if (isAdmin) {
      unsubscribe = listenClientes(
        (clientesData) => {
          setClientes(clientesData);
          setLoading(false);
        },
        () => {
          setClientes([]);
          setLoading(false);
          toast({
            title: "Erro",
            description: "Não foi possível carregar os clientes.",
            variant: "destructive",
          });
        }
      );
    } else if (isVendedor && vendedorUid) {
      if (showAllClients) {
        unsubscribe = listenClientes(
          (clientesData) => {
            setClientes(clientesData);
            setLoading(false);
          },
          () => {
            setClientes([]);
            setLoading(false);
            toast({
              title: "Erro",
              description: "Não foi possível carregar os clientes.",
              variant: "destructive",
            });
          }
        );
      } else {
        unsubscribe = listenClientesPorVendedor(
          vendedorUid,
          (clientesData) => {
            setClientes(clientesData);
            setLoading(false);
          },
          () => {
            setClientes([]);
            setLoading(false);
            toast({
              title: "Erro",
              description: "Não foi possível carregar os seus clientes.",
              variant: "destructive",
            });
          }
        );
      }
    } else {
      setClientes([]);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [blocked, isAdmin, isVendedor, vendedorUid, showAllClients, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase());
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [quickFilter, showAllClients, sortField, sortDirection]);

  const formatarMoeda = (valor: number) =>
    Number(valor || 0).toLocaleString("pt-MZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " MZN";

  const normalizarTexto = (valor?: string | null) => (valor || "").trim().toLowerCase();

  const calcularNumeroCompras = (totalCompras: number) => {
    if (!totalCompras || totalCompras <= 0) return 0;
    if (totalCompras < 1000) return 1;
    return Math.max(1, Math.floor(totalCompras / 1000));
  };

  const getComprasBadgeColor = (totalCompras: number) => {
    if (totalCompras >= 10000) return "bg-green-600 text-white";
    if (totalCompras >= 5000) return "bg-green-500 text-white";
    if (totalCompras >= 1000) return "bg-green-400 text-white";
    if (totalCompras > 0) return "bg-accent/20 text-accent border border-accent/30";
    return "bg-muted text-muted-foreground";
  };

  const getClienteSegmento = (totalCompras: number) => {
    if (totalCompras >= 10000) return "VIP";
    if (totalCompras >= 5000) return "Frequente";
    if (totalCompras > 0) return "Ativo";
    return "Novo";
  };

  const isMeuCliente = (cliente: Cliente) => {
    if (!vendedorUid) return false;
    return cliente.vendedorId === vendedorUid;
  };

  const stats = useMemo(() => {
    const totalClientes = clientes.length;
    const totalCompras = clientes.reduce((acc, c) => acc + (c.totalCompras || 0), 0);
    const mediaCompras = totalClientes > 0 ? totalCompras / totalClientes : 0;

    const clientesComCompras = clientes.filter((c) => (c.totalCompras || 0) > 0).length;
    const clientesSemCompras = clientes.filter((c) => (c.totalCompras || 0) === 0).length;
    const clientesVip = clientes.filter((c) => (c.totalCompras || 0) >= 10000).length;
    const clientesComEmail = clientes.filter((c) => !!c.email?.trim()).length;
    const clientesInativos = clientes.filter((c) => c.status === "inativo").length;
    const clientesComCredito = clientes.filter((c) => (c.limiteCredito || 0) > 0).length;

    const mediaClientesAtivos =
      clientesComCompras > 0
        ? clientes
            .filter((c) => (c.totalCompras || 0) > 0)
            .reduce((acc, c) => acc + (c.totalCompras || 0), 0) / clientesComCompras
        : 0;

    const taxaAtivacao =
      totalClientes > 0 ? Number(((clientesComCompras / totalClientes) * 100).toFixed(1)) : 0;

    return {
      totalClientes,
      totalCompras,
      mediaCompras,
      clientesComCompras,
      clientesSemCompras,
      clientesVip,
      clientesComEmail,
      clientesInativos,
      clientesComCredito,
      mediaClientesAtivos,
      taxaAtivacao,
    };
  }, [clientes]);

  const processedClientes = useMemo(() => {
    let lista = [...clientes];

    if (debouncedSearch) {
      lista = lista.filter((c) => {
        const values = [
          c.nome,
          c.telefone,
          c.email,
          c.id,
          c.nuit,
          c.endereco,
          c.origem,
          c.status,
        ].map(normalizarTexto);

        return values.some((value) => value.includes(debouncedSearch));
      });
    }

    switch (quickFilter) {
      case "ativos":
        lista = lista.filter((c) => (c.totalCompras || 0) > 0);
        break;
      case "sem-compras":
        lista = lista.filter((c) => (c.totalCompras || 0) === 0);
        break;
      case "vip":
        lista = lista.filter((c) => (c.totalCompras || 0) >= 10000);
        break;
      case "frequentes":
        lista = lista.filter((c) => {
          const total = c.totalCompras || 0;
          return total >= 5000 && total < 10000;
        });
        break;
      case "com-email":
        lista = lista.filter((c) => !!c.email?.trim());
        break;
      case "sem-email":
        lista = lista.filter((c) => !c.email?.trim());
        break;
      case "inativos":
        lista = lista.filter((c) => c.status === "inativo");
        break;
      case "com-credito":
        lista = lista.filter((c) => (c.limiteCredito || 0) > 0);
        break;
      default:
        break;
    }

    lista.sort((a, b) => {
      const totalA = a.totalCompras || 0;
      const totalB = b.totalCompras || 0;
      const comprasA = calcularNumeroCompras(totalA);
      const comprasB = calcularNumeroCompras(totalB);
      const segmentoA = getClienteSegmento(totalA);
      const segmentoB = getClienteSegmento(totalB);

      const valueA =
        sortField === "totalCompras"
          ? totalA
          : sortField === "numeroCompras"
            ? comprasA
            : sortField === "segmento"
              ? segmentoA
              : sortField === "limiteCredito"
                ? a.limiteCredito || 0
                : ((a[sortField] || "") as string);

      const valueB =
        sortField === "totalCompras"
          ? totalB
          : sortField === "numeroCompras"
            ? comprasB
            : sortField === "segmento"
              ? segmentoB
              : sortField === "limiteCredito"
                ? b.limiteCredito || 0
                : ((b[sortField] || "") as string);

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
  }, [clientes, debouncedSearch, quickFilter, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(processedClientes.length / ITEMS_PER_PAGE));

  const paginatedClientes = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return processedClientes.slice(start, start + ITEMS_PER_PAGE);
  }, [processedClientes, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDirection("asc");
  };

  const handleAtualizarTotais = async () => {
    if (!isAdmin) {
      toast({
        title: "Permissão negada",
        description: "Apenas administradores podem atualizar os totais.",
        variant: "destructive",
      });
      return;
    }

    if (!canManageCustomers) {
      toast({
        title: "Ação indisponível",
        description: "O seu plano atual não permite alterar dados de clientes.",
        variant: "destructive",
      });
      return;
    }

    setAtualizandoTotais(true);
    try {
      const { executarAtualizacao } = await import("@/scripts/atualizarTotaisClientes");
      const resultado = await executarAtualizacao();

      toast({
        title: "Atualização concluída",
        description: `${resultado.atualizados} clientes atualizados, ${resultado.pulados} já estavam corretos.`,
      });
    } catch {
      toast({
        title: "Erro na atualização",
        description: "Não foi possível atualizar os totais dos clientes.",
        variant: "destructive",
      });
    } finally {
      setAtualizandoTotais(false);
    }
  };

  const handleDeleteClick = (cliente: Cliente) => {
    if (!isAdmin) {
      toast({
        title: "Permissão negada",
        description: "Apenas administradores podem excluir clientes.",
        variant: "destructive",
      });
      return;
    }

    if (!canManageCustomers) {
      toast({
        title: "Ação indisponível",
        description: "O seu plano atual não permite excluir clientes.",
        variant: "destructive",
      });
      return;
    }

    setClienteToDelete(cliente);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!clienteToDelete?.id || !canManageCustomers) return;

    setDeletingId(clienteToDelete.id);

    try {
      await deleteCliente(clienteToDelete.id);
      toast({
        title: "Sucesso",
        description: "Cliente excluído com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Erro ao excluir cliente.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
      setClienteToDelete(null);
    }
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
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Carregando clientes...</p>
          </div>
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
            <span className="font-medium">Acesso restrito para clientes</span>
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
          <h1 className="text-2xl font-bold text-foreground">Gestão de Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {isVendedor
              ? "Gerencie seus clientes com controlo e organização"
              : "Gerencie todos os clientes com visão comercial mais completa"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!blocked && isVendedor && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllClients((prev) => !prev)}
            >
              {showAllClients ? (
                <EyeOff className="mr-2 h-4 w-4" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              {showAllClients ? "Só meus clientes" : "Ver todos"}
            </Button>
          )}

          {!blocked && (
            <Button
              size="sm"
              disabled={!canManageCustomers}
              onClick={() => {
                setSelected(null);
                setOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          )}

          {!blocked && isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAtualizarTotais}
              disabled={!canManageCustomers || atualizandoTotais}
            >
              {atualizandoTotais ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {atualizandoTotais ? "Atualizando..." : "Atualizar Totais"}
            </Button>
          )}
        </div>
      </div>

      <div className={`space-y-6 ${blocked ? "opacity-80" : ""}`}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {isVendedor ? "Meus Clientes" : "Total de Clientes"}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClientes}</div>
              <p className="text-xs text-muted-foreground">
                {stats.clientesSemCompras} sem compras
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total em Compras</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{formatarMoeda(stats.totalCompras)}</div>
              <p className="text-xs text-muted-foreground">Valor total comprado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Média por Cliente</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{formatarMoeda(stats.mediaCompras)}</div>
              <p className="text-xs text-muted-foreground">
                Ativos: {formatarMoeda(stats.mediaClientesAtivos)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
              <UserCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{stats.clientesComCompras}</div>
              <p className="text-xs text-muted-foreground">
                Taxa de ativação: {stats.taxaAtivacao}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes VIP</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.clientesVip}</div>
              <p className="text-xs text-muted-foreground">
                {stats.clientesComCredito} com crédito
              </p>
            </CardContent>
          </Card>
        </div>

        {!blocked && (
          <div className="flex flex-col gap-3 rounded-lg bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por nome, telefone, email, NUIT ou origem..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[
                  ["todos", "Todos"],
                  ["ativos", "Ativos"],
                  ["sem-compras", "Sem compras"],
                  ["vip", "VIP"],
                  ["frequentes", "Frequentes"],
                  ["com-email", "Com email"],
                  ["sem-email", "Sem email"],
                  ["inativos", "Inativos"],
                  ["com-credito", "Com crédito"],
                ].map(([value, label]) => (
                  <Badge
                    key={value}
                    variant={quickFilter === value ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setQuickFilter(value as QuickFilter)}
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Exibindo <span className="font-medium text-foreground">{processedClientes.length}</span>{" "}
              {processedClientes.length === 1 ? "cliente" : "clientes"}
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-lg bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">{renderSortButton("Cliente", "nome")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Contato", "telefone")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Email", "email")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Total Compras", "totalCompras")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Nº Compras", "numeroCompras")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Segmento", "segmento")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Status", "status")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Origem", "origem")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Crédito", "limiteCredito")}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>

              <tbody>
                {paginatedClientes.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Users className="h-8 w-8 opacity-50" />
                        <p className="font-medium">
                          {search || quickFilter !== "todos"
                            ? "Nenhum cliente encontrado"
                            : "Nenhum cliente cadastrado"}
                        </p>
                        <p className="text-xs">Ajuste os filtros ou cadastre um novo cliente.</p>
                      </div>
                    </td>
                  </tr>
                )}

                {paginatedClientes.map((cliente) => {
                  const totalCompras = cliente.totalCompras || 0;
                  const numeroCompras = calcularNumeroCompras(totalCompras);
                  const badgeColor = getComprasBadgeColor(totalCompras);
                  const segmento = getClienteSegmento(totalCompras);
                  const meuCliente = isMeuCliente(cliente);

                  return (
                    <tr
                      key={cliente.id}
                      className="border-b transition-colors hover:bg-muted/30 last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <UserCircle className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{cliente.nome}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {cliente.nuit && (
                                <span className="inline-flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  {cliente.nuit}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{cliente.telefone}</span>
                          </div>
                          {cliente.endereco && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{cliente.endereco}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {cliente.email ? (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{cliente.email}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Não informado</span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-semibold">{formatarMoeda(totalCompras)}</td>

                      <td className="px-4 py-3">
                        <span
                          className={`flex w-fit items-center justify-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ${badgeColor}`}
                        >
                          {totalCompras > 0 && <ShoppingBag className="h-3 w-3" />}
                          {numeroCompras} {numeroCompras === 1 ? "compra" : "compras"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <Badge variant="outline">{segmento}</Badge>
                          {isVendedor && (
                            meuCliente ? (
                              <div className="flex items-center gap-1 text-xs text-accent">
                                <BadgeCheck className="h-3 w-3" />
                                Meu cliente
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">Global</div>
                            )
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant={cliente.status === "inativo" ? "secondary" : "outline"}>
                          {cliente.status || "ativo"}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-sm capitalize">{cliente.origem || "balcao"}</span>
                      </td>

                      <td className="px-4 py-3">
                        {(cliente.limiteCredito || 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 text-sm font-medium">
                            <CreditCard className="h-3 w-3 text-muted-foreground" />
                            {formatarMoeda(cliente.limiteCredito || 0)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem crédito</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {!blocked ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!canManageCustomers}
                              onClick={() => {
                                setSelected(cliente);
                                setOpen(true);
                              }}
                              title="Editar cliente"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteClick(cliente)}
                                disabled={!canManageCustomers || deletingId === cliente.id}
                                title="Excluir cliente"
                              >
                                {deletingId === cliente.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Eye className="h-3 w-3" />
                            Apenas visualização
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!blocked && processedClientes.length > 0 && (
            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Página <span className="font-medium text-foreground">{page}</span> de{" "}
                <span className="font-medium text-foreground">{totalPages}</span>
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Anterior
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                >
                  Próxima
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {!blocked && (
        <ClienteModal
          open={open}
          onClose={() => {
            setOpen(false);
            setSelected(null);
          }}
          cliente={selected}
          vendedorId={isVendedor ? vendedorUid ?? undefined : undefined}
          clientesExistentes={clientes}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{clienteToDelete?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clientes;