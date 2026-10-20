import { describe, expect, it } from 'vitest';
import { validatePhoto } from './photos';

describe('photos acceptées', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepte %s', (type) => {
    expect(() => validatePhoto(new File(['image'], 'photo', { type }))).not.toThrow();
  });
  it('refuse HEIC et SVG avec un message explicite', () => {
    for (const type of ['image/heic', 'image/svg+xml', 'text/html']) {
      expect(() => validatePhoto(new File(['image'], 'photo', { type }))).toThrow('JPEG, PNG ou WebP');
    }
  });
  it('refuse les photos vides', () => {
    expect(() => validatePhoto(new File([], 'photo.jpg', { type: 'image/jpeg' }))).toThrow('vide');
  });
  it('autorise 20 Mo mais refuse strictement au-dessus', () => {
    expect(() => validatePhoto(new File([new Uint8Array(20 * 1024 * 1024)], 'photo.jpg', { type: 'image/jpeg' }))).not.toThrow();
    expect(() => validatePhoto(new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'photo.jpg', { type: 'image/jpeg' }))).toThrow('dépasse 20 Mo');
  });
});
