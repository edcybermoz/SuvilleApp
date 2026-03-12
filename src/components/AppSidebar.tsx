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

type MenuItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  adminOnly?: boolean;
};

const AppSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, isAdmin } = useAuth();
  const { t } = useLanguage();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const menuItems = useMemo<MenuItem[]>(
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

  const filteredMenu = useMemo(
    () => menuItems.filter((item) => !item.adminOnly || isAdmin),
    [menuItems, isAdmin]
  );

  const isActiveRoute = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      setMobileOpen(false);
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Erro ao terminar sessão:", error);
    } finally {
      setLoggingOut(false);
    }
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

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <>
      <div className="sidebar-surface fixed left-0 top-0 z-50 flex h-16 w-full items-center justify-between px-4 lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ShoppingBag className="h-5 w-5" />
          </div>

          <div className="flex min-w-0 flex-col justify-center">
            <span className="truncate text-[16px] font-semibold leading-none text-sidebar-fg">
              VILLESys
            </span>
            <span className="mt-1 truncate text-[10px] leading-none text-sidebar-fg/70">
              {t("sidebar.systemName", "Sistema de gestão de vendas")}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-sidebar-fg transition-colors hover:bg-sidebar-hover"
          aria-label={
            mobileOpen
              ? t("sidebar.closeMenu", "Fechar menu")
              : t("sidebar.openMenu", "Abrir menu")
          }
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <button
          type="button"
          aria-label={t("sidebar.closeMenu", "Fechar menu")}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`sidebar-surface custom-scrollbar fixed left-0 top-0 z-50 flex h-screen w-60 flex-col overflow-y-auto transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex min-h-[84px] items-center gap-3 px-4 pb-4 pt-20 lg:pt-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <ShoppingBag className="h-6 w-6" />
          </div>

          <div className="flex min-w-0 flex-col justify-center">
            <p className="truncate text-[17px] font-semibold leading-none text-sidebar-fg">
              VILLESys
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 pb-4">
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-sidebar-fg/60">
            {t("sidebar.navigation", "Navegação")}
          </div>

          <div className="space-y-1">
            {filteredMenu.map((item) => {
              const isActive = isActiveRoute(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleNavigateMobile}
                  className={isActive ? "sidebar-item-active" : "sidebar-item text-sidebar-fg"}
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t px-3 py-4" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
          <button
            onClick={handleLogout}
            type="button"
            disabled={loggingOut}
            className="sidebar-item w-full text-sidebar-fg disabled:opacity-60"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="truncate">
              {loggingOut
                ? t("header.actions.loggingOut", "A sair...")
                : t("common.logout", "Sair")}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;