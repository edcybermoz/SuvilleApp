import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const AppHeader = () => {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar..."
          className="pl-9"
        />
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-foreground">
          Administrador Geral
        </span>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
          admin
        </span>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
          A
        </div>
        <button className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
