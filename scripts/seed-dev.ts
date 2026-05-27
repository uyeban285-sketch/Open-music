/**
 * seed-dev.ts — Dev database seeder for Open Music
 *
 * Usage:
 *   pnpm db:seed:dev
 *
 * Requires DATABASE_URL env variable (see .env.example).
 * Safe to run multiple times — uses ON CONFLICT DO NOTHING.
 * If tables don't exist yet (Prisma migrations not run), exits with code 0.
 */

import { Client } from 'pg';

// ---------------------------------------------------------------------------
// Fixed UUIDs — guarantees idempotency across multiple runs
// ---------------------------------------------------------------------------
const ADMIN_ID = '00000000-0000-0000-0000-000000000001';
const LISTENER_ID = '00000000-0000-0000-0000-000000000002';

const SEED_USERS = [
  {
    id: ADMIN_ID,
    email: 'admin@openmusic.dev',
    role: 'admin',
    mfa_enabled: false,
    password_hash: 'seed-placeholder-not-for-prod',
  },
  {
    id: LISTENER_ID,
    email: 'listener@openmusic.dev',
    role: 'listener',
    mfa_enabled: false,
    password_hash: 'seed-placeholder-not-for-prod',
  },
] as const;

const SEED_FEATURE_FLAGS = [
  {
    key: 'ai_recommendations',
    description: 'AI-based recommendations (Phase 2)',
    enabled: false,
    rollout_percentage: 0,
  },
  {
    key: 'semantic_search',
    description: 'Semantic search via embeddings (Phase 2)',
    enabled: false,
    rollout_percentage: 0,
  },
  {
    key: 'local_ai',
    description: 'Local AI support via Ollama (Phase 3)',
    enabled: false,
    rollout_percentage: 0,
  },
  {
    key: 'collaborative_playlists',
    description: 'Collaborative playlists (Phase 4)',
    enabled: false,
    rollout_percentage: 0,
  },
  {
    key: 'offline_mode',
    description: 'Offline / Limited mode (Phase 4)',
    enabled: false,
    rollout_percentage: 0,
  },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function log(msg: string): void {
  console.info(`[seed-dev] ${msg}`);
}

function warn(msg: string): void {
  console.warn(`[seed-dev] ⚠  ${msg}`);
}

async function tableExists(client: Client, tableName: string): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name   = $1
     ) AS exists`,
    [tableName],
  );
  return result.rows[0]?.exists === true;
}

// ---------------------------------------------------------------------------
// Seed functions
// ---------------------------------------------------------------------------
async function seedUsers(client: Client): Promise<void> {
  if (!(await tableExists(client, 'users'))) {
    warn(
      'Table "users" does not exist. Run `pnpm prisma migrate dev` first, then re-run the seed.',
    );
    return;
  }

  log('Seeding users…');
  for (const user of SEED_USERS) {
    await client.query(
      `INSERT INTO users (id, email, role, mfa_enabled, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [user.id, user.email, user.role, user.mfa_enabled, user.password_hash],
    );
    log(`  ✔ user ${user.email} (${user.role})`);
  }
}

async function seedFeatureFlags(client: Client): Promise<void> {
  if (!(await tableExists(client, 'feature_flags'))) {
    warn(
      'Table "feature_flags" does not exist. Run `pnpm prisma migrate dev` first, then re-run the seed.',
    );
    return;
  }

  log('Seeding feature flags…');
  for (const flag of SEED_FEATURE_FLAGS) {
    await client.query(
      `INSERT INTO feature_flags (key, description, enabled, rollout_percentage, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (key) DO NOTHING`,
      [flag.key, flag.description, flag.enabled, flag.rollout_percentage],
    );
    log(`  ✔ flag "${flag.key}" (enabled=${String(flag.enabled)})`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    console.error('[seed-dev] ✖  DATABASE_URL env variable is not set. Aborting.');
    process.exit(1);
  }

  log(`Connecting to database…`);
  const client = new Client({ connectionString });

  try {
    await client.connect();
    log('Connected.');

    await seedUsers(client);
    await seedFeatureFlags(client);

    log('✅ Seed complete.');
  } catch (err) {
    console.error('[seed-dev] ✖  Unexpected error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

void main();
