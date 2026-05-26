-- Включаем расширения, которые требуются Open Music (см. design.md).
-- Запускается автоматически при первой инициализации тома postgres-data.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- Row Level Security (RLS) is configured via Prisma migration
-- (apps/api/prisma/migrations/20240101000002_enable_rls/migration.sql)
-- and enforced at runtime by the RLS middleware (SET LOCAL app.user_id).
