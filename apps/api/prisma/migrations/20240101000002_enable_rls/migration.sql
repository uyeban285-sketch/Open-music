-- Row Level Security policies for tenant isolation
-- All user-owned tables enforce that rows are only accessible when
-- current_setting('app.user_id') matches the row's user_id column.
-- The RLS middleware (apps/api/src/common/middleware/rls.middleware.ts)
-- sets this per-transaction via SET LOCAL.

-- Create application role without RLS bypass
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN;
  END IF;
END $$;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

-- Tables with direct user_id column:
-- users, connected_services, playlists, likes, playback_sessions,
-- device_sessions, listening_events, notifications, privacy_settings

-- Enable RLS on user-owned tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE playback_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tables with direct user_id
CREATE POLICY tenant_isolation_users ON users
  USING (id = current_setting('app.user_id', true)::uuid);

CREATE POLICY tenant_isolation_connected_services ON connected_services
  USING (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY tenant_isolation_playlists ON playlists
  USING (user_id = current_setting('app.user_id', true)::uuid);

-- playlist_tracks: accessible if the parent playlist belongs to the user
CREATE POLICY tenant_isolation_playlist_tracks ON playlist_tracks
  USING (playlist_id IN (
    SELECT id FROM playlists WHERE user_id = current_setting('app.user_id', true)::uuid
  ));

CREATE POLICY tenant_isolation_likes ON likes
  USING (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY tenant_isolation_playback_sessions ON playback_sessions
  USING (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY tenant_isolation_device_sessions ON device_sessions
  USING (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY tenant_isolation_listening_events ON listening_events
  USING (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY tenant_isolation_notifications ON notifications
  USING (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY tenant_isolation_privacy_settings ON privacy_settings
  USING (user_id = current_setting('app.user_id', true)::uuid);

-- NOTE: The following tables do NOT have RLS:
-- tracks, albums, artists, track_external_refs, match_decisions - these are shared catalog data
-- sync_jobs - accessed through connected_services (service-layer checks)
-- audit_logs - admin-only access (service-layer checks)
-- feature_flags - system-wide, no user ownership
