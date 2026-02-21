// src/pages/Vendas.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search, Eye, Printer, XCircle, Loader2, ShoppingCart, TrendingUp, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { listenVendas, listenVendasPorVendedor, updateVendaStatus, Venda } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Vendas = () => {
  const { userData, isAdmin, isVendedor } = useAuth();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendasFiltradas, setVendasFiltradas] = useState<Venda[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [cancelandoVenda, setCancelandoVenda] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [vendaToCancel, setVendaToCancel] = useState<Venda | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    let unsubscribe: () => void;

    if (isAdmin) {
      unsubscribe = listenVendas((vendasData) => {
        setVendas(vendasData);
        setVendasFiltradas(vendasData);
        setLoading(false);
      });
    } else if (isVendedor && userData?.id) {
      unsubscribe = listenVendasPorVendedor(userData.id, (vendasData) => {
        setVendas(vendasData);
        setVendasFiltradas(vendasData);
        setLoading(false);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isAdmin, isVendedor, userData?.id]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setVendasFiltradas(vendas);
    } else {
      const term = searchTerm.toLowerCase();
      const filtradas = vendas.filter(
        (v) =>
          v.clienteNome.toLowerCase().includes(term) ||
          v.id?.toLowerCase().includes(term) ||
          v.total.toString().includes(term)
      );
      setVendasFiltradas(filtradas);
    }
  }, [searchTerm, vendas]);

  // Estatísticas de vendas
  const stats = {
    total: vendas.length,
    concluidas: vendas.filter(v => v.status === "concluida").length,
    pendentes: vendas.filter(v => v.status === "pendente").length,
    canceladas: vendas.filter(v => v.status === "cancelada").length,
    valorTotal: vendas
      .filter(v => v.status === "concluida")
      .reduce((acc, v) => acc + v.total, 0),
    ticketMedio: (() => {
      const concluidas = vendas.filter(v => v.status === "concluida");
      return concluidas.length > 0 
        ? concluidas.reduce((acc, v) => acc + v.total, 0) / concluidas.length 
        : 0;
    })(),
  };

  const formatarData = (timestamp: any) => {
    if (!timestamp) return "Data não disponível";
    try {
      const date = timestamp.toDate();
      return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString("pt-MZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " MZN";
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      concluida: { class: "bg-green-500/20 text-green-600 border-green-500/30", label: "Concluída", icon: "✅" },
      pendente: { class: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30", label: "Pendente", icon: "⏳" },
      cancelada: { class: "bg-red-500/20 text-red-600 border-red-500/30", label: "Cancelada", icon: "❌" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;
    
    return (
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold border ${config.class} flex items-center gap-1 w-fit`}>
        <span>{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const handleVerDetalhes = (venda: Venda) => {
    setVendaSelecionada(venda);
    setDialogAberto(true);
  };

  const handleCancelarClick = (venda: Venda) => {
    if (isVendedor) {
      if (venda.status !== "pendente") {
        toast({
          title: "Permissão negada",
          description: "Vendedores só podem cancelar vendas pendentes.",
          variant: "destructive",
        });
        return;
      }
      setMotivoCancelamento("");
    }
    setVendaToCancel(venda);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!vendaToCancel?.id) return;

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
      await updateVendaStatus(vendaToCancel.id, "cancelada", motivoCancelamento);
      toast({
        title: "Sucesso",
        description: "Venda cancelada com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao cancelar venda",
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
    if (isVendedor && venda.vendedorId !== userData?.id) {
      toast({
        title: "Permissão negada",
        description: "Você só pode imprimir recibos das suas próprias vendas.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Recibo",
      description: "Funcionalidade de impressão será implementada",
    });
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
          <h1 className="text-2xl font-bold text-foreground">Gestão de Vendas</h1>
          <p className="text-sm text-muted-foreground">
            {isVendedor ? "Gerencie suas vendas" : "Gerencie todas as vendas"}
          </p>
        </div>
        <Link to="/vendas/nova">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" /> Nova Venda
          </Button>
        </Link>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                {stats.concluidas} concluídas
              </Badge>
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
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
            <div className="text-2xl font-bold text-accent">{formatarMoeda(stats.valorTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Em vendas concluídas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatarMoeda(stats.ticketMedio)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Por venda concluída
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelamentos</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.canceladas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? ((stats.canceladas / stats.total) * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por cliente, ID ou valor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {searchTerm && (
          <p className="text-sm text-muted-foreground self-center">
            {vendasFiltradas.length} {vendasFiltradas.length === 1 ? 'venda encontrada' : 'vendas encontradas'}
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-lg bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Produtos</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pagamento</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {vendasFiltradas.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground">
                  Nenhuma venda encontrada
                </td>
              </tr>
            )}
            {vendasFiltradas.map((venda) => (
              <tr key={venda.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs">
                  {venda.id?.slice(0, 8)}...
                </td>
                <td className="px-4 py-3 font-medium">
                  {venda.clienteNome}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatarData(venda.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-muted px-2 py-1 rounded-full">
                    {venda.produtos.length} {venda.produtos.length === 1 ? 'item' : 'itens'}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold">
                  {formatarMoeda(venda.total)}
                </td>
                <td className="px-4 py-3">
                  <span className="capitalize">
                    {venda.metodoPagamento === "dinheiro" ? "Dinheiro" :
                     venda.metodoPagamento === "cartao" ? "Cartão" :
                     "Transferência"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {getStatusBadge(venda.status)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVerDetalhes(venda)}
                      title="Ver detalhes"
                    >
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
                    
                    {venda.status !== "cancelada" && venda.status !== "concluida" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleCancelarClick(venda)}
                        disabled={cancelandoVenda === venda.id}
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

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Venda</DialogTitle>
            <DialogDescription>
              Informações completas da venda selecionada
            </DialogDescription>
          </DialogHeader>

          {vendaSelecionada && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
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
                  <p>{getStatusBadge(vendaSelecionada.status)}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Produtos</h3>
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
                      <tr key={index}>
                        <td className="py-2">{produto.nome}</td>
                        <td className="py-2 text-right">{produto.quantidade}</td>
                        <td className="py-2 text-right">
                          {formatarMoeda(produto.precoUnitario)}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {formatarMoeda(produto.subtotal)}
                        </td>
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
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total:</span>
                    <span className="text-primary">{formatarMoeda(vendaSelecionada.total)}</span>
                  </div>
                </div>

                {vendaSelecionada.metodoPagamento === "dinheiro" && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Valor Recebido:</span>{" "}
                      <span className="font-medium">{formatarMoeda(vendaSelecionada.valorRecebido || 0)}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Troco:</span>{" "}
                      <span className="font-medium text-green-600">
                        {formatarMoeda(vendaSelecionada.troco || 0)}
                      </span>
                    </p>
                  </div>
                )}

                {vendaSelecionada.motivoCancelamento && (
                  <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
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
                <Button onClick={() => handleImprimirRecibo(vendaSelecionada)}>
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
                    <span className="text-destructive text-sm">
                      Esta ação não pode ser desfeita.
                    </span>
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
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
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