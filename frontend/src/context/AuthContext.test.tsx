import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

const TEST_PASSWORD = 'test-passwort';

const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  (window as any).__BIBLESCRAPER_API_KEY__ = undefined;
});

describe('AuthContext', () => {
  it('meldet an, wenn der Server die Zugangsdaten annimmt, und übernimmt dessen Schlüssel', async () => {
    const fetchMock = mockFetch(200, { success: true, data: { username: 'Simon', api_key: 'server-key' } });
    const { result } = renderHook(() => useAuth(), { wrapper });

    let success = false;
    await act(async () => {
      success = await result.current.login('Simon', TEST_PASSWORD);
    });

    expect(success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8374/admin.php?action=login');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ username: 'Simon', password: TEST_PASSWORD });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual({ username: 'Simon', apiKey: 'server-key' });
    expect((window as any).__BIBLESCRAPER_API_KEY__).toBe('server-key');
  });

  it('bleibt abgemeldet, wenn der Server die Zugangsdaten ablehnt', async () => {
    mockFetch(401, { success: false, error: 'Invalid credentials' });
    const { result } = renderHook(() => useAuth(), { wrapper });

    let success = true;
    await act(async () => {
      success = await result.current.login('Simon', 'falsch');
    });

    expect(success).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('biblescraper_user')).toBeNull();
    expect((window as any).__BIBLESCRAPER_API_KEY__).toBeUndefined();
  });

  it('bleibt abgemeldet, wenn der Server nicht erreichbar ist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useAuth(), { wrapper });

    let success = true;
    await act(async () => {
      success = await result.current.login('Simon', TEST_PASSWORD);
    });

    expect(success).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('setzt nach dem Neuladen den gespeicherten Schlüssel wieder für die API', async () => {
    localStorage.setItem('biblescraper_user', JSON.stringify({ username: 'Simon', apiKey: 'gespeichert' }));
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect((window as any).__BIBLESCRAPER_API_KEY__).toBe('gespeichert');
  });
});
