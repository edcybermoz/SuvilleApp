import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCliente, updateCliente, Cliente, ClienteInput } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  User,
  Phone,
  Mail,
  AlertCircle,
  ShieldCheck,
  FileText,
  MapPin,
  CreditCard,
  CalendarClock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const optionalNumberField = (label: string) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      if (typeof value === "string") return Number(value);
      return value;
    },
    z
      .number({
        invalid_type_error: `${label} deve ser um número`,
      })
      .refine((val) => !Number.isNaN(val), `${label} deve ser um número válido`)
      .optional()
  );

const schema = z.object({
  nome: z
    .string()
    .trim()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(100, "Nome muito longo"),

  telefone: z
    .string()
    .trim()
    .min(9, "Telefone deve ter pelo menos 9 caracteres")
    .regex(/^[0-9+\s()-]+$/, "Telefone deve conter apenas números, espaços, +, parênteses ou hífen"),

  email: z
    .string()
    .trim()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),

  nuit: z
    .string()
    .trim()
    .regex(/^[0-9]*$/, "NUIT deve conter apenas números")
    .max(20, "NUIT muito longo")
    .optional()
    .or(z.literal("")),

  endereco: z
    .string()
    .trim()
    .max(150, "Endereço muito longo")
    .optional()
    .or(z.literal("")),

  observacoes: z
    .string()
    .trim()
    .max(400, "Observações muito longas")
    .optional()
    .or(z.literal("")),

  limiteCredito: optionalNumberField("Limite de crédito").refine(
    (val) => val === undefined || val >= 0,
    "Limite de crédito não pode ser negativo"
  ),

  status: z.enum(["ativo", "inativo"], {
    errorMap: () => ({ message: "Selecione o status" }),
  }),

  origem: z.enum(["balcao", "referencia", "online", "whatsapp", "outro"], {
    errorMap: () => ({ message: "Selecione a origem" }),
  }),

  ultimoAtendimento: z
    .string()
    .optional()
    .or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  vendedorId?: string;
  clientesExistentes: Cliente[];
}

const normalizarTelefone = (telefone: string) =>
  telefone.replace(/\s+/g, " ").trim();

const normalizarEmail = (email?: string) => (email || "").trim().toLowerCase();

const normalizarTexto = (valor?: string) => (valor || "").trim();

const getDefaultValues = (cliente: Cliente | null): FormData => ({
  nome: cliente?.nome ?? "",
  telefone: cliente?.telefone ?? "",
  email: cliente?.email ?? "",
  nuit: cliente?.nuit ?? "",
  endereco: cliente?.endereco ?? "",
  observacoes: cliente?.observacoes ?? "",
  limiteCredito: cliente?.limiteCredito ?? undefined,
  status: cliente?.status ?? "ativo",
  origem: cliente?.origem ?? "balcao",
  ultimoAtendimento: cliente?.ultimoAtendimento ?? "",
});

const ClienteModal = ({
  open,
  onClose,
  cliente,
  vendedorId,
  clientesExistentes,
}: Props) => {
  const isEdit = Boolean(cliente);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isVendedor, isAdmin } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(cliente),
  });

  useEffect(() => {
    if (!open) return;
    reset(getDefaultValues(cliente));
  }, [open, cliente, reset]);

  const telefone = watch("telefone");
  const email = watch("email");
  const nuit = watch("nuit");
  const limiteCredito = watch("limiteCredito");

  const telefoneDuplicado = useMemo(() => {
    if (!open || loading) return false;

    const telefoneNormalizado = normalizarTelefone(telefone || "");
    if (!telefoneNormalizado) return false;

    return clientesExistentes.some((c) => {
      const mesmoTelefone = normalizarTelefone(c.telefone) === telefoneNormalizado;
      const mesmoCliente = cliente?.id === c.id;
      return mesmoTelefone && !mesmoCliente;
    });
  }, [telefone, clientesExistentes, cliente, open, loading]);

  const emailDuplicado = useMemo(() => {
    if (!open || loading) return false;

    const emailNormalizado = normalizarEmail(email);
    if (!emailNormalizado) return false;

    return clientesExistentes.some((c) => {
      const mesmoEmail = normalizarEmail(c.email) === emailNormalizado;
      const mesmoCliente = cliente?.id === c.id;
      return mesmoEmail && !mesmoCliente;
    });
  }, [email, clientesExistentes, cliente, open, loading]);

  const nuitDuplicado = useMemo(() => {
    if (!open || loading) return false;

    const nuitNormalizado = normalizarTexto(nuit);
    if (!nuitNormalizado) return false;

    return clientesExistentes.some((c) => {
      const mesmoNuit = normalizarTexto(c.nuit) === nuitNormalizado;
      const mesmoCliente = cliente?.id === c.id;
      return mesmoNuit && !mesmoCliente;
    });
  }, [nuit, clientesExistentes, cliente, open, loading]);

  const fecharModal = () => {
    if (loading) return;

    if (isDirty) {
      const confirmar = window.confirm(
        "Existem alterações não guardadas. Deseja fechar mesmo assim?"
      );
      if (!confirmar) return;
    }

    reset(getDefaultValues(null));
    onClose();
  };

  const preencherEmailMinusculo = () => {
    setValue("email", normalizarEmail(email), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const onSubmit = async (data: FormData) => {
    const telefoneNormalizado = normalizarTelefone(data.telefone);
    const emailNormalizado = normalizarEmail(data.email);
    const nuitNormalizado = normalizarTexto(data.nuit);

    const telefoneExiste = clientesExistentes.some((c) => {
      const mesmoTelefone = normalizarTelefone(c.telefone) === telefoneNormalizado;
      const mesmoCliente = cliente?.id === c.id;
      return mesmoTelefone && !mesmoCliente;
    });

    if (telefoneExiste) {
      toast({
        title: "Telefone já registado",
        description: "Já existe um cliente com este número de telefone.",
        variant: "destructive",
      });
      return;
    }

    const emailExiste =
      !!emailNormalizado &&
      clientesExistentes.some((c) => {
        const mesmoEmail = normalizarEmail(c.email) === emailNormalizado;
        const mesmoCliente = cliente?.id === c.id;
        return mesmoEmail && !mesmoCliente;
      });

    if (emailExiste) {
      toast({
        title: "Email já registado",
        description: "Já existe um cliente com este email.",
        variant: "destructive",
      });
      return;
    }

    const nuitExiste =
      !!nuitNormalizado &&
      clientesExistentes.some((c) => {
        const mesmoNuit = normalizarTexto(c.nuit) === nuitNormalizado;
        const mesmoCliente = cliente?.id === c.id;
        return mesmoNuit && !mesmoCliente;
      });

    if (nuitExiste) {
      toast({
        title: "NUIT já registado",
        description: "Já existe um cliente com este NUIT.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const input: ClienteInput = {
        nome: data.nome.trim(),
        telefone: telefoneNormalizado,
        email: emailNormalizado,
        nuit: nuitNormalizado,
        endereco: normalizarTexto(data.endereco),
        observacoes: normalizarTexto(data.observacoes),
        limiteCredito: data.limiteCredito ?? 0,
        status: data.status,
        origem: data.origem,
        ultimoAtendimento: data.ultimoAtendimento || "",
      };

      if (isEdit && cliente?.id) {
        await updateCliente(cliente.id, input);
        toast({
          title: "Sucesso!",
          description: "Cliente atualizado com sucesso.",
        });
      } else {
        await createCliente(input, vendedorId);
        toast({
          title: "Sucesso!",
          description: vendedorId
            ? "Cliente criado e associado ao seu perfil."
            : "Cliente criado com sucesso.",
        });
      }

      reset(getDefaultValues(null));
      onClose();
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      toast({
        title: "Erro",
        description: `Erro ao ${isEdit ? "atualizar" : "criar"} cliente. Tente novamente.`,
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
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isEdit ? "Editar Cliente" : "Novo Cliente"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize as informações do cliente com segurança, histórico e controlo comercial."
              : "Cadastre um novo cliente para acompanhar relacionamento, compras e definições avançadas."}
          </DialogDescription>
        </DialogHeader>

        {!isEdit && isVendedor && (
          <Alert className="bg-accent/10 border-accent">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <AlertDescription className="text-foreground font-semibold">
              Este cliente será associado ao seu perfil de vendedor.
            </AlertDescription>
          </Alert>
        )}

        {!isAdmin && isEdit && (
          <Alert className="bg-muted/60">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Você está a editar um cliente já existente. Revise bem os dados antes de salvar.
            </AlertDescription>
          </Alert>
        )}

        {limiteCredito !== undefined && limiteCredito > 0 && (
          <Alert className="bg-muted/50">
            <CreditCard className="h-4 w-4" />
            <AlertDescription>
              Este cliente terá limite de crédito definido em {Number(limiteCredito).toFixed(2)} MZN.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome" className="flex items-center gap-1">
              <User className="h-3 w-3" />
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nome"
              placeholder="Nome completo"
              {...register("nome")}
              className={errors.nome ? "border-destructive" : ""}
              disabled={loading}
              autoFocus
            />
            {errors.nome && (
              <p className="text-sm text-destructive">{errors.nome.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="telefone" className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                Telefone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="telefone"
                placeholder="84 123 4567"
                {...register("telefone")}
                className={errors.telefone || telefoneDuplicado ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.telefone && (
                <p className="text-sm text-destructive">{errors.telefone.message}</p>
              )}
              {!errors.telefone && telefoneDuplicado && (
                <p className="text-sm text-destructive">
                  Já existe um cliente com este telefone.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nuit" className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                NUIT
              </Label>
              <Input
                id="nuit"
                placeholder="NUIT do cliente"
                {...register("nuit")}
                className={errors.nuit || nuitDuplicado ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.nuit && (
                <p className="text-sm text-destructive">{errors.nuit.message}</p>
              )}
              {!errors.nuit && nuitDuplicado && (
                <p className="text-sm text-destructive">
                  Já existe um cliente com este NUIT.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              Email
            </Label>

            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="cliente@email.com"
                {...register("email")}
                className={errors.email || emailDuplicado ? "border-destructive" : ""}
                disabled={loading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={preencherEmailMinusculo}
                disabled={loading || !email}
                title="Normalizar email"
              >
                ok
              </Button>
            </div>

            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
            {!errors.email && emailDuplicado && (
              <p className="text-sm text-destructive">
                Já existe um cliente com este email.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Endereço
            </Label>
            <Input
              id="endereco"
              placeholder="Bairro, rua, referência..."
              {...register("endereco")}
              className={errors.endereco ? "border-destructive" : ""}
              disabled={loading}
            />
            {errors.endereco && (
              <p className="text-sm text-destructive">{errors.endereco.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={watch("status")}
                onValueChange={(value: "ativo" | "inativo") =>
                  setValue("status", value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }
                disabled={loading}
              >
                <SelectTrigger className={errors.status ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecionar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-destructive">{errors.status.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Origem</Label>
              <Select
                value={watch("origem")}
                onValueChange={(value: "balcao" | "referencia" | "online" | "whatsapp" | "outro") =>
                  setValue("origem", value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }
                disabled={loading}
              >
                <SelectTrigger className={errors.origem ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecionar origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balcao">Balcão</SelectItem>
                  <SelectItem value="referencia">Referência</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
              {errors.origem && (
                <p className="text-sm text-destructive">{errors.origem.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="limiteCredito" className="flex items-center gap-1">
                <CreditCard className="h-3 w-3" />
                Limite Crédito
              </Label>
              <Input
                id="limiteCredito"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("limiteCredito")}
                className={errors.limiteCredito ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.limiteCredito && (
                <p className="text-sm text-destructive">{errors.limiteCredito.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ultimoAtendimento" className="flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              Último Atendimento
            </Label>
            <Input
              id="ultimoAtendimento"
              type="date"
              {...register("ultimoAtendimento")}
              className={errors.ultimoAtendimento ? "border-destructive" : ""}
              disabled={loading}
            />
            {errors.ultimoAtendimento && (
              <p className="text-sm text-destructive">{errors.ultimoAtendimento.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes" className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Observações
            </Label>
            <Textarea
              id="observacoes"
              placeholder="Notas importantes sobre o cliente..."
              {...register("observacoes")}
              className={errors.observacoes ? "border-destructive" : ""}
              disabled={loading}
              rows={4}
            />
            {errors.observacoes && (
              <p className="text-sm text-destructive">{errors.observacoes.message}</p>
            )}
          </div>

          <Alert className="bg-muted/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              O telefone é usado como principal referência de contacto. Evite duplicados para manter a carteira de clientes organizada.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={fecharModal}
              disabled={loading}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={loading || telefoneDuplicado || emailDuplicado || nuitDuplicado}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Atualizar" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClienteModal;