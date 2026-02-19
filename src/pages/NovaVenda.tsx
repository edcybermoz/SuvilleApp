import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const NovaVenda = () => {
  const [produtos, setProdutos] = useState<{ nome: string; preco: number; qtd: number }[]>([]);
  const [metodo, setMetodo] = useState("dinheiro");

  const subtotal = produtos.reduce((s, p) => s + p.preco * p.qtd, 0);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-foreground">Registrar Nova Venda</h1>
      <p className="mb-6 text-sm text-muted-foreground">Cliente: Nenhum selecionado</p>

      {/* Cliente */}
      <div className="mb-6 rounded-lg bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-card-foreground">Informações do Cliente</h2>
          <span className="rounded bg-destructive px-2.5 py-0.5 text-xs font-semibold text-destructive-foreground">
            Opcional
          </span>
        </div>
        <Tabs defaultValue="existente">
          <TabsList>
            <TabsTrigger value="existente">Cliente Existente</TabsTrigger>
            <TabsTrigger value="novo">Novo Cliente</TabsTrigger>
            <TabsTrigger value="sem">Sem Cliente</TabsTrigger>
          </TabsList>
          <TabsContent value="existente" className="mt-4 space-y-3">
            <Input placeholder="Pesquisar cliente..." />
          </TabsContent>
          <TabsContent value="novo" className="mt-4 grid grid-cols-2 gap-4">
            <div><Label>Nome</Label><Input placeholder="Nome" /></div>
            <div><Label>Telefone</Label><Input placeholder="Telefone" /></div>
            <Button className="col-span-2">+ Adicionar Cliente</Button>
          </TabsContent>
          <TabsContent value="sem">
            <p className="mt-4 text-sm text-muted-foreground">Venda sem cliente associado.</p>
          </TabsContent>
        </Tabs>
      </div>

      {/* Produtos */}
      <div className="mb-6 rounded-lg bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-card-foreground">Produtos</h2>
        <table className="mb-4 w-full text-sm">
          <thead className="border-b">
            <tr>
              <th className="px-3 py-2 text-left text-muted-foreground">Produto</th>
              <th className="px-3 py-2 text-left text-muted-foreground">Preço Unitário (MZN)</th>
              <th className="px-3 py-2 text-left text-muted-foreground">IVA (%)</th>
              <th className="px-3 py-2 text-left text-muted-foreground">Quantidade</th>
              <th className="px-3 py-2 text-left text-muted-foreground">Subtotal (MZN)</th>
              <th className="px-3 py-2 text-left text-muted-foreground">Ação</th>
            </tr>
          </thead>
          <tbody>
            {produtos.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum produto adicionado</td></tr>
            )}
          </tbody>
        </table>
        <Button variant="outline" size="sm">+ Adicionar Produto</Button>
      </div>

      {/* Pagamento */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-card-foreground">Pagamento</h2>
          <h3 className="mb-3 font-medium text-card-foreground">Método de Pagamento</h3>
          <div className="space-y-3 rounded-lg border border-accent/30 bg-accent/5 p-4">
            <label className="flex items-center gap-2">
              <input type="radio" name="metodo" value="dinheiro" checked={metodo === "dinheiro"} onChange={() => setMetodo("dinheiro")} className="text-primary" />
              <span className="font-medium text-card-foreground">Dinheiro</span>
            </label>
            {metodo === "dinheiro" && (
              <div className="space-y-3 pl-6">
                <div><Label>Valor Recebido (MZN)</Label><Input type="number" placeholder="0,00" /></div>
                <div><Label>Troco (MZN)</Label><Input value="0.00" readOnly /></div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-card p-6 shadow-sm">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="text-card-foreground">{subtotal.toFixed(2)} MZN</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Desconto:</span>
              <span className="text-card-foreground">0,00 MZN</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IVA Total:</span>
              <span className="text-card-foreground">0,00 MZN</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span className="text-card-foreground">Total Geral:</span>
                <span className="text-card-foreground">{subtotal.toFixed(2)} MZN</span>
              </div>
            </div>
          </div>
          <Button className="mt-6 w-full" size="lg">
            Finalizar Venda
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NovaVenda;
