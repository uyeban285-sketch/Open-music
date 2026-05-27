/** Branded string type for connector identifiers */
export type ConnectorId = string & { readonly __brand: 'ConnectorId' };

export enum ConnectionStatus {
  Connected = 'Connected',
  Disconnected = 'Disconnected',
  Error = 'Error',
  Token_Expired = 'Token_Expired',
  Reauth_Required = 'Reauth_Required',
}

export interface ConnectorManifest {
  id: ConnectorId;
  name: string;
  description: string;
  icon: string;
  authMethod: 'oauth2' | 'api_key' | 'file_import';
  capabilities: {
    directPlayback: boolean;
    isrcAvailable: boolean;
    lyrics: boolean;
  };
  rateLimits: {
    requestsPerMinute: number;
  };
}

export interface ExternalTrack {
  externalId: string;
  connectorId: ConnectorId;
  title: string;
  artist: string;
  album: string | null;
  duration: number;
  coverUrl: string | null;
  isrc: string | null;
  availability: 'available' | 'unavailable' | 'unknown';
  explicit: boolean;
  isLive: boolean;
  genre: string | null;
}

export interface ExternalPlaylist {
  externalId: string;
  connectorId: ConnectorId;
  name: string;
  owner: string;
  trackCount: number;
  coverUrl: string | null;
}

export interface TokenBundle {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  scope: string | null;
}

export interface Page<T> {
  items: T[];
  cursor: string | null;
  hasMore: boolean;
  total: number | null;
}

export interface ConnectorCtx {
  userId: string;
  connectionId: string;
  tokens: TokenBundle;
}

export interface PlaybackHandle {
  streamUrl: string;
  format: string;
  expiresAt: Date;
}

export interface Lyrics {
  lines: Array<{ text: string; startMs: number; endMs: number }>;
}
