import { z } from 'zod';

export const internalTrackSchema = z.object({
  id: z.string().uuid(),
  externalRefs: z.array(
    z.object({
      connectorId: z.string(),
      externalId: z.string(),
    }),
  ),
  canonicalTitle: z.string(),
  canonicalArtist: z.string(),
  album: z.string().nullable(),
  duration: z.number().nonnegative(),
  coverUrl: z.string().url().nullable(),
  genres: z.array(z.string()),
  isrc: z.string().nullable(),
  availability: z.record(z.string(), z.enum(['available', 'unavailable', 'unknown'])),
  explicit: z.boolean(),
  isLive: z.boolean(),
  audioFeatures: z
    .object({
      tempo: z.number(),
      energy: z.number(),
      valence: z.number(),
      danceability: z.number(),
      acousticness: z.number(),
      instrumentalness: z.number(),
    })
    .optional(),
  embedding: z.array(z.number()).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type InternalTrackSchema = z.infer<typeof internalTrackSchema>;

export const albumSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  artistId: z.string().uuid(),
  coverUrl: z.string().url().nullable(),
  releaseDate: z.string().nullable(),
  trackCount: z.number().int().nonnegative(),
  genres: z.array(z.string()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type AlbumSchema = z.infer<typeof albumSchema>;

export const artistSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  imageUrl: z.string().url().nullable(),
  genres: z.array(z.string()),
  bio: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ArtistSchema = z.infer<typeof artistSchema>;

export const playlistSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  coverUrl: z.string().url().nullable(),
  isPublic: z.boolean(),
  trackIds: z.array(z.string().uuid()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type PlaylistSchema = z.infer<typeof playlistSchema>;

export const matchDecisionSchema = z.object({
  trackA: z.string().uuid(),
  trackB: z.string().uuid(),
  confidence: z.number().min(0).max(1),
  status: z.enum(['matched', 'rejected', 'pending']),
  decidedBy: z.enum(['ai', 'user', 'system']),
  decidedAt: z.coerce.date(),
});

export type MatchDecisionSchema = z.infer<typeof matchDecisionSchema>;

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  role: z.enum(['user', 'admin']),
  avatarUrl: z.string().url().nullable(),
  mfaEnabled: z.boolean(),
  createdAt: z.coerce.date(),
});

export type UserSchema = z.infer<typeof userSchema>;

export const syncJobSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  connectorId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']),
  type: z.enum(['full', 'incremental']),
  progress: z.number().min(0).max(100),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
  error: z.string().nullable(),
});

export type SyncJobSchema = z.infer<typeof syncJobSchema>;

export const notificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  read: z.boolean(),
  createdAt: z.coerce.date(),
});

export type NotificationSchema = z.infer<typeof notificationSchema>;

export const featureFlagSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  enabled: z.boolean(),
  description: z.string().nullable(),
  targetRoles: z.array(z.string()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type FeatureFlagSchema = z.infer<typeof featureFlagSchema>;
