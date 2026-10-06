import { useMemo, useState } from "react";
import { FileDown, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ApostilaRel = {
  id: string;
  nome: string;
  quantidade: number;
  estoque_minimo: number;
  categoria_id: string | null;
};

export type EntregaRel = {
  id: string;
  apostila_id: string | null;
  apostila_nome: string;
  quantidade: number;
  data_entrega: string;
};

type PeriodoId = "tudo" | "hoje" | "7" | "30" | "mes" | "mes_anterior" | "custom";

const periodos: { id: PeriodoId; rotulo: string }[] = [
  { id: "tudo", rotulo: "Todo o histórico" },
  { id: "hoje", rotulo: "Hoje" },
  { id: "7", rotulo: "Últimos 7 dias" },
  { id: "30", rotulo: "Últimos 30 dias" },
  { id: "mes", rotulo: "Este mês" },
  { id: "mes_anterior", rotulo: "Mês anterior" },
  { id: "custom", rotulo: "Período personalizado" },
];

function inicioDoDia(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function fimDoDia(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function intervaloDe(periodo: PeriodoId, de: string, ate: string): { inicio: Date; fim: Date } {
  const hoje = new Date();
  switch (periodo) {
    case "tudo":
      return { inicio: new Date(0), fim: fimDoDia(hoje) };
    case "hoje":
      return { inicio: inicioDoDia(hoje), fim: fimDoDia(hoje) };
    case "7": {
      const i = inicioDoDia(hoje);
      i.setDate(i.getDate() - 6);
      return { inicio: i, fim: fimDoDia(hoje) };
    }
    case "30": {
      const i = inicioDoDia(hoje);
      i.setDate(i.getDate() - 29);
      return { inicio: i, fim: fimDoDia(hoje) };
    }
    case "mes":
      return {
        inicio: inicioDoDia(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
        fim: fimDoDia(hoje),
      };
    case "mes_anterior":
      return {
        inicio: inicioDoDia(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)),
        fim: fimDoDia(new Date(hoje.getFullYear(), hoje.getMonth(), 0)),
      };
    case "custom": {
      const i = de ? inicioDoDia(new Date(`${de}T00:00:00`)) : new Date(0);
      const f = ate ? fimDoDia(new Date(`${ate}T00:00:00`)) : fimDoDia(hoje);
      return { inicio: i, fim: f };
    }
  }
}

function dataCurta(d: Date) {
  return d.toLocaleDateString("pt-BR");
}

function escapar(v: string) {
  return v.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );
}

type Linha = {
  id: string;
  nome: string;
  categoria: string;
  estoque: number;
  minimo: number;
  saidas: number;
  entregas: number;
  comprar: number;
  situacao: "repor" | "atencao" | "ok";
};

const rotuloSituacao: Record<Linha["situacao"], string> = {
  repor: "Comprar",
  atencao: "Saindo — estoque cobre",
  ok: "Sem saída",
};

const classeSituacao: Record<Linha["situacao"], string> = {
  repor: "bg-stock-low/15 text-stock-low border-stock-low/30",
  atencao: "bg-stock-warn/15 text-stock-warn border-stock-warn/30",
  ok: "bg-stock-ok/15 text-stock-ok border-stock-ok/30",
};

const notaCalculo =
  'Cálculo: com base nas entregas do período selecionado, a coluna "A comprar" repõe exatamente a quantidade que saiu. Apostilas sem saída não entram no pedido — assim você compra apenas o que está saindo.';

export function RelatorioCompras({
  apostilas,
  entregas,
  nomeCategoria,
}: {
  apostilas: ApostilaRel[];
  entregas: EntregaRel[];
  nomeCategoria: (id: string | null) => string | null;
}) {
  const [periodo, setPeriodo] = useState<PeriodoId>("tudo");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const { inicio, fim } = useMemo(() => intervaloDe(periodo, de, ate), [periodo, de, ate]);

  const entregasPeriodo = useMemo(
    () =>
      entregas.filter((e) => {
        const d = new Date(e.data_entrega);
        return d >= inicio && d <= fim;
      }),
    [entregas, inicio, fim],
  );

  const linhas = useMemo<Linha[]>(() => {
    const porId = new Map<string, { qtd: number; ocorrencias: number }>();
    const porNome = new Map<string, { qtd: number; ocorrencias: number }>();
    for (const e of entregasPeriodo) {
      const alvo = e.apostila_id ? porId : porNome;
      const chave = e.apostila_id ?? e.apostila_nome;
      const atual = alvo.get(chave) ?? { qtd: 0, ocorrencias: 0 };
      alvo.set(chave, { qtd: atual.qtd + e.quantidade, ocorrencias: atual.ocorrencias + 1 });
    }

    return apostilas
      .map((a) => {
        const agg = porId.get(a.id) ?? porNome.get(a.nome) ?? { qtd: 0, ocorrencias: 0 };
        // Compra baseada apenas na demanda real do período:
        // repor exatamente o que saiu. Apostilas sem saída não entram no pedido.
        const comprar = agg.qtd;
        const situacao: Linha["situacao"] = agg.qtd > 0 ? "repor" : "ok";
        return {
          id: a.id,
          nome: a.nome,
          categoria: nomeCategoria(a.categoria_id) ?? "—",
          estoque: a.quantidade,
          minimo: a.estoque_minimo,
          saidas: agg.qtd,
          entregas: agg.ocorrencias,
          comprar,
          situacao,
        };
      })
      .sort((x, y) => y.saidas - x.saidas || y.comprar - x.comprar || x.nome.localeCompare(y.nome));
  }, [apostilas, entregasPeriodo, nomeCategoria]);

  const totalSaidas = linhas.reduce((s, l) => s + l.saidas, 0);
  const totalEntregas = linhas.reduce((s, l) => s + l.entregas, 0);
  const totalComprar = linhas.reduce((s, l) => s + l.comprar, 0);
  const totalRepor = linhas.filter((l) => l.comprar > 0).length;

  const rotuloPeriodo =
    periodo === "custom"
      ? `${dataCurta(inicio)} a ${dataCurta(fim)}`
      : periodo === "tudo"
        ? "Todo o histórico de entregas"
        : `${periodos.find((p) => p.id === periodo)?.rotulo} (${dataCurta(inicio)} a ${dataCurta(fim)})`;

  function gerarDocumento() {
    const linhasHtml = linhas
      .map(
        (l) => `<tr>
        <td>${escapar(l.nome)}</td>
        <td>${escapar(l.categoria)}</td>
        <td class="n">${l.saidas}</td>
        <td class="n">${l.estoque}</td>
        <td class="n">${l.minimo}</td>
        <td class="n strong">${l.comprar}</td>
        <td class="s ${l.situacao}">${rotuloSituacao[l.situacao]}</td>
      </tr>`,
      )
      .join("");

    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Relatório de Compras de Apostilas</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1c1c1c; margin: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; letter-spacing: .5px; color: #9b1c1c; }
  .sub { font-size: 12px; color: #555; margin: 2px 0; }
  hr { border: none; border-top: 2px solid #9b1c1c; margin: 14px 0 18px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #9b1c1c; color: #fff; text-align: left; padding: 8px; }
  td { padding: 7px 8px; border-bottom: 1px solid #ddd; }
  td.n { text-align: right; }
  td.strong { font-weight: bold; }
  td.s.repor { color: #b91c1c; font-weight: bold; }
  td.s.atencao { color: #a16207; font-weight: bold; }
  td.s.ok { color: #15803d; }
  tr:nth-child(even) td { background: #faf7f7; }
  .total { margin-top: 20px; padding: 12px 16px; border: 2px solid #9b1c1c; font-size: 14px; font-weight: bold; display: inline-block; }
  .rodape { margin-top: 28px; font-size: 10px; color: #777; }
  @media print { body { margin: 12mm; } }
</style></head><body>
<h1>INSTITUTO MIX — RELATÓRIO DE COMPRAS DE APOSTILAS</h1>
<div class="sub"><strong>Período:</strong> ${escapar(rotuloPeriodo)}</div>
<div class="sub"><strong>Data de emissão:</strong> ${new Date().toLocaleString("pt-BR")}</div>
<hr>
<table>
  <thead><tr>
    <th>Apostila</th><th>Categoria</th><th>Saídas</th><th>Estoque Atual</th>
    <th>Estoque Mínimo</th><th>Comprar</th><th>Situação</th>
  </tr></thead>
  <tbody>${linhasHtml || '<tr><td colspan="7">Nenhuma apostila cadastrada.</td></tr>'}</tbody>
</table>
<div class="total">TOTAL DE UNIDADES PARA COMPRA: ${totalComprar}</div>
<div class="rodape">${escapar(notaCalculo)}</div>
<div class="rodape">Relatório gerado automaticamente pelo sistema interno de controle de apostilas do Instituto Mix.</div>
<script>window.onload = function () { window.print(); };</script>
</body></html>`;

    const janela = window.open("", "_blank");
    if (!janela) return;
    janela.document.write(html);
    janela.document.close();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-5">
        <ResumoRel rotulo="Total de apostilas" valor={linhas.length} />
        <ResumoRel rotulo="Exemplares que saíram" valor={totalSaidas} />
        <ResumoRel rotulo="Entregas no período" valor={totalEntregas} />
        <ResumoRel rotulo="Unidades para comprar" valor={totalComprar} destaque={totalComprar > 0} />
        <ResumoRel rotulo="Apostilas para repor" valor={totalRepor} destaque={totalRepor > 0} />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Período</Label>
              <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoId)}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {periodo === "custom" && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">De</Label>
                  <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Até</Label>
                  <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
                </div>
              </>
            )}
          </div>
          <Button onClick={gerarDocumento} className="gap-2">
            <FileDown className="size-4" />
            Gerar Relatório de Compras
          </Button>
        </CardHeader>
        <CardContent>
          <CardTitle className="mb-4 flex items-center gap-2 text-base">
            <ShoppingCart className="size-4 text-primary" />
            {rotuloPeriodo}
          </CardTitle>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Apostila</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Estoque atual</TableHead>
                <TableHead className="text-right">Estoque mínimo</TableHead>
                <TableHead className="text-right">Saídas no período</TableHead>
                <TableHead className="text-right">Entregas</TableHead>
                <TableHead className="text-right">A comprar</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Nenhuma apostila cadastrada.
                  </TableCell>
                </TableRow>
              )}
              {linhas.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.nome}</TableCell>
                  <TableCell>
                    {l.categoria === "—" ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <Badge variant="secondary">{l.categoria}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{l.estoque}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{l.minimo}</TableCell>
                  <TableCell className="text-right">{l.saidas}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{l.entregas}</TableCell>
                  <TableCell className="text-right font-semibold">{l.comprar}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={classeSituacao[l.situacao]}>
                      {rotuloSituacao[l.situacao]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {linhas.length > 0 && (
            <p className="mt-4 text-right font-display text-sm font-bold">
              TOTAL DE UNIDADES PARA COMPRA: {totalComprar}
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">{notaCalculo}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ResumoRel({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <Card className={destaque ? "border-stock-low/40" : undefined}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{rotulo}</p>
        <p
          className={`font-display text-2xl font-bold ${destaque ? "text-stock-low" : ""}`}
        >
          {valor}
        </p>
      </CardContent>
    </Card>
  );
}
