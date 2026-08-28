
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.apostilas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  codigo TEXT,
  descricao TEXT,
  quantidade INTEGER NOT NULL DEFAULT 0,
  criado_por UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apostilas TO authenticated;
GRANT ALL ON public.apostilas TO service_role;
ALTER TABLE public.apostilas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apostilas_all" ON public.apostilas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.entregas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apostila_id UUID REFERENCES public.apostilas(id) ON DELETE SET NULL,
  apostila_nome TEXT NOT NULL,
  entregue_por TEXT NOT NULL,
  entregue_para TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  data_entrega TIMESTAMPTZ NOT NULL DEFAULT now(),
  observacao TEXT,
  registrado_por UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entregas TO authenticated;
GRANT ALL ON public.entregas TO service_role;
ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entregas_all" ON public.entregas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id UUID,
  descricao TEXT NOT NULL,
  autor_id UUID REFERENCES auth.users ON DELETE SET NULL,
  autor_nome TEXT,
  detalhes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.logs TO authenticated;
GRANT ALL ON public.logs TO service_role;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_select" ON public.logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "logs_insert" ON public.logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = autor_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER apostilas_updated_at BEFORE UPDATE ON public.apostilas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_entregas_data ON public.entregas (data_entrega DESC);
CREATE INDEX idx_logs_created ON public.logs (created_at DESC);
