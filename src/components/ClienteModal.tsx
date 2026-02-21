// src/components/ClienteModal.tsx
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCliente, updateCliente, Cliente, ClienteInput } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, User, Phone, Mail, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Schema de validação
const schema = z.object({
  nome: z.string()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(100, "Nome muito longo"),
  telefone: z.string()
    .min(9, "Telefone deve ter pelo menos 9 dígitos")
    .regex(/^[0-9+\s]+$/, "Telefone deve conter apenas números, espaços ou +"),
  email: z.string()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  vendedorId?: string;
}

const ClienteModal = ({ open, onClose, cliente, vendedorId }: Props) => {
  const isEdit = !!cliente;
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isVendedor } = useAuth();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: cliente?.nome ?? "",
      telefone: cliente?.telefone ?? "",
      email: cliente?.email ?? "",
    },
  });

  // Reset form when cliente changes
  useEffect(() => {
    if (cliente) {
      reset({
        nome: cliente.nome,
        telefone: cliente.telefone,
        email: cliente.email || "",
      });
    } else {
      reset({
        nome: "",
        telefone: "",
        email: "",
      });
    }
  }, [cliente, reset, open]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    
    try {
      const input: ClienteInput = {
        nome: data.nome,
        telefone: data.telefone,
        email: data.email || "",
      };

      if (isEdit && cliente?.id) {
        await updateCliente(cliente.id, input);
        toast({
          title: "Sucesso!",
          description: "Cliente atualizado com sucesso.",
        });
      } else {
        // Passar o vendedorId para a função createCliente
        await createCliente(input, vendedorId);
        toast({
          title: "Sucesso!",
          description: vendedorId 
            ? "Cliente criado e associado ao seu perfil." 
            : "Cliente criado com sucesso.",
        });
      }

      reset();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      toast({
        title: "Erro",
        description: `Erro ao ${isEdit ? 'atualizar' : 'criar'} cliente. Tente novamente.`,
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Cliente" : "Novo Cliente"}
          </DialogTitle>
          <DialogDescription>
            {isEdit 
              ? "Edite as informações do cliente abaixo." 
              : "Preencha as informações do novo cliente."}
          </DialogDescription>
        </DialogHeader>

        {!isEdit && isVendedor && (
  <Alert className="bg-accent/10 border-accent mb-2">
    <User className="h-4 w-4 text-accent" />
    <AlertDescription className="text-foreground font-semibold">
      ⚡ Este cliente será associado ao seu perfil de vendedor!
    </AlertDescription>
  </Alert>
)}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">
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

          <div className="space-y-2">
            <Label htmlFor="telefone">
              Telefone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="telefone"
              placeholder="84 123 4567"
              {...register("telefone")}
              className={errors.telefone ? "border-destructive" : ""}
              disabled={loading}
            />
            {errors.telefone && (
              <p className="text-sm text-destructive">{errors.telefone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="cliente@email.com"
              {...register("email")}
              className={errors.email ? "border-destructive" : ""}
              disabled={loading}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <DialogFooter>
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
              {isEdit ? "Atualizar" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClienteModal;