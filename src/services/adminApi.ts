import { supabase } from "@/lib/supabase";

export interface AdminApiUser {
  id: string;
  nome: string;
  email: string;
  tipo: "admin" | "vendedor";
  telefone?: string;
  ativo: boolean;
  limite_desconto?: number;
  created_at?: string;
  updated_at?: string;
}

const request = async <T>(payload: unknown): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: payload,
  });

  if (error) {
    throw new Error(error.message || "Erro na requisição.");
  }

  const response = data as { error?: string } & T;

  if (response?.error) {
    throw new Error(response.error);
  }

  return response as T;
};

export const adminApi = {
  createUser: async (payload: {
    nome: string;
    email: string;
    password: string;
    tipo: "admin" | "vendedor";
    telefone?: string;
    limiteDesconto?: number;
  }) =>
    request<{ success: boolean; uid: string; message: string }>({
      action: "createUser",
      ...payload,
    }),

  updateUser: async (payload: {
    uid: string;
    nome?: string;
    tipo?: "admin" | "vendedor";
    telefone?: string;
    ativo?: boolean;
    limiteDesconto?: number;
  }) =>
    request<{ success: boolean; message: string }>({
      action: "updateUser",
      ...payload,
    }),

  deleteUser: async (uid: string) =>
    request<{ success: boolean; message: string }>({
      action: "deleteUser",
      uid,
    }),

  generatePasswordReset: async (email: string) =>
    request<{ success: boolean; link: string | null; message: string }>({
      action: "generateResetLink",
      email,
    }),

  listUsers: async () =>
    request<{ success: boolean; usuarios: AdminApiUser[] }>({
      action: "listUsers",
    }),
};