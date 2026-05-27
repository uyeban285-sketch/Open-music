export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  library: {
    tracks: (cursor?: string) => ['library', 'tracks', cursor] as const,
    track: (id: string) => ['library', 'track', id] as const,
    playlists: ['library', 'playlists'] as const,
  },
  settings: {
    all: ['settings'] as const,
    privacy: ['settings', 'privacy'] as const,
  },
} as const;
