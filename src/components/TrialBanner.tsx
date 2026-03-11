import { useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";

const TrialBanner = () => {
  const { userData } = useAuth();

  const info = useMemo(() => {
    if (!userData) return null;

    const plano = userData.plano;
    const statusPlano = userData.statusPlano;

    if (plano !== "trial") return null;

    if (statusPlano === "bloqueado") {
      return {
        type: "blocked" as const,
        daysLeft: 0,
      };
    }

    if (!userData.trialFim) {
      return {
        type: "unknown" as const,
        daysLeft: 0,
      };
    }

    const end = new Date(userData.trialFim);

    if (Number.isNaN(end.getTime())) {
      return {
        type: "unknown" as const,
        daysLeft: 0,
      };
    }

    const now = new Date();
    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (statusPlano === "expirado" || diff <= 0) {
      return {
        type: "expired" as const,
        daysLeft: 0,
      };
    }

    return {
      type: "active" as const,
      daysLeft: Math.max(days, 0),
    };
  }, [userData]);

  if (!info) return null;

  if (info.type === "blocked") {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          O seu plano está bloqueado. Contacte o administrador para reativar o acesso.
        </AlertDescription>
      </Alert>
    );
  }

  if (info.type === "expired") {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          O período de teste expirou. Atualize o plano para continuar usando todos os recursos.
        </AlertDescription>
      </Alert>
    );
  }

  if (info.type === "unknown") {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Não foi possível validar o período de teste da sua conta. Contacte o administrador.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert>
      <AlertDescription>
        A sua conta está em período de teste. Restam {info.daysLeft} dia(s).
      </AlertDescription>
    </Alert>
  );
};

export default TrialBanner;