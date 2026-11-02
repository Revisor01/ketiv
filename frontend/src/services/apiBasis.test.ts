import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Der Bau setzt REACT_APP_API_URL; ohne /api fragte die Startseite die Domain-Wurzel ab.
describe('API-Adresse beim Bau', () => {
  const workflow = readFileSync(resolve(__dirname, '../../../.github/workflows/build-frontend.yml'), 'utf8');
  const zeile = workflow.split('\n').find((z) => z.includes('REACT_APP_API_URL='));

  it('setzt keine feste Adresse ohne /api', () => {
    expect(zeile).toContain('REACT_APP_API_URL=');
    const fest = /\|\|\s*'([^']*)'/.exec(zeile ?? '')?.[1];
    expect(fest === undefined || fest.endsWith('/api')).toBe(true);
  });
});
