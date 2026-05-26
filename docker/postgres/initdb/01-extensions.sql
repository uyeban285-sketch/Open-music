-- Включаем расширения, которые требуются Open Music (см. design.md).
-- Запускается автоматически при первой инициализации тома postgres-data.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;
