import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";

const produtosMock = [
  { id: 1, nome: "Arroz 25kg", categoria: "Alimentos", preco: "1.200,00 MZN", stock: 45 },
  { id: 2, nome: "Óleo de Cozinha 5L", categoria: "Alimentos", preco: "350,00 MZN", stock: 23 },
  { id: 3, nome: "Cimento 50kg", categoria: "Construção", preco: "550,00 MZN", stock: 8 },
];

const Produtos = () => {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Gestão de Produtos</h1>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Novo Produto</Button>
      </div>
      <div className="mb-4 relative w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Pesquisar produtos..." className="pl-9" />
      </div>
      <div className="overflow-hidden rounded-lg bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Categoria</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Preço</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Stock</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtosMock.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="px-4 py-3">{p.id}</td>
                <td className="px-4 py-3 font-medium">{p.nome}</td>
                <td className="px-4 py-3">{p.categoria}</td>
                <td className="px-4 py-3">{p.preco}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    p.stock < 10 ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent"
                  }`}>{p.stock}</span>
                </td>
                <td className="px-4 py-3 flex gap-1">
                  <Button variant="ghost" size="sm">Editar</Button>
                  <Button variant="ghost" size="sm" className="text-destructive">Excluir</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Produtos;
