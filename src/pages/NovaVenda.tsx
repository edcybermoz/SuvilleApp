// src/pages/NovaVenda.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  listenClientes, 
  Cliente, 
  listenProdutos, 
  Produto,
  createCliente,
  createVenda,
  VendaInput,
} from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const { userData, isAdmin, isVendedor } = useAuth();
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [novoCliente, setNovoCliente] = useState<NovoCliente>({
    nome: "",
    telefone: "",
    email: ""
  });
  const [tipoCliente, setTipoCliente] = useState<"existente" | "novo" | "sem">("existente");

  const [produtosDisponiveis, setProdutosDisponiveis] = useState<Produto[]>([]);
  const [produtosSelecionados, setProdutosSelecionados] = useState<VendaProduto[]>([]);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState<string>("");

  const [metodoPagamento, setMetodoPagamento] = useState<"dinheiro" | "cartao" | "transferencia">("dinheiro");
  const [valorRecebido, setValorRecebido] = useState<number>(0);
  
  const [tipoIVA, setTipoIVA] = useState<"percentual" | "valor">("percentual");
  const [ivaValor, setIvaValor] = useState<number>(17);
  
  const [tipoDesconto, setTipoDesconto] = useState<"percentual" | "valor">("percentual");
  const [descontoValor, setDescontoValor] = useState<number>(0);
  
  const [isFinalizando, setIsFinalizando] = useState(false);

  const limiteDesconto = isVendedor ? (userData?.limiteDesconto || 10) : 100;

  useEffect(() => {
    const unsubClientes = listenClientes(setClientes);
    const unsubProdutos = listenProdutos(setProdutosDisponiveis);
    return () => {
      unsubClientes();
      unsubProdutos();
    };
  }, []);

  const adicionarProduto = () => {
    const produto = produtosDisponiveis.find(p => p.id === produtoSelecionadoId);
    if (!produto) {
      toast({
        title: "Erro",
        description: "Selecione um produto válido",
        variant: "destructive",
      });
      return;
    }

    if (produto.stock <= 0) {
      toast({
        title: "Erro",
        description: "Produto sem stock disponível",
        variant: "destructive",
      });
      return;
    }

    const existe = produtosSelecionados.find(p => p.produto.id === produto.id);
    if (existe) {
      toast({
        title: "Aviso",
        description: "Produto já adicionado. Ajuste a quantidade.",
      });
      return;
    }

    setProdutosSelecionados([
      ...produtosSelecionados,
      { produto, quantidade: 1, subtotal: produto.precoVenda }
    ]);
    setProdutoSelecionadoId("");
  };

  const atualizarQuantidade = (id: string, qtd: number) => {
    if (qtd < 1) return;
    
    setProdutosSelecionados(ps =>
      ps.map(p => {
        if (p.produto.id === id) {
          if (qtd > p.produto.stock) {
            toast({
              title: "Aviso",
              description: `Stock máximo disponível: ${p.produto.stock}`,
            });
            return p;
          }
          return { ...p, quantidade: qtd, subtotal: qtd * p.produto.precoVenda };
        }
        return p;
      })
    );
  };

  const removerProduto = (id: string) => {
    setProdutosSelecionados(ps => ps.filter(p => p.produto.id !== id));
  };

  const subtotal = produtosSelecionados.reduce((s, p) => s + p.subtotal, 0);
  
  const calcularIVA = () => {
    if (tipoIVA === "percentual") {
      return subtotal * (ivaValor / 100);
    } else {
      return ivaValor;
    }
  };
  const ivaTotal = calcularIVA();
  
  const calcularDesconto = () => {
    if (tipoDesconto === "percentual") {
      return subtotal * (descontoValor / 100);
    } else {
      return descontoValor;
    }
  };
  const descontoTotal = calcularDesconto();
  
  const totalGeral = subtotal + ivaTotal - descontoTotal;
  const troco = metodoPagamento === "dinheiro" ? valorRecebido - totalGeral : 0;

  const handleCriarCliente = async () => {
    if (!novoCliente.nome || !novoCliente.telefone) {
      toast({
        title: "Erro",
        description: "Nome e telefone são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      const clienteRef = await createCliente({
        nome: novoCliente.nome,
        telefone: novoCliente.telefone,
        email: novoCliente.email,
      }, isVendedor ? userData?.id : undefined);

      const clienteCriado: Cliente = {
        id: clienteRef.id,
        ...novoCliente,
        totalCompras: 0,
      };

      setClienteSelecionado(clienteCriado);
      setTipoCliente("existente");
      
      toast({
        title: "Sucesso",
        description: "Cliente criado com sucesso",
      });

      setNovoCliente({ nome: "", telefone: "", email: "" });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar cliente",
        variant: "destructive",
      });
    }
  };

  const finalizarVenda = async () => {
    if (produtosSelecionados.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um produto à venda",
        variant: "destructive",
      });
      return;
    }

    if (metodoPagamento === "dinheiro" && valorRecebido < totalGeral) {
      toast({
        title: "Erro",
        description: "Valor recebido é menor que o total da venda",
        variant: "destructive",
      });
      return;
    }

    if (isVendedor && tipoDesconto === "percentual" && descontoValor > limiteDesconto) {
      toast({
        title: "Erro",
        description: `Desconto máximo permitido é ${limiteDesconto}%`,
        variant: "destructive",
      });
      return;
    }

    setIsFinalizando(true);

    try {
      const vendaData: VendaInput = {
        clienteId: clienteSelecionado?.id || null,
        clienteNome: clienteSelecionado?.nome || "Cliente não identificado",
        produtos: produtosSelecionados.map(p => ({
          produtoId: p.produto.id!,
          nome: p.produto.nome,
          quantidade: p.quantidade,
          precoUnitario: p.produto.precoVenda,
          subtotal: p.subtotal
        })),
        subtotal,
        iva: ivaTotal,
        desconto: descontoTotal,
        total: totalGeral,
        metodoPagamento,
        status: "concluida",
        valorRecebido: metodoPagamento === "dinheiro" ? valorRecebido : undefined,
        troco: metodoPagamento === "dinheiro" ? troco : undefined,
        vendedorId: isVendedor ? userData?.id : undefined,
      };

      await createVenda(vendaData);

      toast({
        title: "Sucesso!",
        description: "Venda finalizada com sucesso",
      });

      setProdutosSelecionados([]);
      setClienteSelecionado(null);
      setValorRecebido(0);
      setDescontoValor(0);
      
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao finalizar venda",
        variant: "destructive",
      });
    } finally {
      setIsFinalizando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Registrar Nova Venda</h1>
          <p className="text-sm text-muted-foreground">
            Cliente: {clienteSelecionado ? clienteSelecionado.nome : "Nenhum selecionado"}
          </p>
        </div>
      </div>

      {isVendedor && (
        <Alert className="bg-warning/10 border-warning">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning">
            Limite de desconto para vendedores: {limiteDesconto}%
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-card-foreground">Informações do Cliente</h2>
        <Tabs value={tipoCliente} onValueChange={(v) => setTipoCliente(v as typeof tipoCliente)}>
          <TabsList>
            <TabsTrigger value="existente">Cliente Existente</TabsTrigger>
            <TabsTrigger value="novo">Novo Cliente</TabsTrigger>
            <TabsTrigger value="sem">Sem Cliente</TabsTrigger>
          </TabsList>

          <TabsContent value="existente" className="mt-4">
            <Select 
              value={clienteSelecionado?.id ?? ""} 
              onValueChange={(v) => {
                const c = clientes.find(cli => cli.id === v) || null;
                setClienteSelecionado(c);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map(c => (
                  <SelectItem key={c.id} value={c.id ?? ""}>
                    {c.nome} - {c.telefone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TabsContent>

          <TabsContent value="novo" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome <span className="text-destructive">*</span></Label>
                <Input 
                  value={novoCliente.nome} 
                  onChange={e => setNovoCliente({...novoCliente, nome: e.target.value})}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone <span className="text-destructive">*</span></Label>
                <Input 
                  value={novoCliente.telefone} 
                  onChange={e => setNovoCliente({...novoCliente, telefone: e.target.value})}
                  placeholder="84 123 4567"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Email</Label>
                <Input 
                  value={novoCliente.email} 
                  onChange={e => setNovoCliente({...novoCliente, email: e.target.value})}
                  placeholder="cliente@email.com"
                  type="email"
                />
              </div>
            </div>
            <Button onClick={handleCriarCliente} className="w-full">
              + Adicionar Cliente
            </Button>
          </TabsContent>

          <TabsContent value="sem">
            <p className="mt-4 text-sm text-muted-foreground">
              Venda será registrada sem cliente associado.
            </p>
          </TabsContent>
        </Tabs>
      </div>

      <div className="rounded-lg bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-card-foreground">Produtos</h2>

        <div className="mb-4 flex gap-2">
          <Select value={produtoSelecionadoId} onValueChange={setProdutoSelecionadoId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecionar produto" />
            </SelectTrigger>
            <SelectContent>
              {produtosDisponiveis
                .filter(p => p.stock > 0)
                .map(p => (
                  <SelectItem key={p.id} value={p.id ?? ""}>
                    {p.nome} - Stock: {p.stock} - {p.precoVenda.toLocaleString("pt-MZ")} MZN
                  </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={adicionarProduto}>+ Adicionar</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="px-3 py-2 text-left text-muted-foreground">Produto</th>
                <th className="px-3 py-2 text-left text-muted-foreground">Preço (MZN)</th>
                <th className="px-3 py-2 text-left text-muted-foreground">Quantidade</th>
                <th className="px-3 py-2 text-left text-muted-foreground">Stock Disp.</th>
                <th className="px-3 py-2 text-left text-muted-foreground">Subtotal (MZN)</th>
                <th className="px-3 py-2 text-left text-muted-foreground">Ação</th>
              </tr>
            </thead>
            <tbody>
              {produtosSelecionados.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhum produto adicionado
                  </td>
                </tr>
              )}
              {produtosSelecionados.map(p => (
                <tr key={p.produto.id}>
                  <td className="px-3 py-2 font-medium">{p.produto.nome}</td>
                  <td className="px-3 py-2">{p.produto.precoVenda.toLocaleString("pt-MZ")}</td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      value={p.quantidade}
                      min={1}
                      max={p.produto.stock}
                      onChange={e => atualizarQuantidade(p.produto.id ?? "", Number(e.target.value))}
                      className="w-20"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span className={p.produto.stock < 10 ? "text-destructive font-semibold" : ""}>
                      {p.produto.stock}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium">{p.subtotal.toLocaleString("pt-MZ")}</td>
                  <td className="px-3 py-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => removerProduto(p.produto.id ?? "")}
                    >
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
          <div className="rounded-lg bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">Pagamento</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Método de Pagamento</Label>
                <Select value={metodoPagamento} onValueChange={(v: any) => setMetodoPagamento(v)}>
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
                      onChange={e => setValorRecebido(Number(e.target.value))}
                      min={0}
                      step="0.01"
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

          <div className="rounded-lg bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">IVA</h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={tipoIVA === "percentual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTipoIVA("percentual")}
                  className="flex-1"
                >
                  Percentual
                </Button>
                <Button
                  type="button"
                  variant={tipoIVA === "valor" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTipoIVA("valor")}
                  className="flex-1"
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
                  onChange={e => setIvaValor(Number(e.target.value))}
                  min={0}
                  step={tipoIVA === "percentual" ? "0.1" : "0.01"}
                />
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA Calculado:</span>
                <span className="font-medium">{ivaTotal.toFixed(2)} MZN</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">Desconto</h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={tipoDesconto === "percentual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTipoDesconto("percentual")}
                  className="flex-1"
                >
                  Percentual
                </Button>
                <Button
                  type="button"
                  variant={tipoDesconto === "valor" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTipoDesconto("valor")}
                  className="flex-1"
                >
                  Valor Fixo
                </Button>
              </div>

              <div className="space-y-2">
                <Label>
                  {tipoDesconto === "percentual" ? "Percentual de Desconto (%)" : "Valor do Desconto (MZN)"}
                </Label>
                <Input
                  type="number"
                  value={descontoValor}
                  onChange={e => {
                    const novoValor = Number(e.target.value);
                    if (isVendedor && tipoDesconto === "percentual" && novoValor > limiteDesconto) {
                      toast({
                        title: "Aviso",
                        description: `Desconto máximo permitido é ${limiteDesconto}%`,
                        variant: "destructive",
                      });
                      return;
                    }
                    setDescontoValor(novoValor);
                  }}
                  min={0}
                  max={tipoDesconto === "percentual" ? (isVendedor ? limiteDesconto : 100) : subtotal}
                  step={tipoDesconto === "percentual" ? "0.1" : "0.01"}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">Resumo</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="text-card-foreground">{subtotal.toFixed(2)} MZN</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA ({tipoIVA === "percentual" ? ivaValor + "%" : "fixo"}):</span>
                <span className="text-card-foreground">{ivaTotal.toFixed(2)} MZN</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Desconto ({tipoDesconto === "percentual" ? descontoValor + "%" : "fixo"}):</span>
                <span className="text-card-foreground">- {descontoTotal.toFixed(2)} MZN</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-card-foreground">Total Geral:</span>
                  <span className="text-primary">{totalGeral.toFixed(2)} MZN</span>
                </div>
              </div>
            </div>

            <Button 
              className="mt-6 w-full" 
              size="lg"
              onClick={finalizarVenda}
              disabled={isFinalizando || produtosSelecionados.length === 0}
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