// src/pages/Produtos.tsx
import { useEffect, useState, useMemo } from "react";
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
  Eye
} from "lucide-react";
import ProdutoModal from "@/components/ProdutoModal";
import { listenProdutos, deleteProduto, Produto } from "@/lib/store";
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

const Produtos = () => {
  const { isAdmin, isVendedor } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Produto | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [produtoToDelete, setProdutoToDelete] = useState<Produto | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = listenProdutos((produtosData) => {
      setProdutos(produtosData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return produtos;
    
    const term = search.toLowerCase();
    return produtos.filter(p =>
      p.nome.toLowerCase().includes(term) ||
      p.categoria.toLowerCase().includes(term) ||
      p.id?.toLowerCase().includes(term)
    );
  }, [produtos, search]);

  const stats = useMemo(() => {
    const totalProdutos = produtos.length;
    const totalStock = produtos.reduce((acc, p) => acc + p.stock, 0);
    const valorTotalEstoque = produtos.reduce((acc, p) => acc + (p.precoCompra * p.stock), 0);
    const produtosBaixoStock = produtos.filter(p => p.stock < 10).length;
    const valorTotalVenda = produtos.reduce((acc, p) => acc + (p.precoVenda * p.stock), 0);
    const lucroPotencial = valorTotalVenda - valorTotalEstoque;
    
    return {
      totalProdutos,
      totalStock,
      valorTotalEstoque,
      produtosBaixoStock,
      lucroPotencial,
    };
  }, [produtos]);

  const handleDeleteClick = (produto: Produto) => {
    if (!isAdmin) {
      toast({
        title: "Permissão negada",
        description: "Apenas administradores podem excluir produtos.",
        variant: "destructive",
      });
      return;
    }
    setProdutoToDelete(produto);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!produtoToDelete?.id) return;

    setDeletingId(produtoToDelete.id);
    try {
      await deleteProduto(produtoToDelete.id);
      toast({
        title: "Sucesso",
        description: "Produto excluído com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir produto",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
      setProdutoToDelete(null);
    }
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString("pt-MZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " MZN";
  };

  const calcularMargem = (compra: number, venda: number) => {
    if (compra === 0) return 0;
    return ((venda - compra) / compra * 100).toFixed(1);
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
          <h1 className="text-2xl font-bold text-foreground">Gestão de Produtos</h1>
          <p className="text-sm text-muted-foreground">
            {isVendedor ? "Consultar produtos" : "Gerencie todos os seus produtos e estoque"}
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
            <Plus className="mr-2 h-4 w-4" /> Novo Produto
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Produtos
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProdutos}</div>
            <p className="text-xs text-muted-foreground">
              Produtos cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Stock Total
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStock}</div>
            <p className="text-xs text-muted-foreground">
              Unidades em estoque
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Valor em Estoque
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatarMoeda(stats.valorTotalEstoque)}
            </div>
            <p className="text-xs text-muted-foreground">
              Custo total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Baixo Stock
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.produtosBaixoStock}
            </div>
            <p className="text-xs text-muted-foreground">
              Produtos com stock {'<'} 10
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, categoria ou ID..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {search && (
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-lg bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Produto</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoria</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Preço Compra</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Preço Venda</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Margem</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Stock</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Valor Total</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground">
                  {search ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
                </td>
              </tr>
            )}
            {filtered.map((p) => {
              const margem = Number(calcularMargem(p.precoCompra, p.precoVenda));
              return (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">ID: {p.id?.slice(0, 8)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{p.categoria}</Badge>
                  </td>
                  <td className="px-4 py-3">{formatarMoeda(p.precoCompra)}</td>
                  <td className="px-4 py-3 font-medium">{formatarMoeda(p.precoVenda)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      margem >= 20 ? "bg-accent/10 text-accent" : 
                      margem >= 10 ? "bg-warning/10 text-warning" : 
                      "bg-destructive/10 text-destructive"
                    }`}>
                      {margem}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        p.stock < 10 ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"
                      }`}
                    >
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {formatarMoeda(p.precoVenda * p.stock)}
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
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
                          disabled={deletingId === p.id}
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
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Eye className="h-3 w-3" /> Apenas visualização
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ProdutoModal
        open={open}
        onClose={() => setOpen(false)}
        produto={selected}
      />

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