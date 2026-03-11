import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ActionType =
  | "apply_trial"
  | "expire_trial"
  | "restore_trial"
  | "block_plan"
  | "activate_pro"
  | "activate_enterprise";

type ProfileRow = {
  id: string;
  tipo: string | null;
  ativo: boolean | null;
  plano: string | null;
  status_plano: string | null;
  trial_inicio: string | null;
  trial_fim: string | null;
};

const addDays = (days: number) => {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + days);

  return {
    trial_inicio: start.toISOString(),
    trial_fim: end.toISOString(),
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, message: "Método não permitido." }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, message: "Configuração do servidor inválida." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Não autenticado." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: "Sessão inválida." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: actorProfile, error: actorError } = await admin
      .from("profiles")
      .select("id, tipo, ativo")
      .eq("id", user.id)
      .maybeSingle();

    if (actorError || !actorProfile) {
      return new Response(
        JSON.stringify({ success: false, message: "Perfil do administrador não encontrado." }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (actorProfile.ativo === false || actorProfile.tipo !== "admin") {
      return new Response(
        JSON.stringify({ success: false, message: "Acesso negado." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json().catch(() => null);
    const action = body?.action as ActionType | undefined;
    const targetUserId = typeof body?.targetUserId === "string" ? body.targetUserId.trim() : "";
    const trialDaysRaw = Number(body?.trialDays);
    const trialDays =
      Number.isFinite(trialDaysRaw) && trialDaysRaw > 0 ? Math.floor(trialDaysRaw) : 14;

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, message: "Ação não informada." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ success: false, message: "Utilizador alvo não informado." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: targetProfile, error: targetError } = await admin
      .from("profiles")
      .select("id, tipo, ativo, plano, status_plano, trial_inicio, trial_fim")
      .eq("id", targetUserId)
      .maybeSingle<ProfileRow>();

    if (targetError || !targetProfile) {
      return new Response(
        JSON.stringify({ success: false, message: "Perfil do utilizador não encontrado." }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const now = new Date().toISOString();
    let updatePayload: Record<string, unknown> = {};
    let message = "Plano atualizado com sucesso.";

    switch (action) {
      case "apply_trial": {
        const trial = addDays(trialDays);
        updatePayload = {
          plano: "trial",
          status_plano: "ativo",
          trial_inicio: trial.trial_inicio,
          trial_fim: trial.trial_fim,
          activation_key: null,
          updated_at: now,
        };
        message = `Trial aplicado por ${trialDays} dia(s).`;
        break;
      }

      case "expire_trial": {
        updatePayload = {
          plano: "trial",
          status_plano: "expirado",
          trial_inicio: targetProfile.trial_inicio ?? now,
          trial_fim: new Date(Date.now() - 60 * 1000).toISOString(),
          activation_key: null,
          updated_at: now,
        };
        message = "Trial expirado manualmente.";
        break;
      }

      case "restore_trial": {
        updatePayload = {
          plano: "trial",
          status_plano: "ativo",
          trial_inicio: targetProfile.trial_inicio ?? now,
          trial_fim: targetProfile.trial_fim ?? addDays(trialDays).trial_fim,
          activation_key: null,
          updated_at: now,
        };
        message = "Trial restaurado para ativo.";
        break;
      }

      case "block_plan": {
        updatePayload = {
          plano: targetProfile.plano ?? "trial",
          status_plano: "bloqueado",
          trial_inicio: targetProfile.trial_inicio,
          trial_fim: targetProfile.trial_fim,
          updated_at: now,
        };
        message = "Plano bloqueado com sucesso.";
        break;
      }

      case "activate_pro": {
        updatePayload = {
          plano: "pro",
          status_plano: "ativo",
          trial_inicio: null,
          trial_fim: null,
          updated_at: now,
        };
        message = "Plano Pro ativado com sucesso.";
        break;
      }

      case "activate_enterprise": {
        updatePayload = {
          plano: "enterprise",
          status_plano: "ativo",
          trial_inicio: null,
          trial_fim: null,
          updated_at: now,
        };
        message = "Plano Enterprise ativado com sucesso.";
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, message: "Ação inválida." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    const { error: updateError } = await admin
      .from("profiles")
      .update(updatePayload)
      .eq("id", targetUserId);

    if (updateError) {
      return new Response(
        JSON.stringify({ success: false, message: "Erro ao atualizar o plano." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, message: "Erro interno do servidor." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});