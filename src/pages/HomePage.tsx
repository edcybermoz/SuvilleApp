import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  PlayCircle,
  ShieldCheck,
  BarChart3,
  Boxes,
  Users,
  Receipt,
  Menu,
  Phone,
  Mail,
  MapPin,
  Check,
  MonitorSmartphone,
  BadgeDollarSign,
} from "lucide-react";
import { useMemo, useState } from "react";

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = useMemo(
    () => [
      {
        icon: Receipt,
        title: "Gestão de Vendas",
        description:
          "Registe vendas rapidamente, controle pagamentos, descontos e emissão de facturas com fluxo simples e profissional.",
      },
      {
        icon: Users,
        title: "Clientes e Atendimento",
        description:
          "Cadastre clientes, acompanhe histórico de compras e tenha informação organizada para vender melhor.",
      },
      {
        icon: Boxes,
        title: "Produtos e Stock",
        description:
          "Controle produtos, preços, categorias, stock mínimo, reposição e disponibilidade em tempo real.",
      },
      {
        icon: BarChart3,
        title: "Relatórios e Controlo",
        description:
          "Acompanhe faturação, desempenho de vendas, movimento de produtos e indicadores importantes do negócio.",
      },
    ],
    []
  );

  const demos = useMemo(
    () => [
      {
        title: "Painel principal",
        description:
          "Uma visão rápida do negócio com métricas, vendas recentes, estado do sistema e acesso às áreas principais.",
        tag: "Dashboard",
      },
      {
        title: "Venda e facturação",
        description:
          "Processo de venda com cliente, produtos, IVA, desconto, pagamento e factura pronta para impressão.",
        tag: "Facturação",
      },
      {
        title: "Controlo de stock",
        description:
          "Gestão de produtos, quantidades disponíveis, alertas de stock baixo e controlo operacional.",
        tag: "Stock",
      },
    ],
    []
  );

  const pricing = useMemo(
    () => [
      {
        name: "Trial",
        price: "Grátis",
        subtitle: "Teste por 30 dias",
        items: [
          "Acesso completo durante 30 dias",
          "Vendas, clientes e produtos",
          "Controlo básico de stock",
          "Relatórios essenciais",
        ],
        highlighted: false,
        cta: "Começar grátis",
      },
      {
        name: "Pro",
        price: "Sob consulta",
        subtitle: "Para negócios em crescimento",
        items: [
          "Todos os recursos principais",
          "Facturação profissional",
          "Configurações avançadas",
          "Mais controlo e desempenho",
        ],
        highlighted: true,
        cta: "Falar com a equipa",
      },
      {
        name: "Enterprise",
        price: "Personalizado",
        subtitle: "Para operações maiores",
        items: [
          "Escalabilidade avançada",
          "Suporte dedicado",
          "Fluxos personalizados",
          "Maior controlo administrativo",
        ],
        highlighted: false,
        cta: "Solicitar proposta",
      },
    ],
    []
  );

  const quickPoints = useMemo(
    () => [
      "Homepage pública e acesso seguro ao sistema",
      "Teste grátis durante 30 dias",
      "Vendas, stock, clientes e relatórios num só lugar",
    ],
    []
  );

  const benefits = useMemo(
    () => [
      "Navegação simples para equipas pequenas e médias",
      "Visual moderno sem complicar o uso diário",
      "Pronto para crescer com o seu negócio",
      "Facturas profissionais prontas para impressão",
    ],
    []
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BadgeDollarSign className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight text-foreground">VILLESys</h1>
              <p className="truncate text-xs text-muted-foreground">Sistema de gestão de vendas</p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#recursos" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Recursos
            </a>
            <a href="#demo" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Demonstração
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Preços
            </a>
            <a href="#contactos" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Contactos
            </a>
            <Link
              to="/login"
              className="rounded-xl border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Entrar
            </Link>
            <Link
              to="/login"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Teste Grátis
            </Link>
          </nav>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border md:hidden"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t bg-background md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6">
              <a href="#recursos" className="rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                Recursos
              </a>
              <a href="#demo" className="rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                Demonstração
              </a>
              <a href="#pricing" className="rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                Preços
              </a>
              <a href="#contactos" className="rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                Contactos
              </a>
              <Link to="/login" className="rounded-lg border px-4 py-2 text-center text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                Entrar
              </Link>
              <Link to="/login" className="rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground" onClick={() => setMobileMenuOpen(false)}>
                Teste Grátis
              </Link>
            </div>
          </div>
        )}
      </header>

      <section className="border-b bg-card/40">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-20">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              Teste grátis durante 30 dias
            </div>

            <div className="space-y-4">
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Controle o seu negócio com um sistema moderno, claro e fácil de usar
              </h2>
              <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                O VILLESys ajuda a gerir vendas, clientes, produtos, facturação e relatórios com uma experiência intuitiva, profissional e pronta para o dia a dia da sua equipa.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
              >
                Começar teste grátis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center rounded-2xl border px-5 py-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                Ver demonstração
                <PlayCircle className="ml-2 h-4 w-4" />
              </a>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-3">
              {quickPoints.map((point) => (
                <div key={point} className="rounded-2xl border bg-card p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                    <p className="text-sm text-muted-foreground">{point}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border bg-card p-5 shadow-sm sm:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Visão geral do sistema</p>
                  <p className="mt-1 text-lg font-semibold">Painel moderno e fácil de usar</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Online
                </span>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">Vendas</p>
                  <p className="mt-2 text-2xl font-bold">124</p>
                  <p className="mt-1 text-xs text-muted-foreground">Hoje</p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">Clientes</p>
                  <p className="mt-2 text-2xl font-bold">1.284</p>
                  <p className="mt-1 text-xs text-muted-foreground">Registados</p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">Receita</p>
                  <p className="mt-2 text-2xl font-bold">45.320 MZN</p>
                  <p className="mt-1 text-xs text-muted-foreground">Em vendas</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border bg-card p-5 shadow-sm">
              <p className="text-base font-semibold">Facturação</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Emissão de facturas prontas para impressão com dados automáticos da empresa e da venda.
              </p>
            </div>

            <div className="rounded-3xl border bg-card p-5 shadow-sm">
              <p className="text-base font-semibold">Controlo de stock</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Produtos, entradas, saídas e alertas de stock baixo organizados num só lugar.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="recursos" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 max-w-2xl">
          <h3 className="text-3xl font-bold">Tudo o que precisa para gerir o sistema</h3>
          <p className="mt-2 text-muted-foreground">
            Uma plataforma desenhada para dar acesso rápido a vendas, clientes, produtos, relatórios e gestão operacional.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="rounded-3xl border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="text-lg font-semibold">{feature.title}</h4>
                <p className="mt-3 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="demo" className="border-y bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="mb-8 max-w-2xl">
            <h3 className="text-3xl font-bold">Demonstrações do sistema</h3>
            <p className="mt-2 text-muted-foreground">
              Veja como o sistema funciona antes de começar a usar no seu negócio.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {demos.map((demo, index) => (
              <div key={demo.title} className="rounded-3xl border bg-card p-6 shadow-sm">
                <div className="mb-4 rounded-2xl border bg-muted/40 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {demo.tag}
                    </span>
                    <MonitorSmartphone className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="grid gap-2">
                    <div className="h-3 rounded-full bg-muted" />
                    <div className="grid grid-cols-3 gap-2">
                      <div className="h-16 rounded-xl bg-background border" />
                      <div className="h-16 rounded-xl bg-background border" />
                      <div className="h-16 rounded-xl bg-background border" />
                    </div>
                    <div className="h-24 rounded-2xl bg-background border" />
                  </div>
                </div>
                <h4 className="text-lg font-semibold">{demo.title}</h4>
                <p className="mt-2 text-sm text-muted-foreground">{demo.description}</p>
                <a href="#acesso" className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline">
                  Pedir demonstração
                  <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border bg-card p-8 shadow-sm">
            <h3 className="text-3xl font-bold">Teste grátis por 30 dias</h3>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Experimente o sistema sem compromisso durante 30 dias e descubra como ele pode melhorar a gestão do seu negócio.
            </p>

            <div className="mt-6 space-y-3 text-sm text-muted-foreground">
              {benefits.map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>{item}</p>
                </div>
              ))}
            </div>

            <Link
              to="/login"
              className="mt-8 inline-flex items-center rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Activar teste grátis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          <div id="acesso" className="rounded-3xl border bg-card p-8 shadow-sm">
            <h3 className="text-2xl font-bold">Acesso ao sistema</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Já tem conta? Entre e continue a gerir o seu negócio com segurança.
            </p>

            <div className="mt-6 space-y-3">
              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Entrar no sistema
              </Link>
              <Link
                to="/login"
                className="inline-flex w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                Criar conta / iniciar teste
              </Link>
            </div>

            <div className="mt-6 rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">
              Acesso rápido, ambiente seguro e navegação intuitiva para a sua equipa trabalhar melhor.
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="border-t bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="mb-8 max-w-2xl">
            <h3 className="text-3xl font-bold">Planos e preços</h3>
            <p className="mt-2 text-muted-foreground">
              Escolha o plano ideal para o tamanho e a necessidade do seu negócio.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-3xl border bg-card p-8 shadow-sm ${
                  plan.highlighted ? "border-primary shadow-md" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xl font-bold">{plan.name}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{plan.subtitle}</p>
                  </div>
                  {plan.highlighted && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      Recomendado
                    </span>
                  )}
                </div>

                <div className="mt-6 text-3xl font-bold">{plan.price}</div>

                <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {plan.items.map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p>{item}</p>
                    </div>
                  ))}
                </div>

                <Link
                  to="/login"
                  className={`mt-8 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium ${
                    plan.highlighted
                      ? "bg-primary text-primary-foreground"
                      : "border transition-colors hover:bg-muted"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contactos" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border bg-card p-8 shadow-sm">
            <h3 className="text-2xl font-bold">Fale connosco</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Peça uma demonstração, saiba mais sobre os planos ou comece o seu teste grátis.
            </p>

            <div className="mt-6 space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">Telefone</p>
                  <p className="text-muted-foreground">+258 84 000 0000</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-muted-foreground">comercial@villesys.com</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="font-medium">Localização</p>
                  <p className="text-muted-foreground">Maputo, Moçambique</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-card p-8 shadow-sm">
            <h3 className="text-2xl font-bold">Pronto para começar?</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Entre no sistema ou inicie o seu teste grátis agora mesmo.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Entrar no sistema
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                Iniciar teste grátis
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold">VILLESys</p>
            <p className="text-sm text-muted-foreground">Sistema de gestão de vendas e operações</p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <a href="#recursos" className="hover:text-foreground">Recursos</a>
            <a href="#demo" className="hover:text-foreground">Demonstração</a>
            <a href="#pricing" className="hover:text-foreground">Preços</a>
            <a href="#contactos" className="hover:text-foreground">Contactos</a>
            <Link to="/login" className="hover:text-foreground">Entrar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
