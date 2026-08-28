ALTER TABLE public.apostilas ADD COLUMN IF NOT EXISTS estoque_minimo integer NOT NULL DEFAULT 5;

-- Acesso sem login (sistema interno)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apostilas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entregas TO anon;
GRANT SELECT, INSERT ON public.logs TO anon;

DROP POLICY IF EXISTS apostilas_all ON public.apostilas;
CREATE POLICY apostilas_all ON public.apostilas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS entregas_all ON public.entregas;
CREATE POLICY entregas_all ON public.entregas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS logs_select ON public.logs;
DROP POLICY IF EXISTS logs_insert ON public.logs;
CREATE POLICY logs_select ON public.logs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY logs_insert ON public.logs FOR INSERT TO anon, authenticated WITH CHECK (true);