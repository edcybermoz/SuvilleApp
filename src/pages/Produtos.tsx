import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  TrendingUp,
  AlertCircle,
  Loader2,
  Eye,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  BarChart3,
  Building2,
  Lock,
} from "lucide-react";
import ProdutoModal from "@/components/ProdutoModal";
import { listenProdutos, deleteProduto, Produto } from "@/lib/store";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

type SortField =
  | "nome"
  | "categoria"
  | "fornecedor"
  | "marca"
  | "sku"
  | "precoCompra"
  | "precoVenda"
  | "stock"
  | "stockMinimo"
  | "stockMaximo"
  | "estado"
  | "margem"
  | "valorTotal";

type SortDirection = "asc" | "desc";
type QuickFilter =
  | "todos"
  | "baixo-stock"
  | "sem-stock"
  | "alta-margem"
  | "excesso-stock"
  | "inativos";

const ITEMS_PER_PAGE = 8;

const Produtos = () => {
  const { isAdmin, isVendedor } = useAuth();
  const {
    blocked,
    canManageProducts,
    currentPlan,
    currentStatus,
    daysLeft,
  } = usePlanAccess();
  const { toast } = useToast();

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(true);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [produtoToDelete, setProdutoToDelete] = useState<Produto | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [quickFilter, setQuickFilter] = useState<QuickFilter>("todos");
  const [sortField, setSortField] = useState<SortField>("nome");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (blocked) {
      setProdutos([]);
      setLoading(false);
      return;
    }

    const unsubscribe = listenProdutos(
      (produtosData) => {
        setProdutos(produtosData);
        setLoading(false);
      },
      () => {
        setProdutos([]);
        setLoading(false);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os produtos.",
          variant: "destructive",
        });
      }
    );

    return () => unsubscribe();
  }, [blocked, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase());
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const formatarMoeda = (valor: number) => {
    return (
      Number(valor || 0).toLocaleString("pt-MZ", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " MZN"
    );
  };

  const calcularMargem = (compra: number, venda: number) => {
    if (compra <= 0) return 0;
    return Number((((venda - compra) / compra) * 100).toFixed(1));
  };

  const getStockStatus = (produto: Produto) => {
    const stock = produto.stock || 0;
    const minimo = produto.stockMinimo || 0;
    const maximo = produto.stockMaximo || 0;

    if (stock === 0) return "sem-stock";
    if (minimo > 0 && stock <= minimo) return "baixo-stock";
    if (maximo > 0 && stock > maximo) return "excesso-stock";
    return "normal";
  };

  const stats = useMemo(() => {
    const totalProdutos = produtos.length;
    const totalStock = produtos.reduce((acc, p) => acc + (p.stock || 0), 0);
    const valorTotalEstoque = produtos.reduce(
      (acc, p) => acc + (p.precoCompra || 0) * (p.stock || 0),
      0
    );
    const valorTotalVenda = produtos.reduce(
      (acc, p) => acc + (p.precoVenda || 0) * (p.stock || 0),
      0
    );
    const lucroPotencial = valorTotalVenda - valorTotalEstoque;

    const produtosBaixoStock = produtos.filter(
      (p) => (p.stock || 0) > 0 && getStockStatus(p) === "baixo-stock"
    ).length;

    const produtosSemStock = produtos.filter((p) => (p.stock || 0) === 0).length;

    const produtosExcessoStock = produtos.filter(
      (p) => getStockStatus(p) === "excesso-stock"
    ).length;

    const produtosAtivos = produtos.filter((p) => (p.estado || "ativo") === "ativo").length;
    const produtosInativos = produtos.filter((p) => p.estado === "inativo").length;

    const margemMedia =
      produtos.length > 0
        ? produtos.reduce(
            (acc, p) => acc + calcularMargem(p.precoCompra, p.precoVenda),
            0
          ) / produtos.length
        : 0;

    return {
      totalProdutos,
      totalStock,
      valorTotalEstoque,
      valorTotalVenda,
      lucroPotencial,
      produtosBaixoStock,
      produtosSemStock,
      produtosExcessoStock,
      produtosAtivos,
      produtosInativos,
      margemMedia,
    };
  }, [produtos]);

  const processedProdutos = useMemo(() => {
    let lista = [...produtos];

    if (debouncedSearch) {
      lista = lista.filter((p) => {
        const nome = p.nome?.toLowerCase() ?? "";
        const categoria = p.categoria?.toLowerCase() ?? "";
        const id = p.id?.toLowerCase() ?? "";
        const fornecedor = p.fornecedor?.toLowerCase() ?? "";
        const marca = p.marca?.toLowerCase() ?? "";
        const sku = p.sku?.toLowerCase() ?? "";
        const codigoBarras = p.codigoBarras?.toLowerCase() ?? "";

        return (
          nome.includes(debouncedSearch) ||
          categoria.includes(debouncedSearch) ||
          id.includes(debouncedSearch) ||
          fornecedor.includes(debouncedSearch) ||
          marca.includes(debouncedSearch) ||
          sku.includes(debouncedSearch) ||
          codigoBarras.includes(debouncedSearch)
        );
      });
    }

    switch (quickFilter) {
      case "baixo-stock":
        lista = lista.filter((p) => getStockStatus(p) === "baixo-stock");
        break;
      case "sem-stock":
        lista = lista.filter((p) => getStockStatus(p) === "sem-stock");
        break;
      case "alta-margem":
        lista = lista.filter((p) => calcularMargem(p.precoCompra, p.precoVenda) >= 30);
        break;
      case "excesso-stock":
        lista = lista.filter((p) => getStockStatus(p) === "excesso-stock");
        break;
      case "inativos":
        lista = lista.filter((p) => p.estado === "inativo");
        break;
      default:
        break;
    }

    lista.sort((a, b) => {
      const valorA =
        sortField === "margem"
          ? calcularMargem(a.precoCompra, a.precoVenda)
          : sortField === "valorTotal"
            ? (a.precoVenda || 0) * (a.stock || 0)
            : a[sortField as keyof Produto];

      const valorB =
        sortField === "margem"
          ? calcularMargem(b.precoCompra, b.precoVenda)
          : sortField === "valorTotal"
            ? (b.precoVenda || 0) * (b.stock || 0)
            : b[sortField as keyof Produto];

      if (typeof valorA === "string" && typeof valorB === "string") {
        return sortDirection === "asc"
          ? valorA.localeCompare(valorB)
          : valorB.localeCompare(valorA);
      }

      return sortDirection === "asc"
        ? Number(valorA || 0) - Number(valorB || 0)
        : Number(valorB || 0) - Number(valorA || 0);
    });

    return lista;
  }, [produtos, debouncedSearch, quickFilter, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(processedProdutos.length / ITEMS_PER_PAGE));

  const paginatedProdutos = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return processedProdutos.slice(start, start + ITEMS_PER_PAGE);
  }, [processedProdutos, page]);

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

  const handleDeleteClick = (produto: Produto) => {
    if (!isAdmin) {
      toast({
        title: "Permissão negada",
        description: "Apenas administradores podem excluir produtos.",
        variant: "destructive",
      });
      return;
    }

    if (!canManageProducts) {
      toast({
        title: "Ação indisponível",
        description: "O seu plano atual não permite excluir produtos.",
        variant: "destructive",
      });
      return;
    }

    setProdutoToDelete(produto);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!produtoToDelete?.id || !canManageProducts) return;

    setDeletingId(produtoToDelete.id);

    try {
      await deleteProduto(produtoToDelete.id);
      toast({
        title: "Sucesso",
        description: "Produto excluído com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Erro ao excluir produto.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
      setProdutoToDelete(null);
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
            <span className="font-medium">Acesso restrito para produtos</span>
            <span>
              O plano atual ({currentPlan}) está {currentStatus}.
              {typeof daysLeft === "number" && currentPlan === "trial"
                ? ` Dias restantes: ${daysLeft}.`
                : ""}
            </span>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Produtos</h1>
          <p className="text-sm text-muted-foreground">
            {isVendedor
              ? "Consultar produtos disponíveis e acompanhar o estoque"
              : "Gerencie produtos, fornecedores, margens e estoque"}
          </p>
        </div>

        {isAdmin && !blocked && (
          <Button
            size="sm"
            disabled={!canManageProducts}
            onClick={() => {
              setSelected(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        )}
      </div>

      <div className={`space-y-6 ${blocked ? "opacity-80" : ""}`}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProdutos}</div>
              <p className="text-xs text-muted-foreground">
                {stats.produtosAtivos} ativos / {stats.produtosInativos} inativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Total</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStock}</div>
              <p className="text-xs text-muted-foreground">Unidades em estoque</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor em Estoque</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{formatarMoeda(stats.valorTotalEstoque)}</div>
              <p className="text-xs text-muted-foreground">Custo total investido</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Potencial</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{formatarMoeda(stats.lucroPotencial)}</div>
              <p className="text-xs text-muted-foreground">
                Margem média: {stats.margemMedia.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertas</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                <span className="text-destructive">{stats.produtosBaixoStock}</span> baixo stock
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="text-destructive">{stats.produtosSemStock}</span> sem stock
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="text-destructive">{stats.produtosExcessoStock}</span> excesso stock
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
                  placeholder="Pesquisar por nome, categoria, fornecedor, SKU ou código..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={quickFilter === "todos" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setQuickFilter("todos");
                    setPage(1);
                  }}
                >
                  Todos
                </Badge>

                <Badge
                  variant={quickFilter === "baixo-stock" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setQuickFilter("baixo-stock");
                    setPage(1);
                  }}
                >
                  <Filter className="mr-1 h-3 w-3" />
                  Baixo stock
                </Badge>

                <Badge
                  variant={quickFilter === "sem-stock" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setQuickFilter("sem-stock");
                    setPage(1);
                  }}
                >
                  Sem stock
                </Badge>

                <Badge
                  variant={quickFilter === "alta-margem" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setQuickFilter("alta-margem");
                    setPage(1);
                  }}
                >
                  Alta margem
                </Badge>

                <Badge
                  variant={quickFilter === "excesso-stock" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setQuickFilter("excesso-stock");
                    setPage(1);
                  }}
                >
                  Excesso stock
                </Badge>

                <Badge
                  variant={quickFilter === "inativos" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setQuickFilter("inativos");
                    setPage(1);
                  }}
                >
                  Inativos
                </Badge>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Exibindo <span className="font-medium text-foreground">{processedProdutos.length}</span>{" "}
              {processedProdutos.length === 1 ? "produto" : "produtos"}
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-lg bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">{renderSortButton("Produto", "nome")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Fornecedor", "fornecedor")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Categoria", "categoria")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("SKU", "sku")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Preço Compra", "precoCompra")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Preço Venda", "precoVenda")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Margem", "margem")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Stock", "stock")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Valor Total", "valorTotal")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Estado", "estado")}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>

              <tbody>
                {paginatedProdutos.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Package className="h-8 w-8 opacity-50" />
                        <p className="font-medium">
                          {search || quickFilter !== "todos"
                            ? "Nenhum produto encontrado"
                            : "Nenhum produto cadastrado"}
                        </p>
                        <p className="text-xs">Ajuste os filtros ou cadastre um novo produto.</p>
                      </div>
                    </td>
                  </tr>
                )}

                {paginatedProdutos.map((p) => {
                  const margem = calcularMargem(p.precoCompra, p.precoVenda);
                  const stockStatus = getStockStatus(p);

                  return (
                    <tr
                      key={p.id}
                      className="border-b transition-colors hover:bg-muted/30 last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{p.nome}</p>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{p.fornecedor || "-"}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant="outline">{p.categoria}</Badge>
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-xs font-medium">{p.sku || "-"}</span>
                      </td>

                      <td className="px-4 py-3">{formatarMoeda(p.precoCompra)}</td>

                      <td className="px-4 py-3 font-medium">{formatarMoeda(p.precoVenda)}</td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            margem >= 30
                              ? "bg-accent/10 text-accent"
                              : margem >= 15
                                ? "bg-warning/10 text-warning"
                                : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {margem}%
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              stockStatus === "sem-stock"
                                ? "bg-destructive/10 text-destructive"
                                : stockStatus === "baixo-stock"
                                  ? "bg-warning/10 text-warning"
                                  : stockStatus === "excesso-stock"
                                    ? "bg-warning/10 text-warning"
                                    : "bg-accent/10 text-accent"
                            }`}
                          >
                            {p.stock}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            min: {p.stockMinimo || 0} / max: {p.stockMaximo || 0}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {formatarMoeda((p.precoVenda || 0) * (p.stock || 0))}
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant={p.estado === "inativo" ? "secondary" : "outline"}>
                          {p.estado || "ativo"}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        {isAdmin && !blocked ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!canManageProducts}
                              onClick={() => {
                                setSelected(p);
                                setOpen(true);
                              }}
                              title="Editar produto"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteClick(p)}
                              disabled={!canManageProducts || deletingId === p.id}
                              title="Excluir produto"
                            >
                              {deletingId === p.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Eye className="h-3 w-3" />
                            Apenas visualização
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!blocked && processedProdutos.length > 0 && (
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
        <ProdutoModal
          open={open}
          onClose={() => {
            setOpen(false);
            setSelected(null);
          }}
          produto={selected}
          produtosExistentes={produtos}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produto "{produtoToDelete?.nome}"?
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

export default Produtos;