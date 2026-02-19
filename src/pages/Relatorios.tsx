import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const vendaPeriodo = [
  { data: "23/06", vendas: 3, valor: 4500 },
  { data: "24/06", vendas: 5, valor: 7200 },
  { data: "25/06", vendas: 2, valor: 1800 },
  { data: "26/06", vendas: 7, valor: 9500 },
  { data: "27/06", vendas: 4, valor: 5200 },
  { data: "28/06", vendas: 6, valor: 8100 },
  { data: "29/06", vendas: 8, valor: 11500 },
];

const metodosPagamento = [
  { name: "Dinheiro", value: 65 },
  { name: "M-Pesa", value: 25 },
  { name: "Transferência", value: 10 },
];
const COLORS = ["hsl(210 80% 50%)", "hsl(160 55% 42%)", "hsl(40 90% 55%)"];

const Relatorios = () => {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Relatórios Analíticos</h1>
        <div className="flex gap-3">
          <Button size="sm"><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
          <Button variant="destructive" size="sm"><Download className="mr-2 h-4 w-4" /> Exportar</Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex items-end gap-4 rounded-lg bg-card p-4 shadow-sm">
        <div>
          <Label className="text-primary">Data Inicial</Label>
          <Input type="date" defaultValue="2025-05-30" />
        </div>
        <div>
          <Label className="text-primary">Data Final</Label>
          <Input type="date" defaultValue="2025-06-29" />
        </div>
        <Button className="min-w-[200px]">Aplicar Filtros</Button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total de Vendas", value: "35" },
          { label: "Valor Total", value: "47.800,00 MZN" },
          { label: "Média Diária", value: "1.593,33 MZN" },
          { label: "Dias Analisados", value: "30" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-card p-5 text-center shadow-sm">
            <p className="text-2xl font-bold text-card-foreground">{s.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="col-span-2 rounded-lg bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-card-foreground">Vendas por Período</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vendaPeriodo}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 25% 90%)" />
              <XAxis dataKey="data" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="vendas" fill="hsl(210 80% 50%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="valor" fill="hsl(160 55% 42%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-card-foreground">Métodos de Pagamento</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={metodosPagamento} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {metodosPagamento.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;
