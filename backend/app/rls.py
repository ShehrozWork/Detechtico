from sqlalchemy import text
from sqlalchemy.engine import Engine

RLS_STATEMENTS = [
    """
    ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
    ALTER TABLE documents FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS documents_owner ON documents;
    CREATE POLICY documents_owner ON documents
      USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
      WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
    """,
    """
    ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE analysis_jobs FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS analysis_jobs_owner ON analysis_jobs;
    CREATE POLICY analysis_jobs_owner ON analysis_jobs
      USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
      WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
    """,
    """
    ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE findings FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS findings_owner ON findings;
    CREATE POLICY findings_owner ON findings
      USING (
        EXISTS (
          SELECT 1 FROM analysis_jobs j
          WHERE j.id = findings.job_id
            AND j.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM analysis_jobs j
          WHERE j.id = findings.job_id
            AND j.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        )
      );
    """,
    """
    ALTER TABLE imported_transactions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE imported_transactions FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS imported_transactions_owner ON imported_transactions;
    CREATE POLICY imported_transactions_owner ON imported_transactions
      USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
      WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
    """,
    """
    ALTER TABLE user_risk_settings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE user_risk_settings FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS user_risk_settings_owner ON user_risk_settings;
    CREATE POLICY user_risk_settings_owner ON user_risk_settings
      USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
      WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
    """,
    """
    ALTER TABLE finding_dispositions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE finding_dispositions FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS finding_dispositions_owner ON finding_dispositions;
    CREATE POLICY finding_dispositions_owner ON finding_dispositions
      USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
      WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
    """,
    """
    ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS subscriptions_owner ON subscriptions;
    CREATE POLICY subscriptions_owner ON subscriptions
      USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
      WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
    """,
    """
    ALTER TABLE staff_totp_secrets ENABLE ROW LEVEL SECURITY;
    ALTER TABLE staff_totp_secrets FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS staff_totp_secrets_owner ON staff_totp_secrets;
    CREATE POLICY staff_totp_secrets_owner ON staff_totp_secrets
      USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
      WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
    """,
    """
    ALTER TABLE comp_entitlements ENABLE ROW LEVEL SECURITY;
    ALTER TABLE comp_entitlements FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS comp_entitlements_owner_read ON comp_entitlements;
    CREATE POLICY comp_entitlements_owner_read ON comp_entitlements
      FOR SELECT
      USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid);
    """,
    """
    ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE admin_audit_logs FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS admin_audit_logs_deny ON admin_audit_logs;
    """,
    """
    ALTER TABLE document_reveal_grants ENABLE ROW LEVEL SECURITY;
    ALTER TABLE document_reveal_grants FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS document_reveal_grants_deny ON document_reveal_grants;
    """,
    """
    ALTER TABLE llm_usage_events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE llm_usage_events FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS llm_usage_events_deny ON llm_usage_events;
    """,
]


def apply_rls(engine: Engine) -> None:
    with engine.begin() as conn:
        for statement in RLS_STATEMENTS:
            conn.execute(text(statement))
