export type AppPlan = "trial" | "pro" | "enterprise" | "unknown";
export type PlanStatus = "ativo" | "expirado" | "bloqueado" | "desconhecido";

export type PlanInput = {
  plano?: string | null;
  statusPlano?: string | null;
  trialFim?: string | null;
};

export const normalizePlan = (plano?: string | null): AppPlan => {
  if (plano === "trial" || plano === "pro" || plano === "enterprise") {
    return plano;
  }
  return "unknown";
};

export const normalizePlanStatus = (statusPlano?: string | null): PlanStatus => {
  if (
    statusPlano === "ativo" ||
    statusPlano === "expirado" ||
    statusPlano === "bloqueado"
  ) {
    return statusPlano;
  }
  return "desconhecido";
};

export const isTrialExpired = (
  trialFim?: string | null,
  statusPlano?: string | null
) => {
  if (statusPlano === "expirado") return true;
  if (!trialFim) return false;

  const end = new Date(trialFim);
  if (Number.isNaN(end.getTime())) return false;

  return end.getTime() <= Date.now();
};

export const isPlanBlocked = ({ plano, statusPlano, trialFim }: PlanInput) => {
  const normalizedPlan = normalizePlan(plano);
  const normalizedStatus = normalizePlanStatus(statusPlano);

  if (normalizedStatus === "bloqueado") return true;

  if (normalizedPlan === "trial" && isTrialExpired(trialFim, normalizedStatus)) {
    return true;
  }

  return false;
};

export const getPlanStatusLabel = ({ plano, statusPlano, trialFim }: PlanInput) => {
  const normalizedPlan = normalizePlan(plano);
  const normalizedStatus = normalizePlanStatus(statusPlano);

  if (normalizedStatus === "bloqueado") return "bloqueado";

  if (normalizedPlan === "trial" && isTrialExpired(trialFim, normalizedStatus)) {
    return "expirado";
  }

  if (normalizedStatus === "desconhecido") {
    return normalizedPlan === "unknown" ? "desconhecido" : "ativo";
  }

  return normalizedStatus;
};

export const getDaysLeftInTrial = (trialFim?: string | null) => {
  if (!trialFim) return null;

  const end = new Date(trialFim);
  if (Number.isNaN(end.getTime())) return null;

  const diff = end.getTime() - Date.now();
  const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return Math.max(daysLeft, 0);
};

export const hasPlanLevel = (
  currentPlan: AppPlan,
  requiredPlan: Exclude<AppPlan, "unknown">
) => {
  const order: Record<Exclude<AppPlan, "unknown">, number> = {
    trial: 1,
    pro: 2,
    enterprise: 3,
  };

  if (currentPlan === "unknown") return false;
  return order[currentPlan] >= order[requiredPlan];
};