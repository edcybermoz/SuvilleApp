import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

const vendasMock = [
  { id: 1, cliente: "João Silva", data: "2025-06-29", total: "2.500,00 MZN", status: "Concluída" },
  { id: 2, cliente: "Maria Santos", data: "2025-06-28", total: "1.200,00 MZN", status: "Concluída" },
  { id: 3, cliente: "Pedro Almeida", data: "2025-06-28", total: "850,00 MZN", status: "Pendente" },
];

const Vendas = () => {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Gestão de Vendas</h1>
        <Link to="/vendas/nova">
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" /> Nova Venda
          </Button>
        </Link>
      </div>

      <div className="mb-4 relative w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Pesquisar vendas..." className="pl-9" />
      </div>

      <div className="overflow-hidden rounded-lg bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {vendasMock.map((v) => (
              <tr key={v.id} className="border-b last:border-0">
                <td className="px-4 py-3 text-card-foreground">{v.id}</td>
                <td className="px-4 py-3 text-card-foreground">{v.cliente}</td>
                <td className="px-4 py-3 text-card-foreground">{v.data}</td>
                <td className="px-4 py-3 font-medium text-card-foreground">{v.total}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    v.status === "Concluída"
                      ? "bg-accent/10 text-accent"
                      : "bg-warning/10 text-warning"
                  }`}>
                    {v.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="sm">Ver</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Vendas;
