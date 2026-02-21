import { Link, useLocation, useNavigate } from "react-router-dom";
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
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: ShoppingCart, label: "Vendas", path: "/vendas" },
  { icon: Users, label: "Clientes", path: "/clientes" },
  { icon: Package, label: "Produtos", path: "/produtos" },
  { icon: Tags, label: "Categorias", path: "/categorias" },
  { icon: UserCog, label: "Usuários", path: "/usuarios", adminOnly: true },
  { icon: BarChart3, label: "Relatórios", path: "/relatorios", adminOnly: true },
  { icon: Settings, label: "Configurações", path: "/configuracoes", adminOnly: true },
];

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, isAdmin, userData } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const filteredMenu = menuItems.filter(item => 
    !item.adminOnly || (item.adminOnly && isAdmin)
  );

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col bg-sidebar-bg">
      <div className="flex items-center gap-2 px-6 py-6">
        <ShoppingBag className="h-7 w-7 text-primary" />
        <span className="text-xl font-bold text-primary-foreground">VILLESys</span>
      </div>

      <div className="px-3 mb-4">
        <p className="text-xs text-sidebar-fg/60 px-4">Bem-vindo,</p>
        <p className="text-sm font-medium text-sidebar-fg px-4 truncate">
          {userData?.nome || "Usuário"}
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {filteredMenu.map((item) => {
          const isActive = location.pathname === item.path;
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
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-sidebar-fg transition-colors hover:bg-sidebar-hover hover:text-primary-foreground"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;