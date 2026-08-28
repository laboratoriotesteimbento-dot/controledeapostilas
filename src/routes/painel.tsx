import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  BookOpen,
  ClipboardList,
  History,
  PackageCheck,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";


import { supabase } from "@/integrations/supabase/client";
import { formatarData, registrarLog } from "@/lib/registro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Painel — Controle de Apostilas" },
      {
        name: "description",
        content: "Gerencie apostilas, registre entregas e consulte o histórico de alterações.",
      },
      { property: "og:title", content: "Painel — Controle de Apostilas" },
      {
        property: "og:description",
        content: "Gerencie apostilas, registre entregas e consulte o histórico de alterações.",
      },
    ],
  }),
  component: Painel,
});

type Apostila = {
  id: string;
  nome: string;
  codigo: string | null;
  descricao: string | null;
  quantidade: number;
  estoque_minimo: number;
  created_at: string;
};

type NivelEstoque = "ok" | "atencao" | "critico";

function nivelEstoque(a: Apostila): NivelEstoque {
  const min = a.estoque_minimo ?? 0;
  if (a.quantidade <= min) return "critico";
  if (a.quantidade <= min * 1.5 || a.quantidade <= min + 3) return "atencao";
  return "ok";
}

const estiloNivel: Record<NivelEstoque, { classe: string; rotulo: string }> = {
  ok: { classe: "bg-stock-ok/15 text-stock-ok border-stock-ok/30", rotulo: "Estoque bom" },
  atencao: {
    classe: "bg-stock-warn/15 text-stock-warn border-stock-warn/30",
    rotulo: "Atenção",
  },
  critico: {
    classe: "bg-stock-low/15 text-stock-low border-stock-low/30",
    rotulo: "Estoque baixo",
  },
};


type Entrega = {
  id: string;
  apostila_id: string | null;
  apostila_nome: string;
  entregue_por: string;
  entregue_para: string;
  quantidade: number;
  data_entrega: string;
  observacao: string | null;
};

type Log = {
  id: string;
  acao: string;
  entidade: string;
  descricao: string;
  autor_nome: string | null;
  created_at: string;
};

const rotuloAcao: Record<string, string> = {
  criar: "Criação",
  editar: "Edição",
  renomear: "Renomeação",
  excluir: "Exclusão",
  entregar: "Entrega",
  excluir_entrega: "Entrega removida",
};

function Painel() {
  
  const qc = useQueryClient();

  const apostilas = useQuery({
    queryKey: ["apostilas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apostilas")
        .select("*")
        .order("nome", { ascending: true });
      if (error) throw error;
      return data as Apostila[];
    },
  });

  const entregas = useQuery({
    queryKey: ["entregas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entregas")
        .select("*")
        .order("data_entrega", { ascending: false });
      if (error) throw error;
      return data as Entrega[];
    },
  });

  const logs = useQuery({
    queryKey: ["logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Log[];
    },
  });

  function recarregar() {
    qc.invalidateQueries({ queryKey: ["apostilas"] });
    qc.invalidateQueries({ queryKey: ["entregas"] });
    qc.invalidateQueries({ queryKey: ["logs"] });
  }

  // ---------- apostila form ----------
  const [dialogApostila, setDialogApostila] = useState(false);
  const [editando, setEditando] = useState<Apostila | null>(null);
  const [form, setForm] = useState({ nome: "", codigo: "", descricao: "", quantidade: "0" });
  const [excluirApostila, setExcluirApostila] = useState<Apostila | null>(null);

  function abrirNova() {
    setEditando(null);
    setForm({ nome: "", codigo: "", descricao: "", quantidade: "0" });
    setDialogApostila(true);
  }

  function abrirEdicao(a: Apostila) {
    setEditando(a);
    setForm({
      nome: a.nome,
      codigo: a.codigo ?? "",
      descricao: a.descricao ?? "",
      quantidade: String(a.quantidade),
    });
    setDialogApostila(true);
  }

  async function salvarApostila(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      nome: form.nome.trim(),
      codigo: form.codigo.trim() || null,
      descricao: form.descricao.trim() || null,
      quantidade: Number(form.quantidade) || 0,
    };
    if (!payload.nome) return;

    if (editando) {
      const { error } = await supabase.from("apostilas").update(payload).eq("id", editando.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      const renomeou = editando.nome !== payload.nome;
      await registrarLog({
        acao: renomeou ? "renomear" : "editar",
        entidade: "apostila",
        entidadeId: editando.id,
        descricao: renomeou
          ? `Renomeou a apostila "${editando.nome}" para "${payload.nome}"`
          : `Editou a apostila "${payload.nome}"`,
        detalhes: { antes: editando, depois: payload },
      });
      toast.success("Apostila atualizada.");
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("apostilas")
        .insert({ ...payload, criado_por: userData.user?.id ?? null })
        .select()
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      await registrarLog({
        acao: "criar",
        entidade: "apostila",
        entidadeId: data.id,
        descricao: `Cadastrou a apostila "${payload.nome}"`,
        detalhes: payload,
      });
      toast.success("Apostila cadastrada.");
    }
    setDialogApostila(false);
    recarregar();
  }

  async function confirmarExclusao() {
    if (!excluirApostila) return;
    const { error } = await supabase.from("apostilas").delete().eq("id", excluirApostila.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await registrarLog({
      acao: "excluir",
      entidade: "apostila",
      entidadeId: excluirApostila.id,
      descricao: `Excluiu a apostila "${excluirApostila.nome}"`,
      detalhes: { apostila: excluirApostila },
    });
    setExcluirApostila(null);
    toast.success("Apostila excluída.");
    recarregar();
  }

  // ---------- entrega form ----------
  const [dialogEntrega, setDialogEntrega] = useState(false);
  const [formEntrega, setFormEntrega] = useState({
    apostila_id: "",
    entregue_por: "",
    entregue_para: "",
    quantidade: "1",
    data_entrega: new Date().toISOString().slice(0, 16),
    observacao: "",
  });
  const [excluirEntrega, setExcluirEntrega] = useState<Entrega | null>(null);

  async function salvarEntrega(e: React.FormEvent) {
    e.preventDefault();
    const apostila = apostilas.data?.find((a) => a.id === formEntrega.apostila_id);
    if (!apostila) {
      toast.error("Selecione uma apostila.");
      return;
    }
    const qtd = Number(formEntrega.quantidade) || 1;

    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("entregas")
      .insert({
        apostila_id: apostila.id,
        apostila_nome: apostila.nome,
        entregue_por: formEntrega.entregue_por.trim(),
        entregue_para: formEntrega.entregue_para.trim(),
        quantidade: qtd,
        data_entrega: new Date(formEntrega.data_entrega).toISOString(),
        observacao: formEntrega.observacao.trim() || null,
        registrado_por: userData.user?.id ?? null,
      })
      .select()
      .single();
    if (error) {
        toast.error(error.message);
        return;
      }

    await supabase
      .from("apostilas")
      .update({ quantidade: Math.max(0, apostila.quantidade - qtd) })
      .eq("id", apostila.id);

    await registrarLog({
      acao: "entregar",
      entidade: "entrega",
      entidadeId: data.id,
      descricao: `${formEntrega.entregue_por} entregou ${qtd}x "${apostila.nome}" para ${formEntrega.entregue_para}`,
      detalhes: { entrega: data },
    });

    setDialogEntrega(false);
    setFormEntrega({
      apostila_id: "",
      entregue_por: "",
      entregue_para: "",
      quantidade: "1",
      data_entrega: new Date().toISOString().slice(0, 16),
      observacao: "",
    });
    toast.success("Entrega registrada.");
    recarregar();
  }

  async function confirmarExclusaoEntrega() {
    if (!excluirEntrega) return;
    const { error } = await supabase.from("entregas").delete().eq("id", excluirEntrega.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await registrarLog({
      acao: "excluir_entrega",
      entidade: "entrega",
      entidadeId: excluirEntrega.id,
      descricao: `Excluiu a entrega de "${excluirEntrega.apostila_nome}" para ${excluirEntrega.entregue_para}`,
      detalhes: { entrega: excluirEntrega },
    });
    setExcluirEntrega(null);
    toast.success("Entrega excluída.");
    recarregar();
  }

  const totalEstoque = (apostilas.data ?? []).reduce((s, a) => s + a.quantidade, 0);
  const emAlerta = (apostilas.data ?? []).filter((a) => nivelEstoque(a) !== "ok").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-display text-lg font-bold">
            <ClipboardList className="size-5 text-primary" />
            Instituto Mix — Controle de Apostilas
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-4">
          <Resumo icone={BookOpen} rotulo="Apostilas cadastradas" valor={apostilas.data?.length ?? 0} />
          <Resumo icone={ClipboardList} rotulo="Exemplares em estoque" valor={totalEstoque} />
          <Resumo icone={PackageCheck} rotulo="Entregas registradas" valor={entregas.data?.length ?? 0} />
          <Resumo icone={AlertTriangle} rotulo="Apostilas em alerta" valor={emAlerta} destaque={emAlerta > 0} />
        </div>


        <Tabs defaultValue="apostilas" className="mt-8">
          <TabsList>
            <TabsTrigger value="apostilas">Apostilas</TabsTrigger>
            <TabsTrigger value="entregas">Entregas</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          {/* APOSTILAS */}
          <TabsContent value="apostilas" className="pt-6">
            <div className="mb-4 flex justify-end">
              <Button onClick={abrirNova}>
                <Plus className="mr-2 size-4" />
                Nova apostila
              </Button>
            </div>
            <Card className="shadow-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead className="w-28 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(apostilas.data ?? []).map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.nome}</TableCell>
                        <TableCell className="text-muted-foreground">{a.codigo ?? "—"}</TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {a.descricao ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={a.quantidade > 0 ? "secondary" : "outline"}>
                            {a.quantidade}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => abrirEdicao(a)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setExcluirApostila(a)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {apostilas.data?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                          Nenhuma apostila cadastrada ainda.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ENTREGAS */}
          <TabsContent value="entregas" className="pt-6">
            <div className="mb-4 flex justify-end">
              <Button onClick={() => setDialogEntrega(true)}>
                <PackageCheck className="mr-2 size-4" />
                Registrar entrega
              </Button>
            </div>
            <Card className="shadow-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Apostila</TableHead>
                      <TableHead>Entregue por</TableHead>
                      <TableHead>Entregue para</TableHead>
                      <TableHead className="text-right">Qtd.</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="w-16 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(entregas.data ?? []).map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.apostila_nome}</TableCell>
                        <TableCell>{e.entregue_por}</TableCell>
                        <TableCell>{e.entregue_para}</TableCell>
                        <TableCell className="text-right">{e.quantidade}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatarData(e.data_entrega)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => setExcluirEntrega(e)}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {entregas.data?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          Nenhuma entrega registrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* HISTORICO */}
          <TabsContent value="historico" className="pt-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-lg">
                  <History className="size-4 text-accent" />
                  Registro de atividades
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">Ação</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="w-44">Autor</TableHead>
                      <TableHead className="w-44">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(logs.data ?? []).map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>
                          <Badge variant="outline">{rotuloAcao[l.acao] ?? l.acao}</Badge>
                        </TableCell>
                        <TableCell>{l.descricao}</TableCell>
                        <TableCell className="text-muted-foreground">{l.autor_nome ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatarData(l.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {logs.data?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                          Nenhum registro ainda.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialog apostila */}
      <Dialog open={dialogApostila} onOpenChange={setDialogApostila}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              {editando ? "Editar apostila" : "Nova apostila"}
            </DialogTitle>
            <DialogDescription>
              {editando
                ? "Altere o nome, o código, a descrição ou o estoque."
                : "Cadastre uma nova apostila no acervo."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={salvarApostila} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="a-nome">Nome</Label>
              <Input
                id="a-nome"
                required
                value={form.nome}
                onChange={(ev) => setForm({ ...form, nome: ev.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="a-cod">Código</Label>
                <Input
                  id="a-cod"
                  value={form.codigo}
                  onChange={(ev) => setForm({ ...form, codigo: ev.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="a-qtd">Estoque</Label>
                <Input
                  id="a-qtd"
                  type="number"
                  min={0}
                  value={form.quantidade}
                  onChange={(ev) => setForm({ ...form, quantidade: ev.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-desc">Descrição</Label>
              <Textarea
                id="a-desc"
                value={form.descricao}
                onChange={(ev) => setForm({ ...form, descricao: ev.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit">{editando ? "Salvar alterações" : "Cadastrar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog entrega */}
      <Dialog open={dialogEntrega} onOpenChange={setDialogEntrega}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Registrar entrega</DialogTitle>
            <DialogDescription>
              Informe quem entregou, para quem foi entregue e a data.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={salvarEntrega} className="space-y-4">
            <div className="space-y-2">
              <Label>Apostila</Label>
              <Select
                value={formEntrega.apostila_id}
                onValueChange={(v) => setFormEntrega({ ...formEntrega, apostila_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a apostila" />
                </SelectTrigger>
                <SelectContent>
                  {(apostilas.data ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nome} ({a.quantidade} em estoque)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="e-por">Entregue por</Label>
                <Input
                  id="e-por"
                  required
                  value={formEntrega.entregue_por}
                  onChange={(ev) =>
                    setFormEntrega({ ...formEntrega, entregue_por: ev.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-para">Entregue para</Label>
                <Input
                  id="e-para"
                  required
                  value={formEntrega.entregue_para}
                  onChange={(ev) =>
                    setFormEntrega({ ...formEntrega, entregue_para: ev.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="e-qtd">Quantidade</Label>
                <Input
                  id="e-qtd"
                  type="number"
                  min={1}
                  value={formEntrega.quantidade}
                  onChange={(ev) =>
                    setFormEntrega({ ...formEntrega, quantidade: ev.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-data">Data da entrega</Label>
                <Input
                  id="e-data"
                  type="datetime-local"
                  required
                  value={formEntrega.data_entrega}
                  onChange={(ev) =>
                    setFormEntrega({ ...formEntrega, data_entrega: ev.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-obs">Observação</Label>
              <Textarea
                id="e-obs"
                value={formEntrega.observacao}
                onChange={(ev) => setFormEntrega({ ...formEntrega, observacao: ev.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit">Registrar entrega</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!excluirApostila}
        onOpenChange={(o) => !o && setExcluirApostila(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir apostila?</AlertDialogTitle>
            <AlertDialogDescription>
              "{excluirApostila?.nome}" será removida do acervo. O histórico de entregas é
              mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!excluirEntrega} onOpenChange={(o) => !o && setExcluirEntrega(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir entrega?</AlertDialogTitle>
            <AlertDialogDescription>
              O registro da entrega para {excluirEntrega?.entregue_para} será removido, mas
              ficará registrado no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusaoEntrega}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Resumo({
  icone: Icone,
  rotulo,
  valor,
}: {
  icone: React.ElementType;
  rotulo: string;
  valor: number;
}) {
  return (
    <Card className="shadow-card">
      <CardContent className="flex items-center gap-4 py-6">
        <div className="rounded-md bg-secondary p-3">
          <Icone className="size-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{rotulo}</p>
          <p className="font-display text-2xl font-bold">{valor}</p>
        </div>
      </CardContent>
    </Card>
  );
}
