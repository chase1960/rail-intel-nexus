
-- 1. Roles enum + table
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'analyst', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_analyst_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('analyst', 'admin')
  )
$$;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Replace permissive write policies on intelligence tables
-- Analyst/admin can write; all authenticated can read (keeps SELECT true pattern intentional)
DO $$
DECLARE
  t text;
  analyst_tables text[] := ARRAY[
    'sources','collection_runs','evidence_items','evidence_versions',
    'intelligence_events','event_evidence','product_impacts','reports'
  ];
  admin_tables text[] := ARRAY['audit_logs','verification_runs','system_test_runs'];
BEGIN
  FOREACH t IN ARRAY analyst_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth write ' || split_part(t,'_',1), t);
    -- Drop any generic ALL policy names we know
    EXECUTE format('DROP POLICY IF EXISTS "auth write runs" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth write evidence" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth write versions" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth write events" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth write ee" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth write impacts" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth write reports" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth write sources" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "analysts write %I" ON public.%I FOR ALL TO authenticated USING (public.is_analyst_or_admin(auth.uid())) WITH CHECK (public.is_analyst_or_admin(auth.uid()))',
      t, t
    );
  END LOOP;

  FOREACH t IN ARRAY admin_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth write vruns" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth write tests" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth insert audit" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "admins write %I" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))',
      t, t
    );
  END LOOP;
END $$;

-- 3. Storage policies for private evidence-archives bucket
DROP POLICY IF EXISTS "evidence read analysts" ON storage.objects;
CREATE POLICY "evidence read analysts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'evidence-archives' AND public.is_analyst_or_admin(auth.uid()));

DROP POLICY IF EXISTS "evidence write analysts" ON storage.objects;
CREATE POLICY "evidence write analysts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence-archives' AND public.is_analyst_or_admin(auth.uid()));

DROP POLICY IF EXISTS "evidence update analysts" ON storage.objects;
CREATE POLICY "evidence update analysts" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'evidence-archives' AND public.is_analyst_or_admin(auth.uid()))
  WITH CHECK (bucket_id = 'evidence-archives' AND public.is_analyst_or_admin(auth.uid()));

DROP POLICY IF EXISTS "evidence delete admins" ON storage.objects;
CREATE POLICY "evidence delete admins" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'evidence-archives' AND public.has_role(auth.uid(), 'admin'));
