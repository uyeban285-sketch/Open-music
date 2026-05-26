import { ApiError } from '@open-music/shared';
import type { ProblemDetails } from '@open-music/shared';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  accessToken?: string;
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { body, accessToken, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((customHeaders as Record<string, string>) ?? {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let problemDetails: ProblemDetails;
    try {
      problemDetails = (await response.json()) as ProblemDetails;
    } catch {
      problemDetails = {
        type: 'about:blank',
        title: response.statusText,
        status: response.status,
        detail: `Request to ${path} failed with status ${response.status}`,
      };
    }
    throw new ApiError(response.status, problemDetails.type, problemDetails);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const authApi = {
  login(email: string, password: string) {
    return apiFetch<{ accessToken: string; refreshToken: string }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  register(email: string, password: string, displayName: string) {
    return apiFetch<{ accessToken: string; refreshToken: string }>('/api/auth/register', {
      method: 'POST',
      body: { email, password, displayName },
    });
  },

  refresh(refreshToken: string) {
    return apiFetch<{ accessToken: string; refreshToken: string }>('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
  },

  logout(refreshToken: string, accessToken: string) {
    return apiFetch<void>('/api/auth/logout', {
      method: 'POST',
      body: { refreshToken },
      accessToken,
    });
  },

  me(accessToken: string) {
    return apiFetch<{
      id: string;
      email: string;
      displayName: string;
      role: 'listener' | 'enthusiast' | 'power_user' | 'admin';
      avatarUrl: string | null;
    }>('/api/auth/me', {
      method: 'GET',
      accessToken,
    });
  },
};
