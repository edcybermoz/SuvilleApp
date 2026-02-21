import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Usuario } from "@/lib/store";

interface AuthContextType {
  user: User | null;
  userData: Usuario | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isVendedor: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  // Buscar dados do usuário no Firestore
  const fetchUserData = async (firebaseUser: User) => {
    try {
      // Buscar pelo UID (recomendado)
      const userDoc = await getDoc(doc(db, "usuarios", firebaseUser.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data() as Omit<Usuario, "id">;
        setUserData({ 
          id: userDoc.id,
          ...data 
        } as Usuario);
      } else {
        setUserData(null);
      }
    } catch (error) {
      console.error("Erro ao buscar dados do usuário:", error);
      setUserData(null);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        await fetchUserData(firebaseUser);
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsub;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Erro no login:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserData(null);
    } catch (error) {
      console.error("Erro no logout:", error);
      throw error;
    }
  };

  const isAdmin = userData?.tipo === "admin";
  const isVendedor = userData?.tipo === "vendedor";

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData,
      loading, 
      login, 
      logout,
      isAdmin,
      isVendedor
    }}>
      {children}
    </AuthContext.Provider>
  );
};