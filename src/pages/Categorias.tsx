import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";

const categoriasMock = [
  { id: 1, nome: "Alimentos", produtos: 25 },
  { id: 2, nome: "Bebidas", produtos: 18 },
  { id: 3, nome: "Construção", produtos: 12 },
  { id: 4, nome: "Limpeza", produtos: 8 },
];

const Categorias = () => {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Gestão de Categorias</h1>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Nova Categoria</Button>
      </div>
      <div className="mb-4 relative w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Pesquisar categorias..." className="pl-9" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categoriasMock.map((c) => (
          <div key={c.id} className="rounded-lg bg-card p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-card-foreground">{c.nome}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.produtos} produtos</p>
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" size="sm">Editar</Button>
              <Button variant="ghost" size="sm" className="text-destructive">Excluir</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Categorias;
