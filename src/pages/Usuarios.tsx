// src/pages/Usuarios.tsx
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  AlertCircle
} from "lucide-react";
import UsuarioModal from "@/components/UsuarioModal";
import { listenUsuarios, deleteUsuario, updateUsuario, Usuario } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
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
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { Navigate } from "react-router-dom";

const Usuarios = () => {
  const { isAdmin } = useAuth();

  // Redirecionar se não for admin
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<Usuario | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const { toast } = useToast();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = listenUsuarios((usuariosData) => {
      setUsuarios(usuariosData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return usuarios;
    
    const term = search.toLowerCase();
    return usuarios.filter(u =>
      u.nome.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.tipo.toLowerCase().includes(term)
    );
  }, [usuarios, search]);

  const stats = useMemo(() => {
    const total = usuarios.length;
    const admins = usuarios.filter(u => u.tipo === "admin").length;
    const vendedores = usuarios.filter(u => u.tipo === "vendedor").length;
    const ativos = usuarios.filter(u => u.ativo).length;
    const inativos = total - ativos;

    return {
      total,
      admins,
      vendedores,
      ativos,
      inativos,
    };
  }, [usuarios]);

  const handleDeleteClick = (usuario: Usuario) => {
    setUsuarioToDelete(usuario);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!usuarioToDelete?.id) return;

    setDeletingId(usuarioToDelete.id);
    try {
      await updateUsuario(usuarioToDelete.id, { ativo: false });
      
      toast({
        title: "Sucesso",
        description: "Usuário desativado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao desativar usuário",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
      setUsuarioToDelete(null);
    }
  };

  const handleResetPassword = async (usuario: Usuario) => {
    setResetPasswordId(usuario.id!);
    try {
      await sendPasswordResetEmail(auth, usuario.email);
      toast({
        title: "Email enviado",
        description: `Instruções de redefinição de senha enviadas para ${usuario.email}`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao enviar email de redefinição",
        variant: "destructive",
      });
    } finally {
      setResetPasswordId(null);
    }
  };

  const handleToggleStatus = async (usuario: Usuario) => {
    try {
      await updateUsuario(usuario.id!, { ativo: !usuario.ativo });
      toast({
        title: "Sucesso",
        description: `Usuário ${!usuario.ativo ? 'ativado' : 'desativado'} com sucesso`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao alterar status do usuário",
        variant: "destructive",
      });
    }
  };

  const formatarData = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      return timestamp.toDate().toLocaleDateString('pt-BR');
    } catch {
      return "Data inválida";
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os usuários do sistema
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            size="sm"
            onClick={() => {
              setSelected(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Usuário
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Usuários
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Usuários registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Administradores
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
            <p className="text-xs text-muted-foreground">
              Com acesso total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Vendedores
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vendedores}</div>
            <p className="text-xs text-muted-foreground">
              Com acesso limitado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ativos
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.ativos}</div>
            <p className="text-xs text-muted-foreground">
              {stats.inativos} inativos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, email ou tipo..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {search && (
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? 'usuário encontrado' : 'usuários encontrados'}
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-lg bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Usuário</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Registro</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Último Acesso</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  {search ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
                </td>
              </tr>
            )}
            {filtered.map((usuario) => (
              <tr key={usuario.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {usuario.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{usuario.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        ID: {usuario.id?.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{usuario.email}</td>
                <td className="px-4 py-3">
                  <Badge 
                    variant="outline"
                    className={usuario.tipo === "admin" 
                      ? "bg-primary/10 text-primary border-primary/20" 
                      : "bg-accent/10 text-accent border-accent/20"
                    }
                  >
                    {usuario.tipo === "admin" ? "Administrador" : "Vendedor"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-1 ${
                    usuario.ativo ? "text-accent" : "text-destructive"
                  }`}>
                    {usuario.ativo ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <span className="text-xs">
                      {usuario.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatarData(usuario.dataRegistro)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {usuario.ultimoAcesso ? formatarData(usuario.ultimoAcesso) : "Nunca acessou"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelected(usuario);
                        setOpen(true);
                      }}
                      title="Editar usuário"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResetPassword(usuario)}
                      disabled={resetPasswordId === usuario.id}
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
                      disabled={deletingId === usuario.id}
                      title="Excluir"
                    >
                      {deletingId === usuario.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UsuarioModal
        open={open}
        onClose={() => setOpen(false)}
        usuario={selected}
      />

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