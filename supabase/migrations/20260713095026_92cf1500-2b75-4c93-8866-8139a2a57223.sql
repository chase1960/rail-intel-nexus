
-- ========== ENUMS ==========
CREATE TYPE public.intel_category AS ENUM ('policy','competitor','sentiment');
CREATE TYPE public.authority_level AS ENUM ('S','A','B','C','D');
CREATE TYPE public.access_mode AS ENUM ('public_web','public_api','oauth_api','login_manual','internal_connector','file_import','external_collection_service');
CREATE TYPE public.connection_status AS ENUM ('unconfigured','testing','connected','degraded','auth_required','login_required','blocked','failed','disabled');
CREATE TYPE public.data_origin AS ENUM ('real','sample');
CREATE TYPE public.run_type AS ENUM ('scheduled','manual','retry','upload','browser_capture');
CREATE TYPE public.run_status AS ENUM ('success','failed','running','partial','blocked');
CREATE TYPE public.verification_status AS ENUM ('unverified','verifying','verified_online','verified_snapshot','lead_only','conflict','blocked','obsolete');
CREATE TYPE public.check_result AS ENUM ('passed','warning','blocked','unavailable','requires_manual_review');
CREATE TYPE public.workflow_status AS ENUM ('new','evidence_check','human_review','confirmed','product_review','action_planned','assigned','in_progress','effect_review','closed','watching','invalid_lead');
CREATE TYPE public.risk_level AS ENUM ('P1','P2','P3');
CREATE TYPE public.event_type AS ENUM ('policy_change','competitor_feature','sentiment_hot','complaint_spike','regulatory_risk','product_opportunity');
CREATE TYPE public.relation_type AS ENUM ('supports','conflicts','background','competitor_reference','sentiment_signal');
CREATE TYPE public.impact_level AS ENUM ('none','possible','clear','high');
CREATE TYPE public.product_module AS ENUM ('search','list','price','form','payment','order','aftersale','service','student_zone','child_zone','membership','intl');

-- ========== updated_at trigger ==========
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ========== 1. sources ==========
CREATE TABLE public.sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category public.intel_category NOT NULL,
  source_type text,
  authority_level public.authority_level NOT NULL,
  is_official boolean NOT NULL DEFAULT false,
  canonical_domain text,
  source_url text NOT NULL,
  access_mode public.access_mode NOT NULL DEFAULT 'public_web',
  collection_method text,
  collection_frequency text,
  timezone text NOT NULL DEFAULT 'Asia/Shanghai',
  enabled boolean NOT NULL DEFAULT true,
  connection_status public.connection_status NOT NULL DEFAULT 'unconfigured',
  requires_auth boolean NOT NULL DEFAULT false,
  credential_configured boolean NOT NULL DEFAULT false,
  last_tested_at timestamptz,
  last_success_at timestamptz,
  last_error_code text,
  last_error_message text,
  data_origin public.data_origin NOT NULL DEFAULT 'real',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sources TO authenticated;
GRANT ALL ON public.sources TO service_role;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read sources" ON public.sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write sources" ON public.sources FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_sources_updated BEFORE UPDATE ON public.sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_sources_category ON public.sources(category);
CREATE INDEX idx_sources_status ON public.sources(connection_status);

-- ========== 2. collection_runs ==========
CREATE TABLE public.collection_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  run_type public.run_type NOT NULL DEFAULT 'manual',
  status public.run_status NOT NULL DEFAULT 'running',
  http_status int,
  response_time_ms int,
  redirect_url text,
  raw_item_count int NOT NULL DEFAULT 0,
  valid_item_count int NOT NULL DEFAULT 0,
  duplicate_item_count int NOT NULL DEFAULT 0,
  generated_evidence_count int NOT NULL DEFAULT 0,
  error_code text,
  error_message text,
  log_excerpt text,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_runs TO authenticated;
GRANT ALL ON public.collection_runs TO service_role;
ALTER TABLE public.collection_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read runs" ON public.collection_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write runs" ON public.collection_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_runs_source ON public.collection_runs(source_id, started_at DESC);

-- ========== 3. evidence_items ==========
CREATE TABLE public.evidence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.sources(id) ON DELETE RESTRICT,
  title text NOT NULL,
  author text,
  canonical_url text,
  published_at timestamptz,
  effective_at timestamptz,
  expires_at timestamptz,
  collected_at timestamptz NOT NULL DEFAULT now(),
  last_verified_at timestamptz,
  original_language text DEFAULT 'zh-CN',
  content_text text,
  content_hash text,
  verification_status public.verification_status NOT NULL DEFAULT 'unverified',
  can_be_policy_evidence boolean NOT NULL DEFAULT false,
  verification_reason text,
  requires_login boolean NOT NULL DEFAULT false,
  online_access_status text,
  captured_by uuid,
  data_origin public.data_origin NOT NULL DEFAULT 'real',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_items TO authenticated;
GRANT ALL ON public.evidence_items TO service_role;
ALTER TABLE public.evidence_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read evidence" ON public.evidence_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write evidence" ON public.evidence_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_evidence_updated BEFORE UPDATE ON public.evidence_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_evidence_published ON public.evidence_items(published_at DESC);
CREATE INDEX idx_evidence_collected ON public.evidence_items(collected_at DESC);
CREATE INDEX idx_evidence_source ON public.evidence_items(source_id);
CREATE INDEX idx_evidence_status ON public.evidence_items(verification_status);

-- ========== 4. evidence_versions ==========
CREATE TABLE public.evidence_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id uuid NOT NULL REFERENCES public.evidence_items(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  content_text text,
  content_hash text,
  html_storage_path text,
  screenshot_storage_path text,
  attachment_storage_path text,
  metadata_json jsonb,
  collected_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evidence_id, version_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_versions TO authenticated;
GRANT ALL ON public.evidence_versions TO service_role;
ALTER TABLE public.evidence_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read versions" ON public.evidence_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write versions" ON public.evidence_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_versions_evidence ON public.evidence_versions(evidence_id, version_number DESC);

-- ========== 5. verification_runs ==========
CREATE TABLE public.verification_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id uuid NOT NULL REFERENCES public.evidence_items(id) ON DELETE CASCADE,
  run_at timestamptz NOT NULL DEFAULT now(),
  source_identity_status public.check_result,
  accessibility_status public.check_result,
  metadata_status public.check_result,
  snapshot_status public.check_result,
  content_status public.check_result,
  freshness_status public.check_result,
  corroboration_status public.check_result,
  conflict_status public.check_result,
  human_review_status public.check_result,
  final_result public.check_result,
  blockers text[],
  details_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_runs TO authenticated;
GRANT ALL ON public.verification_runs TO service_role;
ALTER TABLE public.verification_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read vruns" ON public.verification_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write vruns" ON public.verification_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_vruns_evidence ON public.verification_runs(evidence_id, run_at DESC);

-- ========== 6. intelligence_events ==========
CREATE TABLE public.intelligence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  event_type public.event_type NOT NULL,
  summary text,
  first_detected_at timestamptz NOT NULL DEFAULT now(),
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  published_time_start timestamptz,
  published_time_end timestamptz,
  effective_at timestamptz,
  risk_level public.risk_level,
  verification_status public.verification_status NOT NULL DEFAULT 'unverified',
  affected_users text,
  recommended_actions text[],
  owner text,
  workflow_status public.workflow_status NOT NULL DEFAULT 'new',
  reviewer uuid,
  reviewed_at timestamptz,
  review_note text,
  data_origin public.data_origin NOT NULL DEFAULT 'real',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intelligence_events TO authenticated;
GRANT ALL ON public.intelligence_events TO service_role;
ALTER TABLE public.intelligence_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read events" ON public.intelligence_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write events" ON public.intelligence_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.intelligence_events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_events_first_detected ON public.intelligence_events(first_detected_at DESC);
CREATE INDEX idx_events_workflow ON public.intelligence_events(workflow_status);

-- ========== 7. event_evidence ==========
CREATE TABLE public.event_evidence (
  event_id uuid NOT NULL REFERENCES public.intelligence_events(id) ON DELETE CASCADE,
  evidence_id uuid NOT NULL REFERENCES public.evidence_items(id) ON DELETE CASCADE,
  evidence_role text,
  relation_type public.relation_type NOT NULL DEFAULT 'supports',
  added_at timestamptz NOT NULL DEFAULT now(),
  added_by uuid,
  PRIMARY KEY (event_id, evidence_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_evidence TO authenticated;
GRANT ALL ON public.event_evidence TO service_role;
ALTER TABLE public.event_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read ee" ON public.event_evidence FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write ee" ON public.event_evidence FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_ee_evidence ON public.event_evidence(evidence_id);

-- ========== 8. product_impacts ==========
CREATE TABLE public.product_impacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.intelligence_events(id) ON DELETE CASCADE,
  product_module public.product_module NOT NULL,
  impact_level public.impact_level NOT NULL DEFAULT 'possible',
  impact_reason text,
  suggested_action text,
  owner text,
  status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_impacts TO authenticated;
GRANT ALL ON public.product_impacts TO service_role;
ALTER TABLE public.product_impacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read impacts" ON public.product_impacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write impacts" ON public.product_impacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_impacts_updated BEFORE UPDATE ON public.product_impacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_impacts_event ON public.product_impacts(event_id);

-- ========== 9. audit_logs ==========
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  before_json jsonb,
  after_json jsonb,
  actor_id uuid,
  actor_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read audit" ON public.audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX idx_audit_entity ON public.audit_logs(entity_type, entity_id, created_at DESC);

-- ========== 10. reports ==========
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL,
  time_filter_type text NOT NULL DEFAULT 'first_detected_at',
  date_start timestamptz NOT NULL,
  date_end timestamptz NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid,
  content_json jsonb NOT NULL,
  included_event_ids uuid[],
  verification_status text,
  data_origin public.data_origin NOT NULL DEFAULT 'real'
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read reports" ON public.reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write reports" ON public.reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_reports_generated ON public.reports(generated_at DESC);

-- ========== 11. system_test_runs ==========
CREATE TABLE public.system_test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name text NOT NULL,
  component text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  result public.check_result,
  error_summary text,
  details_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_test_runs TO authenticated;
GRANT ALL ON public.system_test_runs TO service_role;
ALTER TABLE public.system_test_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read tests" ON public.system_test_runs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write tests" ON public.system_test_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_tests_started ON public.system_test_runs(started_at DESC);
