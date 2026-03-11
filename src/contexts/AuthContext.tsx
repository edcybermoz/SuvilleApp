import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import {
  User as FirebaseUser,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";

import { auth } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: "admin" | "vendedor";
  telefone?: string;
  ativo: boolean;
  limite_desconto?: number;
  limiteDesconto?: number;
  idioma?: "pt" | "en" | "es";
  plano?: "trial" | "pro" | "enterprise";
  statusPlano?: "ativo" | "expirado" | "bloqueado";
  trialInicio?: string | null;
  trialFim?: string | null;
  activationKey?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: SupabaseUser | null;
  session: Session | null;
  firebaseUser: FirebaseUser | null;
  userData: Usuario | null;
  loading: boolean;
  profileLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isVendedor: boolean;
  isActive: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};

const waitForInitialFirebaseAuth = () =>
  new Promise<FirebaseUser | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      unsubscribe();
      resolve(fbUser);
    });
  });

const normalizeEmail = (email?: string | null) => email?.trim().toLowerCase() || "";

const isValidTipo = (value: unknown): value is "admin" | "vendedor" =>
  value === "admin" || value === "vendedor";

const isValidIdioma = (value: unknown): value is "pt" | "en" | "es" =>
  value === "pt" || value === "en" || value === "es";

const isValidPlano = (value: unknown): value is "trial" | "pro" | "enterprise" =>
  value === "trial" || value === "pro" || value === "enterprise";

const isValidStatusPlano = (
  value: unknown
): value is "ativo" | "expirado" | "bloqueado" =>
  value === "ativo" || value === "expirado" || value === "bloqueado";

const sessionsMatch = (session: Session | null, firebaseUser: FirebaseUser | null) => {
  if (!session && !firebaseUser) return true;
  if (!session || !firebaseUser) return false;

  const supabaseEmail = normalizeEmail(session.user.email);
  const firebaseEmail = normalizeEmail(firebaseUser.email);

  if (!supabaseEmail || !firebaseEmail) return false;
  if (supabaseEmail !== firebaseEmail) return false;

  return true;
};

const mapSupabaseAuthErrorMessage = (message?: string) => {
  const text = (message || "").toLowerCase();

  if (text.includes("invalid login credentials")) {
    return "Email ou senha incorretos.";
  }

  if (text.includes("email not confirmed")) {
    return "O email ainda não foi confirmado.";
  }

  if (text.includes("network")) {
    return "Falha de conexão. Verifique sua internet.";
  }

  return "Não foi possível iniciar sessão.";
};

const mapFirebaseLoginError = (error: unknown) => {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as any).code)
      : "";

  switch (code) {
    case "auth/user-not-found":
      return "Conta encontrada no Supabase, mas ausente no Firebase. Contacte o administrador para sincronizar este utilizador.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Senha inválida no Firebase.";
    case "auth/invalid-email":
      return "Email inválido no Firebase.";
    case "auth/network-request-failed":
      return "Falha de conexão ao autenticar no Firebase.";
    default:
      return "Falha ao autenticar no Firebase.";
  }
};

const sanitizeProfile = (data: any): Usuario | null => {
  if (!data || typeof data !== "object") return null;
  if (!data.id || !data.email || !data.nome || !isValidTipo(data.tipo)) return null;

  return {
    id: String(data.id),
    nome: String(data.nome),
    email: normalizeEmail(data.email),
    tipo: data.tipo,
    telefone: data.telefone ? String(data.telefone) : undefined,
    ativo: data.ativo !== false,
    limite_desconto:
      typeof data.limite_desconto === "number" ? data.limite_desconto : undefined,
    limiteDesconto:
      typeof data.limite_desconto === "number"
        ? data.limite_desconto
        : typeof data.limitedesconto === "number"
        ? data.limitedesconto
        : typeof data.limiteDesconto === "number"
        ? data.limiteDesconto
        : undefined,
    idioma: isValidIdioma(data.idioma) ? data.idioma : undefined,
    plano: isValidPlano(data.plano) ? data.plano : undefined,
    statusPlano: isValidStatusPlano(data.status_plano)
      ? data.status_plano
      : isValidStatusPlano(data.statusPlano)
      ? data.statusPlano
      : undefined,
    trialInicio:
      typeof data.trial_inicio === "string"
        ? data.trial_inicio
        : typeof data.trialInicio === "string"
        ? data.trialInicio
        : null,
    trialFim:
      typeof data.trial_fim === "string"
        ? data.trial_fim
        : typeof data.trialFim === "string"
        ? data.trialFim
        : null,
    activationKey:
      typeof data.activation_key === "string"
        ? data.activation_key
        : typeof data.activationKey === "string"
        ? data.activationKey
        : null,
    created_at: typeof data.created_at === "string" ? data.created_at : undefined,
    updated_at: typeof data.updated_at === "string" ? data.updated_at : undefined,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<Usuario | null>(null);

  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  const hydratedRef = useRef(false);
  const loginInProgressRef = useRef(false);
  const reconcileInProgressRef = useRef(false);

  const fetchUserData = useCallback(async (userId: string): Promise<Usuario | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
          id,
          nome,
          email,
          tipo,
          telefone,
          ativo,
          limite_desconto,
          idioma,
          plano,
          status_plano,
          trial_inicio,
          trial_fim,
          activation_key,
          created_at,
          updated_at
        `
      )
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      return null;
    }

    return sanitizeProfile(data);
  }, []);

  const clearAuthState = useCallback(() => {
    setSession(null);
    setSupabaseUser(null);
    setUserData(null);
  }, []);

  const cleanupAllSessions = useCallback(async () => {
    await Promise.allSettled([supabase.auth.signOut(), firebaseSignOut(auth)]);
    clearAuthState();
    setFirebaseUser(null);
  }, [clearAuthState]);

  const refreshUserData = useCallback(async () => {
    if (!supabaseUser?.id) {
      setUserData(null);
      return;
    }

    setProfileLoading(true);
    try {
      const profile = await fetchUserData(supabaseUser.id);
      setUserData(profile);
    } finally {
      setProfileLoading(false);
    }
  }, [fetchUserData, supabaseUser]);

  useEffect(() => {
    let active = true;

    const init = async () => {
      setLoading(true);
      setProfileLoading(true);

      try {
        const [{ data: sessionData }, initialFirebaseUser] = await Promise.all([
          supabase.auth.getSession(),
          waitForInitialFirebaseAuth(),
        ]);

        if (!active) return;

        const currentSession = sessionData.session ?? null;
        const currentSupabaseUser = currentSession?.user ?? null;

        setSession(currentSession);
        setSupabaseUser(currentSupabaseUser);
        setFirebaseUser(initialFirebaseUser);

        if (!sessionsMatch(currentSession, initialFirebaseUser)) {
          if (currentSession || initialFirebaseUser) {
            await cleanupAllSessions();
          }
          return;
        }

        if (currentSupabaseUser?.id) {
          const profile = await fetchUserData(currentSupabaseUser.id);
          if (!active) return;
          setUserData(profile);
        } else {
          setUserData(null);
        }
      } finally {
        if (active) {
          hydratedRef.current = true;
          setProfileLoading(false);
          setLoading(false);
        }
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      setSession(newSession ?? null);
      setSupabaseUser(newSession?.user ?? null);
    });

    const unsubscribeFirebase = onAuthStateChanged(auth, (fbUser) => {
      if (!active) return;
      setFirebaseUser(fbUser);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      unsubscribeFirebase();
    };
  }, [cleanupAllSessions, fetchUserData]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (loginInProgressRef.current) return;
    if (reconcileInProgressRef.current) return;

    let active = true;

    const reconcile = async () => {
      if (!sessionsMatch(session, firebaseUser)) {
        if (session || firebaseUser) {
          try {
            reconcileInProgressRef.current = true;
            setLoading(true);
            await cleanupAllSessions();
          } finally {
            if (active) {
              reconcileInProgressRef.current = false;
              setLoading(false);
              setProfileLoading(false);
            }
          }
        }
        return;
      }

      if (session?.user?.id) {
        setProfileLoading(true);
        try {
          const profile = await fetchUserData(session.user.id);
          if (!active) return;
          setUserData(profile);
        } finally {
          if (active) {
            setProfileLoading(false);
          }
        }
      } else {
        setUserData(null);
        setProfileLoading(false);
      }
    };

    reconcile();

    return () => {
      active = false;
    };
  }, [session, firebaseUser, fetchUserData, cleanupAllSessions]);

  const login = useCallback(
    async (email: string, password: string, rememberMe = false) => {
      const normalizedEmail = normalizeEmail(email);

      loginInProgressRef.current = true;
      setLoading(true);
      setProfileLoading(true);

      try {
        await cleanupAllSessions();

        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error || !data.user || !data.session) {
          throw new Error(mapSupabaseAuthErrorMessage(error?.message));
        }

        const profile = await fetchUserData(data.user.id);

        if (!profile) {
          await cleanupAllSessions();
          throw new Error("Perfil de utilizador não encontrado.");
        }

        if (profile.ativo === false) {
          await cleanupAllSessions();
          throw new Error("Utilizador inativo. Contacte o administrador.");
        }

        try {
          await setPersistence(
            auth,
            rememberMe ? browserLocalPersistence : browserSessionPersistence
          );

          await signInWithEmailAndPassword(auth, normalizedEmail, password);
        } catch (firebaseError) {
          await cleanupAllSessions();
          throw new Error(mapFirebaseLoginError(firebaseError));
        }

        const currentFirebaseUser = auth.currentUser;

        if (!sessionsMatch(data.session, currentFirebaseUser)) {
          await cleanupAllSessions();
          throw new Error("Falha de sincronização entre autenticações.");
        }

        setSession(data.session);
        setSupabaseUser(data.user);
        setFirebaseUser(currentFirebaseUser);
        setUserData(profile);
      } catch (error: any) {
        throw new Error(error?.message || "Não foi possível iniciar sessão.");
      } finally {
        loginInProgressRef.current = false;
        setLoading(false);
        setProfileLoading(false);
      }
    },
    [cleanupAllSessions, fetchUserData]
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await cleanupAllSessions();
    } finally {
      setLoading(false);
      setProfileLoading(false);
    }
  }, [cleanupAllSessions]);

  const user =
    session && firebaseUser && sessionsMatch(session, firebaseUser) ? session.user : null;

  const isAuthenticated = !!user;
  const isAdmin = userData?.tipo === "admin";
  const isVendedor = userData?.tipo === "vendedor";
  const isActive = userData?.ativo !== false;

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      firebaseUser,
      userData,
      loading,
      profileLoading,
      isAuthenticated,
      isAdmin,
      isVendedor,
      isActive,
      login,
      logout,
      refreshUserData,
    }),
    [
      user,
      session,
      firebaseUser,
      userData,
      loading,
      profileLoading,
      isAuthenticated,
      isAdmin,
      isVendedor,
      isActive,
      login,
      logout,
      refreshUserData,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};