/* Ketiv-Widget: zeigt die Tageslosung auf einer Website; Einbindung in docs/widget.md. */
/* Lizenz: AGPL-3.0, https://github.com/Revisor01/ketiv */
(function () {
  'use strict';

  var skript = document.currentScript;
  var API = (skript && skript.getAttribute('data-api')) ||
    (skript && skript.src ? new URL(skript.src, location.href).origin : 'https://ketiv.de');
  var SPEICHER = 'ketiv-losung:v1:';
  var AUSWAHL = ['beide', 'losung', 'lehrtext', 'kuerzer'];
  var anfragen = {};
  var laufend = typeof WeakMap === 'function' ? new WeakMap() : null;

  var STIL = [
    ':host{display:block}',
    '.karte{box-sizing:border-box;position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:24px;width:100%;',
    'min-height:var(--ketiv-mindesthoehe,200px);padding:var(--ketiv-innenabstand,40px 20%);',
    'background:var(--ketiv-hintergrund,#DDF3FF);color:var(--ketiv-farbe,#333);',
    "font-family:var(--ketiv-schrift,'Ketiv Jost','Jost',system-ui,sans-serif);transition:transform .2s ease}",
    '.karte.klickbar{cursor:pointer}',
    '.karte.klickbar:hover{transform:scale(1.01)}',
    '@media (prefers-reduced-motion:reduce){.karte,.karte.klickbar:hover{transition:none;transform:none}}',
    '.verse{display:flex;flex-direction:column;gap:24px;flex:1}',
    'figure{margin:0;display:flex;flex-direction:column;gap:12px;flex:1}',
    'blockquote{margin:0;text-align:var(--ketiv-ausrichtung,center);font-size:var(--ketiv-schriftgroesse,2rem);',
    'font-weight:var(--ketiv-schriftgewicht,700);line-height:1.4}',
    'figcaption{margin-top:auto;text-align:right}',
    '.stelle{color:var(--ketiv-farbe-stelle,#666);font-size:.9em;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none}',
    '.stelle:hover,.stelle:focus-visible{text-decoration:underline}',
    '.klickbar .stelle::after{content:"";position:absolute;inset:0}',
    'a:focus-visible{outline:2px solid currentColor;outline-offset:3px}',
    '.quelle{position:relative;z-index:1;margin:0;font-size:var(--ketiv-quelle-groesse,.75rem);line-height:1.5;',
    'color:var(--ketiv-farbe-quelle,#666);text-align:var(--ketiv-ausrichtung,center)}',
    '.quelle a{color:inherit}',
    '.hinweis{margin:0;text-align:center;font-size:var(--ketiv-schriftgroesse,2rem);font-weight:var(--ketiv-schriftgewicht,700);',
    'line-height:1.4;color:var(--ketiv-farbe-leise,#999)}',
    '.fehler .hinweis{color:var(--ketiv-farbe-fehler,#c33);font-size:1.25rem}',
    '.fehler a{color:inherit}',
    '@media (max-width:600px){.karte{padding:var(--ketiv-innenabstand-schmal,32px 20px)}',
    'blockquote{font-size:var(--ketiv-schriftgroesse-schmal,1.5rem)}}'
  ].join('');

  function heute() {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  function ausSpeicher(schluessel) {
    try {
      var wert = window.localStorage.getItem(schluessel);
      return wert ? JSON.parse(wert) : null;
    } catch (e) {
      return null;
    }
  }

  function inSpeicher(schluessel, daten) {
    try {
      for (var i = window.localStorage.length - 1; i >= 0; i--) {
        var k = window.localStorage.key(i);
        if (k && k.indexOf(SPEICHER) === 0 && k !== schluessel) {
          window.localStorage.removeItem(k);
        }
      }
      window.localStorage.setItem(schluessel, JSON.stringify(daten));
    } catch (e) {
      // Ohne Speicher wird beim nächsten Seitenaufruf neu geladen.
    }
  }

  function laden(uebersetzung) {
    var schluessel = SPEICHER + API + ':' + uebersetzung + ':' + heute();
    var gespeichert = ausSpeicher(schluessel);
    if (gespeichert && gespeichert.date === heute()) {
      return Promise.resolve(gespeichert);
    }
    if (!anfragen[schluessel]) {
      anfragen[schluessel] = fetch(API + '/api/v1/tageslosung?translation=' + encodeURIComponent(uebersetzung), { credentials: 'omit' })
        .then(function (r) {
          if (!r.ok) {
            throw new Error('HTTP ' + r.status);
          }
          return r.json();
        })
        .then(function (json) {
          if (!json || !json.success || !json.data || !json.data.losung || !json.data.lehrtext) {
            throw new Error('Antwort ohne Losung');
          }
          inSpeicher(schluessel, json.data);
          return json.data;
        });
      anfragen[schluessel].catch(function () {
        delete anfragen[schluessel];
      });
    }
    return anfragen[schluessel];
  }

  function verseWaehlen(daten, auswahl) {
    if (auswahl === 'losung') {
      return [['losung', daten.losung]];
    }
    if (auswahl === 'lehrtext') {
      return [['lehrtext', daten.lehrtext]];
    }
    if (auswahl === 'kuerzer') {
      return daten.losung.text.length <= daten.lehrtext.text.length ? [['losung', daten.losung]] : [['lehrtext', daten.lehrtext]];
    }
    return [['losung', daten.losung], ['lehrtext', daten.lehrtext]];
  }

  function el(name, klasse, text) {
    var e = document.createElement(name);
    if (klasse) {
      e.className = klasse;
    }
    if (text) {
      e.textContent = text;
    }
    return e;
  }

  function sichererLink(url) {
    return typeof url === 'string' && /^https:\/\//.test(url) ? url : null;
  }

  function link(text, href, klasse) {
    var a = el('a', klasse, text);
    var ziel = sichererLink(href);
    if (ziel) {
      a.href = ziel;
    }
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }

  // Pflichtangaben nach den Nutzungsbedingungen der Losungen (Stand November 2023).
  function quelleFuellen(ziel, daten) {
    var q = daten.quelle || {};
    ziel.textContent = '';
    ziel.appendChild(document.createTextNode((q.name || 'Die Losungen') + ' · '));
    ziel.appendChild(link(q.copyright || '© Evangelische Brüder-Unität – Herrnhuter Brüdergemeine', q.copyright_url || 'https://www.herrnhuter.de'));
    ziel.appendChild(document.createTextNode(' · '));
    ziel.appendChild(link(q.info_text || 'Weitere Informationen finden Sie hier.', q.info_url || 'https://www.losungen.de'));
    var t = daten.translation || {};
    if (t.name) {
      ziel.appendChild(el('br'));
      ziel.appendChild(document.createTextNode('Bibeltext: ' + t.name + (t.copyright ? ', ' + t.copyright : '')));
    }
  }

  function textMitZeichen(text, zeichen) {
    return zeichen ? '„' + text + '“' : text;
  }

  function einstellungen(container) {
    var auswahl = (container.getAttribute('data-auswahl') || 'beide').toLowerCase();
    return {
      uebersetzung: container.getAttribute('data-translation') || 'LUT',
      auswahl: AUSWAHL.indexOf(auswahl) >= 0 ? auswahl : 'beide',
      eigen: container.getAttribute('data-darstellung') === 'eigen',
      ausblenden: container.getAttribute('data-bei-fehler') === 'ausblenden',
      zeichen: container.getAttribute('data-anfuehrungszeichen') === 'ja'
    };
  }

  // Darstellung „karte“: eigenes Markup im Shadow DOM, unabhängig vom Seiten-CSS.
  function karte(container) {
    var wurzel = container.attachShadow ? container.attachShadow({ mode: 'open' }) : container;
    var stil = el('style');
    stil.textContent = STIL;
    var inhalt = el('div', 'karte');
    inhalt.setAttribute('lang', 'de');
    inhalt.setAttribute('aria-live', 'polite');
    wurzel.appendChild(stil);
    wurzel.appendChild(inhalt);
    return inhalt;
  }

  function karteLaden(inhalt) {
    inhalt.className = 'karte';
    inhalt.setAttribute('aria-busy', 'true');
    inhalt.textContent = '';
    inhalt.appendChild(el('p', 'hinweis', 'Die Losung wird geladen …'));
  }

  function karteZeigen(inhalt, daten, opt) {
    var verse = verseWaehlen(daten, opt.auswahl);
    inhalt.className = 'karte' + (verse.length === 1 ? ' klickbar' : '');
    inhalt.removeAttribute('aria-busy');
    inhalt.textContent = '';
    var liste = el('div', 'verse');
    verse.forEach(function (paar) {
      var vers = paar[1];
      var figur = el('figure');
      figur.setAttribute('data-teil', paar[0]);
      figur.appendChild(el('blockquote', null, textMitZeichen(vers.text, opt.zeichen)));
      var unterschrift = el('figcaption');
      var a = link(vers.reference, vers.bibleserver_url, 'stelle');
      a.setAttribute('aria-label', vers.reference + ' bei bibleserver lesen (neues Fenster)');
      unterschrift.appendChild(a);
      figur.appendChild(unterschrift);
      liste.appendChild(figur);
    });
    inhalt.appendChild(liste);
    var quelle = el('p', 'quelle');
    quelleFuellen(quelle, daten);
    inhalt.appendChild(quelle);
  }

  function karteFehler(inhalt) {
    inhalt.className = 'karte fehler';
    inhalt.removeAttribute('aria-busy');
    inhalt.textContent = '';
    var p = el('p', 'hinweis', 'Die Losung konnte gerade nicht geladen werden. ');
    p.appendChild(link('Zur Losung auf losungen.de', 'https://www.losungen.de'));
    inhalt.appendChild(p);
  }

  // Darstellung „eigen“: füllt vorhandenes Markup der Seite (data-ketiv="text|stelle|link|quelle").
  function eigenZeigen(container, daten, opt) {
    var verse = verseWaehlen(daten, opt.auswahl);
    verse.forEach(function (paar) {
      var bereich = container.querySelector('[data-ketiv-vers="' + paar[0] + '"]') || (verse.length === 1 ? container : null);
      if (!bereich) {
        return;
      }
      var vers = paar[1];
      var text = bereich.querySelector('[data-ketiv="text"]');
      var stelle = bereich.querySelector('[data-ketiv="stelle"]');
      var ziel = bereich.querySelector('[data-ketiv="link"]') || (bereich.matches && bereich.matches('a[data-ketiv="link"]') ? bereich : null);
      if (text) {
        text.textContent = textMitZeichen(vers.text, opt.zeichen);
      }
      if (stelle) {
        stelle.textContent = vers.reference;
      }
      if (ziel && sichererLink(vers.bibleserver_url)) {
        ziel.href = vers.bibleserver_url;
      }
    });
    var quelle = container.querySelector('[data-ketiv="quelle"]');
    if (!quelle) {
      quelle = el('p', 'ketiv-quelle');
      container.appendChild(quelle);
    }
    quelleFuellen(quelle, daten);
    container.setAttribute('lang', container.getAttribute('lang') || 'de');
    container.removeAttribute('aria-busy');
  }

  function schriftEinbinden() {
    if (document.getElementById('ketiv-schrift')) {
      return;
    }
    var stil = document.createElement('style');
    stil.id = 'ketiv-schrift';
    stil.textContent = "@font-face{font-family:'Ketiv Jost';font-style:normal;font-weight:100 900;font-display:swap;" +
      "src:url('" + API + "/fonts/jost-latin-wght-normal.woff2') format('woff2')}";
    (document.head || document.documentElement).appendChild(stil);
  }

  function einrichten(container) {
    if (container.getAttribute('data-ketiv-bereit')) {
      return laufend ? laufend.get(container) : undefined;
    }
    container.setAttribute('data-ketiv-bereit', '1');
    var opt = einstellungen(container);
    var inhalt = null;
    if (opt.eigen) {
      container.setAttribute('aria-busy', 'true');
    } else {
      schriftEinbinden();
      inhalt = karte(container);
      karteLaden(inhalt);
    }
    var arbeit = laden(opt.uebersetzung).then(function (daten) {
      if (opt.eigen) {
        eigenZeigen(container, daten, opt);
      } else {
        karteZeigen(inhalt, daten, opt);
      }
    }).catch(function () {
      if (opt.ausblenden) {
        container.hidden = true;
      } else if (inhalt) {
        karteFehler(inhalt);
      } else {
        container.removeAttribute('aria-busy');
      }
    });
    if (laufend) {
      laufend.set(container, arbeit);
    }
    return arbeit;
  }

  function alle() {
    var liste = document.querySelectorAll('.ketiv-losung, [data-ketiv-losung]');
    var arbeit = [];
    for (var i = 0; i < liste.length; i++) {
      arbeit.push(einrichten(liste[i]));
    }
    return Promise.all(arbeit);
  }

  window.KetivLosung = { aktualisieren: alle };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', alle);
  } else {
    alle();
  }
})();
