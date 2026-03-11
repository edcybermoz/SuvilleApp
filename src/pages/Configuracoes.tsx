import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { APP_VERSION, compareVersions } from "@/lib/appMeta";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSystemConfig } from "@/contexts/SystemConfigContext";
import { usePlanAccess } from "@/hooks/usePlanAccess";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  Save,
  Building2,
  Percent,
  Bell,
  Shield,
  Mail,
  Phone,
  MapPin,
  Globe,
  Upload,
  RefreshCw,
  AlertCircle,
  Download,
  Languages,
  BadgeInfo,
  Clock3,
  ShieldAlert,
  Lock,
} from "lucide-react";

interface EmpresaConfig {
  nome: string;
  nuit: string;
  telefone: string;
  email: string;
  endereco: string;
  logo?: string;
  website?: string;
}

interface IvaConfig {
  taxaPadrao: number;
  incluirNoPreco: boolean;
  categoriasIsentas: string[];
}

interface NotificacaoConfig {
  emailVendas: boolean;
  emailEstoqueBaixo: boolean;
  emailNovoCliente: boolean;
  smsVendas?: boolean;
}

interface SistemaConfig {
  moeda: string;
  formatoData: string;
  fusoHorario: string;
  backupAutomatico: boolean;
  diasBackup: number;
  idioma: "pt" | "en" | "es";
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

const Configuracoes = () => {
  const { isAdmin, userData } = useAuth();
  const { toast } = useToast();
  const { language, t, changeSystemLanguage } = useLanguage();
  const {
    blocked,
    canAccessSettings,
    currentPlan,
    currentStatus,
    daysLeft,
  } = usePlanAccess();

  const {
    appConfig,
    featureFlags,
    empresaConfig,
    ivaConfig,
    notificacaoConfig,
    sistemaConfig,
    configError,
  } = useSystemConfig();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("empresa");

  const [empresa, setEmpresa] = useState<EmpresaConfig>({
    nome: "VILLESys",
    nuit: "",
    telefone: "",
    email: "",
    endereco: "",
    website: "",
  });

  const [iva, setIva] = useState<IvaConfig>({
    taxaPadrao: 16,
    incluirNoPreco: true,
    categoriasIsentas: [],
  });

  const [notificacoes, setNotificacoes] = useState<NotificacaoConfig>({
    emailVendas: true,
    emailEstoqueBaixo: true,
    emailNovoCliente: false,
    smsVendas: false,
  });

  const [sistema, setSistema] = useState<SistemaConfig>({
    moeda: "MZN",
    formatoData: "DD/MM/YYYY",
    fusoHorario: "Africa/Maputo",
    backupAutomatico: true,
    diasBackup: 7,
    idioma: "pt",
    maintenanceMode: false,
    maintenanceMessage: "",
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (empresaConfig) {
      setEmpresa({
        nome: empresaConfig.nome || "VILLESys",
        nuit: empresaConfig.nuit || "",
        telefone: empresaConfig.telefone || "",
        email: empresaConfig.email || "",
        endereco: empresaConfig.endereco || "",
        logo: empresaConfig.logo || "",
        website: empresaConfig.website || "",
      });
      setLogoPreview(empresaConfig.logo || null);
    }
  }, [empresaConfig]);

  useEffect(() => {
    if (ivaConfig) {
      setIva({
        taxaPadrao: ivaConfig.taxaPadrao ?? 16,
        incluirNoPreco: ivaConfig.incluirNoPreco ?? true,
        categoriasIsentas: ivaConfig.categoriasIsentas ?? [],
      });
    }
  }, [ivaConfig]);

  useEffect(() => {
    if (notificacaoConfig) {
      setNotificacoes({
        emailVendas: notificacaoConfig.emailVendas ?? true,
        emailEstoqueBaixo: notificacaoConfig.emailEstoqueBaixo ?? true,
        emailNovoCliente: notificacaoConfig.emailNovoCliente ?? false,
        smsVendas: notificacaoConfig.smsVendas ?? false,
      });
    }
  }, [notificacaoConfig]);

  useEffect(() => {
    setSistema((prev) => ({
      ...prev,
      moeda: sistemaConfig?.moeda ?? prev.moeda,
      formatoData: sistemaConfig?.formatoData ?? prev.formatoData,
      fusoHorario: sistemaConfig?.fusoHorario ?? prev.fusoHorario,
      backupAutomatico: sistemaConfig?.backupAutomatico ?? prev.backupAutomatico,
      diasBackup: sistemaConfig?.diasBackup ?? prev.diasBackup,
      idioma: sistemaConfig?.idioma ?? (language as "pt" | "en" | "es"),
      maintenanceMode: appConfig?.maintenanceMode ?? false,
      maintenanceMessage: appConfig?.maintenanceMessage ?? "",
    }));
  }, [sistemaConfig, appConfig, language]);

  const updateAvailable = useMemo(() => {
    if (!appConfig?.latestVersion) return false;
    return compareVersions(APP_VERSION, appConfig.latestVersion) < 0;
  }, [appConfig]);

  const requiredUpdate = useMemo(() => {
    if (!appConfig?.minimumVersion) return false;
    return compareVersions(APP_VERSION, appConfig.minimumVersion) < 0;
  }, [appConfig]);

  const trialInfo = useMemo(() => {
    if (userData?.plano !== "trial" || !userData?.trialFim) return null;

    try {
      const end = new Date(userData.trialFim);
      const now = new Date();
      const diff = end.getTime() - now.getTime();
      const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));

      return {
        expired: daysLeft < 0 || userData.statusPlano === "expirado",
        daysLeft: Math.max(daysLeft, 0),
      };
    } catch {
      return null;
    }
  }, [userData]);

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error) return error.message;
    return fallback;
  };

  const ensureCanManage = (message: string) => {
    if (blocked || !canAccessSettings) {
      toast({
        title: t("common.error", "Erro"),
        description: message,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSaveEmpresa = async () => {
    if (!ensureCanManage("O plano atual não permite alterar as configurações.")) return;

    setLoading(true);
    try {
      await setDoc(
        doc(db, "app_config", "empresa"),
        {
          ...empresa,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      toast({
        title: t("common.success", "Sucesso"),
        description: t("settings.company.saved", "Dados da empresa salvos com sucesso."),
      });
    } catch (error) {
      toast({
        title: t("common.error", "Erro"),
        description: getErrorMessage(
          error,
          t("settings.company.saveError", "Não foi possível salvar os dados da empresa.")
        ),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIva = async () => {
    if (!ensureCanManage("O plano atual não permite alterar as configurações.")) return;

    setLoading(true);
    try {
      await setDoc(
        doc(db, "app_config", "iva"),
        {
          ...iva,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      toast({
        title: t("common.success", "Sucesso"),
        description: t("settings.tax.saved", "Configurações de IVA salvas com sucesso."),
      });
    } catch (error) {
      toast({
        title: t("common.error", "Erro"),
        description: getErrorMessage(
          error,
          t("settings.tax.saveError", "Não foi possível salvar o IVA.")
        ),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotificacoes = async () => {
    if (!ensureCanManage("O plano atual não permite alterar as configurações.")) return;

    setLoading(true);
    try {
      await setDoc(
        doc(db, "app_config", "notificacoes"),
        {
          ...notificacoes,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      toast({
        title: t("common.success", "Sucesso"),
        description: t("settings.notifications.saved", "Preferências de notificação salvas."),
      });
    } catch (error) {
      toast({
        title: t("common.error", "Erro"),
        description: getErrorMessage(
          error,
          t("settings.notifications.saveError", "Não foi possível salvar as notificações.")
        ),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSistema = async () => {
    if (!ensureCanManage("O plano atual não permite alterar as configurações.")) return;

    setLoading(true);
    try {
      await setDoc(
        doc(db, "app_config", "public"),
        {
          maintenanceMode: sistema.maintenanceMode,
          maintenanceMessage: sistema.maintenanceMessage.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await setDoc(
        doc(db, "app_config", "sistema"),
        {
          moeda: sistema.moeda,
          formatoData: sistema.formatoData,
          fusoHorario: sistema.fusoHorario,
          backupAutomatico: sistema.backupAutomatico,
          diasBackup: sistema.diasBackup,
          idioma: sistema.idioma,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      changeSystemLanguage(sistema.idioma);

      toast({
        title: t("common.success", "Sucesso"),
        description: t("settings.system.saved", "Configurações do sistema salvas."),
      });
    } catch (error) {
      toast({
        title: t("common.error", "Erro"),
        description:
          error instanceof Error
            ? error.message
            : t("settings.system.saveError", "Não foi possível salvar as configurações do sistema."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!ensureCanManage("O plano atual não permite alterar a logo da empresa.")) return;

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setLogoPreview(result);
      setEmpresa((prev) => ({ ...prev, logo: result }));
    };
    reader.readAsDataURL(file);

    toast({
      title: t("settings.company.logoUpdated", "Logo atualizado"),
      description: t("settings.company.logoSaveHint", "Clique em salvar para confirmar a alteração."),
    });
  };

  const handleBackup = () => {
    if (!ensureCanManage("O plano atual não permite iniciar backups.")) return;

    toast({
      title: t("settings.security.backupStarted", "Backup iniciado"),
      description: t("settings.security.backupStartedHint", "O backup foi iniciado com sucesso."),
    });
  };

  const handleTestEmail = () => {
    if (!ensureCanManage("O plano atual não permite testar notificações.")) return;

    toast({
      title: t("settings.notifications.testEmailSent", "Email de teste enviado"),
      description: t("settings.notifications.testEmailSentHint", "Verifique sua caixa de entrada."),
    });
  };

  const handleExportar = () => {
    if (!ensureCanManage("O plano atual não permite exportar dados.")) return;

    toast({
      title: t("settings.security.exportStarted", "Exportação iniciada"),
      description: t(
        "settings.security.exportStartedHint",
        "Seus dados estão sendo preparados para exportação."
      ),
    });
  };

  const handleCheckUpdate = () => {
    if (requiredUpdate) {
      toast({
        title: t("settings.system.updateRequired", "Atualização obrigatória"),
        description: `${t("common.version", "Versão")} mínima exigida: ${appConfig?.minimumVersion}`,
        variant: "destructive",
      });
      return;
    }

    if (updateAvailable) {
      toast({
        title: t("settings.system.updateAvailable", "Atualização disponível"),
        description: `Nova versão: ${appConfig?.latestVersion}`,
      });
      return;
    }

    toast({
      title: t("settings.system.upToDate", "Sistema atualizado"),
      description: `${t("common.version", "Versão")}: ${APP_VERSION}.`,
    });
  };

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="safe-mobile-container space-y-6">
      {blocked && (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertTitle>Configurações em modo restrito</AlertTitle>
          <AlertDescription className="flex flex-col gap-1">
            <span>
              O plano atual ({currentPlan}) está {currentStatus}.
              {typeof daysLeft === "number" && currentPlan === "trial"
                ? ` Dias restantes: ${daysLeft}.`
                : ""}
            </span>
            <span>Alterações administrativas, backup e exportação estão bloqueadas.</span>
          </AlertDescription>
        </Alert>
      )}

      {configError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("common.error", "Erro")}</AlertTitle>
          <AlertDescription className="break-words">{configError}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">
            {t("settings.title", "Configurações")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("settings.subtitle", "Gerencie as configurações gerais do sistema")}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Button className="w-full sm:w-auto" variant="outline" size="sm" onClick={handleCheckUpdate}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("settings.actions.checkUpdate", "Verificar Atualização")}
          </Button>

          {!blocked && (
            <Button className="w-full sm:w-auto" variant="outline" size="sm" onClick={handleBackup}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("settings.actions.backup", "Fazer Backup")}
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="w-full overflow-hidden">
          <TabsList className="scrollbar-hide flex w-full min-w-0 gap-2 overflow-x-auto rounded-md p-1 md:grid md:max-w-3xl md:grid-cols-4 md:overflow-visible">
            <TabsTrigger className="shrink-0" value="empresa">
              <Building2 className="mr-2 h-4 w-4" />
              {t("settings.tabs.company", "Empresa")}
            </TabsTrigger>
            <TabsTrigger className="shrink-0" value="iva">
              <Percent className="mr-2 h-4 w-4" />
              {t("settings.tabs.tax", "IVA")}
            </TabsTrigger>
            <TabsTrigger className="shrink-0" value="notificacoes">
              <Bell className="mr-2 h-4 w-4" />
              {t("settings.tabs.notifications", "Notificações")}
            </TabsTrigger>
            <TabsTrigger className="shrink-0" value="sistema">
              <Shield className="mr-2 h-4 w-4" />
              {t("settings.tabs.system", "Sistema")}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.company.title", "Dados da Empresa")}</CardTitle>
              <CardDescription>
                {t("settings.company.description", "Informações gerais da empresa")}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={logoPreview || empresa.logo || undefined} />
                  <AvatarFallback className="bg-primary/10 text-2xl text-primary">
                    {empresa.nome?.charAt(0) || "V"}
                  </AvatarFallback>
                </Avatar>

                {!blocked && (
                  <div className="w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="relative w-full sm:w-auto">
                      <Upload className="mr-2 h-4 w-4" />
                      {t("settings.company.uploadLogo", "Upload Logo")}
                      <input
                        type="file"
                        className="absolute inset-0 cursor-pointer opacity-0"
                        accept="image/*"
                        onChange={handleLogoUpload}
                      />
                    </Button>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("settings.company.logoHint", "PNG, JPG ou SVG. Máx. 2MB")}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome">{t("settings.company.name", "Nome da Empresa")}</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="nome"
                      className="pl-9"
                      value={empresa.nome}
                      onChange={(e) => setEmpresa({ ...empresa, nome: e.target.value })}
                      disabled={blocked || loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nuit">{t("settings.company.nuit", "NUIT")}</Label>
                  <Input
                    id="nuit"
                    placeholder={t("settings.company.nuitPlaceholder", "Número de contribuinte")}
                    value={empresa.nuit}
                    onChange={(e) => setEmpresa({ ...empresa, nuit: e.target.value })}
                    disabled={blocked || loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">{t("settings.company.phone", "Telefone")}</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="telefone"
                      className="pl-9"
                      placeholder={t("settings.company.phonePlaceholder", "+258 84 123 4567")}
                      value={empresa.telefone}
                      onChange={(e) => setEmpresa({ ...empresa, telefone: e.target.value })}
                      disabled={blocked || loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t("settings.company.email", "Email")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-9"
                      placeholder={t("settings.company.emailPlaceholder", "empresa@email.com")}
                      value={empresa.email}
                      onChange={(e) => setEmpresa({ ...empresa, email: e.target.value })}
                      disabled={blocked || loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">{t("settings.company.website", "Website")}</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="website"
                      className="pl-9"
                      placeholder={t("settings.company.websitePlaceholder", "www.empresa.com")}
                      value={empresa.website}
                      onChange={(e) => setEmpresa({ ...empresa, website: e.target.value })}
                      disabled={blocked || loading}
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="endereco">{t("settings.company.address", "Endereço")}</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="endereco"
                      className="pl-9"
                      placeholder={t("settings.company.addressPlaceholder", "Endereço completo")}
                      value={empresa.endereco}
                      onChange={(e) => setEmpresa({ ...empresa, endereco: e.target.value })}
                      disabled={blocked || loading}
                    />
                  </div>
                </div>
              </div>

              {!blocked && (
                <div className="flex justify-end">
                  <Button className="w-full sm:w-auto" onClick={handleSaveEmpresa} disabled={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    {t("settings.actions.saveChanges", "Salvar Alterações")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="iva">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.tax.title", "Configurações de IVA")}</CardTitle>
              <CardDescription>
                {t("settings.tax.description", "Gerencie taxas e regras de IVA")}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="taxaIva">
                    {t("settings.tax.defaultRate", "Taxa de IVA Padrão (%)")}
                  </Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="taxaIva"
                      type="number"
                      className="pl-9"
                      value={iva.taxaPadrao}
                      onChange={(e) =>
                        setIva({ ...iva, taxaPadrao: Number(e.target.value) || 0 })
                      }
                      min={0}
                      max={100}
                      disabled={blocked || loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("settings.tax.includeInPrice", "Incluir IVA no Preço")}</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      checked={iva.incluirNoPreco}
                      onCheckedChange={(checked) =>
                        setIva({ ...iva, incluirNoPreco: checked })
                      }
                      disabled={blocked || loading}
                    />
                    <span className="text-sm text-muted-foreground">
                      {iva.incluirNoPreco
                        ? t("settings.tax.included", "Preços já incluem IVA")
                        : t("settings.tax.addedAtCheckout", "IVA adicionado no checkout")}
                    </span>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("settings.tax.noteTitle", "Nota importante")}</AlertTitle>
                <AlertDescription>
                  {t("settings.tax.noteText", "As alterações de IVA afetarão apenas novas vendas.")}
                </AlertDescription>
              </Alert>

              {!blocked && (
                <div className="flex justify-end">
                  <Button className="w-full sm:w-auto" onClick={handleSaveIva} disabled={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    {t("settings.tax.save", "Salvar Configurações")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes">
          <Card>
            <CardHeader>
              <CardTitle>
                {t("settings.notifications.title", "Preferências de Notificação")}
              </CardTitle>
              <CardDescription>
                {t("settings.notifications.description", "Configure como e quando receber notificações")}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Label className="text-base">{t("settings.notifications.sales", "Vendas")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.notifications.salesHint", "Receber email quando uma venda for concluída")}
                    </p>
                  </div>
                  <Switch
                    checked={notificacoes.emailVendas}
                    onCheckedChange={(checked) =>
                      setNotificacoes({ ...notificacoes, emailVendas: checked })
                    }
                    disabled={blocked || loading}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Label className="text-base">
                      {t("settings.notifications.lowStock", "Estoque Baixo")}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.notifications.lowStockHint", "Alertar quando produtos estiverem com estoque baixo")}
                    </p>
                  </div>
                  <Switch
                    checked={notificacoes.emailEstoqueBaixo}
                    onCheckedChange={(checked) =>
                      setNotificacoes({
                        ...notificacoes,
                        emailEstoqueBaixo: checked,
                      })
                    }
                    disabled={blocked || loading}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Label className="text-base">
                      {t("settings.notifications.newCustomer", "Novo Cliente")}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.notifications.newCustomerHint", "Notificar quando um novo cliente for criado")}
                    </p>
                  </div>
                  <Switch
                    checked={notificacoes.emailNovoCliente}
                    onCheckedChange={(checked) =>
                      setNotificacoes({
                        ...notificacoes,
                        emailNovoCliente: checked,
                      })
                    }
                    disabled={blocked || loading}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Label className="text-base">{t("settings.notifications.sms", "SMS")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.notifications.smsHint", "Receber notificações por SMS")}
                    </p>
                  </div>
                  <Switch
                    checked={!!notificacoes.smsVendas}
                    onCheckedChange={(checked) =>
                      setNotificacoes({ ...notificacoes, smsVendas: checked })
                    }
                    disabled={blocked || loading}
                  />
                </div>
              </div>

              {!blocked && (
                <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <Button className="w-full sm:w-auto" variant="outline" onClick={handleTestEmail}>
                    <Mail className="mr-2 h-4 w-4" />
                    {t("settings.notifications.testEmail", "Testar Email")}
                  </Button>

                  <Button className="w-full sm:w-auto" onClick={handleSaveNotificacoes} disabled={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    {t("settings.notifications.save", "Salvar Preferências")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sistema">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.system.title", "Configurações do Sistema")}</CardTitle>
              <CardDescription>
                {t("settings.system.description", "Preferências globais do sistema")}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("settings.system.currency", "Moeda")}</Label>
                  <Select
                    value={sistema.moeda}
                    onValueChange={(v) => setSistema({ ...sistema, moeda: v })}
                    disabled={blocked || loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MZN">Metical (MZN)</SelectItem>
                      <SelectItem value="USD">Dólar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                      <SelectItem value="ZAR">Rand (ZAR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("settings.system.dateFormat", "Formato de Data")}</Label>
                  <Select
                    value={sistema.formatoData}
                    onValueChange={(v) => setSistema({ ...sistema, formatoData: v })}
                    disabled={blocked || loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("settings.system.timezone", "Fuso Horário")}</Label>
                  <Select
                    value={sistema.fusoHorario}
                    onValueChange={(v) => setSistema({ ...sistema, fusoHorario: v })}
                    disabled={blocked || loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Maputo">África/Maputo (GMT+2)</SelectItem>
                      <SelectItem value="Africa/Luanda">África/Luanda (GMT+1)</SelectItem>
                      <SelectItem value="Africa/Johannesburg">
                        África/Johannesburg (GMT+2)
                      </SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Languages className="h-4 w-4" />
                    {t("settings.system.language", "Idioma do Sistema")}
                  </Label>
                  <Select
                    value={sistema.idioma}
                    onValueChange={(v: "pt" | "en" | "es") =>
                      setSistema({ ...sistema, idioma: v })
                    }
                    disabled={blocked || loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt">Português</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t("settings.system.autoBackup", "Backup Automático")}</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      checked={sistema.backupAutomatico}
                      onCheckedChange={(checked) =>
                        setSistema({ ...sistema, backupAutomatico: checked })
                      }
                      disabled={blocked || loading}
                    />
                    <span className="text-sm text-muted-foreground">
                      {sistema.backupAutomatico
                        ? t("common.enabled", "Ativado")
                        : t("common.disabled", "Desativado")}
                    </span>
                  </div>
                </div>

                {sistema.backupAutomatico && (
                  <div className="space-y-2">
                    <Label>{t("settings.system.backupFrequency", "Frequência de Backup (dias)")}</Label>
                    <Input
                      type="number"
                      value={sistema.diasBackup}
                      onChange={(e) =>
                        setSistema({
                          ...sistema,
                          diasBackup: Number(e.target.value) || 1,
                        })
                      }
                      min={1}
                      max={30}
                      disabled={blocked || loading}
                    />
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  {t("settings.system.maintenanceMode", "Modo de Manutenção")}
                </Label>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={sistema.maintenanceMode}
                    onCheckedChange={(checked) =>
                      setSistema({ ...sistema, maintenanceMode: checked })
                    }
                    disabled={blocked || loading}
                  />
                  <span className="text-sm text-muted-foreground">
                    {sistema.maintenanceMode
                      ? t("common.enabled", "Ativado")
                      : t("common.disabled", "Desativado")}
                  </span>
                </div>

                {sistema.maintenanceMode && (
                  <div className="space-y-2">
                    <Label>{t("settings.system.maintenanceMessage", "Mensagem de manutenção")}</Label>
                    <Input
                      value={sistema.maintenanceMessage}
                      onChange={(e) =>
                        setSistema({
                          ...sistema,
                          maintenanceMessage: e.target.value,
                        })
                      }
                      placeholder={t("settings.system.maintenancePlaceholder", "Sistema em manutenção.")}
                      disabled={blocked || loading}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Alert className={requiredUpdate ? "border-destructive bg-destructive/5" : "border-accent bg-accent/10"}>
                  <BadgeInfo className={`h-4 w-4 ${requiredUpdate ? "text-destructive" : "text-accent"}`} />
                  <AlertTitle>
                    {requiredUpdate
                      ? t("settings.system.updateRequired", "Atualização obrigatória")
                      : updateAvailable
                        ? t("settings.system.updateAvailable", "Atualização disponível")
                        : t("settings.system.upToDate", "Sistema atualizado")}
                  </AlertTitle>
                  <AlertDescription className="break-words">
                    {t("common.version", "Versão")}: {APP_VERSION}
                    {appConfig?.latestVersion ? ` | Última: ${appConfig.latestVersion}` : ""}
                    {appConfig?.minimumVersion ? ` | Mínima: ${appConfig.minimumVersion}` : ""}
                  </AlertDescription>
                </Alert>

                <Alert>
                  <Clock3 className="h-4 w-4" />
                  <AlertTitle>{t("settings.system.currentPlan", "Plano atual")}</AlertTitle>
                  <AlertDescription className="break-words">
                    Plano: {userData?.plano || "trial"} | Status: {userData?.statusPlano || "ativo"}
                    {trialInfo && !trialInfo.expired && ` | Restam ${trialInfo.daysLeft} dia(s)`}
                    {trialInfo?.expired && " | Trial expirado"}
                  </AlertDescription>
                </Alert>
              </div>

              <div className="rounded-lg border p-4">
                <p className="mb-2 text-sm font-medium">
                  {t("settings.system.featureFlags", "Feature Flags")}
                </p>
                <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground md:grid-cols-2">
                  <span>
                    {t("settings.system.flags.reports", "Relatórios")}:{" "}
                    {featureFlags?.reportsEnabled === false
                      ? t("common.disabled", "Desativado")
                      : t("common.enabled", "Ativado")}
                  </span>
                  <span>
                    {t("settings.system.flags.advancedProducts", "Produtos avançados")}:{" "}
                    {featureFlags?.advancedProducts === false
                      ? t("common.disabled", "Desativado")
                      : t("common.enabled", "Ativado")}
                  </span>
                  <span>
                    {t("settings.system.flags.multiLanguage", "Multi idioma")}:{" "}
                    {featureFlags?.multiLanguage === false
                      ? t("common.disabled", "Desativado")
                      : t("common.enabled", "Ativado")}
                  </span>
                  <span>
                    {t("settings.system.flags.trial", "Trial")}:{" "}
                    {featureFlags?.trialEnabled === false
                      ? t("common.disabled", "Desativado")
                      : t("common.enabled", "Ativado")}
                  </span>
                </div>
              </div>

              {!blocked && (
                <div className="flex justify-end">
                  <Button className="w-full sm:w-auto" onClick={handleSaveSistema} disabled={loading}>
                    <Save className="mr-2 h-4 w-4" />
                    {t("settings.system.save", "Salvar Configurações")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.security.title", "Backup e Segurança")}</CardTitle>
          <CardDescription>
            {t("settings.security.description", "Gerencie backups e exportação dos dados")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium">{t("settings.security.lastBackup", "Último backup")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings.security.lastBackupHint", "Backup automático controlado pelo sistema")}
              </p>
            </div>

            {!blocked && (
              <Button className="w-full sm:w-auto" variant="outline" onClick={handleBackup}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("settings.security.backupNow", "Fazer Backup Agora")}
              </Button>
            )}
          </div>

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium">{t("settings.security.exportData", "Exportar dados")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings.security.exportDataHint", "Exportar informações do sistema")}
              </p>
            </div>

            {!blocked && (
              <Button className="w-full sm:w-auto" variant="outline" onClick={handleExportar}>
                <Download className="mr-2 h-4 w-4" />
                {t("settings.security.export", "Exportar")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Configuracoes;