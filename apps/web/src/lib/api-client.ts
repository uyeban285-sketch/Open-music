import type { ProblemDetails } from '@open-music/shared';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly problem: ProblemDetails,
    public readonly status: number,
  ) {
    super(problem.detail ?? problem.title);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let problem: ProblemDetails;
    try {
      problem = (await res.json()) as ProblemDetails;
    } catch {
      problem = {
        title: res.statusText || 'Unknown error',
        status: res.status,
      };
    }
    throw new ApiError(problem, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  token?: string;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, token, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return handleResponse<T>(res);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface RegisterDto {
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface MeResponse {
  id: string;
  email: string;
  role: string;
  mfaEnabled: boolean;
}

export const authApi = {
  register: (dto: RegisterDto) =>
    apiRequest<{ id: string; email: string }>('/auth/register', {
      method: 'POST',
      body: dto,
    }),

  login: (dto: LoginDto) =>
    apiRequest<AuthTokens>('/auth/login', {
      method: 'POST',
      body: dto,
    }),

  refresh: () => apiRequest<AuthTokens>('/auth/refresh', { method: 'POST' }),

  logout: (token: string) => apiRequest<void>('/auth/logout', { method: 'POST', token }),

  me: (token: string) => apiRequest<MeResponse>('/auth/me', { method: 'GET', token }),
};

// ─── Library ──────────────────────────────────────────────────────────────────

export interface TrackDto {
  id: string;
  canonicalTitle: string;
  canonicalArtists: string[];
  durationMs: number;
  coverUrl?: string;
  explicit: boolean;
  availability: Record<string, string>;
}

export interface PageResponse<T> {
  data: T[];
  nextCursor?: string;
  total?: number;
}

export const libraryApi = {
  getTracks: (token: string, cursor?: string) =>
    apiRequest<PageResponse<TrackDto>>(`/library/tracks${cursor ? `?cursor=${cursor}` : ''}`, {
      token,
    }),

  getTrack: (id: string, token: string) => apiRequest<TrackDto>(`/library/tracks/${id}`, { token }),

  getPlaylists: (token: string) =>
    apiRequest<PageResponse<{ id: string; name: string; trackCount: number }>>(
      '/library/playlists',
      { token },
    ),
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settingsApi = {
  get: (token: string) => apiRequest<Record<string, unknown>>('/settings', { token }),

  patch: (token: string, data: Record<string, unknown>) =>
    apiRequest<void>('/settings', { method: 'PATCH', token, body: data }),

  getPrivacy: (token: string) =>
    apiRequest<Record<string, unknown>>('/settings/privacy', { token }),

  patchPrivacy: (token: string, data: Record<string, unknown>) =>
    apiRequest<void>('/settings/privacy', { method: 'PATCH', token, body: data }),
};
