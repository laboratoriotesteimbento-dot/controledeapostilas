import { supabase } from "@/integrations/supabase/client";

export type AcaoLog =
  | "criar"
  | "editar"
  | "renomear"
  | "excluir"
  | "entregar"
  | "excluir_entrega";

export async function registrarLog(params: {
  acao: AcaoLog;
  entidade: "apostila" | "entrega";
  entidadeId?: string | null;
  descricao: string;
  detalhes?: Record<string, unknown>;
}) {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  await supabase.from("logs").insert({
    acao: params.acao,
    entidade: params.entidade,
    entidade_id: params.entidadeId ?? null,
    descricao: params.descricao,
    autor_id: user.id,
    autor_nome: perfil?.display_name || user.email || "Usuário",
    detalhes: (params.detalhes ?? null) as never,
  });
}

export function formatarData(valor: string) {
  return new Date(valor).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
