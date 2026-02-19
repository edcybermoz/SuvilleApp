import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";

const clientesMock = [
  { id: 1, nome: "João Silva", telefone: "+258 84 1234567", email: "joao@email.com", totalCompras: "15.000,00 MZN" },
  { id: 2, nome: "Maria Santos", telefone: "+258 82 7654321", email: "maria@email.com", totalCompras: "8.500,00 MZN" },
];

const Clientes = () => {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Gestão de Clientes</h1>
        <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Novo Cliente</Button>
      </div>
      <div className="mb-4 relative w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Pesquisar clientes..." className="pl-9" />
      </div>
      <div className="overflow-hidden rounded-lg bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Telefone</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total Compras</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {clientesMock.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="px-4 py-3">{c.id}</td>
                <td className="px-4 py-3 font-medium">{c.nome}</td>
                <td className="px-4 py-3">{c.telefone}</td>
                <td className="px-4 py-3">{c.email}</td>
                <td className="px-4 py-3 font-medium">{c.totalCompras}</td>
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

export default Clientes;
