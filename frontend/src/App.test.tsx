import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

afterEach(() => vi.unstubAllGlobals());

// Prüft zugleich, dass Router und Auth-Kontext beim Start zusammenspielen.
describe('App', () => {
  it('rendert den Login, solange niemand angemeldet ist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ success: false }) }));
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Ketiv' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Benutzername/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Anmelden/i })).toBeInTheDocument();
  });
});
