// src/pages/Categorias.tsx
import { useEffect, useState, useMemo } from "react";
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
  Eye
} from "lucide-react";
import CategoriaModal from "@/components/CategoriaModal";
import {
  listenCategorias,
  deleteCategoria,
  Categoria,
} from "@/lib/store";
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

const Categorias = () => {
  const { isAdmin, isVendedor } = useAuth();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Categoria | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoriaToDelete, setCategoriaToDelete] = useState<Categoria | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = listenCategorias((categoriasData) => {
      setCategorias(categoriasData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filtrar categorias baseado na busca
  const filtered = useMemo(() => {
    if (!search.trim()) return categorias;
    
    const term = search.toLowerCase();
    return categorias.filter((c) =>
      c.nome.toLowerCase().includes(term)
    );
  }, [categorias, search]);

  // Ordenar alfabeticamente
  const sortedCategorias = useMemo(() => {
    return [...filtered].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [filtered]);

  const handleDeleteClick = (categoria: Categoria) => {
    if (!isAdmin) {
      toast({
        title: "Permissão negada",
        description: "Apenas administradores podem excluir categorias.",
        variant: "destructive",
      });
      return;
    }
    setCategoriaToDelete(categoria);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoriaToDelete?.id) return;

    setDeletingId(categoriaToDelete.id);
    try {
      await deleteCategoria(categoriaToDelete.id);
      toast({
        title: "Sucesso",
        description: "Categoria excluída com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir categoria",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
      setCategoriaToDelete(null);
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
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Gestão de Categorias
          </h1>
          <p className="text-sm text-muted-foreground">
            {isVendedor 
              ? "Visualizar categorias de produtos" 
              : "Organize seus produtos por categorias"}
          </p>
        </div>

        {isAdmin && (
          <Button
            size="sm"
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

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Categorias
            </CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categorias.length}</div>
            <p className="text-xs text-muted-foreground">
              Categorias cadastradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Média por Categoria
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categorias.length > 0 ? Math.round(100 / categorias.length) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Distribuição aproximada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Última Categoria
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium truncate">
              {categorias[categorias.length - 1]?.nome || "Nenhuma"}
            </div>
            <p className="text-xs text-muted-foreground">
              Adicionada recentemente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Pesquisa */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar categorias..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {search && (
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? 'categoria encontrada' : 'categorias encontradas'}
          </p>
        )}
      </div>

      {/* Grid de Categorias */}
      {sortedCategorias.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <FolderTree className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium text-foreground mb-1">
            Nenhuma categoria encontrada
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search 
              ? "Tente buscar por outro termo" 
              : "Comece criando sua primeira categoria"}
          </p>
          {!search && isAdmin && (
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Categoria
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedCategorias.map((c) => (
            <div
              key={c.id}
              className="group relative rounded-lg bg-card p-6 shadow-sm hover:shadow-md transition-all border border-border"
            >
              {/* Ícone decorativo */}
              <div className="absolute top-3 right-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <FolderTree className="h-12 w-12" />
              </div>

              {/* Conteúdo */}
              <div className="relative">
                <h3 className="text-lg font-semibold text-card-foreground mb-1">
                  {c.nome}
                </h3>
                
                <p className="text-xs text-muted-foreground mb-4">
                  ID: {c.id?.slice(0, 8)}
                </p>

                {/* Badge de data (se disponível) */}
                {c.createdAt && (
                  <Badge variant="outline" className="mb-4">
                    {new Date(c.createdAt.toDate()).toLocaleDateString('pt-BR')}
                  </Badge>
                )}

                {/* Ações */}
                {isAdmin ? (
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelected(c);
                        setOpen(true);
                      }}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteClick(c)}
                      disabled={deletingId === c.id}
                    >
                      {deletingId === c.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Excluir
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 text-xs text-muted-foreground flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Apenas visualização
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Categoria */}
      {isAdmin && (
        <CategoriaModal
          open={open}
          onClose={() => setOpen(false)}
          categoria={selected}
        />
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria "{categoriaToDelete?.nome}"?
              Esta ação não pode ser desfeita e pode afetar produtos vinculados a esta categoria.
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