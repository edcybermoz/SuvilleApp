import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemConfig } from "@/contexts/SystemConfigContext";
import { APP_VERSION, compareVersions } from "@/lib/appMeta";
import { normalizePlan, normalizePlanStatus } from "@/lib/plan";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-MZ");
};

const getPlanLabel = (plano?: string | null) => {
  switch (normalizePlan(plano)) {
    case "trial":
      return "Experimental";
    case "pro":
      return "Profissional";
    case "enterprise":
      return "Enterprise";
    default:
      return "Não definido";
  }
};

const getStatusLabel = (status?: string | null) => {
  switch (normalizePlanStatus(status)) {
    case "ativo":
      return "Ativo";
    case "expirado":
      return "Expirado";
    case "bloqueado":
      return "Bloqueado";
    default:
      return "Desconhecido";
  }
};

const getStatusBadgeVariant = (status?: string | null) => {
  const normalized = normalizePlanStatus(status);
  if (normalized === "expirado" || normalized === "bloqueado") {
    return "destructive" as const;
  }
  return "outline" as const;
};

const ControleSistema = () => {
  const { userData, logout } = useAuth();
  const { appConfig, featureFlags } = useSystemConfig();

  const normalizedPlan = normalizePlan(userData?.plano);
  const normalizedStatus = normalizePlanStatus(userData?.statusPlano);

  const hasActivePaidPlan =
    (normalizedPlan === "pro" || normalizedPlan === "enterprise") &&
    normalizedStatus === "ativo";

  const versionCheckEnabled = featureFlags?.versionCheckEnabled !== false;

  const updateState = useMemo(() => {
    if (!versionCheckEnabled || !appConfig) {
      return {
        label: "Verificação desativada",
        variant: "outline" as const,
      };
    }

    if (
      appConfig.minimumVersion &&
      compareVersions(APP_VERSION, appConfig.minimumVersion) < 0
    ) {
      return {
        label: "Atualização obrigatória",
        variant: "destructive" as const,
      };
    }

    if (
      appConfig.latestVersion &&
      compareVersions(APP_VERSION, appConfig.latestVersion) < 0
    ) {
      return {
        label: "Atualização disponível",
        variant: "outline" as const,
      };
    }

    return {
      label: "Sistema atualizado",
      variant: "outline" as const,
    };
  }, [appConfig, versionCheckEnabled]);

  const handleCheckUpdate = () => {
    window.location.reload();
  };

  const handleSupportRequest = () => {
    const supportEmail =
      (appConfig as { supportEmail?: string } | null)?.supportEmail ||
      "edsonantonionhanombe39@gmail.com";

    const subject = encodeURIComponent("Pedido de licenciamento / reativação");
    const body = encodeURIComponent(
      `Olá,\n\nSolicito apoio para licenciamento ou reativação da minha conta.\n\nNome: ${
        userData?.nome || "—"
      }\nEmail: ${userData?.email || "—"}\nPlano atual: ${getPlanLabel(
        userData?.plano
      )}\nEstado da subscrição: ${getStatusLabel(
        userData?.statusPlano
      )}\nVersão atual: ${APP_VERSION}\n\nPeço a validação e reativação do acesso, se aplicável.\n`
    );

    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  };

  const handleRelogin = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Subscrição</CardTitle>
          <CardDescription>
            Consulte o plano atual e o estado do licenciamento da sua conta.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Plano atual</p>
            <p className="font-medium">{getPlanLabel(userData?.plano)}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Estado da subscrição</p>
            <Badge variant={getStatusBadgeVariant(userData?.statusPlano)}>
              {getStatusLabel(userData?.statusPlano)}
            </Badge>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Titular</p>
            <p className="font-medium">{userData?.nome || "—"}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Email da conta</p>
            <p className="font-medium">{userData?.email || "—"}</p>
          </div>

          {normalizedPlan === "trial" && (
            <div>
              <p className="text-sm text-muted-foreground">
                Validade do período experimental
              </p>
              <p className="font-medium">{formatDate(userData?.trialFim)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Versão da aplicação</CardTitle>
          <CardDescription>
            Verifique a conformidade da instalação e a disponibilidade de atualizações.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Versão instalada</p>
              <p className="font-medium">{APP_VERSION}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <Badge variant={updateState.variant}>{updateState.label}</Badge>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Versão mínima</p>
              <p className="font-medium">{appConfig?.minimumVersion || "—"}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Versão mais recente</p>
              <p className="font-medium">{appConfig?.latestVersion || "—"}</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={handleCheckUpdate}>
              Verificar atualizações
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Licenciamento</CardTitle>
          <CardDescription>
            A ativação e a reativação do acesso são tratadas pela equipa administrativa.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="rounded-lg border p-4">
            <p className="font-medium">
              {hasActivePaidPlan ? "Subscrição ativa" : "Licenciamento assistido"}
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
              {hasActivePaidPlan
                ? "A sua conta encontra-se licenciada e com acesso disponível aos recursos do sistema."
                : "Caso a conta esteja expirada, bloqueada ou sem licenciamento ativo, o processo de regularização será feito por email. Após o pedido, o administrador poderá validar e reativar o acesso."}
            </p>

            {!hasActivePaidPlan && (
              <p className="mt-3 text-sm text-muted-foreground">
                Envie um pedido de reativação para que a equipa responsável analise a situação e proceda à ativação do plano aplicável.
              </p>
            )}

            <div className="mt-4">
              <Badge variant="outline">{getPlanLabel(userData?.plano)}</Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleSupportRequest}>
              Solicitar licenciamento por email
            </Button>

            <Button variant="ghost" onClick={handleRelogin}>
              Atualizar sessão
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ControleSistema;