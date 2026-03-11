import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FolderTree,
  Package,
  Loader2,
  AlertCircle,
  Eye,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  CalendarDays,
  Lock,
} from "lucide-react";
import CategoriaModal from "@/components/CategoriaModal";
import { listenCategorias, deleteCategoria, Categoria } from "@/lib/store";
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

type SortMode = "az" | "za" | "recentes";
type QuickFilter = "todas" | "com-data" | "sem-data";

const ITEMS_PER_PAGE = 8;

const Categorias = () => {
  const { isAdmin, isVendedor } = useAuth();
  const { blocked, canManageCategories, currentPlan, currentStatus, daysLeft } = usePlanAccess();
  const { toast } = useToast();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Categoria | null>(null);
  const [loading, setLoading] = useState(true);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoriaToDelete, setCategoriaToDelete] = useState<Categoria | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [sortMode, setSortMode] = useState<SortMode>("az");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("todas");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (blocked) {
      setCategorias([]);
      setLoading(false);
      return;
    }

    const unsubscribe = listenCategorias(
      (categoriasData) => {
        setCategorias(categoriasData);
        setLoading(false);
      },
      () => {
        setCategorias([]);
        setLoading(false);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as categorias.",
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

  const toDateSafe = (categoria: Categoria) => {
    try {
      return categoria.createdAt?.toDate?.() ?? null;
    } catch {
      return null;
    }
  };

  const getTimestampMs = (categoria: Categoria) => {
    const date = toDateSafe(categoria);
    return date ? date.getTime() : 0;
  };

  const stats = useMemo(() => {
    const total = categorias.length;
    const comData = categorias.filter((c) => !!toDateSafe(c)).length;
    const semData = categorias.filter((c) => !toDateSafe(c)).length;
    const nomes = categorias.map((c) => (c.nome || "").trim());
    const maiorNome = nomes.reduce((acc, nome) => (nome.length > acc.length ? nome : acc), "");
    const ultimaCategoria =
      [...categorias].sort((a, b) => getTimestampMs(b) - getTimestampMs(a))[0] || null;

    return { total, comData, semData, maiorNome, ultimaCategoria };
  }, [categorias]);

  const categoriasProcessadas = useMemo(() => {
    let lista = [...categorias];

    if (debouncedSearch) {
      lista = lista.filter((c) => (c.nome || "").toLowerCase().includes(debouncedSearch));
    }

    if (quickFilter === "com-data") lista = lista.filter((c) => !!toDateSafe(c));
    if (quickFilter === "sem-data") lista = lista.filter((c) => !toDateSafe(c));

    if (sortMode === "az") lista.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    if (sortMode === "za") lista.sort((a, b) => (b.nome || "").localeCompare(a.nome || ""));
    if (sortMode === "recentes") lista.sort((a, b) => getTimestampMs(b) - getTimestampMs(a));

    return lista;
  }, [categorias, debouncedSearch, quickFilter, sortMode]);

  const totalPages = Math.max(1, Math.ceil(categoriasProcessadas.length / ITEMS_PER_PAGE));

  const categoriasPaginadas = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return categoriasProcessadas.slice(start, start + ITEMS_PER_PAGE);
  }, [categoriasProcessadas, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const formatarData = (categoria: Categoria) => {
    const date = toDateSafe(categoria);
    if (!date) return "Sem data";

    try {
      return date.toLocaleDateString("pt-BR");
    } catch {
      return "Data inválida";
    }
  };

  const handleDeleteClick = (categoria: Categoria) => {
    if (!isAdmin) {
      toast({
        title: "Permissão negada",
        description: "Apenas administradores podem excluir categorias.",
        variant: "destructive",
      });
      return;
    }

    if (!canManageCategories) {
      toast({
        title: "Ação indisponível",
        description: "O seu plano atual não permite excluir categorias.",
        variant: "destructive",
      });
      return;
    }

    setCategoriaToDelete(categoria);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoriaToDelete?.id || !canManageCategories) return;

    setDeletingId(categoriaToDelete.id);

    try {
      await deleteCategoria(categoriaToDelete.id);
      toast({
        title: "Sucesso",
        description: "Categoria excluída com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Erro ao excluir categoria.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
      setCategoriaToDelete(null);
    }
  };

  const handleCloseModal = () => {
    setOpen(false);
    setSelected(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
            <span className="font-medium">Acesso restrito para categorias</span>
            <span>
              O plano atual ({currentPlan}) está {currentStatus}.
              {typeof daysLeft === "number" && currentPlan === "trial" ? ` Dias restantes: ${daysLeft}.` : ""}
            </span>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Categorias</h1>
          <p className="text-sm text-muted-foreground">
            {isVendedor ? "Visualizar categorias de produtos" : "Organize seus produtos por categorias"}
          </p>
        </div>

        {isAdmin && !blocked && (
          <Button
            size="sm"
            disabled={!canManageCategories}
            onClick={() => {
              setSelected(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Categoria
          </Button>
        )}
      </div>

      <div className={`space-y-6 ${blocked ? "opacity-80" : ""}`}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Categorias</CardTitle>
              <FolderTree className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Categorias cadastradas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Com Data</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.comData}</div>
              <p className="text-xs text-muted-foreground">Com registo de criação</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maior Nome</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="truncate text-lg font-medium">{stats.maiorNome || "Nenhuma"}</div>
              <p className="text-xs text-muted-foreground">Maior nome cadastrado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Última Categoria</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="truncate text-lg font-medium">{stats.ultimaCategoria?.nome || "Nenhuma"}</div>
              <p className="text-xs text-muted-foreground">Mais recente por data disponível</p>
            </CardContent>
          </Card>
        </div>

        {!blocked && (
          <div className="space-y-3 rounded-lg bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar categorias..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  ["todas", "Todas"],
                  ["com-data", "Com data"],
                  ["sem-data", "Sem data"],
                ].map(([value, label]) => (
                  <Badge
                    key={value}
                    variant={quickFilter === value ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setQuickFilter(value as QuickFilter);
                      setPage(1);
                    }}
                  >
                    {value === "com-data" && <Filter className="mr-1 h-3 w-3" />}
                    {label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["az", "A-Z"],
                ["za", "Z-A"],
                ["recentes", "Recentes"],
              ].map(([value, label]) => (
                <Badge
                  key={value}
                  variant={sortMode === value ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setSortMode(value as SortMode);
                    setPage(1);
                  }}
                >
                  {value === "az" && <ArrowUpDown className="mr-1 h-3 w-3" />}
                  {label}
                </Badge>
              ))}
            </div>

            <div className="text-sm text-muted-foreground">
              Exibindo <span className="font-medium text-foreground">{categoriasProcessadas.length}</span>{" "}
              {categoriasProcessadas.length === 1 ? "categoria" : "categorias"}
            </div>
          </div>
        )}

        {categoriasPaginadas.length === 0 ? (
          <div className="rounded-lg bg-muted/30 py-12 text-center">
            <FolderTree className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-medium text-foreground">Nenhuma categoria encontrada</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {search || quickFilter !== "todas"
                ? "Tente ajustar a pesquisa ou os filtros."
                : "Comece criando sua primeira categoria."}
            </p>

            {!search && quickFilter === "todas" && isAdmin && !blocked && (
              <Button
                disabled={!canManageCategories}
                onClick={() => {
                  setSelected(null);
                  setOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Categoria
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {categoriasPaginadas.map((c) => (
                <div
                  key={c.id}
                  className="group relative rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="absolute right-3 top-3 opacity-10 transition-opacity group-hover:opacity-20">
                    <FolderTree className="h-12 w-12" />
                  </div>

                  <div className="relative">
                    <h3 className="mb-1 break-words text-lg font-semibold text-card-foreground">
                      {c.nome}
                    </h3>

                    <div className="mb-4 flex flex-wrap gap-2">
                      <Badge variant="outline">{formatarData(c)}</Badge>
                      <Badge variant="outline">{toDateSafe(c) ? "Registada" : "Sem data"}</Badge>
                    </div>

                    {isAdmin && !blocked ? (
                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!canManageCategories}
                          onClick={() => {
                            setSelected(c);
                            setOpen(true);
                          }}
                          className="flex-1"
                        >
                          <Edit className="mr-1 h-4 w-4" />
                          Editar
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleDeleteClick(c)}
                          disabled={!canManageCategories || deletingId === c.id}
                        >
                          {deletingId === c.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="mr-1 h-4 w-4" />
                              Excluir
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        Apenas visualização
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!blocked && (
              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
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
          </>
        )}
      </div>

      {isAdmin && !blocked && (
        <CategoriaModal
          open={open}
          onClose={handleCloseModal}
          categoria={selected}
          categoriasExistentes={categorias}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria "{categoriaToDelete?.nome}"?
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

export default Categorias;