import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProduto, updateProduto, Produto, ProdutoInput, Categoria, listenCategorias } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, TrendingUp, AlertCircle, Package, DollarSign, Tag, Box } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Schema de validação melhorado
const schema = z.object({
  nome: z.string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo")
    .regex(/^[a-zA-Z0-9À-ÿ\s]+$/, "Nome deve conter apenas letras, números e espaços"),
  categoria: z.string()
    .min(1, "Selecione uma categoria"),
  precoCompra: z.number({ 
    required_error: "Preço de compra é obrigatório",
    invalid_type_error: "Preço de compra deve ser um número"
  }).min(0.01, "Preço de compra deve ser maior que 0"),
  precoVenda: z.number({ 
    required_error: "Preço de venda é obrigatório",
    invalid_type_error: "Preço de venda deve ser um número"
  }).min(0.01, "Preço de venda deve ser maior que 0"),
  stock: z.number({ 
    required_error: "Stock é obrigatório",
    invalid_type_error: "Stock deve ser um número"
  }).int("Stock deve ser um número inteiro")
    .min(0, "Stock não pode ser negativo"),
}).refine((data) => data.precoVenda >= data.precoCompra, {
  message: "Preço de venda deve ser maior ou igual ao preço de compra",
  path: ["precoVenda"],
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  produto: Produto | null;
}

const ProdutoModal = ({ open, onClose, produto }: Props) => {
  const isEdit = !!produto;
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isAdmin, isVendedor } = useAuth();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: produto?.nome ?? "",
      categoria: produto?.categoria ?? "",
      precoCompra: produto?.precoCompra ?? 0,
      precoVenda: produto?.precoVenda ?? 0,
      stock: produto?.stock ?? 0,
    },
  });

  // Carregar categorias do Firestore
  useEffect(() => {
    const unsubscribe = listenCategorias((categoriasData) => {
      setCategorias(categoriasData);
    });
    return () => unsubscribe();
  }, []);

  // Resetar valores ao abrir modal
  useEffect(() => {
    if (produto) {
      reset({
        nome: produto.nome,
        categoria: produto.categoria,
        precoCompra: produto.precoCompra,
        precoVenda: produto.precoVenda,
        stock: produto.stock,
      });
    } else {
      reset({ 
        nome: "", 
        categoria: "", 
        precoCompra: 0, 
        precoVenda: 0, 
        stock: 0 
      });
    }
  }, [produto, reset, open]);

  // Observar valores para cálculos
  const precoCompra = watch("precoCompra");
  const precoVenda = watch("precoVenda");

  // Calcular margem de lucro
  const margemLucro = precoCompra > 0 
    ? ((precoVenda - precoCompra) / precoCompra * 100).toFixed(1)
    : "0.0";

  // Determinar cor da margem
  const getMargemColor = () => {
    const margem = Number(margemLucro);
    if (margem >= 30) return "text-green-600";
    if (margem >= 20) return "text-accent";
    if (margem >= 10) return "text-yellow-600";
    return "text-destructive";
  };

  // Calcular lucro estimado
  const lucroEstimado = precoVenda - precoCompra;

  // Submit do formulário
  const onSubmit = async (data: FormData) => {
    // Verificar permissão
    if (!isAdmin) {
      toast({
        title: "Permissão negada",
        description: "Apenas administradores podem criar ou editar produtos.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const input: ProdutoInput = {
        nome: data.nome,
        categoria: data.categoria,
        precoCompra: data.precoCompra,
        precoVenda: data.precoVenda,
        stock: data.stock,
      };

      if (isEdit && produto?.id) {
        await updateProduto(produto.id, input);
        toast({
          title: "Sucesso!",
          description: "Produto atualizado com sucesso.",
        });
      } else {
        await createProduto(input);
        toast({
          title: "Sucesso!",
          description: "Produto criado com sucesso.",
        });
      }
      
      reset();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      toast({
        title: "Erro",
        description: `Erro ao ${isEdit ? 'atualizar' : 'criar'} produto. Tente novamente.`,
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
      description: "Você não tem permissão para gerenciar produtos.",
      variant: "destructive",
    });
    onClose();
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isEdit ? "Editar Produto" : "Novo Produto"}
          </DialogTitle>
          <DialogDescription>
            {isEdit 
              ? "Edite as informações do produto abaixo." 
              : "Preencha as informações do novo produto."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nome do Produto */}
          <div className="space-y-2">
            <Label htmlFor="nome" className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Nome do Produto <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nome"
              placeholder="Ex: Arroz 5kg"
              {...register("nome")}
              className={errors.nome ? "border-destructive" : ""}
              disabled={loading}
              autoFocus
            />
            {errors.nome && (
              <p className="text-sm text-destructive">{errors.nome.message}</p>
            )}
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="categoria" className="flex items-center gap-1">
              <Box className="h-3 w-3" />
              Categoria <span className="text-destructive">*</span>
            </Label>
            <Select 
              onValueChange={(value) => setValue("categoria", value)}
              defaultValue={produto?.categoria}
              disabled={loading}
            >
              <SelectTrigger className={errors.categoria ? "border-destructive" : ""}>
                <SelectValue placeholder="Selecionar categoria" />
              </SelectTrigger>
              <SelectContent>
                {categorias.length === 0 ? (
                  <SelectItem value="no-categories" disabled>
                    Nenhuma categoria encontrada
                  </SelectItem>
                ) : (
                  categorias.map((c) => (
                    <SelectItem key={c.id} value={c.nome}>
                      {c.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.categoria && (
              <p className="text-sm text-destructive">{errors.categoria.message}</p>
            )}
          </div>

          {/* Preços */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="precoCompra" className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Preço Compra <span className="text-destructive">*</span>
              </Label>
              <Input
                id="precoCompra"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                {...register("precoCompra", { valueAsNumber: true })}
                className={errors.precoCompra ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.precoCompra && (
                <p className="text-sm text-destructive">{errors.precoCompra.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="precoVenda" className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Preço Venda <span className="text-destructive">*</span>
              </Label>
              <Input
                id="precoVenda"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                {...register("precoVenda", { valueAsNumber: true })}
                className={errors.precoVenda ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.precoVenda && (
                <p className="text-sm text-destructive">{errors.precoVenda.message}</p>
              )}
            </div>
          </div>

          {/* Margem de Lucro e Lucro Estimado */}
          {precoCompra > 0 && precoVenda > 0 && (
            <div className="space-y-2">
              <Alert variant="default" className="bg-muted/50">
                <TrendingUp className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Margem de Lucro:</span>
                  <span className={`font-bold ${getMargemColor()}`}>
                    {margemLucro}%
                  </span>
                </AlertDescription>
              </Alert>
              
              <Alert variant="default" className="bg-muted/50">
                <DollarSign className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Lucro por Unidade:</span>
                  <span className={`font-bold ${lucroEstimado > 0 ? "text-accent" : "text-destructive"}`}>
                    {lucroEstimado.toFixed(2)} MZN
                  </span>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Stock */}
          <div className="space-y-2">
            <Label htmlFor="stock" className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              Stock Inicial <span className="text-destructive">*</span>
            </Label>
            <Input
              id="stock"
              type="number"
              step="1"
              min="0"
              placeholder="0"
              {...register("stock", { valueAsNumber: true })}
              className={errors.stock ? "border-destructive" : ""}
              disabled={loading}
            />
            {errors.stock && (
              <p className="text-sm text-destructive">{errors.stock.message}</p>
            )}
          </div>

          {/* Aviso de stock baixo (se for edição) */}
          {isEdit && produto && produto.stock < 10 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Este produto está com stock baixo ({produto.stock} unidades). 
                Considere fazer um novo pedido.
              </AlertDescription>
            </Alert>
          )}

          {/* Aviso de permissão para vendedores */}
          {isVendedor && (
            <Alert variant="default" className="bg-warning/10 border-warning">
              <AlertCircle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning text-xs">
                Apenas administradores podem modificar produtos. Você está no modo de visualização.
              </AlertDescription>
            </Alert>
          )}

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
            <Button type="submit" disabled={loading || !isAdmin}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Atualizar" : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProdutoModal;