import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useSystemConfig } from "@/contexts/SystemConfigContext";
import { useAuth } from "@/contexts/AuthContext";
import { APP_VERSION, compareVersions } from "@/lib/appMeta";
import { isPlanBlocked, isTrialExpired } from "@/lib/plan";
import { AlertTriangle, Lock, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SystemGuards = () => {
  const { appConfig, featureFlags } = useSystemConfig();
  const { userData, isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!appConfig) return null;

  const versionCheckEnabled = featureFlags?.versionCheckEnabled !== false;

  const hasRequiredUpdate =
    versionCheckEnabled &&
    !!appConfig.minimumVersion &&
    compareVersions(APP_VERSION, appConfig.minimumVersion) < 0;

  const hasOptionalUpdate =
    versionCheckEnabled &&
    !!appConfig.latestVersion &&
    compareVersions(APP_VERSION, appConfig.latestVersion) < 0;

  const trialExpired =
    userData?.plano === "trial" &&
    isTrialExpired(userData?.trialFim, userData?.statusPlano);

  const planBlocked = isPlanBlocked({
    plano: userData?.plano,
    statusPlano: userData?.statusPlano,
    trialFim: userData?.trialFim,
  });

  return (
    <div className="space-y-3">
      {appConfig.maintenanceMode && !isAdmin && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Sistema em manutenção</AlertTitle>
          <AlertDescription>
            {appConfig.maintenanceMessage || "Sistema em manutenção."}
          </AlertDescription>
        </Alert>
      )}

      {hasRequiredUpdate && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>
              Atualização obrigatória. Atual: {APP_VERSION} | Mínima:{" "}
              {appConfig.minimumVersion}
            </span>
            <Button size="sm" onClick={() => window.location.reload()}>
              Atualizar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!hasRequiredUpdate && hasOptionalUpdate && (
        <Alert>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>
              Nova versão disponível: {appConfig.latestVersion}. Atual: {APP_VERSION}
            </span>
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              Verificar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {planBlocked && (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertTitle>Acesso restrito</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {trialExpired
                ? "O período de teste expirou. Renove ou ative um plano para continuar a usar os recursos do sistema."
                : "O seu plano está bloqueado. Contacte o suporte."}
            </span>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/controle-sistema")}
              >
                Controle do sistema
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default SystemGuards;