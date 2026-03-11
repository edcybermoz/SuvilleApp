import { useEffect, useMemo, useState } from "react";
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
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, isAdmin } = useAuth();
  const { t } = useLanguage();

  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = useMemo(
    () => [
      { icon: LayoutDashboard, label: t("menu.dashboard", "Dashboard"), path: "/" },
      { icon: ShoppingCart, label: t("menu.vendas", "Vendas"), path: "/vendas" },
      { icon: Users, label: t("menu.clientes", "Clientes"), path: "/clientes" },
      { icon: Package, label: t("menu.produtos", "Produtos"), path: "/produtos" },
      { icon: Tags, label: t("menu.categorias", "Categorias"), path: "/categorias" },
      {
        icon: UserCog,
        label: t("menu.usuarios", "Usuários"),
        path: "/usuarios",
        adminOnly: true,
      },
      {
        icon: BarChart3,
        label: t("menu.relatorios", "Relatórios"),
        path: "/relatorios",
        adminOnly: true,
      },
      {
        icon: Settings,
        label: t("menu.configuracoes", "Configurações"),
        path: "/configuracoes",
        adminOnly: true,
      },
    ],
    [t]
  );

  const filteredMenu = menuItems.filter(
    (item) => !item.adminOnly || (item.adminOnly && isAdmin)
  );

  const isActiveRoute = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleNavigateMobile = () => {
    setMobileOpen(false);
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      <div className="fixed left-0 top-0 z-50 flex h-16 w-full items-center justify-between border-b bg-sidebar-bg px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-primary-foreground">VILLESys</span>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="rounded-lg p-2 text-sidebar-fg transition-colors hover:bg-sidebar-hover hover:text-primary-foreground"
          aria-label={
            mobileOpen
              ? t("sidebar.closeMenu", "Fechar menu")
              : t("sidebar.openMenu", "Abrir menu")
          }
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <button
          type="button"
          aria-label={t("sidebar.closeMenu", "Fechar menu")}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 z-50 flex h-screen w-60 flex-col bg-sidebar-bg transition-transform duration-300
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="flex items-center gap-2 px-6 py-6 lg:py-6 pt-20 lg:pt-6">
          <ShoppingBag className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold text-primary-foreground">VILLESys</span>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {filteredMenu.map((item) => {
            const isActive = isActiveRoute(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleNavigateMobile}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-active text-primary-foreground"
                    : "text-sidebar-fg hover:bg-sidebar-hover hover:text-primary-foreground"
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-6">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-sidebar-fg transition-colors hover:bg-sidebar-hover hover:text-primary-foreground"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="truncate">{t("common.logout", "Sair")}</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;