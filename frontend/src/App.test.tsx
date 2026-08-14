import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Ohne gespeicherte Anmeldung zeigt die App den Login. Der Test prüft damit
// zugleich, dass Router und Auth-Kontext beim Start fehlerfrei zusammenspielen.
describe('App', () => {
  it('rendert den Login, solange niemand angemeldet ist', () => {
    localStorage.clear();
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Ketiv' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Benutzername/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Anmelden/i })).toBeInTheDocument();
  });
});
