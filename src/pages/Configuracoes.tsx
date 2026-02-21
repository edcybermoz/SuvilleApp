// src/pages/Configuracoes.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Save, 
  Building2, 
  Percent, 
  Bell, 
  Shield, 
  Users,
  Printer,
  Mail,
  Phone,
  MapPin,
  Globe,
  Clock,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Download
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

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
}

const Configuracoes = () => {
  const { isAdmin } = useAuth();

  // Redirecionar se não for admin
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("empresa");
  
  const [empresa, setEmpresa] = useState<EmpresaConfig>({
    nome: "VILLESys",
    nuit: "",
    telefone: "",
    email: "",
    endereco: "",
    website: ""
  });

  const [iva, setIva] = useState<IvaConfig>({
    taxaPadrao: 16,
    incluirNoPreco: true,
    categoriasIsentas: []
  });

  const [notificacoes, setNotificacoes] = useState<NotificacaoConfig>({
    emailVendas: true,
    emailEstoqueBaixo: true,
    emailNovoCliente: false,
    smsVendas: false
  });

  const [sistema, setSistema] = useState<SistemaConfig>({
    moeda: "MZN",
    formatoData: "DD/MM/YYYY",
    fusoHorario: "Africa/Maputo",
    backupAutomatico: true,
    diasBackup: 7
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    };
    loadConfig();
  }, []);

  const handleSaveEmpresa = () => {
    toast({
      title: "Sucesso",
      description: "Dados da empresa salvos com sucesso."
    });
  };

  const handleSaveIva = () => {
    toast({
      title: "Sucesso",
      description: "Configurações de IVA salvas com sucesso."
    });
  };

  const handleSaveNotificacoes = () => {
    toast({
      title: "Sucesso",
      description: "Preferências de notificação salvas."
    });
  };

  const handleSaveSistema = () => {
    toast({
      title: "Sucesso",
      description: "Configurações do sistema salvas."
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      toast({
        title: "Logo atualizado",
        description: "Clique em salvar para confirmar a alteração."
      });
    }
  };

  const handleBackup = () => {
    toast({
      title: "Backup iniciado",
      description: "Seu backup está sendo gerado. Você receberá uma notificação quando estiver pronto."
    });
  };

  const handleTestEmail = () => {
    toast({
      title: "Email de teste enviado",
      description: "Verifique sua caixa de entrada."
    });
  };

  const handleExportar = () => {
    toast({
      title: "Exportação iniciada",
      description: "Seus dados estão sendo exportados."
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as configurações do sistema
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleBackup}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Fazer Backup
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="empresa">
            <Building2 className="h-4 w-4 mr-2" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="iva">
            <Percent className="h-4 w-4 mr-2" />
            IVA
          </TabsTrigger>
          <TabsTrigger value="notificacoes">
            <Bell className="h-4 w-4 mr-2" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="sistema">
            <Shield className="h-4 w-4 mr-2" />
            Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Empresa</CardTitle>
              <CardDescription>
                Informações gerais da sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={logoPreview || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {empresa.nome.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm" className="relative">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Logo
                    <input
                      type="file"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept="image/*"
                      onChange={handleLogoUpload}
                    />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    PNG, JPG ou SVG. Máx 2MB
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Empresa</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="nome"
                      className="pl-9"
                      value={empresa.nome}
                      onChange={(e) => setEmpresa({...empresa, nome: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nuit">NUIT</Label>
                  <Input
                    id="nuit"
                    placeholder="Número de contribuinte"
                    value={empresa.nuit}
                    onChange={(e) => setEmpresa({...empresa, nuit: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="telefone"
                      className="pl-9"
                      placeholder="+258 84 123 4567"
                      value={empresa.telefone}
                      onChange={(e) => setEmpresa({...empresa, telefone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-9"
                      placeholder="empresa@email.com"
                      value={empresa.email}
                      onChange={(e) => setEmpresa({...empresa, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="website"
                      className="pl-9"
                      placeholder="www.empresa.com"
                      value={empresa.website}
                      onChange={(e) => setEmpresa({...empresa, website: e.target.value})}
                    />
                  </div>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="endereco"
                      className="pl-9"
                      placeholder="Endereço completo"
                      value={empresa.endereco}
                      onChange={(e) => setEmpresa({...empresa, endereco: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveEmpresa}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="iva">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de IVA</CardTitle>
              <CardDescription>
                Gerencie as taxas e regras de IVA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="taxaIva">Taxa de IVA Padrão (%)</Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="taxaIva"
                      type="number"
                      className="pl-9"
                      value={iva.taxaPadrao}
                      onChange={(e) => setIva({...iva, taxaPadrao: Number(e.target.value)})}
                      min={0}
                      max={100}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Incluir IVA no Preço</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      checked={iva.incluirNoPreco}
                      onCheckedChange={(checked) => setIva({...iva, incluirNoPreco: checked})}
                    />
                    <span className="text-sm text-muted-foreground">
                      {iva.incluirNoPreco 
                        ? "Preços já incluem IVA" 
                        : "IVA é adicionado no checkout"}
                    </span>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Nota importante</AlertTitle>
                <AlertDescription>
                  As alterações nas configurações de IVA afetarão apenas novas vendas.
                  Vendas existentes não serão modificadas.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end">
                <Button onClick={handleSaveIva}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Notificação</CardTitle>
              <CardDescription>
                Configure como e quando receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Vendas</Label>
                    <p className="text-sm text-muted-foreground">
                      Receber email quando uma venda for concluída
                    </p>
                  </div>
                  <Switch
                    checked={notificacoes.emailVendas}
                    onCheckedChange={(checked) => setNotificacoes({...notificacoes, emailVendas: checked})}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Estoque Baixo</Label>
                    <p className="text-sm text-muted-foreground">
                      Alertar quando produtos estiverem com estoque baixo
                    </p>
                  </div>
                  <Switch
                    checked={notificacoes.emailEstoqueBaixo}
                    onCheckedChange={(checked) => setNotificacoes({...notificacoes, emailEstoqueBaixo: checked})}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Novo Cliente</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificar quando um novo cliente se registrar
                    </p>
                  </div>
                  <Switch
                    checked={notificacoes.emailNovoCliente}
                    onCheckedChange={(checked) => setNotificacoes({...notificacoes, emailNovoCliente: checked})}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">SMS (Opcional)</Label>
                    <p className="text-sm text-muted-foreground">
                      Receber notificações por SMS
                    </p>
                  </div>
                  <Switch
                    checked={notificacoes.smsVendas}
                    onCheckedChange={(checked) => setNotificacoes({...notificacoes, smsVendas: checked})}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button variant="outline" onClick={handleTestEmail}>
                  <Mail className="mr-2 h-4 w-4" />
                  Testar Email
                </Button>
                <Button onClick={handleSaveNotificacoes}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Preferências
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sistema">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Sistema</CardTitle>
              <CardDescription>
                Preferências gerais do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Moeda</Label>
                  <Select value={sistema.moeda} onValueChange={(v) => setSistema({...sistema, moeda: v})}>
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
                  <Label>Formato de Data</Label>
                  <Select value={sistema.formatoData} onValueChange={(v) => setSistema({...sistema, formatoData: v})}>
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
                  <Label>Fuso Horário</Label>
                  <Select value={sistema.fusoHorario} onValueChange={(v) => setSistema({...sistema, fusoHorario: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Maputo">África/Maputo (GMT+2)</SelectItem>
                      <SelectItem value="Africa/Luanda">África/Luanda (GMT+1)</SelectItem>
                      <SelectItem value="Africa/Johannesburg">África/Johannesburg (GMT+2)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Backup Automático</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      checked={sistema.backupAutomatico}
                      onCheckedChange={(checked) => setSistema({...sistema, backupAutomatico: checked})}
                    />
                    <span className="text-sm text-muted-foreground">
                      {sistema.backupAutomatico ? "Ativado" : "Desativado"}
                    </span>
                  </div>
                </div>

                {sistema.backupAutomatico && (
                  <div className="space-y-2">
                    <Label>Frequência de Backup (dias)</Label>
                    <Input
                      type="number"
                      value={sistema.diasBackup}
                      onChange={(e) => setSistema({...sistema, diasBackup: Number(e.target.value)})}
                      min={1}
                      max={30}
                    />
                  </div>
                )}
              </div>

              <Alert className="bg-accent/10 border-accent">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                <AlertTitle>Sistema atualizado</AlertTitle>
                <AlertDescription>
                  Versão 1.0.0 - Última atualização: 30/06/2025
                </AlertDescription>
              </Alert>

              <div className="flex justify-end">
                <Button onClick={handleSaveSistema}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Backup e Segurança</CardTitle>
          <CardDescription>
            Gerencie backups e segurança dos dados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Último backup</p>
              <p className="text-sm text-muted-foreground">29/06/2025 às 23:59</p>
            </div>
            <Button variant="outline" onClick={handleBackup}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Fazer Backup Agora
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Exportar dados</p>
              <p className="text-sm text-muted-foreground">Exportar todas as informações do sistema</p>
            </div>
            <Button variant="outline" onClick={handleExportar}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Configuracoes;