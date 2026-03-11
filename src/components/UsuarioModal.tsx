import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Key,
  Loader2,
  Mail,
  Phone,
  Shield,
  Sparkles,
  User,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { adminApi } from "@/services/adminApi";
import { createFullUser } from "@/services/userProvisioning";
import type { AdminUser } from "@/pages/Usuarios";

const schema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(3, "Nome deve ter pelo menos 3 caracteres")
      .max(100, "Nome muito longo")
      .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras e espaços"),

    email: z.string().trim().email("Email inválido").min(5, "Email muito curto"),

    tipo: z.enum(["admin", "vendedor"], {
      required_error: "Selecione o tipo de usuário",
    }),

    telefone: z
      .string()
      .optional()
      .nullable()
      .transform((val) => (val || "").trim() || undefined),

    senha: z.string().optional().or(z.literal("")),
    confirmarSenha: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const senha = data.senha || "";
    const confirmarSenha = data.confirmarSenha || "";

    if (senha || confirmarSenha) {
      if (senha.length < 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["senha"],
          message: "Senha deve ter pelo menos 6 caracteres",
        });
      }

      if (senha !== confirmarSenha) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["confirmarSenha"],
          message: "As senhas não coincidem",
        });
      }
    }
  });

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  usuario: AdminUser | null;
  usuariosExistentes: AdminUser[];
  onSaved?: () => void;
}

const normalizarEmail = (email: string) => email.trim().toLowerCase();

const getDefaultValues = (usuario: AdminUser | null): FormData => ({
  nome: usuario?.nome ?? "",
  email: usuario?.email ?? "",
  tipo: usuario?.tipo ?? "vendedor",
  telefone: usuario?.telefone ?? "",
  senha: "",
  confirmarSenha: "",
});

const UsuarioModal = ({
  open,
  onClose,
  usuario,
  usuariosExistentes,
  onSaved,
}: Props) => {
  const isEdit = Boolean(usuario);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(usuario),
  });

  useEffect(() => {
    if (!open) return;
    reset(getDefaultValues(usuario));
  }, [open, usuario, reset]);

  const tipoSelecionado = watch("tipo");
  const senha = watch("senha");
  const confirmarSenha = watch("confirmarSenha");
  const email = watch("email");
  const nome = watch("nome");

  const emailDuplicado = useMemo(() => {
    if (!open || loading) return false;

    const emailNormalizado = normalizarEmail(email || "");
    if (!emailNormalizado) return false;

    return usuariosExistentes.some((u) => {
      const mesmoEmail = normalizarEmail(u.email) === emailNormalizado;
      const mesmoUsuario = usuario?.id === u.id;
      return mesmoEmail && !mesmoUsuario;
    });
  }, [email, usuariosExistentes, usuario, open, loading]);

  const forcaSenha = useMemo(() => {
    if (!senha) return null;

    let forca = 0;
    if (senha.length >= 8) forca++;
    if (/[A-Z]/.test(senha)) forca++;
    if (/[0-9]/.test(senha)) forca++;
    if (/[^A-Za-z0-9]/.test(senha)) forca++;

    if (forca >= 3) return { text: "Forte", color: "text-accent", bar: "bg-accent" };
    if (forca >= 2) return { text: "Média", color: "text-yellow-600", bar: "bg-yellow-600" };
    return { text: "Fraca", color: "text-destructive", bar: "bg-destructive" };
  }, [senha]);

  const formatarNome = () => {
    const valor = nome
      ?.trim()
      .split(" ")
      .filter(Boolean)
      .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
      .join(" ");

    setValue("nome", valor || "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const normalizarCampoEmail = () => {
    setValue("email", normalizarEmail(email || ""), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const fecharModal = () => {
    if (loading) return;

    if (isDirty) {
      const confirmar = window.confirm(
        "Existem alterações não guardadas. Deseja fechar mesmo assim?"
      );
      if (!confirmar) return;
    }

    reset(getDefaultValues(usuario));
    onClose();
  };

  const onSubmit = async (data: FormData) => {
    const emailNormalizado = normalizarEmail(data.email);

    const existeEmail = usuariosExistentes.some((u) => {
      const mesmoEmail = normalizarEmail(u.email) === emailNormalizado;
      const mesmoUsuario = usuario?.id === u.id;
      return mesmoEmail && !mesmoUsuario;
    });

    if (existeEmail) {
      toast({
        title: "Email duplicado",
        description: "Já existe um usuário com este email.",
        variant: "destructive",
      });
      return;
    }

    if (!isEdit && !data.senha) {
      toast({
        title: "Erro",
        description: "Senha é obrigatória para novos usuários.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isEdit && usuario?.id) {
        await adminApi.updateUser({
          uid: usuario.id,
          nome: data.nome.trim(),
          tipo: data.tipo,
          telefone: data.telefone || "",
        });

        toast({
          title: "Sucesso!",
          description: "Usuário atualizado com sucesso.",
        });
      } else {
        await createFullUser({
          nome: data.nome.trim(),
          email: emailNormalizado,
          password: data.senha || "",
          tipo: data.tipo,
          telefone: data.telefone || "",
          limiteDesconto: data.tipo === "admin" ? 100 : 10,
        });

        toast({
          title: "Sucesso!",
          description: "Usuário criado com sucesso.",
        });
      }

      reset(getDefaultValues(null));
      onClose();
      onSaved?.();
    } catch (error: any) {
      toast({
        title: "Erro",
        description:
          error?.message || `Erro ao ${isEdit ? "atualizar" : "criar"} usuário`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) fecharModal();
      }}
    >
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Edite as informações do usuário abaixo."
              : "Preencha as informações do novo usuário."}
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-accent bg-accent/10">
          <AlertCircle className="h-4 w-4 text-accent" />
          <AlertDescription className="text-xs">
            Este formulário cria o utilizador no Supabase, Firebase Auth e Firestore.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">
              Nome Completo <span className="text-destructive">*</span>
            </Label>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="nome"
                  placeholder="Ex: João Silva"
                  className={`pl-9 ${errors.nome ? "border-destructive" : ""}`}
                  {...register("nome")}
                  disabled={loading}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={formatarNome}
                disabled={loading || !nome}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>

            {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@email.com"
                  className={`pl-9 ${errors.email || emailDuplicado ? "border-destructive" : ""}`}
                  {...register("email")}
                  disabled={loading || isEdit}
                />
              </div>

              {!isEdit && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={normalizarCampoEmail}
                  disabled={loading || !email}
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              )}
            </div>

            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            {!errors.email && emailDuplicado && (
              <p className="text-sm text-destructive">Já existe um usuário com este email.</p>
            )}
            {isEdit && (
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado após a criação.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">
              Tipo de Usuário <span className="text-destructive">*</span>
            </Label>

            <Select
              value={tipoSelecionado}
              onValueChange={(value: "admin" | "vendedor") =>
                setValue("tipo", value, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                })
              }
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

            {errors.tipo && <p className="text-sm text-destructive">{errors.tipo.message}</p>}
          </div>

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

                {errors.senha && <p className="text-sm text-destructive">{errors.senha.message}</p>}

                {senha && forcaSenha && (
                  <div className="mt-1">
                    <div className="flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full ${forcaSenha.bar}`}
                          style={{
                            width:
                              senha.length >= 8 ? "100%" : senha.length >= 6 ? "66%" : "33%",
                          }}
                        />
                      </div>
                      <span className={`text-xs ${forcaSenha.color}`}>{forcaSenha.text}</span>
                    </div>
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

                {senha && confirmarSenha && (
                  <p
                    className={`text-xs ${
                      senha === confirmarSenha ? "text-accent" : "text-destructive"
                    }`}
                  >
                    {senha === confirmarSenha
                      ? "✓ As senhas coincidem"
                      : "✗ As senhas não coincidem"}
                  </p>
                )}
              </div>
            </>
          )}

          {isEdit && (
            <Alert variant="default" className="bg-muted/50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Para alterar a senha, utilize a opção "Redefinir Senha" na lista de usuários.
              </AlertDescription>
            </Alert>
          )}

          <Alert variant="default" className="bg-muted/30">
            {tipoSelecionado === "admin" ? (
              <Shield className="h-4 w-4 text-primary" />
            ) : (
              <User className="h-4 w-4 text-accent" />
            )}
            <AlertDescription className="text-xs">
              {tipoSelecionado === "admin"
                ? "Administradores têm acesso total ao sistema."
                : "Vendedores têm acesso operacional limitado."}
            </AlertDescription>
          </Alert>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={fecharModal} disabled={loading}>
              Cancelar
            </Button>

            <Button type="submit" disabled={loading || emailDuplicado}>
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