import { describe, it, expect } from 'vitest';
import { BibleReferenceParser } from './bibleParser';

describe('BibleReferenceParser.parse', () => {
  it('liest eine ausgeschriebene Stelle', () => {
    const r = BibleReferenceParser.parse('Johannes 3,16');
    expect(r).not.toBeNull();
    expect(r!.book).toBe('Johannes');
    expect(r!.chapter).toBe(3);
    expect(r!.verseStart).toBe(16);
    expect(r!.normalized).toBe('Johannes 3,16');
  });

  it('löst Abkürzungen zum vollen Buchnamen auf', () => {
    expect(BibleReferenceParser.parse('Joh 3,16')!.book).toBe('Johannes');
    expect(BibleReferenceParser.parse('Lk 12,48')!.book).toBe('Lukas');
    expect(BibleReferenceParser.parse('Mt 5,9')!.book).toBe('Matthäus');
  });

  it('liest Versbereiche', () => {
    const r = BibleReferenceParser.parse('Joh 3,16-18');
    expect(r!.verseStart).toBe(16);
    expect(r!.verseEnd).toBe(18);
    expect(r!.normalized).toBe('Johannes 3,16-18');
  });

  it('liest Bücher mit vorangestellter Zahl', () => {
    const r = BibleReferenceParser.parse('2. Korinther 1,20');
    expect(r!.book).toBe('2. Korinther');
    expect(r!.chapter).toBe(1);
    expect(r!.verseStart).toBe(20);
  });

  it('liest zusammengesetzte Versbereiche mit Lücken', () => {
    const r = BibleReferenceParser.parse('2. Mose 16,2-3.11-18');
    expect(r!.book).toBe('2. Mose');
    expect(r!.chapter).toBe(16);
    expect(r!.verseRanges).toEqual([
      { start: 2, end: 3 },
      { start: 11, end: 18 },
    ]);
    expect(r!.verseStart).toBe(2);
    expect(r!.verseEnd).toBe(18);
  });

  it('verkraftet Leerzeichen um Trennzeichen', () => {
    const r = BibleReferenceParser.parse('Joh. 3, 16 - 18');
    expect(r!.book).toBe('Johannes');
    expect(r!.verseStart).toBe(16);
    expect(r!.verseEnd).toBe(18);
  });

  it('kommt mit hohen Kapitelnummern zurecht', () => {
    const r = BibleReferenceParser.parse('Psalm 105,8');
    expect(r!.book).toBe('Psalm');
    expect(r!.chapter).toBe(105);
    expect(r!.verseStart).toBe(8);
  });

  it('gibt null für ungültige Eingaben zurück', () => {
    expect(BibleReferenceParser.parse('Quatsch')).toBeNull();
    expect(BibleReferenceParser.parse('')).toBeNull();
    expect(BibleReferenceParser.parse('   ')).toBeNull();
  });

  it('gibt null zurück, wenn das Leerzeichen vor dem Kapitel fehlt', () => {
    expect(BibleReferenceParser.parse('joh3,16')).toBeNull();
  });
});

describe('BibleReferenceParser.validate', () => {
  it('bestätigt gültige Stellen', () => {
    expect(BibleReferenceParser.validate('Johannes 3,16')).toBe(true);
    expect(BibleReferenceParser.validate('Lk 12,48')).toBe(true);
  });

  it('weist ungültige Stellen ab', () => {
    expect(BibleReferenceParser.validate('Quatsch')).toBe(false);
    expect(BibleReferenceParser.validate('')).toBe(false);
  });
});

describe('BibleReferenceParser.getExamples', () => {
  it('liefert ausschließlich Beispiele, die auch geparst werden können', () => {
    const examples = BibleReferenceParser.getExamples();
    expect(examples.length).toBeGreaterThan(0);
    for (const example of examples) {
      expect(BibleReferenceParser.parse(example), `Beispiel "${example}"`).not.toBeNull();
    }
  });
});
