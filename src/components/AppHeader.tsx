import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Settings,
  User,
  CheckCheck,
  RefreshCcw,
  Mail,
  ShieldCheck,
  Phone,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const AppHeader = () => {
  const { userData, firebaseUser, logout, isAdmin, isVendedor } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const profileRef = useRef<HTMLDivElement | null>(null);
  const notificationRef = useRef<HTMLDivElement | null>(null);

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: t("header.notifications.items.newAccess.title", "Novo acesso detectado"),
      message: t(
        "header.notifications.items.newAccess.message",
        "A tua conta foi iniciada com sucesso."
      ),
      read: false,
      time: t("header.notifications.items.newAccess.time", "Agora mesmo"),
    },
    {
      id: 2,
      title: t("header.notifications.items.profileUpdated.title", "Perfil atualizado"),
      message: t(
        "header.notifications.items.profileUpdated.message",
        "Os teus dados foram sincronizados."
      ),
      read: false,
      time: t("header.notifications.items.profileUpdated.time", "Há 10 min"),
    },
    {
      id: 3,
      title: t("header.notifications.items.welcome.title", "Bem-vindo ao sistema"),
      message: t(
        "header.notifications.items.welcome.message",
        "Explora as funcionalidades disponíveis."
      ),
      read: true,
      time: t("header.notifications.items.welcome.time", "Ontem"),
    },
  ]);

  useEffect(() => {
    setNotifications((prev) =>
      prev.map((item) => {
        if (item.id === 1) {
          return {
            ...item,
            title: t("header.notifications.items.newAccess.title", "Novo acesso detectado"),
            message: t(
              "header.notifications.items.newAccess.message",
              "A tua conta foi iniciada com sucesso."
            ),
            time: t("header.notifications.items.newAccess.time", "Agora mesmo"),
          };
        }

        if (item.id === 2) {
          return {
            ...item,
            title: t("header.notifications.items.profileUpdated.title", "Perfil atualizado"),
            message: t(
              "header.notifications.items.profileUpdated.message",
              "Os teus dados foram sincronizados."
            ),
            time: t("header.notifications.items.profileUpdated.time", "Há 10 min"),
          };
        }

        if (item.id === 3) {
          return {
            ...item,
            title: t("header.notifications.items.welcome.title", "Bem-vindo ao sistema"),
            message: t(
              "header.notifications.items.welcome.message",
              "Explora as funcionalidades disponíveis."
            ),
            time: t("header.notifications.items.welcome.time", "Ontem"),
          };
        }

        return item;
      })
    );
  }, [t]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const getInitials = () => {
    const nomeBase =
      userData?.nome ||
      firebaseUser?.displayName ||
      firebaseUser?.email ||
      t("header.user.defaultName", "Utilizador");

    return nomeBase
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const nomeUtilizador =
    userData?.nome ||
    firebaseUser?.displayName ||
    t("header.user.defaultName", "Utilizador");

  const emailUtilizador =
    userData?.email || firebaseUser?.email || t("header.user.noEmail", "Sem email");

  const telefoneUtilizador = userData?.telefone || t("header.user.noPhone", "Sem telefone");

  const tipoUtilizador = isAdmin
    ? t("header.roles.admin", "Administrador")
    : isVendedor
      ? t("header.roles.seller", "Vendedor")
      : userData?.tipo || t("header.user.defaultName", "Utilizador");

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const handleOpenProfile = () => {
    setProfileOpen((prev) => !prev);
    setNotificationsOpen(false);
  };

  const handleOpenNotifications = () => {
    setNotificationsOpen((prev) => !prev);
    setProfileOpen(false);
  };

  const handleGoToProfile = () => {
    setProfileOpen(false);
    navigate("/perfil");
  };

  const handleGoToSettings = () => {
    setProfileOpen(false);
    navigate("/configuracoes");
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      setProfileOpen(false);
      setNotificationsOpen(false);

      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Erro ao terminar sessão:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSwitchUser = async () => {
    try {
      setLoggingOut(true);
      setProfileOpen(false);
      setNotificationsOpen(false);

      await logout();
      navigate("/login", {
        replace: true,
        state: { switchUser: true },
      });
    } catch (error) {
      console.error("Erro ao trocar de utilizador:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }

      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="flex h-16 items-center justify-end gap-3 border-b border-border bg-card px-4 md:px-6">
      <div className="relative" ref={notificationRef}>
        <button
          onClick={handleOpenNotifications}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          type="button"
          aria-label={t("header.notifications.title", "Notificações")}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {notificationsOpen && (
          <div className="absolute right-0 z-50 mt-2 w-[320px] max-w-[90vw] overflow-hidden rounded-2xl border border-border bg-popover shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {t("header.notifications.title", "Notificações")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("header.notifications.unreadCount", "{{count}} não lida(s)", {
                    count: unreadCount,
                  })}
                </p>
              </div>

              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                type="button"
              >
                <CheckCheck className="h-4 w-4" />
                {t("header.notifications.markAll", "Marcar todas")}
              </button>
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  {t("header.notifications.empty", "Sem notificações no momento.")}
                </div>
              ) : (
                notifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setNotifications((prev) =>
                        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
                      )
                    }
                    className={`w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent/50 ${
                      !item.read ? "bg-accent/30" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.message}</p>
                      </div>

                      {!item.read && (
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>

                    <p className="mt-2 text-[11px] text-muted-foreground">{item.time}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="relative" ref={profileRef}>
        <button
          onClick={handleOpenProfile}
          type="button"
          className="flex items-center gap-3 rounded-full border border-border bg-background px-2 py-1.5 transition-colors hover:bg-accent"
        >
          <div className="hidden w-[220px] text-right md:block">
            <p className="truncate text-sm font-medium text-foreground">{emailUtilizador}</p>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {getInitials()}
          </div>

          <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
        </button>

        {profileOpen && (
          <div className="absolute right-0 z-50 mt-2 w-80 max-w-[92vw] overflow-hidden rounded-2xl border border-border bg-popover shadow-xl">
            <div className="border-b border-border px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {getInitials()}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {nomeUtilizador}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{emailUtilizador}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 border-b border-border px-4 py-4">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span>{tipoUtilizador}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-foreground">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{emailUtilizador}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-foreground">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{telefoneUtilizador}</span>
              </div>

              {firebaseUser?.uid && (
                <div className="text-xs text-muted-foreground">UID: {firebaseUser.uid}</div>
              )}
            </div>

            <div className="p-2">
              <button
                onClick={handleGoToProfile}
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
              >
                <User className="h-4 w-4" />
                {t("header.actions.viewProfile", "Ver perfil")}
              </button>

              <button
                onClick={handleGoToSettings}
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
              >
                <Settings className="h-4 w-4" />
                {t("common.settings", "Configurações")}
              </button>

              <button
                onClick={handleSwitchUser}
                type="button"
                disabled={loggingOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-60"
              >
                <RefreshCcw className="h-4 w-4" />
                {loggingOut
                  ? t("header.actions.pleaseWait", "Aguarde...")
                  : t("header.actions.switchUser", "Trocar utilizador")}
              </button>

              <button
                onClick={handleLogout}
                type="button"
                disabled={loggingOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                {loggingOut
                  ? t("header.actions.loggingOut", "A sair...")
                  : t("common.logout", "Terminar sessão")}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default AppHeader;