import { describe, expect, it } from 'vitest';
import { badges, progression, searchMatches, speciesKey } from './game';
import type { Capture } from './types';

function capture(name: string, family = 'Araceae'): Capture {
  return { id: name, user_id: 'user', scientific_name: name, common_name: name, family, score: .8, photo_path: `user/${name}.jpg`, species_key: speciesKey(name), created_at: '2026-10-20T12:00:00Z' };
}
function collection(count: number) { return Array.from({ length: count }, (_, i) => capture(`Species ${i}`, `Family ${i % 3}`)); }

describe('progression de l’explorateur', () => {
  it('commence au niveau 1 sans faux points ni fausses captures', () => {
    expect(progression([])).toEqual({ species: 0, families: 0, xp: 0, level: 1, levelXp: 0, remaining: 300 });
    expect(badges([]).filter((badge) => badge.current >= badge.target)).toHaveLength(0);
  });
  it.each([[1, 100, 1, 100, 200], [2, 200, 1, 200, 100], [3, 300, 2, 0, 300], [6, 600, 3, 0, 300], [50, 5000, 17, 200, 100]])('%i espèces correspondent aux seuils exacts', (count, xp, level, levelXp, remaining) => {
    expect(progression(collection(count))).toMatchObject({ species: count, xp, level, levelXp, remaining });
  });
  it('ne récompense pas deux fois une même espèce', () => {
    expect(progression([capture('Monstera deliciosa'), capture('  MONSTERA DELICIOSA  ')])).toMatchObject({ species: 1, xp: 100 });
  });
  it('normalise les familles et ignore les familles vides', () => {
    expect(progression([capture('a', ' Araceae '), capture('b', 'ARACEAE'), capture('c', '')]).families).toBe(1);
  });
  it.each([1, 5, 10, 25, 50])('ne débloque le badge %i espèces qu’à son seuil', (target) => {
    const badge = badges(collection(target)).find((badge) => badge.target === target && badge.id !== 'families')!;
    const before = badges(collection(target - 1)).find((item) => item.id === badge.id)!;
    expect(badge.current >= badge.target).toBe(true);
    expect(before.current >= before.target).toBe(false);
  });
  it('demande trois familles différentes pour Esprit curieux', () => {
    const two = badges([capture('a', 'X'), capture('b', 'Y'), capture('c', 'X')]).find((badge) => badge.id === 'families')!;
    const three = badges(collection(3)).find((badge) => badge.id === 'families')!;
    expect(two.current).toBe(2); expect(three.current).toBe(3);
  });
});

describe('recherche botanique', () => {
  it('cherche sans tenir compte de la casse, des espaces extérieurs et des accents', () => {
    expect(searchMatches(['Fougère', 'Nephrolepis exaltata'], ' FOUGERE ')).toBe(true);
    expect(searchMatches(['Monstera deliciosa', 'Araceae'], 'araceae')).toBe(true);
    expect(searchMatches(['Aloe vera'], 'monstera')).toBe(false);
    expect(searchMatches(['Aloe vera'], '')).toBe(true);
  });
});
