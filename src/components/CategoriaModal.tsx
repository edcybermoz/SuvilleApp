import { useEffect, useMemo, useState } from "react";
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
import { Loader2, FolderTree, AlertCircle, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const schema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(50, "Nome muito longo")
    .regex(
      /^[a-zA-ZÀ-ÿ0-9\s&\-]+$/,
      "Nome deve conter apenas letras, números, espaços, & e hífen"
    ),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  categoria: Categoria | null;
  categoriasExistentes: Categoria[];
}

const normalizarNome = (nome: string) => nome.trim().replace(/\s+/g, " ");

const CategoriaModal = ({
  open,
  onClose,
  categoria,
  categoriasExistentes,
}: Props) => {
  const isEdit = Boolean(categoria);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: "",
    },
  });

  const nome = watch("nome");

  useEffect(() => {
    if (!open) return;

    reset({
      nome: categoria?.nome ?? "",
    });
  }, [open, categoria, reset]);

  useEffect(() => {
    if (!open || isAdmin) return;

    toast({
      title: "Acesso negado",
      description: "Você não tem permissão para gerenciar categorias.",
      variant: "destructive",
    });

    onClose();
  }, [open, isAdmin, onClose, toast]);

  const categoriaDuplicada = useMemo(() => {
    if (!open || loading) return false;

    const nomeNormalizado = normalizarNome(nome || "").toLowerCase();
    if (!nomeNormalizado) return false;

    return categoriasExistentes.some((c) => {
      const nomeExistente = normalizarNome(c.nome || "").toLowerCase();
      const mesmaCategoria = categoria?.id === c.id;
      return nomeExistente === nomeNormalizado && !mesmaCategoria;
    });
  }, [nome, categoriasExistentes, categoria, open, loading]);

  const capitalizarNome = () => {
    const valor = normalizarNome(nome || "")
      .split(" ")
      .filter(Boolean)
      .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
      .join(" ");

    setValue("nome", valor, {
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

    reset({ nome: "" });
    onClose();
  };

  const onSubmit = async (data: FormData) => {
    if (!isAdmin) {
      toast({
        title: "Permissão negada",
        description: "Apenas administradores podem criar ou editar categorias.",
        variant: "destructive",
      });
      return;
    }

    const nomeNormalizado = normalizarNome(data.nome).toLowerCase();

    const duplicada = categoriasExistentes.some((c) => {
      const nomeExistente = normalizarNome(c.nome || "").toLowerCase();
      const mesmaCategoria = categoria?.id === c.id;
      return nomeExistente === nomeNormalizado && !mesmaCategoria;
    });

    if (duplicada) {
      toast({
        title: "Categoria duplicada",
        description: "Já existe uma categoria com esse nome.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const input: CategoriaInput = {
        nome: normalizarNome(data.nome),
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

      reset({ nome: "" });
      onClose();
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);

      toast({
        title: "Erro",
        description: `Erro ao ${isEdit ? "atualizar" : "criar"} categoria. Tente novamente.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin && open) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) fecharModal();
      }}
    >
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            {isEdit ? "Editar Categoria" : "Nova Categoria"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Edite o nome da categoria abaixo."
              : "Preencha o nome da nova categoria para organizar melhor os produtos."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome" className="flex items-center gap-1">
              <FolderTree className="h-3 w-3" />
              Nome da Categoria <span className="text-destructive">*</span>
            </Label>

            <div className="flex gap-2">
              <Input
                id="nome"
                placeholder="Ex: Alimentos, Bebidas, Limpeza..."
                {...register("nome")}
                className={errors.nome || categoriaDuplicada ? "border-destructive" : ""}
                disabled={loading}
                autoFocus
              />

              <Button
                type="button"
                variant="outline"
                onClick={capitalizarNome}
                disabled={loading || !nome?.trim()}
                title="Formatar nome"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>

            {errors.nome && (
              <p className="text-sm text-destructive">{errors.nome.message}</p>
            )}

            {!errors.nome && categoriaDuplicada && (
              <p className="text-sm text-destructive">
                Já existe uma categoria com este nome.
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Máximo 50 caracteres. Evite nomes repetidos.
            </p>
          </div>

          <Alert className="bg-muted/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Categorias bem definidas ajudam a organizar produtos, melhorar filtros e facilitar relatórios.
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
              disabled={loading || categoriaDuplicada}
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