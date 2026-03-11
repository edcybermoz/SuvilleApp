import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lock } from "lucide-react";
import { usePlanAccess } from "@/hooks/usePlanAccess";

type AccessGuardProps = {
  allow: boolean;
  title?: string;
  message?: string;
  fallback?: ReactNode;
  children: ReactNode;
};

const AccessGuard = ({
  allow,
  title = "Acesso restrito",
  message = "O seu plano atual não permite usar este recurso.",
  fallback,
  children,
}: AccessGuardProps) => {
  const plan = usePlanAccess();

  if (allow) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  return (
    <Alert variant="destructive">
      <Lock className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {plan.blocked ? "O seu plano está bloqueado ou expirado." : message}
      </AlertDescription>
    </Alert>
  );
};

export default AccessGuard;