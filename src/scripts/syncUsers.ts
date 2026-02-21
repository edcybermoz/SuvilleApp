// src/scripts/syncUsers.ts
import { auth, db } from "@/lib/firebase";
import { 
  doc, 
  setDoc,
  Timestamp 
} from "firebase/firestore";
import { Usuario } from "@/lib/store";

interface SyncOptions {
  useUidAsId?: boolean;
}

/**
 * Sincroniza o usuário atual com o Firestore
 * ATENÇÃO: Esta função deve ser usada APENAS em desenvolvimento
 * e requer que o usuário já exista no Authentication
 */
export const syncCurrentUser = async (options: SyncOptions = {}) => {
  const user = auth.currentUser;
  if (!user) {
    console.log("❌ Nenhum usuário autenticado");
    return false;
  }

  // VERIFICAÇÃO DE SEGURANÇA: Apenas em desenvolvimento
  if (process.env.NODE_ENV === 'production') {
    console.error("❌ syncCurrentUser não pode ser usado em produção");
    return false;
  }

  try {
    const novoUsuario: Omit<Usuario, "id"> = {
      authUid: user.uid,
      nome: user.displayName || user.email?.split('@')[0] || "Usuário",
      email: user.email!,
      tipo: "vendedor", // SEMPRE vendedor por padrão
      telefone: "",
      dataRegistro: Timestamp.now(),
      ultimoAcesso: Timestamp.now(),
      ativo: true,
    };

    if (options.useUidAsId) {
      await setDoc(doc(db, "usuarios", user.uid), novoUsuario);
      console.log(`✅ Usuário criado com UID como ID:`, user.email);
    } else {
      // Deixar o Firestore gerar um ID automático (menos recomendado)
      const { addDoc, collection } = await import("firebase/firestore");
      await addDoc(collection(db, "usuarios"), novoUsuario);
      console.log(`✅ Usuário criado com ID automático:`, user.email);
    }
    
    return true;
  } catch (error) {
    console.error("❌ Erro ao sincronizar usuário:", error);
    return false;
  }
};

/**
 * Cria um usuário específico no Firestore
 * ATENÇÃO: Apenas para desenvolvimento e testes
 * Em produção, use a interface de usuários
 */
export const createTestUser = async (
  email: string, 
  nome: string, 
  tipo: "admin" | "vendedor" = "vendedor"
) => {
  // VERIFICAÇÃO DE SEGURANÇA: Apenas em desenvolvimento
  if (process.env.NODE_ENV === 'production') {
    console.error("❌ createTestUser não pode ser usado em produção");
    return false;
  }

  try {
    const user = auth.currentUser;
    if (!user || user.email !== email) {
      console.log("❌ Usuário não autenticado com o email correto");
      return false;
    }

    const novoUsuario: Omit<Usuario, "id"> = {
      authUid: user.uid,
      nome: nome,
      email: email,
      tipo: tipo,
      telefone: "",
      dataRegistro: Timestamp.now(),
      ultimoAcesso: Timestamp.now(),
      ativo: true,
    };

    await setDoc(doc(db, "usuarios", user.uid), novoUsuario);
    console.log(`✅ Usuário de teste ${tipo} criado com sucesso!`);
    return true;
  } catch (error) {
    console.error("❌ Erro ao criar usuário de teste:", error);
    return false;
  }
};

// Função utilitária para verificar se o script pode ser executado
export const canRunSyncScript = () => {
  return process.env.NODE_ENV !== 'production';
};