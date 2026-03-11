import type { ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2, Lock } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { Button } from "@/components/ui/button";

type ProtectedRouteProps = {
  children: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireVendedor?: boolean;
  requireActive?: boolean;
  requireSystemAccess?: boolean;
  redirectTo?: string;
};

type StateCardProps = {
  icon?: ReactNode;
  title: string;
  description: ReactNode;
  footer?: ReactNode;
};

const StateCard = ({ icon, title, description, footer }: StateCardProps) => {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          {icon}
        </div>

        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <div className="mt-2 text-sm text-muted-foreground">{description}</div>

        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </div>
  );
};

export default function ProtectedRoute({
  children,
  requireAuth = true,
  requireAdmin = false,
  requireVendedor = false,
  requireActive = true,
  requireSystemAccess = false,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const {
    isAuthenticated,
    user,
    userData,
    loading,
    profileLoading,
    isActive,
    isAdmin,
    isVendedor,
  } = useAuth();

  const plan = usePlanAccess();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading || profileLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Carregando...
      </div>
    );
  }

  if (requireAuth && (!isAuthenticated || !user)) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  if (!userData) {
    return (
      <StateCard
        icon={<AlertTriangle className="h-6 w-6 text-destructive" />}
        title="Acesso negado"
        description={
          <>
            A sua conta não possui perfil de acesso no sistema.
            <br />
            Um administrador precisa criar ou sincronizar o seu perfil.
            <div className="mt-4 rounded-lg bg-muted/40 p-3 text-left text-xs">
              <p>
                <span className="font-medium">Email:</span> {user?.email ?? "N/A"}
              </p>
              <p>
                <span className="font-medium">ID:</span> {user?.id ?? "N/A"}
              </p>
            </div>
          </>
        }
        footer={
          <Button variant="outline" onClick={() => navigate("/login", { replace: true })}>
            Voltar para login
          </Button>
        }
      />
    );
  }

  if (requireActive && !isActive) {
    return (
      <StateCard
        icon={<AlertTriangle className="h-6 w-6 text-destructive" />}
        title="Conta inativa"
        description={
          <>
            A sua conta está desativada no sistema.
            <br />
            Contacte o administrador para voltar a ter acesso.
            <div className="mt-4 rounded-lg bg-muted/40 p-3 text-left text-xs">
              <p>
                <span className="font-medium">Email:</span> {user?.email ?? "N/A"}
              </p>
              <p>
                <span className="font-medium">ID:</span> {user?.id ?? "N/A"}
              </p>
            </div>
          </>
        }
        footer={
          <Button variant="outline" onClick={() => navigate("/login", { replace: true })}>
            Voltar para login
          </Button>
        }
      />
    );
  }

  if (requireAdmin && !isAdmin) {
    return (
      <StateCard
        icon={<Lock className="h-6 w-6 text-destructive" />}
        title="Acesso restrito"
        description={<>Esta área está disponível apenas para administradores.</>}
        footer={
          <Button variant="outline" onClick={() => navigate("/", { replace: true })}>
            Voltar ao início
          </Button>
        }
      />
    );
  }

  if (requireVendedor && !isVendedor && !isAdmin) {
    return (
      <StateCard
        icon={<Lock className="h-6 w-6 text-destructive" />}
        title="Acesso restrito"
        description={<>Esta área está disponível apenas para utilizadores autorizados.</>}
        footer={
          <Button variant="outline" onClick={() => navigate("/", { replace: true })}>
            Voltar ao início
          </Button>
        }
      />
    );
  }

  if (requireSystemAccess && !plan.canUseSystem) {
    return (
      <StateCard
        icon={<Lock className="h-6 w-6 text-destructive" />}
        title="Plano sem acesso"
        description={
          <>
            {plan.blocked
              ? "O seu plano está bloqueado ou expirado. Verifique o seu perfil ou contacte o suporte."
              : "O seu plano atual não permite aceder a esta área do sistema."}
          </>
        }
        footer={
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => navigate("/perfil", { replace: true })}>
              Ver perfil
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/controle-sistema", { replace: true })}
            >
              Controle do sistema
            </Button>
          </div>
        }
      />
    );
  }

  return <>{children}</>;
}