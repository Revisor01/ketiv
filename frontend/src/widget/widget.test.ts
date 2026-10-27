import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Das Widget wird als einzelne Datei ausgeliefert; der Test lädt genau diese Datei.
const quelltext = readFileSync(resolve(__dirname, '../../public/widget.js'), 'utf8');

// Antwortform von GET /api/v1/tageslosung (Stand 27.10.2026).
const antwort = {
  success: true,
  data: {
    date: '2026-10-27',
    formatted_date: 'Dienstag, 27. Oktober 2026',
    weekday: 'Dienstag',
    holiday: null,
    losung: {
      text: 'Steh auf, Gott, richte die Erde, denn dein Eigentum sind die Nationen alle.',
      reference: 'Psalm 82,8',
      bibleserver_url: 'https://www.bibleserver.com/LUT/Psalm82%2C8',
    },
    lehrtext: {
      text: 'Jesus spricht: Ich bin bei euch alle Tage bis an der Welt Ende, und siehe, ich bin bei euch.',
      reference: 'Matthäus 28,20',
      bibleserver_url: 'https://www.bibleserver.com/LUT/Matthaeus28%2C20',
    },
    translation: { code: 'LUT', name: 'Lutherbibel, revidiert 2017', copyright: '© 2016 Deutsche Bibelgesellschaft, Stuttgart' },
    quelle: {
      name: 'Die Losungen',
      copyright: '© Evangelische Brüder-Unität – Herrnhuter Brüdergemeine',
      copyright_url: 'https://www.herrnhuter.de',
      info_text: 'Weitere Informationen finden Sie hier.',
      info_url: 'https://www.losungen.de',
    },
  },
};

type KetivFenster = Window & { KetivLosung: { aktualisieren: () => Promise<unknown> } };

function antwortMit(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

async function starten(html: string) {
  document.body.innerHTML = html;
  new Function(quelltext)();
  await (window as unknown as KetivFenster).KetivLosung.aktualisieren();
}

function karte(auswahl = '.ketiv-losung') {
  const wurzel = document.querySelector(auswahl)!.shadowRoot!;
  return wurzel.querySelector('.karte') as HTMLElement;
}

describe('Ketiv-Widget', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-27T13:00:00Z'));
    window.localStorage.clear();
    document.head.innerHTML = '';
    fetchMock = vi.fn(() => antwortMit(antwort));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('zeigt standardmäßig Losung und Lehrtext mit Quellenangabe', async () => {
    await starten('<div class="ketiv-losung"></div>');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://ketiv.de/api/v1/tageslosung?translation=LUT');
    const k = karte();
    const verse = k.querySelectorAll('blockquote');
    expect(verse).toHaveLength(2);
    expect(verse[0].textContent).toBe(antwort.data.losung.text);
    expect(verse[1].textContent).toBe(antwort.data.lehrtext.text);
    expect(k.getAttribute('lang')).toBe('de');
    expect(k.classList.contains('klickbar')).toBe(false);

    const quelle = k.querySelector('.quelle')!;
    expect(quelle.textContent).toBe(
      'Die Losungen · © Evangelische Brüder-Unität – Herrnhuter Brüdergemeine · Weitere Informationen finden Sie hier.' +
        'Bibeltext: Lutherbibel, revidiert 2017, © 2016 Deutsche Bibelgesellschaft, Stuttgart',
    );
    const links = Array.from(quelle.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['https://www.herrnhuter.de', 'https://www.losungen.de']);
  });

  it('wählt bei „kuerzer“ den kürzeren Vers und verlinkt ihn zu bibleserver', async () => {
    await starten('<div class="ketiv-losung" data-translation="BIGS" data-auswahl="kuerzer"></div>');
    expect(fetchMock.mock.calls[0][0]).toBe('https://ketiv.de/api/v1/tageslosung?translation=BIGS');
    const k = karte();
    expect(k.querySelectorAll('blockquote')).toHaveLength(1);
    expect(k.querySelector('blockquote')!.textContent).toBe(antwort.data.losung.text);
    const stelle = k.querySelector('a.stelle') as HTMLAnchorElement;
    expect(stelle.textContent).toBe('Psalm 82,8');
    expect(stelle.getAttribute('href')).toBe('https://www.bibleserver.com/LUT/Psalm82%2C8');
    expect(stelle.getAttribute('target')).toBe('_blank');
    expect(stelle.getAttribute('rel')).toBe('noopener');
    expect(stelle.getAttribute('aria-label')).toBe('Psalm 82,8 bei bibleserver lesen (neues Fenster)');
    expect(k.classList.contains('klickbar')).toBe(true);
  });

  it('zeigt bei „lehrtext“ nur den Lehrtext', async () => {
    await starten('<div class="ketiv-losung" data-auswahl="lehrtext"></div>');
    const verse = karte().querySelectorAll('blockquote');
    expect(verse).toHaveLength(1);
    expect(verse[0].textContent).toBe(antwort.data.lehrtext.text);
  });

  it('lädt für mehrere Widgets und einen zweiten Seitenaufruf am selben Tag nur einmal', async () => {
    await starten('<div class="ketiv-losung"></div><div class="ketiv-losung" data-auswahl="losung"></div>');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await starten('<div class="ketiv-losung"></div>');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(karte().querySelectorAll('blockquote')).toHaveLength(2);
  });

  it('lädt am nächsten Tag neu und räumt den alten Eintrag weg', async () => {
    await starten('<div class="ketiv-losung"></div>');
    vi.setSystemTime(new Date('2026-10-27T23:30:00Z'));
    await starten('<div class="ketiv-losung"></div>');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(Object.keys(window.localStorage)).toEqual(['ketiv-losung:v1:https://ketiv.de:LUT:2026-10-28']);
  });

  it('zeigt einen Fehlerzustand, wenn die API nicht antwortet', async () => {
    fetchMock.mockImplementation(() => antwortMit({ success: false, error: 'Unbekannte Übersetzung.' }, 400));
    await starten('<div class="ketiv-losung" data-translation="XYZ"></div>');
    const k = karte();
    expect(k.classList.contains('fehler')).toBe(true);
    expect(k.getAttribute('aria-busy')).toBeNull();
    expect(k.textContent).toBe('Die Losung konnte gerade nicht geladen werden. Zur Losung auf losungen.de');
  });

  it('blendet sich bei Fehler auf Wunsch aus', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new TypeError('offline')));
    await starten('<div class="ketiv-losung" data-bei-fehler="ausblenden"></div>');
    expect((document.querySelector('.ketiv-losung') as HTMLElement).hidden).toBe(true);
  });

  it('zeigt vor der Antwort einen Ladezustand', async () => {
    let freigeben: (wert: Response) => void = () => {};
    fetchMock.mockImplementation(() => new Promise<Response>((r) => { freigeben = r; }));
    document.body.innerHTML = '<div class="ketiv-losung"></div>';
    new Function(quelltext)();
    const k = karte();
    expect(k.getAttribute('aria-busy')).toBe('true');
    expect(k.textContent).toBe('Die Losung wird geladen …');
    freigeben(new Response(JSON.stringify(antwort)));
  });

  it('füllt in der Darstellung „eigen“ das Markup der Seite', async () => {
    await starten(
      '<section class="ketiv-losung" data-darstellung="eigen" data-auswahl="kuerzer" data-anfuehrungszeichen="ja">' +
        '<a data-ketiv="link" href="#"><blockquote data-ketiv="text">…</blockquote><span data-ketiv="stelle"></span></a>' +
        '<p data-ketiv="quelle"></p></section>',
    );
    const s = document.querySelector('section')!;
    expect(s.shadowRoot).toBeNull();
    expect(s.querySelector('[data-ketiv="text"]')!.textContent).toBe('„' + antwort.data.losung.text + '“');
    expect(s.querySelector('[data-ketiv="stelle"]')!.textContent).toBe('Psalm 82,8');
    expect(s.querySelector('[data-ketiv="link"]')!.getAttribute('href')).toBe('https://www.bibleserver.com/LUT/Psalm82%2C8');
    expect(s.querySelector('[data-ketiv="quelle"]')!.textContent).toContain('© Evangelische Brüder-Unität – Herrnhuter Brüdergemeine');
    expect(s.getAttribute('lang')).toBe('de');
  });

  it('ergänzt die Quellenangabe, wenn die Seite keinen Platz dafür vorsieht', async () => {
    await starten('<div class="ketiv-losung" data-darstellung="eigen" data-auswahl="losung"><p data-ketiv="text"></p></div>');
    const quelle = document.querySelector('.ketiv-losung .ketiv-quelle')!;
    expect(quelle.textContent).toContain('Weitere Informationen finden Sie hier.');
  });

  it('übernimmt nur https-Links aus der Antwort', async () => {
    const boese = structuredClone(antwort);
    boese.data.losung.bibleserver_url = 'javascript:alert(1)';
    boese.data.losung.text = '<img src=x onerror=alert(1)>';
    fetchMock.mockImplementation(() => antwortMit(boese));
    await starten('<div class="ketiv-losung" data-auswahl="losung"></div>');
    const k = karte();
    expect(k.querySelector('a.stelle')!.hasAttribute('href')).toBe(false);
    expect(k.querySelector('img')).toBeNull();
    expect(k.querySelector('blockquote')!.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('bindet die Schrift von ketiv.de ein, ohne fremden Dienst', async () => {
    await starten('<div class="ketiv-losung"></div>');
    const stil = document.getElementById('ketiv-schrift')!;
    expect(stil.textContent).toContain("url('https://ketiv.de/fonts/jost-latin-wght-normal.woff2')");
    expect(document.querySelectorAll('link[href*="fonts.googleapis.com"]')).toHaveLength(0);
  });
});
