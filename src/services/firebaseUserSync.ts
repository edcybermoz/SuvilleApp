import { deleteApp, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  inMemoryPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { firebaseConfig } from "@/lib/firebase";

interface CreateFirebaseUserInput {
  email: string;
  password: string;
  nome?: string;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const createTemporaryFirebaseAuth = () => {
  const appName = `firebase-user-sync-${crypto.randomUUID()}`;
  const tempApp = initializeApp(firebaseConfig, appName);
  const tempAuth = getAuth(tempApp);
  return { tempApp, tempAuth };
};

const mapFirebaseSyncError = (error: any) => {
  const code = error?.code || "";

  switch (code) {
    case "auth/email-already-in-use":
      return "Este email já existe no Firebase.";
    case "auth/invalid-email":
      return "O email informado é inválido no Firebase.";
    case "auth/weak-password":
      return "A senha é muito fraca para o Firebase.";
    case "auth/operation-not-allowed":
      return "O login por email/senha não está ativo no Firebase.";
    case "auth/network-request-failed":
      return "Falha de conexão ao comunicar com o Firebase.";
    default:
      return error?.message || "Erro ao sincronizar utilizador com o Firebase.";
  }
};

export const createFirebasePasswordUser = async ({
  email,
  password,
  nome,
}: CreateFirebaseUserInput) => {
  const normalizedEmail = normalizeEmail(email);
  const { tempApp, tempAuth } = createTemporaryFirebaseAuth();

  try {
    await setPersistence(tempAuth, inMemoryPersistence);

    const cred = await createUserWithEmailAndPassword(
      tempAuth,
      normalizedEmail,
      password
    );

    if (nome?.trim()) {
      await updateProfile(cred.user, {
        displayName: nome.trim(),
      });
    }

    return {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName,
    };
  } catch (error: any) {
    throw new Error(mapFirebaseSyncError(error));
  } finally {
    try {
      await signOut(tempAuth);
    } catch {}

    try {
      await deleteApp(tempApp);
    } catch {}
  }
};

export const rollbackFirebasePasswordUser = async (
  email: string,
  password: string
) => {
  const normalizedEmail = normalizeEmail(email);
  const { tempApp, tempAuth } = createTemporaryFirebaseAuth();

  try {
    await setPersistence(tempAuth, inMemoryPersistence);

    const cred = await signInWithEmailAndPassword(
      tempAuth,
      normalizedEmail,
      password
    );

    await deleteUser(cred.user);
    return true;
  } catch {
    return false;
  } finally {
    try {
      await signOut(tempAuth);
    } catch {}

    try {
      await deleteApp(tempApp);
    } catch {}
  }
};