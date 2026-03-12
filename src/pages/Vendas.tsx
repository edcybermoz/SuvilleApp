import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  Eye,
  Printer,
  XCircle,
  Loader2,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  CalendarDays,
  BadgeDollarSign,
  Lock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import {
  listenVendas,
  listenVendasPorVendedor,
  updateVendaStatus,
  type Venda,
} from "@/lib/store";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { useSystemConfig } from "@/contexts/SystemConfigContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

type SortField =
  | "createdAt"
  | "clienteNome"
  | "total"
  | "status"
  | "metodoPagamento";

type SortDirection = "asc" | "desc";
type QuickFilter = "todos" | "concluida" | "pendente" | "cancelada" | "hoje";
type PaymentFilter = "todos" | "dinheiro" | "cartao" | "transferencia";

const ITEMS_PER_PAGE = 8;

const Vendas = () => {
  const { firebaseUser, isAdmin, isVendedor } = useAuth();
  const { blocked, canCreateSales, currentPlan, currentStatus, daysLeft } = usePlanAccess();
  const { empresaConfig, sistemaConfig, ivaConfig } = useSystemConfig();
  const { toast } = useToast();

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null);
  const [dialogAberto, setDialogAberto] = useState(false);

  const [cancelandoVenda, setCancelandoVenda] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [vendaToCancel, setVendaToCancel] = useState<Venda | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");

  const [quickFilter, setQuickFilter] = useState<QuickFilter>("todos");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("todos");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);

  const vendedorUid = firebaseUser?.uid ?? null;

  useEffect(() => {
    if (blocked) {
      setVendas([]);
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    setLoading(true);

    if (isAdmin) {
      unsubscribe = listenVendas(
        (vendasData) => {
          setVendas(vendasData);
          setLoading(false);
        },
        () => {
          setVendas([]);
          setLoading(false);
          toast({
            title: "Erro",
            description: "Não foi possível carregar as vendas.",
            variant: "destructive",
          });
        }
      );
    } else if (isVendedor) {
      if (!vendedorUid) {
        setVendas([]);
        setLoading(false);
        return;
      }

      unsubscribe = listenVendasPorVendedor(
        vendedorUid,
        (vendasData) => {
          setVendas(vendasData);
          setLoading(false);
        },
        () => {
          setVendas([]);
          setLoading(false);
          toast({
            title: "Erro",
            description: "Não foi possível carregar as suas vendas.",
            variant: "destructive",
          });
        }
      );
    } else {
      setVendas([]);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [blocked, isAdmin, isVendedor, vendedorUid, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [quickFilter, paymentFilter, sortField, sortDirection]);

  const formatarData = (timestamp?: Timestamp | null) => {
    if (!timestamp) return "Data não disponível";

    try {
      const date = timestamp.toDate();
      return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  const formatarDataCurta = (timestamp?: Timestamp | null) => {
    if (!timestamp) return "Data não disponível";

    try {
      const date = timestamp.toDate();
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  const formatarMoeda = (valor: number) => {
    const moeda = sistemaConfig?.moeda || "MZN";

    return (
      Number(valor || 0).toLocaleString("pt-MZ", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + ` ${moeda}`
    );
  };

  const getTimestampMs = (timestamp?: Timestamp | null) => {
    try {
      return timestamp?.toDate()?.getTime() ?? 0;
    } catch {
      return 0;
    }
  };

  const dadosEmpresa = {
    nome: empresaConfig?.nome || "VILLESys",
    subtitulo: "Sistema de Gestão de Vendas",
    nuit: empresaConfig?.nuit ? `NUIT: ${empresaConfig.nuit}` : "NUIT não configurado",
    endereco: empresaConfig?.endereco || "Endereço não configurado",
    telefone: empresaConfig?.telefone || "Telefone não configurado",
    email: empresaConfig?.email || "Email não configurado",
    website: empresaConfig?.website || "",
    logo: empresaConfig?.logo || "",
  };

  const taxaIvaAtual = ivaConfig?.taxaPadrao ?? 16;

  const stats = useMemo(() => {
    const concluidas = vendas.filter((v) => v.status === "concluida");
    const pendentes = vendas.filter((v) => v.status === "pendente");
    const canceladas = vendas.filter((v) => v.status === "cancelada");
    const hoje = vendas.filter((v) => {
      try {
        return v.createdAt ? isToday(v.createdAt.toDate()) : false;
      } catch {
        return false;
      }
    });

    const valorTotal = concluidas.reduce((acc, v) => acc + (v.total || 0), 0);
    const ticketMedio = concluidas.length > 0 ? valorTotal / concluidas.length : 0;
    const taxaConversao =
      vendas.length > 0 ? Number(((concluidas.length / vendas.length) * 100).toFixed(1)) : 0;

    return {
      total: vendas.length,
      concluidas: concluidas.length,
      pendentes: pendentes.length,
      canceladas: canceladas.length,
      hoje: hoje.length,
      valorTotal,
      ticketMedio,
      taxaConversao,
    };
  }, [vendas]);

  const vendasProcessadas = useMemo(() => {
    let lista = [...vendas];

    if (debouncedSearch) {
      lista = lista.filter((v) => {
        const cliente = v.clienteNome?.toLowerCase?.() ?? "";
        const id = v.id?.toLowerCase?.() ?? "";
        const valor = String(v.total ?? "");
        const metodo = v.metodoPagamento?.toLowerCase?.() ?? "";
        const status = v.status?.toLowerCase?.() ?? "";
        const motivo = v.motivoCancelamento?.toLowerCase?.() ?? "";

        return (
          cliente.includes(debouncedSearch) ||
          id.includes(debouncedSearch) ||
          valor.includes(debouncedSearch) ||
          metodo.includes(debouncedSearch) ||
          status.includes(debouncedSearch) ||
          motivo.includes(debouncedSearch)
        );
      });
    }

    if (quickFilter !== "todos") {
      if (quickFilter === "hoje") {
        lista = lista.filter((v) => {
          try {
            return v.createdAt ? isToday(v.createdAt.toDate()) : false;
          } catch {
            return false;
          }
        });
      } else {
        lista = lista.filter((v) => v.status === quickFilter);
      }
    }

    if (paymentFilter !== "todos") {
      lista = lista.filter((v) => v.metodoPagamento === paymentFilter);
    }

    lista.sort((a, b) => {
      const valueA =
        sortField === "createdAt"
          ? getTimestampMs(a.createdAt)
          : sortField === "total"
            ? a.total ?? 0
            : ((a[sortField] ?? "") as string | number);

      const valueB =
        sortField === "createdAt"
          ? getTimestampMs(b.createdAt)
          : sortField === "total"
            ? b.total ?? 0
            : ((b[sortField] ?? "") as string | number);

      if (typeof valueA === "string" && typeof valueB === "string") {
        return sortDirection === "asc"
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }

      return sortDirection === "asc"
        ? Number(valueA) - Number(valueB)
        : Number(valueB) - Number(valueA);
    });

    return lista;
  }, [vendas, debouncedSearch, quickFilter, paymentFilter, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(vendasProcessadas.length / ITEMS_PER_PAGE));

  const vendasPaginadas = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return vendasProcessadas.slice(start, start + ITEMS_PER_PAGE);
  }, [vendasProcessadas, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      concluida: {
        class: "bg-green-500/20 text-green-600 border-green-500/30",
        label: "Concluída",
        icon: "✅",
      },
      pendente: {
        class: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
        label: "Pendente",
        icon: "⏳",
      },
      cancelada: {
        class: "bg-red-500/20 text-red-600 border-red-500/30",
        label: "Cancelada",
        icon: "❌",
      },
    } as const;

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente;

    return (
      <span
        className={`flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.class}`}
      >
        <span>{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const getMetodoPagamentoLabel = (metodo: string) => {
    if (metodo === "dinheiro") return "Dinheiro";
    if (metodo === "cartao") return "Cartão";
    return "Transferência";
  };

  const getNumeroFactura = (venda: Venda) => {
    const baseId = venda.id ? venda.id.slice(0, 8).toUpperCase() : "SEM-ID";
    return `FT-${baseId}`;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection(field === "createdAt" ? "desc" : "asc");
  };

  const renderSortButton = (label: string, field: SortField) => (
    <button
      type="button"
      onClick={() => handleSort(field)}
      className="inline-flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}
      <ArrowUpDown className="h-3.5 w-3.5" />
    </button>
  );

  const handleVerDetalhes = (venda: Venda) => {
    setVendaSelecionada(venda);
    setDialogAberto(true);
  };

  const handleCancelarClick = (venda: Venda) => {
    if (!canCreateSales) {
      toast({
        title: "Acesso restrito",
        description: "O seu plano atual não permite alterar vendas.",
        variant: "destructive",
      });
      return;
    }

    if (isVendedor && venda.status !== "pendente") {
      toast({
        title: "Permissão negada",
        description: "Vendedores só podem cancelar vendas pendentes.",
        variant: "destructive",
      });
      return;
    }

    setMotivoCancelamento("");
    setVendaToCancel(venda);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!vendaToCancel?.id || !canCreateSales) return;

    if (isVendedor && !motivoCancelamento.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo do cancelamento.",
        variant: "destructive",
      });
      return;
    }

    setCancelandoVenda(vendaToCancel.id);

    try {
      await updateVendaStatus(vendaToCancel.id, "cancelada", motivoCancelamento.trim());

      toast({
        title: "Sucesso",
        description: "Venda cancelada com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Erro ao cancelar venda.",
        variant: "destructive",
      });
    } finally {
      setCancelandoVenda(null);
      setCancelDialogOpen(false);
      setVendaToCancel(null);
      setMotivoCancelamento("");
    }
  };

  const escapeHtml = (value?: string | number | null) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const gerarHtmlFactura = (venda: Venda) => {
    const logoHtml = dadosEmpresa.logo
      ? `<img src="${dadosEmpresa.logo}" alt="${escapeHtml(
          dadosEmpresa.nome
        )}" style="width:56px;height:56px;border-radius:10px;object-fit:cover;border:1px solid #ddd;" />`
      : "";

    const linhasProdutos = venda.produtos
      .map(
        (produto) => `
          <tr>
            <td style="padding:10px 12px;border-top:1px solid #e5e7eb;">${escapeHtml(produto.nome)}</td>
            <td style="padding:10px 12px;border-top:1px solid #e5e7eb;text-align:right;">${escapeHtml(produto.quantidade)}</td>
            <td style="padding:10px 12px;border-top:1px solid #e5e7eb;text-align:right;">${escapeHtml(formatarMoeda(produto.precoUnitario))}</td>
            <td style="padding:10px 12px;border-top:1px solid #e5e7eb;text-align:right;font-weight:600;">${escapeHtml(formatarMoeda(produto.subtotal))}</td>
          </tr>
        `
      )
      .join("");

    return `
      <!doctype html>
      <html lang="pt">
        <head>
          <meta charset="UTF-8" />
          <title>Factura ${escapeHtml(getNumeroFactura(venda))}</title>
          <style>
            @page {
              size: A4;
              margin: 12mm;
            }

            * { box-sizing: border-box; }

            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
              background: #ffffff;
            }

            .page {
              width: 100%;
              padding: 8px;
            }

            .card {
              border: 1px solid #e5e7eb;
              border-radius: 14px;
              padding: 24px;
            }

            .row {
              display: flex;
              justify-content: space-between;
              gap: 24px;
            }

            .col {
              flex: 1;
              min-width: 0;
            }

            .muted { color: #6b7280; }
            .small { font-size: 12px; }
            .text-sm { font-size: 14px; }
            .text-xl { font-size: 24px; }
            .bold { font-weight: 700; }
            .semi { font-weight: 600; }

            .box {
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              padding: 14px;
              background: #fff;
            }

            .box-soft {
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              padding: 14px;
              background: #f8fafc;
            }

            .divider {
              border-top: 1px solid #e5e7eb;
              margin: 24px 0;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 14px;
            }

            thead th {
              background: #f3f4f6;
              text-align: left;
              padding: 12px;
              font-weight: 700;
            }

            .text-right { text-align: right; }

            .totals {
              width: 100%;
              max-width: 380px;
              margin-left: auto;
            }

            .total-line {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              padding: 6px 0;
              font-size: 14px;
            }

            .grand-total {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              padding-top: 12px;
              margin-top: 8px;
              border-top: 1px solid #e5e7eb;
              font-size: 20px;
              font-weight: 700;
            }

            .footer {
              margin-top: 24px;
              padding-top: 16px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 12px;
              color: #6b7280;
            }

            .logo-line {
              display: flex;
              align-items: flex-start;
              gap: 14px;
            }

            .cancel-box {
              margin-top: 20px;
              border: 1px solid #fecaca;
              background: #fef2f2;
              color: #991b1b;
              border-radius: 10px;
              padding: 14px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="card">
              <div class="row">
                <div class="col">
                  <div class="logo-line">
                    ${logoHtml}
                    <div>
                      <div class="text-xl bold">${escapeHtml(dadosEmpresa.nome)}</div>
                      <div class="text-sm muted">${escapeHtml(dadosEmpresa.subtitulo)}</div>
                    </div>
                  </div>

                  <div style="margin-top:14px;" class="text-sm">
                    <div>${escapeHtml(dadosEmpresa.nuit)}</div>
                    <div>${escapeHtml(dadosEmpresa.endereco)}</div>
                    <div>${escapeHtml(dadosEmpresa.telefone)}</div>
                    <div>${escapeHtml(dadosEmpresa.email)}</div>
                    ${
                      dadosEmpresa.website
                        ? `<div>${escapeHtml(dadosEmpresa.website)}</div>`
                        : ""
                    }
                  </div>
                </div>

                <div class="box-soft" style="width:280px;">
                  <div class="small semi muted" style="text-transform:uppercase;letter-spacing:.08em;">Factura</div>
                  <div class="text-sm" style="margin-top:10px;">
                    <div><span class="semi">Número:</span> ${escapeHtml(getNumeroFactura(venda))}</div>
                    <div><span class="semi">ID Venda:</span> ${escapeHtml(venda.id)}</div>
                    <div><span class="semi">Data:</span> ${escapeHtml(formatarData(venda.createdAt))}</div>
                    <div><span class="semi">Status:</span> ${escapeHtml(
                      venda.status === "concluida"
                        ? "Concluída"
                        : venda.status === "cancelada"
                          ? "Cancelada"
                          : "Pendente"
                    )}</div>
                  </div>
                </div>
              </div>

              <div class="divider"></div>

              <div class="row">
                <div class="box col">
                  <div class="small semi muted" style="text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">Cliente</div>
                  <div class="text-sm">
                    <div class="semi">${escapeHtml(venda.clienteNome || "Consumidor final")}</div>
                    <div><span class="muted">Código da venda:</span> ${escapeHtml(venda.id || "-")}</div>
                    <div><span class="muted">Data da venda:</span> ${escapeHtml(formatarDataCurta(venda.createdAt))}</div>
                  </div>
                </div>

                <div class="box col">
                  <div class="small semi muted" style="text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">Pagamento</div>
                  <div class="text-sm">
                    <div><span class="semi">Método:</span> ${escapeHtml(getMetodoPagamentoLabel(venda.metodoPagamento))}</div>
                    <div><span class="semi">Itens:</span> ${escapeHtml(venda.produtos.length)}</div>
                    ${
                      venda.vendedorNome
                        ? `<div><span class="semi">Vendedor:</span> ${escapeHtml(venda.vendedorNome)}</div>`
                        : ""
                    }
                  </div>
                </div>
              </div>

              <div style="margin-top:24px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                <table>
                  <thead>
                    <tr>
                      <th>Descrição</th>
                      <th class="text-right">Qtd</th>
                      <th class="text-right">Preço Unit.</th>
                      <th class="text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${linhasProdutos}
                  </tbody>
                </table>
              </div>

              <div style="margin-top:24px;" class="totals">
                <div class="box">
                  <div class="total-line">
                    <span class="muted">Subtotal</span>
                    <span>${escapeHtml(formatarMoeda(venda.subtotal || 0))}</span>
                  </div>

                  <div class="total-line">
                    <span class="muted">IVA (${escapeHtml(taxaIvaAtual)}%)</span>
                    <span>${escapeHtml(formatarMoeda(venda.iva || 0))}</span>
                  </div>

                  <div class="total-line">
                    <span class="muted">Desconto</span>
                    <span>- ${escapeHtml(formatarMoeda(venda.desconto || 0))}</span>
                  </div>

                  <div class="grand-total">
                    <span>Total</span>
                    <span>${escapeHtml(formatarMoeda(venda.total || 0))}</span>
                  </div>

                  ${
                    venda.metodoPagamento === "dinheiro"
                      ? `
                        <div class="total-line" style="margin-top:8px;">
                          <span class="muted">Valor recebido</span>
                          <span>${escapeHtml(formatarMoeda(venda.valorRecebido || 0))}</span>
                        </div>
                        <div class="total-line">
                          <span class="muted">Troco</span>
                          <span style="font-weight:700;color:#166534;">${escapeHtml(formatarMoeda(venda.troco || 0))}</span>
                        </div>
                      `
                      : ""
                  }
                </div>
              </div>

              ${
                venda.motivoCancelamento
                  ? `
                    <div class="cancel-box">
                      <strong>Motivo do cancelamento:</strong> ${escapeHtml(venda.motivoCancelamento)}
                    </div>
                  `
                  : ""
              }

              <div class="footer">
                <div>Obrigado pela sua preferência.</div>
                <div>Documento emitido eletronicamente pelo sistema ${escapeHtml(dadosEmpresa.nome)}.</div>
                <div>Este documento serve como comprovativo da transação.</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handleImprimirRecibo = (venda: Venda) => {
    if (isVendedor && venda.vendedorId !== vendedorUid) {
      toast({
        title: "Permissão negada",
        description: "Você só pode imprimir facturas das suas próprias vendas.",
        variant: "destructive",
      });
      return;
    }

    const html = gerarHtmlFactura(venda);
    const printWindow = window.open("", "_blank", "width=900,height=700");

    if (!printWindow) {
      toast({
        title: "Erro",
        description: "Não foi possível abrir a janela de impressão.",
        variant: "destructive",
      });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-28 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="mb-2 h-8 w-20 rounded bg-muted" />
                <div className="h-3 w-24 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {blocked && (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-1">
            <span className="font-medium">Acesso restrito para vendas</span>
            <span>
              O plano atual ({currentPlan}) está {currentStatus}.
              {typeof daysLeft === "number" && currentPlan === "trial"
                ? ` Dias restantes: ${daysLeft}.`
                : ""}
            </span>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Vendas</h1>
          <p className="text-sm text-muted-foreground">
            {isVendedor ? "Gerencie suas vendas com mais controlo" : "Gerencie todas as vendas"}
          </p>
        </div>

        {!blocked && (
          <Link to="/vendas/nova">
            <Button size="sm" disabled={!canCreateSales}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Venda
            </Button>
          </Link>
        )}
      </div>

      <div className={`space-y-6 ${blocked ? "opacity-80" : ""}`}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="border-green-500/30 bg-green-500/10 text-green-600"
                >
                  {stats.concluidas} concluídas
                </Badge>
                <Badge
                  variant="outline"
                  className="border-yellow-500/30 bg-yellow-500/10 text-yellow-600"
                >
                  {stats.pendentes} pendentes
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-accent">{formatarMoeda(stats.valorTotal)}</div>
              <p className="mt-1 text-xs text-muted-foreground">Em vendas concluídas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-primary">
                {formatarMoeda(stats.ticketMedio)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Por venda concluída</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas de Hoje</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.hoje}</div>
              <p className="mt-1 text-xs text-muted-foreground">Registadas hoje</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversão</CardTitle>
              <BadgeDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.taxaConversao}%</div>
              <p className="mt-1 text-xs text-muted-foreground">{stats.canceladas} canceladas</p>
            </CardContent>
          </Card>
        </div>

        {!blocked && (
          <div className="space-y-3 rounded-lg bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full xl:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por cliente, ID, valor, status ou pagamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={quickFilter === "todos" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setQuickFilter("todos")}
                >
                  Todos
                </Badge>
                <Badge
                  variant={quickFilter === "concluida" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setQuickFilter("concluida")}
                >
                  <Filter className="mr-1 h-3 w-3" />
                  Concluídas
                </Badge>
                <Badge
                  variant={quickFilter === "pendente" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setQuickFilter("pendente")}
                >
                  Pendentes
                </Badge>
                <Badge
                  variant={quickFilter === "cancelada" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setQuickFilter("cancelada")}
                >
                  Canceladas
                </Badge>
                <Badge
                  variant={quickFilter === "hoje" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setQuickFilter("hoje")}
                >
                  Hoje
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={paymentFilter === "todos" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setPaymentFilter("todos")}
              >
                Pagamento: todos
              </Badge>
              <Badge
                variant={paymentFilter === "dinheiro" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setPaymentFilter("dinheiro")}
              >
                Dinheiro
              </Badge>
              <Badge
                variant={paymentFilter === "cartao" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setPaymentFilter("cartao")}
              >
                Cartão
              </Badge>
              <Badge
                variant={paymentFilter === "transferencia" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setPaymentFilter("transferencia")}
              >
                Transferência
              </Badge>
            </div>

            <div className="text-sm text-muted-foreground">
              Exibindo <span className="font-medium text-foreground">{vendasProcessadas.length}</span>{" "}
              {vendasProcessadas.length === 1 ? "venda" : "vendas"}
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-lg bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Cliente", "clienteNome")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Data", "createdAt")}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Produtos</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Total", "total")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Pagamento", "metodoPagamento")}</th>
                  <th className="px-4 py-3 text-left">{renderSortButton("Status", "status")}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>

              <tbody>
                {vendasPaginadas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <CalendarDays className="h-8 w-8 opacity-50" />
                        <p className="font-medium">Nenhuma venda encontrada</p>
                      </div>
                    </td>
                  </tr>
                )}

                {vendasPaginadas.map((venda) => (
                  <tr
                    key={venda.id}
                    className="border-b transition-colors hover:bg-muted/30 last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {venda.id ? `${venda.id.slice(0, 8)}...` : "-"}
                    </td>
                    <td className="px-4 py-3 font-medium">{venda.clienteNome}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatarData(venda.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-1 text-xs">
                        {venda.produtos.length} {venda.produtos.length === 1 ? "item" : "itens"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatarMoeda(venda.total)}</td>
                    <td className="px-4 py-3">{getMetodoPagamentoLabel(venda.metodoPagamento)}</td>
                    <td className="px-4 py-3">{getStatusBadge(venda.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerDetalhes(venda)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleImprimirRecibo(venda)}
                          title="Imprimir factura"
                          disabled={venda.status === "cancelada"}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>

                        {!blocked && venda.status !== "cancelada" && venda.status !== "concluida" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleCancelarClick(venda)}
                            disabled={!canCreateSales || cancelandoVenda === venda.id}
                            title="Cancelar venda"
                          >
                            {cancelandoVenda === venda.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!blocked && vendasProcessadas.length > 0 && (
            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Página <span className="font-medium text-foreground">{page}</span> de{" "}
                <span className="font-medium text-foreground">{totalPages}</span>
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Anterior
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                >
                  Próxima
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Venda / Factura</DialogTitle>
            <DialogDescription>Informações completas da venda selecionada</DialogDescription>
          </DialogHeader>

          {vendaSelecionada && (
            <div className="space-y-6">
              <div className="rounded-xl border bg-white p-6 text-black shadow-sm">
                <div className="mb-6 flex flex-col gap-6 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start gap-4">
                      {dadosEmpresa.logo ? (
                        <img
                          src={dadosEmpresa.logo}
                          alt={dadosEmpresa.nome}
                          className="h-14 w-14 rounded-lg border object-cover"
                        />
                      ) : null}

                      <div>
                        <h2 className="text-2xl font-bold">{dadosEmpresa.nome}</h2>
                        <p className="text-sm text-slate-600">{dadosEmpresa.subtitulo}</p>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm text-slate-700">
                      <p>{dadosEmpresa.nuit}</p>
                      <p>{dadosEmpresa.endereco}</p>
                      <p>{dadosEmpresa.telefone}</p>
                      <p>{dadosEmpresa.email}</p>
                      {dadosEmpresa.website && <p>{dadosEmpresa.website}</p>}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-slate-50 p-4 sm:min-w-[260px]">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Factura
                    </p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Número:</span>{" "}
                        {getNumeroFactura(vendaSelecionada)}
                      </p>
                      <p>
                        <span className="font-medium">ID Venda:</span> {vendaSelecionada.id}
                      </p>
                      <p>
                        <span className="font-medium">Data:</span>{" "}
                        {formatarData(vendaSelecionada.createdAt)}
                      </p>
                      <p>
                        <span className="font-medium">Status:</span>{" "}
                        {vendaSelecionada.status === "concluida"
                          ? "Concluída"
                          : vendaSelecionada.status === "cancelada"
                            ? "Cancelada"
                            : "Pendente"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Cliente
                    </p>
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold">
                        {vendaSelecionada.clienteNome || "Consumidor final"}
                      </p>
                      <p>
                        <span className="text-slate-500">Código da venda:</span>{" "}
                        {vendaSelecionada.id || "-"}
                      </p>
                      <p>
                        <span className="text-slate-500">Data da venda:</span>{" "}
                        {formatarDataCurta(vendaSelecionada.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Pagamento
                    </p>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Método:</span>{" "}
                        {getMetodoPagamentoLabel(vendaSelecionada.metodoPagamento)}
                      </p>
                      <p>
                        <span className="font-medium">Itens:</span>{" "}
                        {vendaSelecionada.produtos.length}
                      </p>
                      {vendaSelecionada.vendedorNome && (
                        <p>
                          <span className="font-medium">Vendedor:</span>{" "}
                          {vendaSelecionada.vendedorNome}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-6 overflow-hidden rounded-lg border">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Descrição</th>
                        <th className="px-4 py-3 text-right font-semibold">Qtd</th>
                        <th className="px-4 py-3 text-right font-semibold">Preço Unit.</th>
                        <th className="px-4 py-3 text-right font-semibold">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendaSelecionada.produtos.map((produto, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-3">{produto.nome}</td>
                          <td className="px-4 py-3 text-right">{produto.quantidade}</td>
                          <td className="px-4 py-3 text-right">
                            {formatarMoeda(produto.precoUnitario)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatarMoeda(produto.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mb-6 flex justify-end">
                  <div className="w-full max-w-md space-y-2 rounded-lg border p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Subtotal</span>
                      <span>{formatarMoeda(vendaSelecionada.subtotal || 0)}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">IVA ({taxaIvaAtual}%)</span>
                      <span>{formatarMoeda(vendaSelecionada.iva || 0)}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Desconto</span>
                      <span>- {formatarMoeda(vendaSelecionada.desconto || 0)}</span>
                    </div>

                    <div className="flex items-center justify-between border-t pt-3 text-lg font-bold">
                      <span>Total</span>
                      <span>{formatarMoeda(vendaSelecionada.total || 0)}</span>
                    </div>

                    {vendaSelecionada.metodoPagamento === "dinheiro" && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Valor recebido</span>
                          <span>{formatarMoeda(vendaSelecionada.valorRecebido || 0)}</span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Troco</span>
                          <span className="font-semibold text-green-700">
                            {formatarMoeda(vendaSelecionada.troco || 0)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {vendaSelecionada.motivoCancelamento && (
                  <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-sm">
                      <span className="font-medium text-red-700">Motivo do cancelamento:</span>{" "}
                      <span className="text-red-800">{vendaSelecionada.motivoCancelamento}</span>
                    </p>
                  </div>
                )}

                <div className="border-t pt-4 text-center text-xs text-slate-500">
                  <p>Obrigado pela sua preferência.</p>
                  <p>Documento emitido eletronicamente pelo sistema {dadosEmpresa.nome}.</p>
                  <p>Este documento serve como comprovativo da transação.</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogAberto(false)}>
                  Fechar
                </Button>
                <Button
                  onClick={() => handleImprimirRecibo(vendaSelecionada)}
                  disabled={vendaSelecionada.status === "cancelada"}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir Factura
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cancelamento</AlertDialogTitle>
            <AlertDialogDescription>
              {isVendedor ? (
                <div className="space-y-4">
                  <p>
                    Tem certeza que deseja cancelar esta venda?
                    <br />
                    <span className="text-sm text-destructive">
                      Esta ação não pode ser desfeita.
                    </span>
                  </p>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Motivo do cancelamento *</label>
                    <Input
                      placeholder="Digite o motivo do cancelamento..."
                      value={motivoCancelamento}
                      onChange={(e) => setMotivoCancelamento(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              ) : (
                "Tem certeza que deseja cancelar esta venda? Esta ação não pode ser desfeita."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Vendas;