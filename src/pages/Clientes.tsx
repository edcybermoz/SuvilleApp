// src/pages/Clientes.tsx
import { useEffect, useState, useMemo } from "react";
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
  AlertCircle,
  Eye,
  EyeOff,
  TrendingUp,
  RefreshCw // ADICIONADO
} from "lucide-react";
import ClienteModal from "@/components/ClienteModal";
import { 
  listenClientes, 
  listenClientesPorVendedor,
  deleteCliente,
  Cliente 
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

const Clientes = () => {
  const { userData, isAdmin, isVendedor } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAllClients, setShowAllClients] = useState(false);
  const [atualizandoTotais, setAtualizandoTotais] = useState(false); // ADICIONADO
  const { toast } = useToast();

  useEffect(() => {
    let unsubscribe: () => void;

    if (isAdmin) {
      unsubscribe = listenClientes((clientesData) => {
        setClientes(clientesData);
        setLoading(false);
      });
    } else if (isVendedor && userData?.id) {
      if (showAllClients) {
        unsubscribe = listenClientes((clientesData) => {
          setClientes(clientesData);
          setLoading(false);
        });
      } else {
        unsubscribe = listenClientesPorVendedor(userData.id, (clientesData) => {
          setClientes(clientesData);
          setLoading(false);
        });
      }
    } else {
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isAdmin, isVendedor, userData?.id, showAllClients]);

  const filtered = useMemo(() => {
    if (!search.trim()) return clientes;
    
    const term = search.toLowerCase();
    return clientes.filter(c =>
      c.nome.toLowerCase().includes(term) ||
      c.telefone.includes(term) ||
      c.email?.toLowerCase().includes(term)
    );
  }, [clientes, search]);

  const stats = useMemo(() => {
    const totalClientes = clientes.length;
    const totalCompras = clientes.reduce((acc, c) => acc + (c.totalCompras || 0), 0);
    const mediaCompras = totalClientes > 0 ? totalCompras / totalClientes : 0;
    const clientesComCompras = clientes.filter(c => (c.totalCompras || 0) > 0).length;
    
    return {
      totalClientes,
      totalCompras,
      mediaCompras,
      clientesComCompras,
    };
  }, [clientes]);

  // NOVA FUNÇÃO: Atualizar totais de compras
  const handleAtualizarTotais = async () => {
    if (!isAdmin) {
      toast({
        title: "Permissão negada",
        description: "Apenas administradores podem atualizar os totais.",
        variant: "destructive",
      });
      return;
    }

    setAtualizandoTotais(true);
    try {
      const { executarAtualizacao } = await import("@/scripts/atualizarTotaisClientes");
      const resultado = await executarAtualizacao();
      
      toast({
        title: "✅ Atualização concluída",
        description: `${resultado.atualizados} clientes atualizados, ${resultado.pulados} já estavam corretos.`,
      });
    } catch (error) {
      console.error("Erro na atualização:", error);
      toast({
        title: "❌ Erro na atualização",
        description: "Verifique o console para mais detalhes.",
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
    setClienteToDelete(cliente);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!clienteToDelete?.id) return;

    setDeletingId(clienteToDelete.id);
    try {
      await deleteCliente(clienteToDelete.id);
      toast({
        title: "Sucesso",
        description: "Cliente excluído com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir cliente",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
      setClienteToDelete(null);
    }
  };

  const handleNovoCliente = () => {
    setSelected(null);
    setOpen(true);
  };

  const handleEditarCliente = (cliente: Cliente) => {
    setSelected(cliente);
    setOpen(true);
  };

  const handleCloseModal = () => {
    setOpen(false);
    setSelected(null);
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString("pt-MZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " MZN";
  };

  // Função para determinar a cor do badge de compras
  const getComprasBadgeColor = (totalCompras: number) => {
    if (totalCompras >= 10000) return "bg-green-600 text-white"; // Verde escuro para clientes VIP
    if (totalCompras >= 5000) return "bg-green-500 text-white"; // Verde médio
    if (totalCompras >= 1000) return "bg-green-400 text-white"; // Verde claro
    if (totalCompras > 0) return "bg-accent/20 text-accent border border-accent/30"; // Azul para quem já comprou
    return "bg-muted text-muted-foreground"; // Cinza para quem nunca comprou
  };

  // Função para calcular o número aproximado de compras
  const calcularNumeroCompras = (totalCompras: number) => {
    if (!totalCompras) return 0;
    // Assumindo um ticket médio de 1000 MZN por compra
    return Math.floor(totalCompras / 1000) || 1;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {isVendedor ? "Gerencie seus clientes" : "Gerencie todos os clientes"}
          </p>
        </div>
        <div className="flex gap-2">
          {isVendedor && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllClients(!showAllClients)}
              title={showAllClients ? "Ver apenas meus clientes" : "Ver todos os clientes"}
            >
              {showAllClients ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleNovoCliente}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
          {/* BOTÃO DE ATUALIZAÇÃO ADICIONADO */}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAtualizarTotais}
              disabled={atualizandoTotais}
              title="Atualizar totais de compras dos clientes"
              className="ml-2"
            >
              {atualizandoTotais ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {atualizandoTotais ? "Atualizando..." : "Atualizar Totais"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isVendedor ? "Meus Clientes" : "Total de Clientes"}
            </CardTitle>
            <UserCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClientes}</div>
            <p className="text-xs text-muted-foreground">
              Clientes cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total em Compras
            </CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatarMoeda(stats.totalCompras)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor total de compras
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Média por Cliente
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatarMoeda(stats.mediaCompras)}
            </div>
            <p className="text-xs text-muted-foreground">
              Média de compras por cliente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clientes Ativos
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.clientesComCompras}</div>
            <p className="text-xs text-muted-foreground">
              Clientes que já compraram
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, telefone ou email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {search && (
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-lg bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contato</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total Compras</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nº Compras</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  {search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
                </td>
              </tr>
            )}
            {filtered.map((cliente) => {
              const totalCompras = cliente.totalCompras || 0;
              const numeroCompras = calcularNumeroCompras(totalCompras);
              const badgeColor = getComprasBadgeColor(totalCompras);
              
              return (
                <tr key={cliente.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{cliente.nome}</p>
                        <p className="text-xs text-muted-foreground">ID: {cliente.id?.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span>{cliente.telefone}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {cliente.email ? (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{cliente.email}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">Não informado</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {formatarMoeda(totalCompras)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${badgeColor} flex items-center justify-center gap-1 w-fit`}>
                      {totalCompras > 0 && <ShoppingBag className="h-3 w-3" />}
                      {numeroCompras} {numeroCompras === 1 ? 'compra' : 'compras'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditarCliente(cliente)}
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
                          disabled={deletingId === cliente.id}
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ClienteModal
        open={open}
        onClose={handleCloseModal}
        cliente={selected}
        vendedorId={isVendedor ? userData?.id : undefined}
      />

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