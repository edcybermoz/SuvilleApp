import { createClient } from "jsr:@supabase/supabase-js@2";

type TipoUsuario = "admin" | "vendedor";

interface CreateUserPayload {
  nome: string;
  email: string;
  password: string;
  tipo: TipoUsuario;
  telefone?: string;
  limiteDesconto?: number;
}

interface UpdateUserPayload {
  uid: string;
  nome?: string;
  tipo?: TipoUsuario;
  telefone?: string;
  ativo?: boolean;
  limiteDesconto?: number;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Método não permitido." }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return json({ error: "Secrets do Supabase não configuradas." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Token não fornecido." }, 401);
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return json({ error: "Token inválido." }, 401);
    }

    const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await supabaseAuthClient.auth.getUser(token);

    if (userError || !user) {
      return json({ error: "Usuário não autenticado." }, 401);
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, nome, email, tipo, ativo")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return json({ error: "Perfil não encontrado." }, 403);
    }

    if (profile.tipo !== "admin" || profile.ativo === false) {
      return json({ error: "Acesso permitido apenas para administradores ativos." }, 403);
    }

    const body = await req.json();
    const action = body.action as string | undefined;

    if (action === "createUser") {
      const {
        nome,
        email,
        password,
        tipo,
        telefone = "",
        limiteDesconto = 10,
      } = body as { action: string } & CreateUserPayload;

      if (!nome || !email || !password || !tipo) {
        return json({ error: "Campos obrigatórios em falta." }, 400);
      }

      const normalizedEmail = email.trim().toLowerCase();
      const normalizedNome = nome.trim();

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          nome: normalizedNome,
          tipo,
        },
      });

      if (error || !data.user) {
        return json({ error: error?.message || "Erro ao criar utilizador." }, 400);
      }

      const { error: insertError } = await supabaseAdmin.from("profiles").insert({
        id: data.user.id,
        nome: normalizedNome,
        email: normalizedEmail,
        tipo,
        telefone: telefone?.trim?.() || "",
        ativo: true,
        limite_desconto: tipo === "admin" ? 100 : limiteDesconto,
      });

      if (insertError) {
        await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        return json({ error: insertError.message }, 400);
      }

      return json({
        success: true,
        uid: data.user.id,
        message: "Usuário criado com sucesso.",
      });
    }

    if (action === "updateUser") {
      const {
        uid,
        nome,
        tipo,
        telefone,
        ativo,
        limiteDesconto,
      } = body as { action: string } & UpdateUserPayload;

      if (!uid) {
        return json({ error: "UID é obrigatório." }, 400);
      }

      if (uid === user.id && ativo === false) {
        return json({ error: "Você não pode desativar sua própria conta." }, 400);
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (nome !== undefined) updateData.nome = nome.trim();
      if (tipo !== undefined) updateData.tipo = tipo;
      if (telefone !== undefined) updateData.telefone = telefone?.trim?.() || "";
      if (ativo !== undefined) updateData.ativo = ativo;
      if (limiteDesconto !== undefined) updateData.limite_desconto = limiteDesconto;

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("id", uid);

      if (updateError) {
        return json({ error: updateError.message }, 400);
      }

      return json({
        success: true,
        message: "Usuário atualizado com sucesso.",
      });
    }

    if (action === "deleteUser") {
      const { uid } = body as { action: string; uid: string };

      if (!uid) {
        return json({ error: "UID é obrigatório." }, 400);
      }

      if (uid === user.id) {
        return json({ error: "Você não pode apagar sua própria conta." }, 400);
      }

      const { error: profileDeleteError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("id", uid);

      if (profileDeleteError) {
        return json({ error: profileDeleteError.message }, 400);
      }

      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(uid);

      if (authDeleteError) {
        return json({ error: authDeleteError.message }, 400);
      }

      return json({
        success: true,
        message: "Usuário removido com sucesso.",
      });
    }

    if (action === "generateResetLink") {
      const { email } = body as { action: string; email: string };

      if (!email) {
        return json({ error: "Email é obrigatório." }, 400);
      }

      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: email.trim().toLowerCase(),
      });

      if (error) {
        return json({ error: error.message }, 400);
      }

      return json({
        success: true,
        link: data.properties?.action_link || null,
        message: "Link de redefinição gerado com sucesso.",
      });
    }

    if (action === "listUsers") {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        return json({ error: error.message }, 400);
      }

      return json({
        success: true,
        usuarios: data,
      });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Erro interno." },
      500
    );
  }
});