import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Download } from "lucide-react";

const usuariosMock = [
  { id: 1, nome: "Admin", email: "admin@villesys.com", tipo: "Administrador", data: "01/01/2025" },
  { id: 2, nome: "Vendedor 1", email: "vendedor@villesys.com", tipo: "Vendedor", data: "15/03/2025" },
  { id: 3, nome: "Edson Nhanombe", email: "edson@villesys.com", tipo: "Administrador", data: "15/07/2025" },
];

const Usuarios = () => {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
        <div className="flex gap-3">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Novo Usuário</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Usuário</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Nome Completo *</Label><Input /></div>
                <div><Label>Senha *</Label><Input type="password" /><p className="text-xs text-muted-foreground mt-1">Mínimo 6 caracteres</p></div>
                <div><Label>Email *</Label><Input type="email" /></div>
                <div>
                  <Label>Tipo *</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2"><Label>Telefone</Label><Input placeholder="Ex: +258 84 1234567" /></div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button>Salvar Usuário</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Exportar</Button>
        </div>
      </div>

      <div className="mb-4 relative w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Pesquisar usuários..." className="pl-9" />
      </div>

      <div className="overflow-hidden rounded-lg bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome Completo</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data Registro</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuariosMock.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="px-4 py-3">{u.id}</td>
                <td className="px-4 py-3 font-medium">{u.nome}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    u.tipo === "Administrador" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                  }`}>{u.tipo}</span>
                </td>
                <td className="px-4 py-3">{u.data}</td>
                <td className="px-4 py-3 flex gap-1">
                  <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Usuarios;
