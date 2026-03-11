import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AppConfig {
  appName?: string;
  latestVersion?: string;
  minimumVersion?: string;
  updateRequired?: boolean;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  trialDaysDefault?: number;
  supportEmail?: string;
}

export type FeatureFlags = {
  reportsEnabled?: boolean;
  advancedProducts?: boolean;
  multiLanguage?: boolean;
  trialEnabled?: boolean;
  versionCheckEnabled?: boolean;
};

export type EmpresaConfig = {
  nome?: string;
  nuit?: string;
  telefone?: string;
  email?: string;
  endereco?: string;
  logo?: string;
  website?: string;
};

export type IvaConfig = {
  taxaPadrao?: number;
  incluirNoPreco?: boolean;
  categoriasIsentas?: string[];
};

export type NotificacaoConfig = {
  emailVendas?: boolean;
  emailEstoqueBaixo?: boolean;
  emailNovoCliente?: boolean;
  smsVendas?: boolean;
};

export type SistemaConfig = {
  moeda?: string;
  formatoData?: string;
  fusoHorario?: string;
  backupAutomatico?: boolean;
  diasBackup?: number;
  idioma?: "pt" | "en" | "es";
};

type SystemConfigContextType = {
  appConfig: AppConfig;
  featureFlags: FeatureFlags;
  empresaConfig: EmpresaConfig;
  ivaConfig: IvaConfig;
  notificacaoConfig: NotificacaoConfig;
  sistemaConfig: SistemaConfig;
  configError: string | null;
  configLoading: boolean;
};

const defaultAppConfig: AppConfig = {
  appName: "Sistema",
  latestVersion: "2.0.0",
  minimumVersion: "1.0.0",
  updateRequired: false,
  maintenanceMode: false,
  maintenanceMessage: "",
  trialDaysDefault: 14,
  supportEmail: "suporte@seudominio.com",
};

const defaultFeatureFlags: FeatureFlags = {
  reportsEnabled: true,
  advancedProducts: true,
  multiLanguage: true,
  trialEnabled: true,
  versionCheckEnabled: true,
};

const defaultEmpresaConfig: EmpresaConfig = {
  nome: "",
  nuit: "",
  telefone: "",
  email: "",
  endereco: "",
  logo: "",
  website: "",
};

const defaultIvaConfig: IvaConfig = {
  taxaPadrao: 16,
  incluirNoPreco: false,
  categoriasIsentas: [],
};

const defaultNotificacaoConfig: NotificacaoConfig = {
  emailVendas: false,
  emailEstoqueBaixo: false,
  emailNovoCliente: false,
  smsVendas: false,
};

const defaultSistemaConfig: SistemaConfig = {
  moeda: "MZN",
  formatoData: "dd/MM/yyyy",
  fusoHorario: "Africa/Maputo",
  backupAutomatico: false,
  diasBackup: 7,
  idioma: "pt",
};

const SystemConfigContext = createContext<SystemConfigContextType | null>(null);

export function SystemConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [appConfig, setAppConfig] = useState<AppConfig>(defaultAppConfig);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(defaultFeatureFlags);
  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig>(defaultEmpresaConfig);
  const [ivaConfig, setIvaConfig] = useState<IvaConfig>(defaultIvaConfig);
  const [notificacaoConfig, setNotificacaoConfig] =
    useState<NotificacaoConfig>(defaultNotificacaoConfig);
  const [sistemaConfig, setSistemaConfig] = useState<SistemaConfig>(defaultSistemaConfig);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    const errors = new Set<string>();

    const handleError = (message: string, error: unknown) => {
      console.error(message, error);
      errors.add(message);
      setConfigError(Array.from(errors).join(" | "));
    };

    const clearError = (message: string) => {
      if (errors.has(message)) {
        errors.delete(message);
        setConfigError(errors.size ? Array.from(errors).join(" | ") : null);
      }
    };

    const unsubApp = onSnapshot(
      doc(db, "app_config", "public"),
      (snap) => {
        setAppConfig({ ...defaultAppConfig, ...(snap.data() as AppConfig) });
        clearError("Sem permissão para ler app_config/public.");
        setConfigLoading(false);
      },
      (error) => {
        handleError("Sem permissão para ler app_config/public.", error);
        setConfigLoading(false);
      }
    );

    const unsubFlags = onSnapshot(
      doc(db, "feature_flags", "public"),
      (snap) => {
        setFeatureFlags({ ...defaultFeatureFlags, ...(snap.data() as FeatureFlags) });
        clearError("Sem permissão para ler feature_flags/public.");
      },
      (error) => {
        handleError("Sem permissão para ler feature_flags/public.", error);
      }
    );

    const unsubEmpresa = onSnapshot(
      doc(db, "app_config", "empresa"),
      (snap) => {
        setEmpresaConfig({ ...defaultEmpresaConfig, ...(snap.data() as EmpresaConfig) });
        clearError("Sem permissão para ler app_config/empresa.");
      },
      (error) => {
        handleError("Sem permissão para ler app_config/empresa.", error);
      }
    );

    const unsubIva = onSnapshot(
      doc(db, "app_config", "iva"),
      (snap) => {
        setIvaConfig({ ...defaultIvaConfig, ...(snap.data() as IvaConfig) });
        clearError("Sem permissão para ler app_config/iva.");
      },
      (error) => {
        handleError("Sem permissão para ler app_config/iva.", error);
      }
    );

    const unsubNotificacoes = onSnapshot(
      doc(db, "app_config", "notificacoes"),
      (snap) => {
        setNotificacaoConfig({
          ...defaultNotificacaoConfig,
          ...(snap.data() as NotificacaoConfig),
        });
        clearError("Sem permissão para ler app_config/notificacoes.");
      },
      (error) => {
        handleError("Sem permissão para ler app_config/notificacoes.", error);
      }
    );

    const unsubSistema = onSnapshot(
      doc(db, "app_config", "sistema"),
      (snap) => {
        setSistemaConfig({ ...defaultSistemaConfig, ...(snap.data() as SistemaConfig) });
        clearError("Sem permissão para ler app_config/sistema.");
      },
      (error) => {
        handleError("Sem permissão para ler app_config/sistema.", error);
      }
    );

    return () => {
      unsubApp();
      unsubFlags();
      unsubEmpresa();
      unsubIva();
      unsubNotificacoes();
      unsubSistema();
    };
  }, []);

  const value = useMemo(
    () => ({
      appConfig,
      featureFlags,
      empresaConfig,
      ivaConfig,
      notificacaoConfig,
      sistemaConfig,
      configError,
      configLoading,
    }),
    [
      appConfig,
      featureFlags,
      empresaConfig,
      ivaConfig,
      notificacaoConfig,
      sistemaConfig,
      configError,
      configLoading,
    ]
  );

  return (
    <SystemConfigContext.Provider value={value}>
      {children}
    </SystemConfigContext.Provider>
  );
}

export function useSystemConfig() {
  const ctx = useContext(SystemConfigContext);
  if (!ctx) {
    throw new Error("useSystemConfig deve ser usado dentro de SystemConfigProvider");
  }
  return ctx;
}