import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getDaysLeftInTrial,
  getPlanStatusLabel,
  hasPlanLevel,
  isPlanBlocked,
  isTrialExpired,
  normalizePlan,
} from "@/lib/plan";

type PlanCapabilities = {
  blocked: boolean;
  expired: boolean;
  readOnly: boolean;
  canUseSystem: boolean;
  canCreateSales: boolean;
  canManageProducts: boolean;
  canManageCustomers: boolean;
  canManageCategories: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canExportData: boolean;
  canAccessSettings: boolean;
  currentPlan: "trial" | "pro" | "enterprise" | "unknown";
  currentStatus: string;
  daysLeft: number | null;
};

export const usePlanAccess = (): PlanCapabilities => {
  const { userData } = useAuth();

  return useMemo(() => {
    const currentPlan = normalizePlan(userData?.plano);

    const expired =
      currentPlan === "trial" &&
      isTrialExpired(userData?.trialFim, userData?.statusPlano);

    const blocked = isPlanBlocked({
      plano: userData?.plano,
      statusPlano: userData?.statusPlano,
      trialFim: userData?.trialFim,
    });

    const daysLeft = getDaysLeftInTrial(userData?.trialFim);
    const currentStatus = getPlanStatusLabel({
      plano: userData?.plano,
      statusPlano: userData?.statusPlano,
      trialFim: userData?.trialFim,
    });

    return {
      blocked,
      expired,
      readOnly: blocked,
      canUseSystem: !blocked && hasPlanLevel(currentPlan, "trial"),
      canCreateSales: !blocked && hasPlanLevel(currentPlan, "trial"),
      canManageProducts: !blocked && hasPlanLevel(currentPlan, "trial"),
      canManageCustomers: !blocked && hasPlanLevel(currentPlan, "trial"),
      canManageCategories: !blocked && hasPlanLevel(currentPlan, "trial"),
      canManageUsers: !blocked && hasPlanLevel(currentPlan, "pro"),
      canViewReports: !blocked && hasPlanLevel(currentPlan, "pro"),
      canExportData: !blocked && hasPlanLevel(currentPlan, "pro"),
      canAccessSettings: true,
      currentPlan,
      currentStatus,
      daysLeft,
    };
  }, [userData]);
};