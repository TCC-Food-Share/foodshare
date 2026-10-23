import { describe, expect, it } from '@jest/globals';

import { normalizeText } from './normalize-text';

describe('normalizeText', () => {
  it('removes accents, lowercases and trims', () => {
    expect(normalizeText('  Pão Francês ')).toBe('pao frances');
  });

  it('handles cedilla and tilde', () => {
    expect(normalizeText('AÇÚCAR MAÇÃ')).toBe('acucar maca');
  });

  it('keeps inner spaces and punctuation', () => {
    expect(normalizeText('Foda-se')).toBe('foda-se');
  });
});
