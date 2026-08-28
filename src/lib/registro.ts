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
  autor?: string;
  detalhes?: Record<string, unknown>;
}) {
  await supabase.from("logs").insert({
    acao: params.acao,
    entidade: params.entidade,
    entidade_id: params.entidadeId ?? null,
    descricao: params.descricao,
    autor_nome: params.autor ?? "Sistema interno",
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
