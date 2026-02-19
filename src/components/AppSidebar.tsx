import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Tags,
  UserCog,
  BarChart3,
  Settings,
  LogOut,
  ShoppingBag,
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: ShoppingCart, label: "Vendas", path: "/vendas" },
  { icon: Users, label: "Clientes", path: "/clientes" },
  { icon: Package, label: "Produtos", path: "/produtos" },
  { icon: Tags, label: "Categorias", path: "/categorias" },
  { icon: UserCog, label: "Usuários", path: "/usuarios" },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
  { icon: Settings, label: "Configurações", path: "/configuracoes" },
];

const AppSidebar = () => {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col bg-sidebar-bg">
      <div className="flex items-center gap-2 px-6 py-6">
        <ShoppingBag className="h-7 w-7 text-primary" />
        <span className="text-xl font-bold text-primary-foreground">
          VILLESys
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {menuItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-active text-primary-foreground"
                  : "text-sidebar-fg hover:bg-sidebar-hover hover:text-primary-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-6">
        <button className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-sidebar-fg transition-colors hover:bg-sidebar-hover hover:text-primary-foreground">
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
