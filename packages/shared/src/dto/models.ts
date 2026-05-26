import type { ConnectorId } from '../connectors/types';

export interface InternalTrack {
  id: string;
  externalRefs: Array<{ connectorId: ConnectorId; externalId: string }>;
  canonicalTitle: string;
  canonicalArtist: string;
  album: string | null;
  duration: number;
  coverUrl: string | null;
  genres: string[];
  isrc: string | null;
  availability: Record<string, 'available' | 'unavailable' | 'unknown'>;
  explicit: boolean;
  isLive: boolean;
  audioFeatures?: {
    tempo: number;
    energy: number;
    valence: number;
    danceability: number;
    acousticness: number;
    instrumentalness: number;
  };
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Album {
  id: string;
  name: string;
  artistId: string;
  coverUrl: string | null;
  releaseDate: string | null;
  trackCount: number;
  genres: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Artist {
  id: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Playlist {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  isPublic: boolean;
  trackIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchDecision {
  trackA: string;
  trackB: string;
  confidence: number;
  status: 'matched' | 'rejected' | 'pending';
  decidedBy: 'ai' | 'user' | 'system';
  decidedAt: Date;
}

export interface ListeningEvent {
  id: string;
  userId: string;
  trackId: string;
  connectorId: ConnectorId;
  startedAt: Date;
  endedAt: Date | null;
  durationMs: number;
  context: string | null;
}

export interface PlaybackSession {
  id: string;
  userId: string;
  trackId: string;
  connectorId: ConnectorId;
  startedAt: Date;
  endedAt: Date | null;
  positionMs: number;
  status: 'playing' | 'paused' | 'stopped';
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'listener' | 'enthusiast' | 'power_user' | 'admin';
  avatarUrl: string | null;
  mfaEnabled: boolean;
  createdAt: Date;
}

export interface PrivacySetting {
  userId: string;
  shareListeningHistory: boolean;
  shareLibrary: boolean;
  allowRecommendations: boolean;
  dataRetentionDays: number;
}

export interface Recommendation {
  id: string;
  userId: string;
  trackId: string;
  source: string;
  score: number;
  reason: string | null;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface AIProfile {
  userId: string;
  moodClusters: string[];
  topGenres: string[];
  listeningPatterns: Record<string, number>;
  updatedAt: Date;
}

export interface MoodCluster {
  id: string;
  name: string;
  description: string | null;
  centroid: number[];
  trackCount: number;
}

export interface SyncJob {
  id: string;
  userId: string;
  connectorId: ConnectorId;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  type: 'full' | 'incremental';
  progress: number;
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: Date;
}

export interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description: string | null;
  targetRoles: string[];
  createdAt: Date;
  updatedAt: Date;
}
