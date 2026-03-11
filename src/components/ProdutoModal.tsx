import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createProduto,
  updateProduto,
  Produto,
  ProdutoInput,
  Categoria,
  listenCategorias,
} from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  TrendingUp,
  AlertCircle,
  Package,
  DollarSign,
  Tag,
  Box,
  Sparkles,
  Barcode,
  Building2,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const numberField = (label: string) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      if (typeof value === "string") return Number(value);
      return value;
    },
    z
      .number({
        required_error: `${label} é obrigatório`,
        invalid_type_error: `${label} deve ser um número`,
      })
      .refine((val) => !Number.isNaN(val), `${label} deve ser um número válido`)
  );

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

const schema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(2, "Nome deve ter pelo menos 2 caracteres")
      .max(100, "Nome muito longo")
      .regex(/^[a-zA-Z0-9À-ÿ\s\-.,/]+$/, "Nome contém caracteres inválidos"),

    categoria: z.string().min(1, "Selecione uma categoria"),

    fornecedor: z
      .string()
      .trim()
      .min(2, "Fornecedor deve ter pelo menos 2 caracteres")
      .max(100, "Fornecedor muito longo")
      .regex(/^[a-zA-Z0-9À-ÿ\s\-.,&]+$/, "Fornecedor contém caracteres inválidos"),

    marca: z
      .string()
      .trim()
      .max(60, "Marca muito longa")
      .optional()
      .or(z.literal("")),

    sku: z
      .string()
      .trim()
      .max(40, "SKU muito longo")
      .regex(/^[a-zA-Z0-9\-_]*$/, "SKU inválido")
      .optional()
      .or(z.literal("")),

    codigoBarras: z
      .string()
      .trim()
      .max(30, "Código de barras muito longo")
      .regex(/^[0-9]*$/, "Código de barras deve conter apenas números")
      .optional()
      .or(z.literal("")),

    unidade: z.enum(["un", "kg", "lt", "cx", "pct"], {
      errorMap: () => ({ message: "Selecione a unidade" }),
    }),

    precoCompra: numberField("Preço de compra").refine(
      (val) => val >= 0.01,
      "Preço de compra deve ser maior que 0"
    ),

    precoVenda: numberField("Preço de venda").refine(
      (val) => val >= 0.01,
      "Preço de venda deve ser maior que 0"
    ),

    stock: numberField("Stock")
      .refine((val) => Number.isInteger(val), "Stock deve ser um número inteiro")
      .refine((val) => val >= 0, "Stock não pode ser negativo"),

    stockMinimo: optionalNumberField("Stock mínimo")
      .refine((val) => val === undefined || Number.isInteger(val), "Stock mínimo deve ser inteiro")
      .refine((val) => val === undefined || val >= 0, "Stock mínimo não pode ser negativo"),

    stockMaximo: optionalNumberField("Stock máximo")
      .refine((val) => val === undefined || Number.isInteger(val), "Stock máximo deve ser inteiro")
      .refine((val) => val === undefined || val >= 0, "Stock máximo não pode ser negativo"),

    localizacao: z
      .string()
      .trim()
      .max(80, "Localização muito longa")
      .optional()
      .or(z.literal("")),

    estado: z.enum(["ativo", "inativo"], {
      errorMap: () => ({ message: "Selecione o estado" }),
    }),

    descricao: z
      .string()
      .trim()
      .max(300, "Descrição muito longa")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.precoVenda >= data.precoCompra, {
    message: "Preço de venda deve ser maior ou igual ao preço de compra",
    path: ["precoVenda"],
  })
  .refine(
    (data) =>
      data.stockMinimo === undefined ||
      data.stockMaximo === undefined ||
      data.stockMaximo >= data.stockMinimo,
    {
      message: "Stock máximo deve ser maior ou igual ao stock mínimo",
      path: ["stockMaximo"],
    }
  )
  .refine(
    (data) => data.stockMaximo === undefined || data.stock <= data.stockMaximo,
    {
      message: "Stock inicial não pode ser maior que o stock máximo",
      path: ["stock"],
    }
  );

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  produto: Produto | null;
  produtosExistentes: Produto[];
}

const getDefaultValues = (produto: Produto | null): FormData => ({
  nome: produto?.nome ?? "",
  categoria: produto?.categoria ?? "",
  fornecedor: produto?.fornecedor ?? "",
  marca: produto?.marca ?? "",
  sku: produto?.sku ?? "",
  codigoBarras: produto?.codigoBarras ?? "",
  unidade: (produto?.unidade as FormData["unidade"]) ?? "un",
  precoCompra: produto?.precoCompra ?? 0,
  precoVenda: produto?.precoVenda ?? 0,
  stock: produto?.stock ?? 0,
  stockMinimo: produto?.stockMinimo,
  stockMaximo: produto?.stockMaximo,
  localizacao: produto?.localizacao ?? "",
  estado: (produto?.estado as FormData["estado"]) ?? "ativo",
  descricao: produto?.descricao ?? "",
});

const ProdutoModal = ({ open, onClose, produto, produtosExistentes }: Props) => {
  const isEdit = Boolean(produto);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const { isAdmin, isVendedor } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(produto),
  });

  useEffect(() => {
    const unsubscribe = listenCategorias((categoriasData) => {
      setCategorias(categoriasData);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!open) return;
    reset(getDefaultValues(produto));
  }, [open, produto, reset]);

  const nome = watch("nome");
  const categoria = watch("categoria");
  const fornecedor = watch("fornecedor");
  const sku = watch("sku");
  const codigoBarras = watch("codigoBarras");
  const precoCompra = watch("precoCompra");
  const precoVenda = watch("precoVenda");
  const stock = watch("stock");
  const stockMinimo = watch("stockMinimo");
  const stockMaximo = watch("stockMaximo");

  const margemLucro =
    precoCompra > 0 ? (((precoVenda - precoCompra) / precoCompra) * 100).toFixed(1) : "0.0";

  const lucroPorUnidade = (precoVenda || 0) - (precoCompra || 0);
  const lucroTotalEstimado = lucroPorUnidade * (stock || 0);

  const nomeDuplicado = useMemo(() => {
    if (!open || loading) return false;

    const nomeFormatado = nome?.trim().toLowerCase();
    if (!nomeFormatado) return false;

    return produtosExistentes.some((p) => {
      const mesmoNome = p.nome.trim().toLowerCase() === nomeFormatado;
      const mesmoProduto = produto?.id === p.id;
      return mesmoNome && !mesmoProduto;
    });
  }, [nome, produtosExistentes, produto, open, loading]);

  const skuDuplicado = useMemo(() => {
    if (!open || loading || !sku?.trim()) return false;

    const skuFormatado = sku.trim().toLowerCase();

    return produtosExistentes.some((p) => {
      const skuExistente = p.sku?.trim().toLowerCase() === skuFormatado;
      const mesmoProduto = produto?.id === p.id;
      return skuExistente && !mesmoProduto;
    });
  }, [sku, produtosExistentes, produto, open, loading]);

  const codigoBarrasDuplicado = useMemo(() => {
    if (!open || loading || !codigoBarras?.trim()) return false;

    const codigoFormatado = codigoBarras.trim();

    return produtosExistentes.some((p) => {
      const codigoExistente = p.codigoBarras?.trim() === codigoFormatado;
      const mesmoProduto = produto?.id === p.id;
      return codigoExistente && !mesmoProduto;
    });
  }, [codigoBarras, produtosExistentes, produto, open, loading]);

  const getMargemColor = () => {
    const margem = Number(margemLucro);
    if (margem >= 30) return "text-green-600";
    if (margem >= 20) return "text-accent";
    if (margem >= 10) return "text-yellow-600";
    return "text-destructive";
  };

  const sugerirPrecoVenda = () => {
    if (!precoCompra || precoCompra <= 0) return;

    const sugerido = Number((precoCompra * 1.3).toFixed(2));
    setValue("precoVenda", sugerido, {
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

    reset(getDefaultValues(null));
    onClose();
  };

  const onSubmit = async (data: FormData) => {
    if (!isAdmin) {
      toast({
        title: "Permissão negada",
        description: "Apenas administradores podem criar ou editar produtos.",
        variant: "destructive",
      });
      return;
    }

    const nomeNormalizado = data.nome.trim().toLowerCase();
    const skuNormalizado = data.sku?.trim().toLowerCase();
    const codigoNormalizado = data.codigoBarras?.trim();

    const existeProduto = produtosExistentes.some((p) => {
      const mesmoNome = p.nome.trim().toLowerCase() === nomeNormalizado;
      const mesmoProduto = produto?.id === p.id;
      return mesmoNome && !mesmoProduto;
    });

    const existeSku =
      skuNormalizado &&
      produtosExistentes.some((p) => {
        const mesmoSku = p.sku?.trim().toLowerCase() === skuNormalizado;
        const mesmoProduto = produto?.id === p.id;
        return mesmoSku && !mesmoProduto;
      });

    const existeCodigoBarras =
      codigoNormalizado &&
      produtosExistentes.some((p) => {
        const mesmoCodigo = p.codigoBarras?.trim() === codigoNormalizado;
        const mesmoProduto = produto?.id === p.id;
        return mesmoCodigo && !mesmoProduto;
      });

    if (existeProduto) {
      toast({
        title: "Nome duplicado",
        description: "Já existe um produto com esse nome.",
        variant: "destructive",
      });
      return;
    }

    if (existeSku) {
      toast({
        title: "SKU duplicado",
        description: "Já existe um produto com esse SKU.",
        variant: "destructive",
      });
      return;
    }

    if (existeCodigoBarras) {
      toast({
        title: "Código de barras duplicado",
        description: "Já existe um produto com esse código de barras.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const input: ProdutoInput = {
        nome: data.nome.trim(),
        categoria: data.categoria,
        fornecedor: data.fornecedor.trim(),
        marca: data.marca?.trim() || "",
        sku: data.sku?.trim() || "",
        codigoBarras: data.codigoBarras?.trim() || "",
        unidade: data.unidade,
        precoCompra: data.precoCompra,
        precoVenda: data.precoVenda,
        stock: data.stock,
        stockMinimo: data.stockMinimo ?? 0,
        stockMaximo: data.stockMaximo ?? 0,
        localizacao: data.localizacao?.trim() || "",
        estado: data.estado,
        descricao: data.descricao?.trim() || "",
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

      reset(getDefaultValues(null));
      onClose();
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      toast({
        title: "Erro",
        description: `Erro ao ${isEdit ? "atualizar" : "criar"} produto. Tente novamente.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || isAdmin) return;

    toast({
      title: "Acesso negado",
      description: "Você não tem permissão para gerenciar produtos.",
      variant: "destructive",
    });

    onClose();
  }, [open, isAdmin, onClose, toast]);

  if (!isAdmin && open) return null;

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
            <Package className="h-5 w-5" />
            {isEdit ? "Editar Produto" : "Novo Produto"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize as informações do produto com controlo de preço, margem, stock e definições avançadas."
              : "Preencha os dados do produto para o cadastrar no estoque com fornecedor e definições avançadas."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome" className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Nome do Produto <span className="text-destructive">*</span>
            </Label>
            <Input
              id="nome"
              placeholder="Ex: Arroz 5kg"
              {...register("nome")}
              className={errors.nome || nomeDuplicado ? "border-destructive" : ""}
              disabled={loading}
              autoFocus
            />
            {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
            {!errors.nome && nomeDuplicado && (
              <p className="text-sm text-destructive">Já existe um produto com este nome.</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="categoria" className="flex items-center gap-1">
                <Box className="h-3 w-3" />
                Categoria <span className="text-destructive">*</span>
              </Label>

              <Select
                value={categoria || ""}
                onValueChange={(value) =>
                  setValue("categoria", value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }
                disabled={loading}
              >
                <SelectTrigger className={errors.categoria ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>

                <SelectContent>
                  {categorias.length === 0 ? (
                    <SelectItem value="sem-categorias" disabled>
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

            <div className="space-y-2">
              <Label htmlFor="fornecedor" className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Fornecedor <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fornecedor"
                placeholder="Ex: Distribuidora Central"
                {...register("fornecedor")}
                className={errors.fornecedor ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.fornecedor && (
                <p className="text-sm text-destructive">{errors.fornecedor.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="marca">Marca</Label>
              <Input
                id="marca"
                placeholder="Ex: XAI-XAI"
                {...register("marca")}
                className={errors.marca ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.marca && <p className="text-sm text-destructive">{errors.marca.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku" className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                SKU
              </Label>
              <Input
                id="sku"
                placeholder="Ex: ARZ-5KG-001"
                {...register("sku")}
                className={errors.sku || skuDuplicado ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}
              {!errors.sku && skuDuplicado && (
                <p className="text-sm text-destructive">Já existe um produto com este SKU.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigoBarras" className="flex items-center gap-1">
                <Barcode className="h-3 w-3" />
                Código de Barras
              </Label>
              <Input
                id="codigoBarras"
                placeholder="Ex: 1234567890123"
                {...register("codigoBarras")}
                className={errors.codigoBarras || codigoBarrasDuplicado ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.codigoBarras && (
                <p className="text-sm text-destructive">{errors.codigoBarras.message}</p>
              )}
              {!errors.codigoBarras && codigoBarrasDuplicado && (
                <p className="text-sm text-destructive">
                  Já existe um produto com este código de barras.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Unidade <span className="text-destructive">*</span></Label>
              <Select
                value={watch("unidade")}
                onValueChange={(value: FormData["unidade"]) =>
                  setValue("unidade", value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }
                disabled={loading}
              >
                <SelectTrigger className={errors.unidade ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecionar unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="un">Unidade</SelectItem>
                  <SelectItem value="kg">Quilograma</SelectItem>
                  <SelectItem value="lt">Litro</SelectItem>
                  <SelectItem value="cx">Caixa</SelectItem>
                  <SelectItem value="pct">Pacote</SelectItem>
                </SelectContent>
              </Select>
              {errors.unidade && (
                <p className="text-sm text-destructive">{errors.unidade.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Estado <span className="text-destructive">*</span></Label>
              <Select
                value={watch("estado")}
                onValueChange={(value: FormData["estado"]) =>
                  setValue("estado", value, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }
                disabled={loading}
              >
                <SelectTrigger className={errors.estado ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
              {errors.estado && (
                <p className="text-sm text-destructive">{errors.estado.message}</p>
              )}
            </div>
          </div>

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
                {...register("precoCompra")}
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
              <div className="flex gap-2">
                <Input
                  id="precoVenda"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  {...register("precoVenda")}
                  className={errors.precoVenda ? "border-destructive" : ""}
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={sugerirPrecoVenda}
                  disabled={loading || !precoCompra || precoCompra <= 0}
                  title="Sugerir preço com margem de 30%"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </div>
              {errors.precoVenda && (
                <p className="text-sm text-destructive">{errors.precoVenda.message}</p>
              )}
            </div>
          </div>

          {precoCompra > 0 && precoVenda > 0 && (
            <div className="space-y-2">
              <Alert variant="default" className="bg-muted/50">
                <TrendingUp className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Margem de Lucro</span>
                  <span className={`font-bold ${getMargemColor()}`}>{margemLucro}%</span>
                </AlertDescription>
              </Alert>

              <Alert variant="default" className="bg-muted/50">
                <DollarSign className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Lucro por Unidade</span>
                  <span className={`font-bold ${lucroPorUnidade >= 0 ? "text-accent" : "text-destructive"}`}>
                    {lucroPorUnidade.toFixed(2)} MZN
                  </span>
                </AlertDescription>
              </Alert>

              <Alert variant="default" className="bg-muted/50">
                <Package className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Lucro Total Estimado</span>
                  <span className={`font-bold ${lucroTotalEstimado >= 0 ? "text-accent" : "text-destructive"}`}>
                    {lucroTotalEstimado.toFixed(2)} MZN
                  </span>
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                {...register("stock")}
                className={errors.stock ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.stock && <p className="text-sm text-destructive">{errors.stock.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stockMinimo">Stock Mínimo</Label>
              <Input
                id="stockMinimo"
                type="number"
                step="1"
                min="0"
                placeholder="Ex: 5"
                {...register("stockMinimo")}
                className={errors.stockMinimo ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.stockMinimo && (
                <p className="text-sm text-destructive">{errors.stockMinimo.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stockMaximo">Stock Máximo</Label>
              <Input
                id="stockMaximo"
                type="number"
                step="1"
                min="0"
                placeholder="Ex: 100"
                {...register("stockMaximo")}
                className={errors.stockMaximo ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.stockMaximo && (
                <p className="text-sm text-destructive">{errors.stockMaximo.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="localizacao" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Localização
              </Label>
              <Input
                id="localizacao"
                placeholder="Ex: Armazém A - Prateleira 2"
                {...register("localizacao")}
                className={errors.localizacao ? "border-destructive" : ""}
                disabled={loading}
              />
              {errors.localizacao && (
                <p className="text-sm text-destructive">{errors.localizacao.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                placeholder="Observações, composição, embalagem, etc."
                {...register("descricao")}
                className={errors.descricao ? "border-destructive" : ""}
                disabled={loading}
                rows={3}
              />
              {errors.descricao && (
                <p className="text-sm text-destructive">{errors.descricao.message}</p>
              )}
            </div>
          </div>

          {stock === 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Este produto ficará sem stock.</AlertDescription>
            </Alert>
          )}

          {stockMinimo !== undefined && stock > 0 && stock <= stockMinimo && (
            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                O stock atual está no nível mínimo ou abaixo dele.
              </AlertDescription>
            </Alert>
          )}

          {stockMaximo !== undefined && stockMaximo > 0 && stock > stockMaximo && (
            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                O stock informado está acima do stock máximo definido.
              </AlertDescription>
            </Alert>
          )}

          {isEdit && produto && produto.stock < 10 && (
            <Alert variant={produto.stock === 0 ? "destructive" : "default"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {produto.stock === 0
                  ? "Este produto está sem stock. Reposição recomendada com urgência."
                  : `Este produto está com stock baixo (${produto.stock} unidades). Considere repor.`}
              </AlertDescription>
            </Alert>
          )}

          {isVendedor && (
            <Alert variant="default" className="bg-warning/10 border-warning">
              <AlertCircle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning text-xs">
                Apenas administradores podem modificar produtos. Você está no modo de visualização.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-4">
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
              disabled={loading || !isAdmin || nomeDuplicado || skuDuplicado || codigoBarrasDuplicado}
            >
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