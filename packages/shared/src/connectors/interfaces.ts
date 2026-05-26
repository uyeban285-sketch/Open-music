import type {
  ConnectorCtx,
  ConnectorId,
  ConnectorManifest,
  ExternalPlaylist,
  ExternalTrack,
  Lyrics,
  Page,
  PlaybackHandle,
  TokenBundle,
} from './types';

export interface MusicConnector {
  readonly manifest: ConnectorManifest;

  startAuth(userId: string): Promise<{ redirectUrl: string; state: string }>;
  handleCallback(state: string, params: Record<string, string>): Promise<TokenBundle>;
  refresh(token: TokenBundle): Promise<TokenBundle>;
  revoke(token: TokenBundle): Promise<void>;

  listPlaylists(ctx: ConnectorCtx, cursor?: string): Promise<Page<ExternalPlaylist>>;
  listLikedTracks(ctx: ConnectorCtx, cursor?: string): Promise<Page<ExternalTrack>>;
  listRecentlyPlayed(ctx: ConnectorCtx, cursor?: string): Promise<Page<ExternalTrack>>;

  getTrack(ctx: ConnectorCtx, externalId: string): Promise<ExternalTrack | null>;
  getDeepLink(externalId: string): string;

  getPlaybackHandle?(ctx: ConnectorCtx, externalId: string): Promise<PlaybackHandle>;
  getLyrics?(ctx: ConnectorCtx, externalId: string): Promise<Lyrics | null>;
}

export interface ConnectorRegistry {
  register(connector: MusicConnector): void;
  get(id: ConnectorId): MusicConnector | undefined;
  list(): ConnectorManifest[];
  has(id: ConnectorId): boolean;
}
