import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUsuario, updateUsuario, Usuario, UsuarioInput } from "@/lib/store";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Shield, User, Key, AlertCircle, Mail, Phone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";

// Schema de validação
const schema = z.object({
  nome: z.string()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(100, "Nome muito longo")
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras e espaços"),
  
  email: z.string()
    .email("Email inválido")
    .min(5, "Email muito curto"),
  
  tipo: z.enum(["admin", "vendedor"], {
    required_error: "Selecione o tipo de usuário",
  }),
  
  telefone: z.string()
    .optional()
    .nullable()
    .transform(val => val || undefined),
  
  senha: z.string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .optional()
    .or(z.literal("")),
  
  confirmarSenha: z.string()
    .optional()
    .or(z.literal("")),
}).refine((data) => {
  if (!data.senha && !data.confirmarSenha) {
    return true;
  }
  return data.senha === data.confirmarSenha;
}, {
  message: "As senhas não coincidem",
  path: ["confirmarSenha"],
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  usuario: Usuario | null;
}

const UsuarioModal = ({ open, onClose, usuario }: Props) => {
  const isEdit = !!usuario;
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const auth = getAuth();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: usuario?.nome ?? "",
      email: usuario?.email ?? "",
      tipo: usuario?.tipo ?? "vendedor",
      telefone: usuario?.telefone ?? "",
      senha: "",
      confirmarSenha: "",
    },
  });

  // Resetar valores ao abrir modal
  useEffect(() => {
    if (usuario) {
      reset({
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        telefone: usuario.telefone || "",
        senha: "",
        confirmarSenha: "",
      });
    } else {
      reset({
        nome: "",
        email: "",
        tipo: "vendedor",
        telefone: "",
        senha: "",
        confirmarSenha: "",
      });
    }
  }, [usuario, reset, open]);

  const tipoSelecionado = watch("tipo");
  const senha = watch("senha");
  const confirmarSenha = watch("confirmarSenha");

  // Validar força da senha
  const getSenhaForca = () => {
    if (!senha) return null;
    
    let forca = 0;
    if (senha.length >= 8) forca++;
    if (/[A-Z]/.test(senha)) forca++;
    if (/[0-9]/.test(senha)) forca++;
    if (/[^A-Za-z0-9]/.test(senha)) forca++;

    if (forca >= 3) return { text: "Forte", color: "text-accent" };
    if (forca >= 2) return { text: "Média", color: "text-yellow-600" };
    return { text: "Fraca", color: "text-destructive" };
  };

  const forcaSenha = getSenhaForca();

  // Submit do formulário
  const onSubmit = async (data: FormData) => {
    setLoading(true);

    try {
      if (isEdit && usuario?.id) {
        // Edição - apenas campos permitidos
        await updateUsuario(usuario.id, {
          nome: data.nome,
          tipo: data.tipo,
          telefone: data.telefone || "",
        });

        toast({
          title: "Sucesso!",
          description: "Usuário atualizado com sucesso.",
        });
      } else {
        // Validar senha para novo usuário
        if (!data.senha) {
          toast({
            title: "Erro",
            description: "Senha é obrigatória para novos usuários",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Criar no Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          data.email,
          data.senha
        );

        // Criar no Firestore com o authUid
        const novoUsuario: UsuarioInput = {
          authUid: userCredential.user.uid,
          nome: data.nome,
          email: data.email,
          tipo: data.tipo,
          telefone: data.telefone || "",
          ativo: true,
        };

        await createUsuario(novoUsuario);

        toast({
          title: "Sucesso!",
          description: "Usuário criado com sucesso.",
        });
      }

      reset();
      onClose();
    } catch (error: any) {
      console.error("Erro ao salvar usuário:", error);
      
      let mensagem = `Erro ao ${isEdit ? 'atualizar' : 'criar'} usuário`;
      
      if (error.code === 'auth/email-already-in-use') {
        mensagem = "Este email já está em uso por outro usuário";
      } else if (error.code === 'auth/invalid-email') {
        mensagem = "O email fornecido é inválido";
      } else if (error.code === 'auth/weak-password') {
        mensagem = "A senha é muito fraca. Use pelo menos 6 caracteres com letras e números";
      }

      toast({
        title: "Erro",
        description: mensagem,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Usuário" : "Novo Usuário"}
          </DialogTitle>
          <DialogDescription>
            {isEdit 
              ? "Edite as informações do usuário abaixo." 
              : "Preencha as informações do novo usuário."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nome Completo */}
          <div className="space-y-2">
            <Label htmlFor="nome">
              Nome Completo <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="nome"
                placeholder="Ex: João Silva"
                className={`pl-9 ${errors.nome ? "border-destructive" : ""}`}
                {...register("nome")}
                disabled={loading}
              />
            </div>
            {errors.nome && (
              <p className="text-sm text-destructive">{errors.nome.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="usuario@email.com"
                className={`pl-9 ${errors.email ? "border-destructive" : ""}`}
                {...register("email")}
                disabled={loading || isEdit}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
            {isEdit && (
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado após a criação.
              </p>
            )}
          </div>

          {/* Tipo de Usuário */}
          <div className="space-y-2">
            <Label htmlFor="tipo">
              Tipo de Usuário <span className="text-destructive">*</span>
            </Label>
            <Select
              value={tipoSelecionado}
              onValueChange={(value: "admin" | "vendedor") => setValue("tipo", value)}
              disabled={loading}
            >
              <SelectTrigger className={errors.tipo ? "border-destructive" : ""}>
                <SelectValue placeholder="Selecionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span>Administrador</span>
                  </div>
                </SelectItem>
                <SelectItem value="vendedor">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-accent" />
                    <span>Vendedor</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.tipo && (
              <p className="text-sm text-destructive">{errors.tipo.message}</p>
            )}
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="telefone"
                placeholder="Ex: +258 84 1234567"
                className="pl-9"
                {...register("telefone")}
                disabled={loading}
              />
            </div>
          </div>

          {/* Senha - apenas para novos usuários */}
          {!isEdit && (
            <>
              <div className="space-y-2">
                <Label htmlFor="senha">
                  Senha <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="senha"
                    type="password"
                    placeholder="••••••"
                    className={`pl-9 ${errors.senha ? "border-destructive" : ""}`}
                    {...register("senha")}
                    disabled={loading}
                  />
                </div>
                {errors.senha && (
                  <p className="text-sm text-destructive">{errors.senha.message}</p>
                )}
                
                {/* Indicador de força da senha */}
                {senha && forcaSenha && (
                  <div className="mt-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            forcaSenha.color === "text-accent" ? "bg-accent" :
                            forcaSenha.color === "text-yellow-600" ? "bg-yellow-600" :
                            "bg-destructive"
                          }`}
                          style={{ 
                            width: senha.length >= 8 ? "100%" : 
                                   senha.length >= 6 ? "66%" : "33%" 
                          }}
                        />
                      </div>
                      <span className={`text-xs ${forcaSenha.color}`}>
                        {forcaSenha.text}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use pelo menos 6 caracteres, incluindo letras maiúsculas, números e símbolos
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">
                  Confirmar Senha <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmarSenha"
                    type="password"
                    placeholder="••••••"
                    className={`pl-9 ${errors.confirmarSenha ? "border-destructive" : ""}`}
                    {...register("confirmarSenha")}
                    disabled={loading}
                  />
                </div>
                {errors.confirmarSenha && (
                  <p className="text-sm text-destructive">{errors.confirmarSenha.message}</p>
                )}
                
                {/* Indicador de correspondência */}
                {senha && confirmarSenha && (
                  <p className={`text-xs ${senha === confirmarSenha ? "text-accent" : "text-destructive"}`}>
                    {senha === confirmarSenha 
                      ? "✓ As senhas coincidem" 
                      : "✗ As senhas não coincidem"}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Aviso de segurança para edição */}
          {isEdit && (
            <Alert variant="default" className="bg-muted/50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Para alterar a senha, utilize a opção "Redefinir Senha" na lista de usuários. 
                Um email será enviado ao usuário com instruções.
              </AlertDescription>
            </Alert>
          )}

          {/* Aviso sobre permissões baseadas no tipo */}
          <Alert variant="default" className="bg-muted/30">
            {tipoSelecionado === "admin" ? (
              <Shield className="h-4 w-4 text-primary" />
            ) : (
              <User className="h-4 w-4 text-accent" />
            )}
            <AlertDescription className="text-xs">
              {tipoSelecionado === "admin" 
                ? "Administradores têm acesso total ao sistema, incluindo gestão de usuários e configurações."
                : "Vendedores têm acesso apenas a vendas, clientes e consulta de produtos."}
            </AlertDescription>
          </Alert>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Atualizar Usuário" : "Criar Usuário"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UsuarioModal;