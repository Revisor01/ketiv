import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

const TEST_PASSWORD = 'test-passwort';

const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;

function antwort(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

// Erste Antwort gilt der Sitzungsabfrage beim Start, die weiteren den folgenden Aufrufen.
function mockFetch(...antworten: Array<[number, unknown]>) {
  const fetchMock = vi.fn();
  for (const [status, body] of antworten) {
    fetchMock.mockResolvedValueOnce(antwort(status, body));
  }
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const OHNE_SITZUNG: [number, unknown] = [401, { success: false }];

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('AuthContext', () => {
  it('meldet an, wenn der Server die Zugangsdaten annimmt, und hält keinen Schlüssel im Browser', async () => {
    const fetchMock = mockFetch(OHNE_SITZUNG, [200, { success: true, data: { username: 'Simon' } }]);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.checking).toBe(false));

    let success = false;
    await act(async () => {
      success = await result.current.login('Simon', TEST_PASSWORD);
    });

    expect(success).toBe(true);
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('http://localhost:8374/admin.php?action=login');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(JSON.parse(init.body)).toEqual({ username: 'Simon', password: TEST_PASSWORD });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual({ username: 'Simon' });
    expect(localStorage.length).toBe(0);
  });

  it('bleibt abgemeldet, wenn der Server die Zugangsdaten ablehnt', async () => {
    mockFetch(OHNE_SITZUNG, [401, { success: false, error: 'Invalid credentials' }]);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.checking).toBe(false));

    let success = true;
    await act(async () => {
      success = await result.current.login('Simon', 'falsch');
    });

    expect(success).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('bleibt abgemeldet, wenn der Server nicht erreichbar ist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.checking).toBe(false));

    let success = true;
    await act(async () => {
      success = await result.current.login('Simon', TEST_PASSWORD);
    });

    expect(success).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('übernimmt nach dem Neuladen die bestehende Sitzung vom Server', async () => {
    const fetchMock = mockFetch([200, { success: true, data: { username: 'Simon' } }]);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user).toEqual({ username: 'Simon' });
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8374/admin.php?action=session');
  });

  it('löscht einen früher im Browser gespeicherten Schlüssel', async () => {
    localStorage.setItem('biblescraper_user', JSON.stringify({ username: 'Simon', apiKey: 'alt' }));
    mockFetch(OHNE_SITZUNG);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(localStorage.getItem('biblescraper_user')).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('meldet beim Server ab', async () => {
    const fetchMock = mockFetch([200, { success: true, data: { username: 'Simon' } }], [200, { success: true }]);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.logout();
    });

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('http://localhost:8374/admin.php?action=logout');
    expect(init.method).toBe('POST');
    expect(result.current.isAuthenticated).toBe(false);
  });
});
