import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ClipboardList, History, PackageCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Controle de Apostilas — Estoque, entregas e histórico" },
      {
        name: "description",
        content:
          "Cadastre apostilas, registre entregas com responsável, destinatário e data, e acompanhe todo o histórico de alterações.",
      },
      { property: "og:title", content: "Controle de Apostilas" },
      {
        property: "og:description",
        content: "Estoque de apostilas, entregas registradas e log completo de alterações.",
      },
    ],
  }),
  component: Index,
});

const recursos = [
  {
    icone: BookOpen,
    titulo: "Cadastro de apostilas",
    texto: "Adicione, edite o nome, ajuste o estoque ou exclua apostilas em segundos.",
  },
  {
    icone: PackageCheck,
    titulo: "Entregas rastreadas",
    texto: "Quem entregou, para quem foi entregue, quantidade e data de cada entrega.",
  },
  {
    icone: History,
    titulo: "Log completo",
    texto: "Todo cadastro, edição, exclusão e entrega fica registrado com autor e horário.",
  },
];

function Index() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 font-display text-lg font-bold">
            <ClipboardList className="size-5 text-primary" />
            Apostilas
          </div>
          <Button asChild size="sm">
            <Link to="/painel">Abrir painel</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Gestão de material didático
        </p>
        <h1 className="mt-4 max-w-2xl font-display text-5xl leading-tight font-bold text-foreground">
          Controle de apostilas com entrega registrada e histórico auditável.
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground">
          Um painel único para o acervo, o estoque e cada entrega feita — sempre com quem
          entregou, para quem e quando.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/painel">Entrar no painel</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">Criar conta</Link>
          </Button>
        </div>

        <div className="mt-20 grid gap-5 sm:grid-cols-3">
          {recursos.map((r) => (
            <div
              key={r.titulo}
              className="rounded-lg border border-border bg-card p-6 shadow-card"
            >
              <r.icone className="size-5 text-accent" />
              <h2 className="mt-4 font-display text-lg font-bold">{r.titulo}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{r.texto}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
