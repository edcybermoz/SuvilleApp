import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ActivationKeyRow = {
  id: string;
  chave: string;
  plano: "pro" | "enterprise";
  ativa: boolean;
  usada: boolean;
  usada_por: string | null;
  usada_em: string | null;
};

type ProfileRow = {
  id: string;
  ativo: boolean | null;
  tipo: string | null;
  plano: string | null;
  status_plano: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Método não permitido.",
        }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error("activate-plan env missing");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Variáveis de ambiente não configuradas.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Não autenticado.",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const admin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      console.error("activate-plan auth error:", userError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Sessão inválida.",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json().catch(() => null);
    const rawKey = typeof body?.chave === "string" ? body.chave : "";
    const chave = rawKey.trim().toUpperCase();

    if (!chave) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Informe a chave de ativação.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, ativo, tipo, plano, status_plano")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();

    if (profileError || !profile) {
      console.error("activate-plan profile error:", profileError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Perfil não encontrado.",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (profile.ativo === false) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Utilizador inativo.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: keyRow, error: keyError } = await admin
      .from("activation_keys")
      .select("id, chave, plano, ativa, usada, usada_por, usada_em")
      .eq("chave", chave)
      .maybeSingle<ActivationKeyRow>();

    if (keyError) {
      console.error("activate-plan key validation error:", keyError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Erro ao validar a chave.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!keyRow) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Chave inválida.",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!keyRow.ativa) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Esta chave está inativa.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (keyRow.usada) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Esta chave já foi utilizada.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (keyRow.plano !== "pro" && keyRow.plano !== "enterprise") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Plano da chave inválido.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const now = new Date().toISOString();

    const { error: updateProfileError } = await admin
      .from("profiles")
      .update({
        plano: keyRow.plano,
        status_plano: "ativo",
        trial_inicio: null,
        trial_fim: null,
        activation_key: chave,
        updated_at: now,
      })
      .eq("id", user.id);

    if (updateProfileError) {
      console.error("activate-plan update profile error:", updateProfileError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Erro ao atualizar o perfil.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { error: updateKeyError } = await admin
      .from("activation_keys")
      .update({
        usada: true,
        usada_por: user.id,
        usada_em: now,
        updated_at: now,
      })
      .eq("id", keyRow.id)
      .eq("usada", false);

    if (updateKeyError) {
      console.error("activate-plan update key error:", updateKeyError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Erro ao marcar a chave como usada.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Plano ${keyRow.plano} ativado com sucesso.`,
        plan: keyRow.plano,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("activate-plan unexpected error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "Erro interno do servidor.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});