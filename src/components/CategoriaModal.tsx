import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCategoria,
  updateCategoria,
  Categoria,
  CategoriaInput,
} from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, FolderTree, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Schema de validação
const schema = z.object({
  nome: z.string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(50, "Nome muito longo")
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras e espaços"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  categoria: Categoria | null;
}

const CategoriaModal = ({ open, onClose, categoria }: Props) => {
  const isEdit = !!categoria;
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isAdmin, isVendedor } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: categoria?.nome ?? "",
    },
  });

  useEffect(() => {
    if (categoria) {
      reset({ nome: categoria.nome });
    } else {
      reset({ nome: "" });
    }
  }, [categoria, reset, open]);

  const onSubmit = async (data: FormData) => {
    // Verificar permissão
    if (!isAdmin) {
      toast({
        title: "Permissão negada",
        description: "Apenas administradores podem criar ou editar categorias.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const input: CategoriaInput = {
        nome: data.nome,
      };

      if (isEdit && categoria?.id) {
        await updateCategoria(categoria.id, input);
        toast({
          title: "Sucesso!",
          description: "Categoria atualizada com sucesso.",
        });
      } else {
        await createCategoria(input);
        toast({
          title: "Sucesso!",
          description: "Categoria criada com sucesso.",
        });
      }

      reset();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);
      toast({
        title: "Erro",
        description: `Erro ao ${isEdit ? 'atualizar' : 'criar'} categoria. Tente novamente.`,
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

  // Se não for admin, não mostra o modal
  if (!isAdmin && open) {
    toast({
      title: "Acesso negado",
      description: "Você não tem permissão para gerenciar categorias.",
      variant: "destructive",
    });
    onClose();
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            {isEdit ? "Editar Categoria" : "Nova Categoria"}
          </DialogTitle>
          <DialogDescription>
            {isEdit 
              ? "Edite o nome da categoria abaixo." 
              : "Preencha o nome da nova categoria."}
          </DialogDescription>
        </DialogHeader>

        {/* Aviso para vendedores */}
        {isVendedor && (
          <Alert variant="default" className="bg-warning/10 border-warning mb-4">
            <AlertCircle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning text-xs">
              Apenas administradores podem gerenciar categorias. Você está no modo de visualização.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome" className="flex items-center gap-1">
              <FolderTree className="h-3 w-3" />
              Nome da Categoria <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nome"
              placeholder="Ex: Alimentos, Bebidas, Limpeza..."
              {...register("nome")}
              className={errors.nome ? "border-destructive" : ""}
              disabled={loading || !isAdmin}
              autoFocus
            />
            {errors.nome && (
              <p className="text-sm text-destructive">{errors.nome.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Use apenas letras e espaços. Máximo 50 caracteres.
            </p>
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
            <Button 
              type="submit" 
              disabled={loading || !isAdmin}
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

export default CategoriaModal;