import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { updateUsuario } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Save,
  Loader2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Perfil = () => {
  const { userData, firebaseUser, isAdmin, isVendedor } = useAuth();
  const { toast } = useToast();

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNome(userData?.nome || firebaseUser?.displayName || "");
    setTelefone(userData?.telefone || "");
  }, [userData, firebaseUser]);

  const tipoUtilizador = useMemo(() => {
    if (isAdmin) return "Administrador";
    if (isVendedor) return "Vendedor";
    return userData?.tipo || "Utilizador";
  }, [isAdmin, isVendedor, userData]);

  const emailUtilizador = userData?.email || firebaseUser?.email || "Sem email";
  const uidUtilizador = firebaseUser?.uid || "";
  const limiteDesconto = userData?.limite_desconto ?? 0;

  const normalizarTelefone = (valor: string) => valor.replace(/\s+/g, " ").trim();

  const handleSalvar = async () => {
    if (!uidUtilizador) {
      toast({
        title: "Erro",
        description: "Utilizador não identificado.",
        variant: "destructive",
      });
      return;
    }

    const nomeNormalizado = nome.trim();
    const telefoneNormalizado = normalizarTelefone(telefone);

    if (nomeNormalizado.length < 3) {
      toast({
        title: "Erro",
        description: "O nome deve ter pelo menos 3 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (telefoneNormalizado && telefoneNormalizado.length < 9) {
      toast({
        title: "Erro",
        description: "O telefone deve ter pelo menos 9 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await updateUsuario(uidUtilizador, {
        nome: nomeNormalizado,
        telefone: telefoneNormalizado,
      });

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso.",
      });
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">
          Visualize e atualize os seus dados de acesso.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dados do Utilizador</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Nome
                </Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  Telefone
                </Label>
                <Input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="84 123 4567"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input value={emailUtilizador} disabled readOnly />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4" />
                  Tipo de Utilizador
                </Label>
                <Input value={tipoUtilizador} disabled readOnly />
              </div>
            </div>

            <Alert className="bg-muted/50">
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                O email e o tipo de utilizador são controlados pelo sistema.
                Apenas nome e telefone podem ser alterados aqui.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end">
              <Button onClick={handleSalvar} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo da Conta</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="font-medium">{nome || "Não definido"}</p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="break-words font-medium">{emailUtilizador}</p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Função</p>
              <p className="font-medium">{tipoUtilizador}</p>
            </div>

            {isVendedor && (
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Limite de Desconto</p>
                <p className="font-medium">{limiteDesconto}%</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Perfil;