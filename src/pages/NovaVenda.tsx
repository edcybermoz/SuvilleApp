import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listenClientes,
  listenClientesPorVendedor,
  listenProdutosAtivos,
  Cliente,
  Produto,
  createCliente,
  createVenda,
  VendaInput,
} from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import {
  Loader2,
  AlertCircle,
  Search,
  ShoppingCart,
  UserPlus,
  Trash2,
  Lock,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface VendaProduto {
  produto: Produto;
  quantidade: number;
  subtotal: number;
}

interface NovoCliente {
  nome: string;
  telefone: string;
  email: string;
}

const NovaVenda = () => {
  const { toast } = useToast();
  const { userData, firebaseUser, isVendedor, isAdmin } = useAuth();
  const { blocked, canCreateSales, currentPlan, currentStatus, daysLeft } = usePlanAccess();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [clienteSearch, setClienteSearch] = useState("");
  const [novoCliente, setNovoCliente] = useState<NovoCliente>({
    nome: "",
    telefone: "",
    email: "",
  });
  const [tipoCliente, setTipoCliente] = useState<"existente" | "novo" | "sem">("existente");

  const [produtosDisponiveis, setProdutosDisponiveis] = useState<Produto[]>([]);
  const [produtoSearch, setProdutoSearch] = useState("");
  const [produtosSelecionados, setProdutosSelecionados] = useState<VendaProduto[]>([]);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState<string>("");

  const [metodoPagamento, setMetodoPagamento] = useState<"dinheiro" | "cartao" | "transferencia">("dinheiro");
  const [valorRecebido, setValorRecebido] = useState<number>(0);

  const [tipoIVA, setTipoIVA] = useState<"percentual" | "valor">("percentual");
  const [ivaValor, setIvaValor] = useState<number>(17);

  const [tipoDesconto, setTipoDesconto] = useState<"percentual" | "valor">("percentual");
  const [descontoValor, setDescontoValor] = useState<number>(0);

  const [isFinalizando, setIsFinalizando] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  const vendedorUid = firebaseUser?.uid ?? null;
  const limiteDesconto = isVendedor ? userData?.limite_desconto || 10 : 100;

  useEffect(() => {
    if (blocked) {
      setClientes([]);
      setProdutosDisponiveis([]);
      return;
    }

    if (isVendedor && !vendedorUid) return;

    let unsubClientes: (() => void) | undefined;
    let unsubProdutos: (() => void) | undefined;

    if (isAdmin) {
      unsubClientes = listenClientes(
        setClientes,
        () => {
          setClientes([]);
          toast({
            title: "Erro",
            description: "Não foi possível carregar os clientes.",
            variant: "destructive",
          });
        }
      );
    } else if (isVendedor && vendedorUid) {
      unsubClientes = listenClientesPorVendedor(
        vendedorUid,
        setClientes,
        () => {
          setClientes([]);
          toast({
            title: "Erro",
            description: "Não foi possível carregar os seus clientes.",
            variant: "destructive",
          });
        }
      );
    } else {
      setClientes([]);
    }

    unsubProdutos = listenProdutosAtivos(
      setProdutosDisponiveis,
      () => {
        setProdutosDisponiveis([]);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os produtos.",
          variant: "destructive",
        });
      }
    );

    return () => {
      if (unsubClientes) unsubClientes();
      if (unsubProdutos) unsubProdutos();
    };
  }, [blocked, isAdmin, isVendedor, vendedorUid, toast]);

  const formatarMoeda = (valor: number) =>
    Number(valor || 0).toLocaleString("pt-MZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " MZN";

  const normalizarTelefone = (telefone: string) =>
    telefone.replace(/\s+/g, " ").trim();

  const clientesFiltrados = useMemo(() => {
    const term = clienteSearch.trim().toLowerCase();
    const base = clientes.filter((c) => (c.status || "ativo") === "ativo");

    if (!term) return base.slice(0, 50);

    return base.filter(
      (c) =>
        c.nome.toLowerCase().includes(term) ||
        c.telefone.toLowerCase().includes(term) ||
        (c.email || "").toLowerCase().includes(term) ||
        (c.nuit || "").toLowerCase().includes(term)
    );
  }, [clientes, clienteSearch]);

  const produtosFiltrados = useMemo(() => {
    const term = produtoSearch.trim().toLowerCase();

    return produtosDisponiveis
      .filter((p) => (p.stock || 0) > 0)
      .filter((p) => (p.estado || "ativo") === "ativo")
      .filter((p) => {
        if (!term) return true;
        return (
          p.nome.toLowerCase().includes(term) ||
          p.categoria.toLowerCase().includes(term) ||
          (p.id || "").toLowerCase().includes(term) ||
          (p.sku || "").toLowerCase().includes(term) ||
          (p.codigoBarras || "").toLowerCase().includes(term) ||
          (p.fornecedor || "").toLowerCase().includes(term)
        );
      });
  }, [produtosDisponiveis, produtoSearch]);

  const produtoSelecionadoInfo = useMemo(
    () => produtosDisponiveis.find((p) => p.id === produtoSelecionadoId) || null,
    [produtoSelecionadoId, produtosDisponiveis]
  );

  const adicionarProduto = () => {
    if (!canCreateSales) {
      toast({
        title: "Acesso restrito",
        description: "O seu plano não permite registar vendas no momento.",
        variant: "destructive",
      });
      return;
    }

    const produto = produtosDisponiveis.find((p) => p.id === produtoSelecionadoId);

    if (!produto) {
      toast({
        title: "Erro",
        description: "Selecione um produto válido.",
        variant: "destructive",
      });
      return;
    }

    if ((produto.estado || "ativo") !== "ativo") {
      toast({
        title: "Erro",
        description: "Produto inativo não pode ser vendido.",
        variant: "destructive",
      });
      return;
    }

    if (produto.stock <= 0) {
      toast({
        title: "Erro",
        description: "Produto sem stock disponível.",
        variant: "destructive",
      });
      return;
    }

    const existe = produtosSelecionados.find((p) => p.produto.id === produto.id);
    if (existe) {
      toast({
        title: "Produto já adicionado",
        description: "Ajuste a quantidade na lista abaixo.",
      });
      return;
    }

    setProdutosSelecionados((prev) => [
      ...prev,
      {
        produto,
        quantidade: 1,
        subtotal: produto.precoVenda,
      },
    ]);

    setProdutoSelecionadoId("");
  };

  const atualizarQuantidade = (id: string, qtd: number) => {
    if (!canCreateSales) return;
    if (!Number.isFinite(qtd) || qtd < 1) return;

    setProdutosSelecionados((ps) =>
      ps.map((p) => {
        if (p.produto.id !== id) return p;

        if (qtd > p.produto.stock) {
          toast({
            title: "Stock insuficiente",
            description: `Stock máximo disponível: ${p.produto.stock}`,
          });
          return p;
        }

        return {
          ...p,
          quantidade: qtd,
          subtotal: qtd * p.produto.precoVenda,
        };
      })
    );
  };

  const incrementarQuantidade = (id: string) => {
    if (!canCreateSales) return;
    const item = produtosSelecionados.find((p) => p.produto.id === id);
    if (!item) return;
    atualizarQuantidade(id, item.quantidade + 1);
  };

  const decrementarQuantidade = (id: string) => {
    if (!canCreateSales) return;
    const item = produtosSelecionados.find((p) => p.produto.id === id);
    if (!item || item.quantidade <= 1) return;
    atualizarQuantidade(id, item.quantidade - 1);
  };

  const removerProduto = (id: string) => {
    if (!canCreateSales) return;
    setProdutosSelecionados((ps) => ps.filter((p) => p.produto.id !== id));
  };

  const subtotal = useMemo(
    () => produtosSelecionados.reduce((s, p) => s + p.subtotal, 0),
    [produtosSelecionados]
  );

  const ivaTotal = useMemo(() => {
    const valor = tipoIVA === "percentual" ? subtotal * (ivaValor / 100) : ivaValor;
    return Math.max(0, valor);
  }, [subtotal, tipoIVA, ivaValor]);

  const descontoTotal = useMemo(() => {
    const valor =
      tipoDesconto === "percentual"
        ? subtotal * (descontoValor / 100)
        : descontoValor;
    return Math.max(0, valor);
  }, [subtotal, tipoDesconto, descontoValor]);

  const totalGeral = Math.max(0, subtotal + ivaTotal - descontoTotal);
  const troco = metodoPagamento === "dinheiro" ? valorRecebido - totalGeral : 0;

  const totalItens = useMemo(
    () => produtosSelecionados.reduce((acc, item) => acc + item.quantidade, 0),
    [produtosSelecionados]
  );

  const clienteDuplicado = useMemo(() => {
    const telefone = normalizarTelefone(novoCliente.telefone);
    if (!telefone) return false;
    return clientes.some((c) => normalizarTelefone(c.telefone) === telefone);
  }, [novoCliente.telefone, clientes]);

  const handleCriarCliente = async () => {
    if (!canCreateSales) {
      toast({
        title: "Acesso restrito",
        description: "O seu plano não permite criar clientes durante a venda.",
        variant: "destructive",
      });
      return;
    }

    if (!novoCliente.nome.trim() || !novoCliente.telefone.trim()) {
      toast({
        title: "Erro",
        description: "Nome e telefone são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (clienteDuplicado) {
      toast({
        title: "Cliente já existe",
        description: "Já existe um cliente com este telefone.",
        variant: "destructive",
      });
      return;
    }

    if (isVendedor && !vendedorUid) {
      toast({
        title: "Erro",
        description: "Utilizador não identificado.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingClient(true);

    try {
      const telefoneNormalizado = normalizarTelefone(novoCliente.telefone);
      const emailNormalizado = novoCliente.email.trim().toLowerCase();

      const clienteRef = await createCliente(
        {
          nome: novoCliente.nome.trim(),
          telefone: telefoneNormalizado,
          email: emailNormalizado,
          status: "ativo",
          origem: "balcao",
          limiteCredito: 0,
          nuit: "",
          endereco: "",
          observacoes: "",
          ultimoAtendimento: "",
        },
        isVendedor ? vendedorUid : undefined
      );

      const clienteCriado: Cliente = {
        id: clienteRef.id,
        nome: novoCliente.nome.trim(),
        telefone: telefoneNormalizado,
        email: emailNormalizado,
        totalCompras: 0,
        vendedorId: isVendedor ? vendedorUid : null,
        status: "ativo",
        origem: "balcao",
        limiteCredito: 0,
      };

      setClienteSelecionado(clienteCriado);
      setTipoCliente("existente");
      setNovoCliente({ nome: "", telefone: "", email: "" });

      toast({
        title: "Sucesso",
        description: "Cliente criado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Erro ao criar cliente.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingClient(false);
    }
  };

  const validarVenda = () => {
    if (!canCreateSales) {
      toast({
        title: "Plano expirado",
        description: "Renove o plano para continuar a registar vendas.",
        variant: "destructive",
      });
      return false;
    }

    if (produtosSelecionados.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um produto à venda.",
        variant: "destructive",
      });
      return false;
    }

    if (tipoCliente === "existente" && !clienteSelecionado) {
      toast({
        title: "Erro",
        description: "Selecione um cliente ou use a opção sem cliente.",
        variant: "destructive",
      });
      return false;
    }

    if (
      tipoCliente === "existente" &&
      clienteSelecionado &&
      (clienteSelecionado.status || "ativo") !== "ativo"
    ) {
      toast({
        title: "Erro",
        description: "Cliente inativo não pode ser usado na venda.",
        variant: "destructive",
      });
      return false;
    }

    if (ivaValor < 0 || descontoValor < 0) {
      toast({
        title: "Erro",
        description: "IVA e desconto não podem ser negativos.",
        variant: "destructive",
      });
      return false;
    }

    if (metodoPagamento === "dinheiro" && valorRecebido < totalGeral) {
      toast({
        title: "Erro",
        description: "Valor recebido é menor que o total da venda.",
        variant: "destructive",
      });
      return false;
    }

    if (isVendedor && tipoDesconto === "percentual" && descontoValor > limiteDesconto) {
      toast({
        title: "Erro",
        description: `Desconto máximo permitido é ${limiteDesconto}%.`,
        variant: "destructive",
      });
      return false;
    }

    if (tipoDesconto === "valor" && descontoValor > subtotal) {
      toast({
        title: "Erro",
        description: "O desconto não pode ser maior que o subtotal.",
        variant: "destructive",
      });
      return false;
    }

    if (isVendedor && !vendedorUid) {
      toast({
        title: "Erro",
        description: "Utilizador não identificado.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const resetVenda = () => {
    setProdutosSelecionados([]);
    setProdutoSelecionadoId("");
    setProdutoSearch("");
    setClienteSelecionado(null);
    setClienteSearch("");
    setTipoCliente("existente");
    setNovoCliente({ nome: "", telefone: "", email: "" });
    setValorRecebido(0);
    setDescontoValor(0);
    setTipoDesconto("percentual");
    setIvaValor(17);
    setTipoIVA("percentual");
    setMetodoPagamento("dinheiro");
  };

  const finalizarVenda = async () => {
    if (!validarVenda()) return;

    setIsFinalizando(true);

    try {
      const vendaData: VendaInput = {
        clienteId: tipoCliente === "sem" ? null : clienteSelecionado?.id || null,
        clienteNome:
          tipoCliente === "sem"
            ? "Cliente não identificado"
            : clienteSelecionado?.nome || "Cliente não identificado",
        produtos: produtosSelecionados.map((p) => ({
          produtoId: p.produto.id!,
          nome: p.produto.nome,
          quantidade: p.quantidade,
          precoUnitario: p.produto.precoVenda,
          subtotal: p.subtotal,
        })),
        subtotal,
        iva: ivaTotal,
        desconto: descontoTotal,
        total: totalGeral,
        metodoPagamento,
        status: "concluida",
        valorRecebido: metodoPagamento === "dinheiro" ? valorRecebido : null,
        troco: metodoPagamento === "dinheiro" ? Math.max(0, troco) : null,
        vendedorId: isVendedor ? vendedorUid! : null,
      };

      await createVenda(vendaData);

      toast({
        title: "Sucesso!",
        description: "Venda finalizada com sucesso.",
      });

      resetVenda();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Erro ao finalizar venda.",
        variant: "destructive",
      });
    } finally {
      setIsFinalizando(false);
    }
  };

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

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Registrar Nova Venda</h1>
          <p className="text-sm text-muted-foreground">
            Cliente:{" "}
            {tipoCliente === "sem"
              ? "Sem cliente"
              : clienteSelecionado
                ? clienteSelecionado.nome
                : "Nenhum selecionado"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {totalItens} {totalItens === 1 ? "item" : "itens"}
          </Badge>
          <Badge variant="outline">Total: {formatarMoeda(totalGeral)}</Badge>
        </div>
      </div>

      {isVendedor && (
        <Alert className="border-warning bg-warning/10">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning">
            Limite de desconto para vendedores: {limiteDesconto}%
          </AlertDescription>
        </Alert>
      )}

      <div className={`rounded-lg bg-card p-6 shadow-sm ${blocked ? "opacity-70" : ""}`}>
        <h2 className="mb-4 text-lg font-semibold text-card-foreground">Informações do Cliente</h2>

        <Tabs
          value={tipoCliente}
          onValueChange={(v) => {
            if (blocked) return;
            setTipoCliente(v as typeof tipoCliente);
          }}
        >
          <TabsList>
            <TabsTrigger value="existente" disabled={blocked}>Cliente Existente</TabsTrigger>
            <TabsTrigger value="novo" disabled={blocked}>Novo Cliente</TabsTrigger>
            <TabsTrigger value="sem" disabled={blocked}>Sem Cliente</TabsTrigger>
          </TabsList>

          <TabsContent value="existente" className="mt-4 space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={clienteSearch}
                onChange={(e) => setClienteSearch(e.target.value)}
                placeholder="Pesquisar cliente..."
                className="pl-9"
                disabled={blocked}
              />
            </div>

            <Select
              value={clienteSelecionado?.id ?? ""}
              onValueChange={(v) => {
                const c = clientes.find((cli) => cli.id === v) || null;
                setClienteSelecionado(c);
              }}
              disabled={blocked}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientesFiltrados.map((c) => (
                  <SelectItem key={c.id} value={c.id ?? ""}>
                    {c.nome} - {c.telefone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {clienteSelecionado && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Cliente:</span>{" "}
                  <span className="font-medium">{clienteSelecionado.nome}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Telefone:</span>{" "}
                  {clienteSelecionado.telefone}
                </p>
                <p>
                  <span className="text-muted-foreground">Email:</span>{" "}
                  {clienteSelecionado.email || "Não informado"}
                </p>
                <p>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  {clienteSelecionado.status || "ativo"}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="novo" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Nome <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={novoCliente.nome}
                  onChange={(e) => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                  placeholder="Nome completo"
                  disabled={blocked}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Telefone <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={novoCliente.telefone}
                  onChange={(e) => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
                  placeholder="84 123 4567"
                  disabled={blocked}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Email</Label>
                <Input
                  value={novoCliente.email}
                  onChange={(e) => setNovoCliente({ ...novoCliente, email: e.target.value })}
                  placeholder="cliente@email.com"
                  type="email"
                  disabled={blocked}
                />
              </div>
            </div>

            {clienteDuplicado && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Já existe um cliente com este telefone.</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleCriarCliente}
              className="w-full"
              disabled={blocked || isCreatingClient || clienteDuplicado}
            >
              {isCreatingClient ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando cliente...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Adicionar Cliente
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="sem">
            <p className="mt-4 text-sm text-muted-foreground">
              Venda será registrada sem cliente associado.
            </p>
          </TabsContent>
        </Tabs>
      </div>

      <div className={`rounded-lg bg-card p-6 shadow-sm ${blocked ? "opacity-70" : ""}`}>
        <h2 className="mb-4 text-lg font-semibold text-card-foreground">Produtos</h2>

        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={produtoSearch}
              onChange={(e) => setProdutoSearch(e.target.value)}
              placeholder="Pesquisar produto..."
              className="pl-9"
              disabled={blocked}
            />
          </div>

          <Select
            value={produtoSelecionadoId}
            onValueChange={setProdutoSelecionadoId}
            disabled={blocked}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecionar produto" />
            </SelectTrigger>
            <SelectContent>
              {produtosFiltrados.map((p) => (
                <SelectItem key={p.id} value={p.id ?? ""}>
                  {p.nome} - Stock: {p.stock} - {formatarMoeda(p.precoVenda)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={adicionarProduto} disabled={blocked}>
            + Adicionar
          </Button>
        </div>

        {produtoSelecionadoInfo && (
          <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium">{produtoSelecionadoInfo.nome}</p>
            <div className="mt-1 flex flex-wrap gap-3 text-muted-foreground">
              <span>Categoria: {produtoSelecionadoInfo.categoria}</span>
              <span>Fornecedor: {produtoSelecionadoInfo.fornecedor || "-"}</span>
              <span>SKU: {produtoSelecionadoInfo.sku || "-"}</span>
              <span>Stock: {produtoSelecionadoInfo.stock}</span>
            </div>
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="px-3 py-2 text-left text-muted-foreground">Produto</th>
                <th className="px-3 py-2 text-left text-muted-foreground">Preço</th>
                <th className="px-3 py-2 text-left text-muted-foreground">Quantidade</th>
                <th className="px-3 py-2 text-left text-muted-foreground">Stock</th>
                <th className="px-3 py-2 text-left text-muted-foreground">Subtotal</th>
                <th className="px-3 py-2 text-left text-muted-foreground">Ação</th>
              </tr>
            </thead>
            <tbody>
              {produtosSelecionados.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <ShoppingCart className="h-8 w-8 opacity-50" />
                      <p className="font-medium">Nenhum produto adicionado</p>
                    </div>
                  </td>
                </tr>
              )}

              {produtosSelecionados.map((p) => (
                <tr key={p.produto.id} className="border-b last:border-0">
                  <td className="px-3 py-3">
                    <div>
                      <div className="font-medium">{p.produto.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        <span>{p.produto.categoria}</span>
                        {p.produto.sku && <span> · {p.produto.sku}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">{formatarMoeda(p.produto.precoVenda)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => decrementarQuantidade(p.produto.id ?? "")}
                        disabled={blocked}
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        value={p.quantidade}
                        min={1}
                        max={p.produto.stock}
                        onChange={(e) =>
                          atualizarQuantidade(p.produto.id ?? "", Number(e.target.value))
                        }
                        className="w-20"
                        disabled={blocked}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => incrementarQuantidade(p.produto.id ?? "")}
                        disabled={blocked}
                      >
                        +
                      </Button>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={p.produto.stock < 10 ? "font-semibold text-destructive" : ""}>
                      {p.produto.stock}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-medium">{formatarMoeda(p.subtotal)}</td>
                  <td className="px-3 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removerProduto(p.produto.id ?? "")}
                      disabled={blocked}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Remover
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className={`rounded-lg bg-card p-6 shadow-sm ${blocked ? "opacity-70" : ""}`}>
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">Pagamento</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Método de Pagamento</Label>
                <Select
                  value={metodoPagamento}
                  onValueChange={(v: "dinheiro" | "cartao" | "transferencia") => setMetodoPagamento(v)}
                  disabled={blocked}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {metodoPagamento === "dinheiro" && (
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="space-y-2">
                    <Label>Valor Recebido (MZN)</Label>
                    <Input
                      type="number"
                      value={valorRecebido}
                      onChange={(e) => setValorRecebido(Number(e.target.value))}
                      min={0}
                      step="0.01"
                      disabled={blocked}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Troco (MZN)</Label>
                    <Input
                      value={troco.toFixed(2)}
                      readOnly
                      className={troco >= 0 ? "text-green-600" : "text-destructive"}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={`rounded-lg bg-card p-6 shadow-sm ${blocked ? "opacity-70" : ""}`}>
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">IVA</h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={tipoIVA === "percentual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTipoIVA("percentual")}
                  className="flex-1"
                  disabled={blocked}
                >
                  Percentual
                </Button>
                <Button
                  type="button"
                  variant={tipoIVA === "valor" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTipoIVA("valor")}
                  className="flex-1"
                  disabled={blocked}
                >
                  Valor Fixo
                </Button>
              </div>

              <div className="space-y-2">
                <Label>
                  {tipoIVA === "percentual" ? "Percentual de IVA (%)" : "Valor do IVA (MZN)"}
                </Label>
                <Input
                  type="number"
                  value={ivaValor}
                  onChange={(e) => setIvaValor(Math.max(0, Number(e.target.value)))}
                  min={0}
                  step={tipoIVA === "percentual" ? "0.1" : "0.01"}
                  disabled={blocked}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {[0, 5, 17].map((valor) => (
                  <Button
                    key={valor}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTipoIVA("percentual");
                      setIvaValor(valor);
                    }}
                    disabled={blocked}
                  >
                    {valor}%
                  </Button>
                ))}
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA Calculado:</span>
                <span className="font-medium">{formatarMoeda(ivaTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={`rounded-lg bg-card p-6 shadow-sm ${blocked ? "opacity-70" : ""}`}>
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">Desconto</h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={tipoDesconto === "percentual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTipoDesconto("percentual")}
                  className="flex-1"
                  disabled={blocked}
                >
                  Percentual
                </Button>
                <Button
                  type="button"
                  variant={tipoDesconto === "valor" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTipoDesconto("valor")}
                  className="flex-1"
                  disabled={blocked}
                >
                  Valor Fixo
                </Button>
              </div>

              <div className="space-y-2">
                <Label>
                  {tipoDesconto === "percentual"
                    ? "Percentual de Desconto (%)"
                    : "Valor do Desconto (MZN)"}
                </Label>
                <Input
                  type="number"
                  value={descontoValor}
                  onChange={(e) => {
                    const novoValor = Math.max(0, Number(e.target.value));

                    if (isVendedor && tipoDesconto === "percentual" && novoValor > limiteDesconto) {
                      toast({
                        title: "Limite excedido",
                        description: `Desconto máximo permitido é ${limiteDesconto}%.`,
                        variant: "destructive",
                      });
                      return;
                    }

                    setDescontoValor(novoValor);
                  }}
                  min={0}
                  max={tipoDesconto === "percentual" ? (isVendedor ? limiteDesconto : 100) : subtotal}
                  step={tipoDesconto === "percentual" ? "0.1" : "0.01"}
                  disabled={blocked}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {[0, 5, 10].map((valor) => (
                  <Button
                    key={valor}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTipoDesconto("percentual");
                      if (isVendedor && valor > limiteDesconto) return;
                      setDescontoValor(valor);
                    }}
                    disabled={blocked}
                  >
                    {valor}%
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className={`rounded-lg bg-card p-6 shadow-sm ${blocked ? "opacity-70" : ""}`}>
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">Resumo</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="text-card-foreground">{formatarMoeda(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  IVA ({tipoIVA === "percentual" ? ivaValor + "%" : "fixo"}):
                </span>
                <span className="text-card-foreground">{formatarMoeda(ivaTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Desconto ({tipoDesconto === "percentual" ? descontoValor + "%" : "fixo"}):
                </span>
                <span className="text-card-foreground">- {formatarMoeda(descontoTotal)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-card-foreground">Total Geral:</span>
                  <span className="text-primary">{formatarMoeda(totalGeral)}</span>
                </div>
              </div>
            </div>

            <Button
              className="mt-6 w-full"
              size="lg"
              onClick={finalizarVenda}
              disabled={blocked || isFinalizando || produtosSelecionados.length === 0}
            >
              {isFinalizando ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                "Finalizar Venda"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NovaVenda;