import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  ShoppingBag,
  Loader2,
  Eye,
  EyeOff,
  Mail,
  Lock,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  Chrome,
  Apple,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const emailValido = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

type LocationState = {
  from?: {
    pathname?: string;
  };
};

const Login = () => {
  const { login, loading, profileLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const from = useMemo(() => {
    const state = location.state as LocationState | null;
    const pathname = state?.from?.pathname;

    if (!pathname || pathname === "/" || pathname === "/login") {
      return "/dashboard";
    }

    return pathname;
  }, [location.state]);

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (!loading && !profileLoading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [loading, profileLoading, isAuthenticated, navigate, from]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    setError(null);

    const emailLimpo = email.trim();

    if (!emailValido(emailLimpo)) {
      setError("Por favor, insira um email válido.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setSubmitting(true);

    try {
      await login(emailLimpo, password, rememberMe);

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", emailLimpo);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || "Erro ao fazer login. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    setError("Para recuperar a senha, contacte o suporte ou o administrador do sistema.");
  };

  const isBusy = submitting || loading || profileLoading;
  const anoAtual = new Date().getFullYear();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar à homepage
          </Link>
        </div>

        <Card className="w-full shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="mb-2 flex justify-center">
              <div className="rounded-full bg-primary/10 p-3">
                <ShoppingBag className="h-8 w-8 text-primary" />
              </div>
            </div>

            <CardTitle className="text-2xl font-bold text-foreground">VILLESys</CardTitle>
            <CardDescription className="text-muted-foreground">
              Entre para aceder ao sistema de gestão
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mb-5 space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between"
                disabled
              >
                <span className="flex items-center">
                  <Chrome className="mr-2 h-4 w-4" />
                  Entrar com Google
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  Em desenvolvimento
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full justify-between"
                disabled
              >
                <span className="flex items-center">
                  <Apple className="mr-2 h-4 w-4" />
                  Entrar com Apple ID
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  Em desenvolvimento
                </span>
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Login com Google e Apple ID estará disponível em breve.
              </p>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    ou continue com email
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email
                </Label>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isBusy}
                    className="border-input bg-background pl-9 text-foreground focus:ring-primary"
                    autoComplete="email"
                    autoFocus
                    aria-invalid={!!error}
                    aria-describedby={error ? "login-error" : undefined}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  Senha
                </Label>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isBusy}
                    className="border-input bg-background pl-9 pr-9 text-foreground focus:ring-primary"
                    autoComplete="current-password"
                    aria-invalid={!!error}
                    aria-describedby={error ? "login-error" : undefined}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    disabled={isBusy}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    disabled={isBusy}
                  />
                  <span className="text-sm text-muted-foreground">Lembrar-me</span>
                </label>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="inline-flex items-center gap-1 text-sm text-primary transition-colors hover:text-primary/80"
                  disabled={isBusy}
                >
                  <KeyRound className="h-4 w-4" />
                  Esqueceu a senha?
                </button>
              </div>

              {error && (
                <Alert
                  id="login-error"
                  variant="destructive"
                  className="border-destructive bg-destructive/10"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-destructive">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isBusy}
                size="lg"
              >
                {isBusy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-2 border-t border-border pt-4">
            <p className="text-center text-xs text-muted-foreground">
              © {anoAtual} VILLESys. Todos os direitos reservados.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;