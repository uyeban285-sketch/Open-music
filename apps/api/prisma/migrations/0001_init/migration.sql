-- Enable extensions (already done in docker initdb, but ensure idempotent)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Enums
CREATE TYPE "UserRole" AS ENUM ('listener', 'enthusiast', 'power_user', 'admin');
CREATE TYPE "AuditAction" AS ENUM (
  'login_success', 'login_failure', 'mfa_enrolled', 'mfa_verified',
  'token_issued', 'token_revoked', 'data_exported', 'data_deleted',
  'cross_tenant_attempt', 'admin_action'
);

-- Users
CREATE TABLE "users" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "email"         CITEXT      NOT NULL,
  "password_hash" TEXT,
  "sso_provider"  TEXT,
  "role"          "UserRole"  NOT NULL DEFAULT 'listener',
  "mfa_enabled"   BOOLEAN     NOT NULL DEFAULT false,
  "mfa_secret"    TEXT,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deleted_at"    TIMESTAMPTZ,
  "version"       INTEGER     NOT NULL DEFAULT 0,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- Row Level Security for users
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_rls" ON "users"
  USING ("id"::text = current_setting('app.user_id', true));

-- Privacy Settings
CREATE TABLE "privacy_settings" (
  "user_id"                   UUID    NOT NULL,
  "use_history_for_reco"      BOOLEAN NOT NULL DEFAULT true,
  "use_cloud_ai"              BOOLEAN NOT NULL DEFAULT true,
  "product_analytics_enabled" BOOLEAN NOT NULL DEFAULT true,
  "marketing_notifications"   BOOLEAN NOT NULL DEFAULT false,
  "disabled_signal_sources"   TEXT[]  NOT NULL DEFAULT '{}',
  "private_mode_default"      BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "privacy_settings_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "privacy_settings_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "users"("id") ON DELETE CASCADE
);
ALTER TABLE "privacy_settings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "privacy_settings_rls" ON "privacy_settings"
  USING ("user_id"::text = current_setting('app.user_id', true));

-- Audit Logs (append-only, NO RLS — admin reads all)
CREATE TABLE "audit_logs" (
  "id"          UUID            NOT NULL DEFAULT gen_random_uuid(),
  "user_id"     UUID,
  "action"      "AuditAction"   NOT NULL,
  "resource"    TEXT,
  "ip_address"  TEXT,
  "user_agent"  TEXT,
  "metadata"    JSONB,
  "created_at"  TIMESTAMPTZ     NOT NULL DEFAULT now(),
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "users"("id") ON DELETE SET NULL
);
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at" DESC);
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- Prisma migrations table
INSERT INTO "_prisma_migrations" VALUES (
  '0001_init',
  now(),
  1,
  '0001_init',
  NULL,
  0,
  now()
) ON CONFLICT DO NOTHING;
