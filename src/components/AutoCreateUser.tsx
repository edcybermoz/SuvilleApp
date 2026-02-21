// src/components/AutoCreateUser.tsx
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, Timestamp, getDoc } from "firebase/firestore";
import { Loader2, CheckCircle, XCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Lista de emails autorizados para auto-criação (APENAS ADMIN)
const AUTHORIZED_EMAILS = [
  "admin@villesys.com",
  "edson@villesys.com"
  // Adicione apenas emails de ADMINISTRADORES aqui
];

// Token secreto para validação extra (opcional)
const SECRET_TOKEN = "VILLESYS2025"; // Mude para algo seguro

export const AutoCreateUser = () => {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [open, setOpen] = useState(false);
  const [secretInput, setSecretInput] = useState("");
  const [secretError, setSecretError] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Verificar se o email é autorizado
  useEffect(() => {
    if (user?.email) {
      const authorized = AUTHORIZED_EMAILS.includes(user.email);
      setIsAuthorized(authorized);
      
      // Só abre o diálogo se for autorizado E não tiver perfil
      if (authorized && !userData && !loading) {
        setOpen(true);
      }
    }
  }, [user, userData, loading]);

  const handleCreateUser = async () => {
    if (!user) return;

    // Verificação de segurança extra
    if (!isAuthorized) {
      console.error("❌ Email não autorizado para auto-criação");
      return;
    }

    // Verificar token secreto (opcional, mas recomendado)
    if (secretInput !== SECRET_TOKEN) {
      setSecretError(true);
      return;
    }

    setLoading(true);
    setStatus("idle");
    setSecretError(false);

    try {
      // Verificar novamente se o usuário ainda não existe (race condition)
      const userDoc = await getDoc(doc(db, "usuarios", user.uid));
      if (userDoc.exists()) {
        setStatus("error");
        setLoading(false);
        return;
      }

      // Determinar tipo baseado no email (apenas admin)
      const tipo = "admin"; // Forçar admin para emails autorizados

      await setDoc(doc(db, "usuarios", user.uid), {
        authUid: user.uid,
        nome: user.displayName || user.email?.split('@')[0] || "Administrador",
        email: user.email,
        tipo: tipo,
        telefone: "",
        dataRegistro: Timestamp.now(),
        ultimoAcesso: Timestamp.now(),
        ativo: true,
        criadoPor: "auto-create-secure",
        criadoEm: Timestamp.now(),
      });

      setStatus("success");
      
      // Log de segurança
      console.log(`✅ Usuário ${user.email} criado com segurança`);
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("❌ Erro ao criar usuário:", error);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  // Se não for autorizado, não mostra nada
  if (!isAuthorized) return null;
  
  // Se já tem dados, não mostra
  if (userData) return null;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <AlertDialogTitle className="text-center text-2xl">
            {status === "success" ? "✅ Perfil Criado!" : 
             status === "error" ? "❌ Erro ao criar perfil" : 
             "🔒 Configuração Inicial do Sistema"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {status === "success" ? (
              <div className="space-y-4">
                <CheckCircle className="h-16 w-16 text-accent mx-auto" />
                <p>Perfil administrativo criado com sucesso!</p>
                <p className="text-sm text-muted-foreground">Recarregando em 2 segundos...</p>
              </div>
            ) : status === "error" ? (
              <div className="space-y-4">
                <XCircle className="h-16 w-16 text-destructive mx-auto" />
                <p>Não foi possível criar o perfil.</p>
                <p className="text-sm text-muted-foreground">Contacte o administrador do sistema.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-accent/10 p-4 rounded-lg text-left">
                  <p className="font-medium mb-2">📋 Informações de segurança:</p>
                  <p className="text-sm mb-1">
                    <span className="text-muted-foreground">Email autorizado:</span>{' '}
                    <span className="font-mono">{user?.email}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Nível de acesso:</span>{' '}
                    <span className="font-semibold text-primary">Administrador</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secret">Token de segurança</Label>
                  <Input
                    id="secret"
                    type="password"
                    placeholder="Digite o token de segurança"
                    value={secretInput}
                    onChange={(e) => {
                      setSecretInput(e.target.value);
                      setSecretError(false);
                    }}
                    className={secretError ? "border-destructive" : ""}
                  />
                  {secretError && (
                    <p className="text-sm text-destructive">
                      Token inválido. Esta ação será registrada.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Token necessário para criar perfil administrativo.
                  </p>
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {status === "idle" && (
          <div className="flex justify-center gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                // Redirecionar para login por segurança
                window.location.href = "/login";
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={loading || !secretInput}
              className="bg-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Criar Perfil Administrativo"
              )}
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setStatus("idle");
                setOpen(false);
                window.location.href = "/login";
              }}
            >
              Voltar ao Login
            </Button>
          </div>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};