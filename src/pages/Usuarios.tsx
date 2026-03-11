import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Download,
  Shield,
  User,
  Key,
  Loader2,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Phone,
  RefreshCw,
  Lock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import UsuarioModal from "@/components/UsuarioModal";
import { adminApi } from "@/services/adminApi";
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
import { Alert, AlertDescription } from "@/components/ui/alert";

type SortField = "nome" | "email" | "tipo" | "ativo" | "created_at" | "updated_at";
type SortDirection = "asc" | "desc";
type QuickFilter = "todos" | "admins" | "vendedores" | "ativos" | "inativos";

const ITEMS_PER_PAGE = 8;
const QUICK_FILTERS: QuickFilter[] = ["todos", "admins", "vendedores", "ativos", "inativos"];

const FILTER_LABELS: Record<QuickFilter, string> = {
  todos: "Todos",
  admins: "Admins",
  vendedores: "Vendedores",
  ativos: "Ativos",
  inativos: "Inativos",
};

export interface AdminUser {
  id: string;
  nome: string;
  email: string;
  tipo: "admin" | "vendedor";
  telefone?: string;
  ativo: boolean;
  limite_desconto?: number;
  created_at?: string;
  updated_at?: string;
}

const getDateMs = (value?: string) => {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

const formatarData = (value?: string) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return date.toLocaleDateString("pt-BR");
};

const Usuarios = () => {
  const { isAdmin, loading: authLoading, profileLoading } = useAuth();
  const {
    blocked,
    canManageUsers,
    currentPlan,
    currentStatus,
    daysLeft,
  } = usePlanAccess();
  const { toast } = useToast();

  const [usuarios, setUsuarios] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<AdminUser | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);

  const [quickFilter, setQuickFilter] = useState<QuickFilter>("todos");
  const [sortField, setSortField] = useState<SortField>("nome");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);

  const carregarUsuarios = useCallback(
    async (showLoader = true) => {
      if (blocked) {
        setUsuarios([]);
        if (showLoader) setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (showLoader) setLoading(true);

        const result = await adminApi.listUsers();
        setUsuarios(result.usuarios || []);
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error?.message || "Erro ao carregar usuários.",
          variant: "destructive",
        });
      } finally {
        if (showLoader) setLoading(false);
        setRefreshing(false);
      }
    },
    [toast, blocked]
  );

  useEffect(() => {
    if (!isAdmin) return;
    if (blocked) {
      setUsuarios([]);
      setLoading(false);
      return;
    }
    carregarUsuarios();
  }, [isAdmin, blocked, carregarUsuarios]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase());
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const stats = useMemo(() => {
    const total = usuarios.length;
    const admins = usuarios.filter((u) => u.tipo === "admin").length;
    const vendedores = usuarios.filter((u) => u.tipo === "vendedor").length;
    const ativos = usuarios.filter((u) => u.ativo).length;
    const inativos = total - ativos;
    const comTelefone = usuarios.filter((u) => !!u.telefone?.trim()).length;

    return { total, admins, vendedores, ativos, inativos, comTelefone };
  }, [usuarios]);

  const usuariosProcessados = useMemo(() => {
    let lista = [...usuarios];

    if (debouncedSearch) {
      lista = lista.filter((u) => {
        const termo = debouncedSearch;
        return (
          u.nome.toLowerCase().includes(termo) ||
          u.email.toLowerCase().includes(termo) ||
          u.tipo.toLowerCase().includes(termo) ||
          (u.telefone || "").toLowerCase().includes(termo)
        );
      });
    }

    switch (quickFilter) {
      case "admins":
        lista = lista.filter((u) => u.tipo === "admin");
        break;
      case "vendedores":
        lista = lista.filter((u) => u.tipo === "vendedor");
        break;
      case "ativos":
        lista = lista.filter((u) => u.ativo);
        break;
      case "inativos":
        lista = lista.filter((u) => !u.ativo);
        break;
      default:
        break;
    }

    lista.sort((a, b) => {
      const valueA =
        sortField === "created_at" || sortField === "updated_at"
          ? getDateMs(a[sortField])
          : sortField === "ativo"
            ? Number(a.ativo)
            : ((a[sortField] ?? "") as string | number);

      const valueB =
        sortField === "created_at" || sortField === "updated_at"
          ? getDateMs(b[sortField])
          : sortField === "ativo"
            ? Number(b.ativo)
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
  }, [usuarios, debouncedSearch, quickFilter, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(usuariosProcessados.length / ITEMS_PER_PAGE));

  const usuariosPaginados = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return usuariosProcessados.slice(start, start + ITEMS_PER_PAGE);
  }, [usuariosProcessados, page]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection(field === "created_at" || field === "updated_at" ? "desc" : "asc");
  };

  const handleOpenCreate = () => {
    if (!canManageUsers) {
      toast({
        title: "Ação indisponível",
        description: "O seu plano atual não permite criar usuários.",
        variant: "destructive",
      });
      return;
    }

    setSelected(null);
    setOpen(true);
  };

  const handleOpenEdit = (usuario: AdminUser) => {
    if (!canManageUsers) {
      toast({
        title: "Ação indisponível",
        description: "O seu plano atual não permite editar usuários.",
        variant: "destructive",
      });
      return;
    }

    setSelected(usuario);
    setOpen(true);
  };

  const handleDeleteClick = (usuario: AdminUser) => {
    if (!canManageUsers) {
      toast({
        title: "Ação indisponível",
        description: "O seu plano atual não permite desativar usuários.",
        variant: "destructive",
      });
      return;
    }

    setUsuarioToDelete(usuario);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!usuarioToDelete?.id || !canManageUsers) return;

    setDeletingId(usuarioToDelete.id);

    try {
      await adminApi.updateUser({
        uid: usuarioToDelete.id,
        ativo: false,
      });

      toast({
        title: "Sucesso",
        description: "Usuário desativado com sucesso.",
      });

      await carregarUsuarios(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Erro ao desativar usuário.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
      setUsuarioToDelete(null);
    }
  };

  const handleResetPassword = async (usuario: AdminUser) => {
    if (!canManageUsers) {
      toast({
        title: "Ação indisponível",
        description: "O seu plano atual não permite redefinir senhas.",
        variant: "destructive",
      });
      return;
    }

    setResetPasswordId(usuario.id);

    try {
      await adminApi.generatePasswordReset(usuario.email);

      toast({
        title: "Link gerado",
        description: "Link de redefinição gerado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Erro ao gerar redefinição de senha.",
        variant: "destructive",
      });
    } finally {
      setResetPasswordId(null);
    }
  };

  const handleToggleStatus = async (usuario: AdminUser) => {
    if (!canManageUsers) {
      toast({
        title: "Ação indisponível",
        description: "O seu plano atual não permite alterar status de usuários.",
        variant: "destructive",
      });
      return;
    }

    try {
      await adminApi.updateUser({
        uid: usuario.id,
        ativo: !usuario.ativo,
      });

      toast({
        title: "Sucesso",
        description: `Usuário ${usuario.ativo ? "desativado" : "ativado"} com sucesso.`,
      });

      await carregarUsuarios(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Erro ao alterar status do usuário.",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    if (blocked) return;
    setRefreshing(true);
    await carregarUsuarios(false);
  };

  const exportarCSV = () => {
    if (!canManageUsers) {
      toast({
        title: "Ação indisponível",
        description: "O seu plano atual não permite exportar usuários.",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Nome", "Email", "Tipo", "Status", "Telefone", "Registro", "Atualização"];

    const rows = usuariosProcessados.map((u) => [
      u.nome,
      u.email,
      u.tipo,
      u.ativo ? "Ativo" : "Inativo",
      u.telefone || "",
      formatarData(u.created_at),
      formatarData(u.updated_at),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", "usuarios.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Exportação concluída",
      description: "Lista de usuários exportada com sucesso.",
    });
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

  if (authLoading || profileLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      {blocked && (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-1">
            <span className="font-medium">Gestão de usuários em modo restrito</span>
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
          <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os usuários do sistema
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {!blocked && (
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Atualizar
            </Button>
          )}

          {!blocked && (
            <Button size="sm" onClick={handleOpenCreate} disabled={!canManageUsers}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          )}

          {!blocked && (
            <Button variant="outline" size="sm" onClick={exportarCSV} disabled={!canManageUsers}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          )}
        </div>
      </div>

      <div className={`space-y-6 ${blocked ? "opacity-80" : ""}`}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Usuários registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administradores</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.admins}</div>
              <p className="text-xs text-muted-foreground">Com acesso total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendedores</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.vendedores}</div>
              <p className="text-xs text-muted-foreground">Com acesso operacional</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ativos</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{stats.ativos}</div>
              <p className="text-xs text-muted-foreground">{stats.inativos} inativos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Com Telefone</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.comTelefone}</div>
              <p className="text-xs text-muted-foreground">Perfis mais completos</p>
            </CardContent>
          </Card>
        </div>

        {!blocked && (
          <div className="space-y-3 rounded-lg bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por nome, email, telefone ou tipo..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {QUICK_FILTERS.map((filter) => (
                  <Badge
                    key={filter}
                    variant={quickFilter === filter ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setQuickFilter(filter);
                      setPage(1);
                    }}
                  >
                    {filter === "admins" && <Filter className="mr-1 h-3 w-3" />}
                    {FILTER_LABELS[filter]}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Exibindo <span className="font-medium text-foreground">{usuariosProcessados.length}</span>{" "}
              {usuariosProcessados.length === 1 ? "usuário" : "usuários"}
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-lg bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">{renderSortButton("Usuário", "nome")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Email", "email")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Tipo", "tipo")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Status", "ativo")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Registro", "created_at")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Atualização", "updated_at")}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando usuários...
                      </div>
                    </td>
                  </tr>
                ) : usuariosPaginados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      {debouncedSearch ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
                    </td>
                  </tr>
                ) : (
                  usuariosPaginados.map((usuario) => (
                    <tr
                      key={usuario.id}
                      className="border-b transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <span className="text-sm font-semibold text-primary">
                              {usuario.nome.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{usuario.nome}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">{usuario.email}</td>

                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            usuario.tipo === "admin"
                              ? "border-primary/20 bg-primary/10 text-primary"
                              : "border-accent/20 bg-accent/10 text-accent"
                          }
                        >
                          {usuario.tipo === "admin" ? "Administrador" : "Vendedor"}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`flex items-center gap-1 ${
                            usuario.ativo ? "text-accent" : "text-destructive"
                          }`}
                        >
                          {usuario.ativo ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          <span className="text-xs">{usuario.ativo ? "Ativo" : "Inativo"}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {formatarData(usuario.created_at)}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {formatarData(usuario.updated_at)}
                      </td>

                      <td className="px-4 py-3">
                        {!blocked ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(usuario)}
                              disabled={!canManageUsers}
                              title="Editar usuário"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetPassword(usuario)}
                              disabled={!canManageUsers || resetPasswordId === usuario.id}
                              title="Redefinir senha"
                            >
                              {resetPasswordId === usuario.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Key className="h-4 w-4" />
                              )}
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(usuario)}
                              title={usuario.ativo ? "Desativar" : "Ativar"}
                              className={!usuario.ativo ? "text-accent" : ""}
                              disabled={!canManageUsers}
                            >
                              {usuario.ativo ? (
                                <XCircle className="h-4 w-4" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteClick(usuario)}
                              disabled={!canManageUsers || deletingId === usuario.id}
                              title="Desativar"
                            >
                              {deletingId === usuario.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Lock className="h-3 w-3" />
                            Apenas visualização
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!blocked && usuariosProcessados.length > 0 && (
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
        <UsuarioModal
          open={open}
          onClose={() => {
            setOpen(false);
            setSelected(null);
          }}
          usuario={selected}
          usuariosExistentes={usuarios}
          onSaved={() => carregarUsuarios(false)}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar desativação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar o usuário "{usuarioToDelete?.nome}"?
              O usuário não poderá mais acessar o sistema, mas seus dados serão preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Usuarios;