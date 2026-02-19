import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Configuracoes = () => {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Configurações</h1>
      <div className="max-w-2xl space-y-6">
        <div className="rounded-lg bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-card-foreground">Dados da Empresa</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Nome da Empresa</Label><Input defaultValue="VILLESys" /></div>
            <div><Label>NUIT</Label><Input placeholder="Número de contribuinte" /></div>
            <div><Label>Telefone</Label><Input placeholder="+258 84 ..." /></div>
            <div><Label>Email</Label><Input type="email" placeholder="empresa@email.com" /></div>
            <div className="col-span-2"><Label>Endereço</Label><Input placeholder="Endereço completo" /></div>
          </div>
          <Button className="mt-4">Salvar Alterações</Button>
        </div>

        <div className="rounded-lg bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-card-foreground">Configurações de IVA</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Taxa de IVA Padrão (%)</Label><Input type="number" defaultValue="16" /></div>
            <div><Label>Moeda</Label><Input defaultValue="MZN" readOnly /></div>
          </div>
          <Button className="mt-4">Salvar</Button>
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
