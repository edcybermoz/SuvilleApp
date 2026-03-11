import { adminApi } from "@/services/adminApi";
import {
  createFirebasePasswordUser,
  rollbackFirebasePasswordUser,
} from "@/services/firebaseUserSync";
import { createUsuario } from "@/lib/store";

type CreateFullUserPayload = {
  nome: string;
  email: string;
  password: string;
  tipo: "admin" | "vendedor";
  telefone?: string;
  limiteDesconto?: number;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const createFullUser = async (payload: CreateFullUserPayload) => {
  let supabaseUid: string | null = null;
  let firebaseCreated = false;

  try {
    const normalizedEmail = normalizeEmail(payload.email);
    const normalizedNome = payload.nome.trim();

    const supaResult = await adminApi.createUser({
      ...payload,
      nome: normalizedNome,
      email: normalizedEmail,
    });

    supabaseUid = supaResult.uid;

    const firebaseResult = await createFirebasePasswordUser({
      email: normalizedEmail,
      password: payload.password,
      nome: normalizedNome,
    });

    firebaseCreated = true;

    await createUsuario({
      authUid: firebaseResult.uid,
      nome: normalizedNome,
      email: normalizedEmail,
      tipo: payload.tipo,
      telefone: payload.telefone?.trim() || "",
      ativo: true,
      limiteDesconto:
        payload.tipo === "admin" ? 100 : payload.limiteDesconto ?? 10,
    });

    return {
      success: true,
      supabaseUid,
      firebaseUid: firebaseResult.uid,
      message: "Usuário criado com sucesso em todos os serviços.",
    };
  } catch (error) {
    if (firebaseCreated) {
      try {
        await rollbackFirebasePasswordUser(payload.email, payload.password);
      } catch {}
    }

    if (supabaseUid) {
      try {
        await adminApi.deleteUser(supabaseUid);
      } catch {}
    }

    throw error;
  }
};