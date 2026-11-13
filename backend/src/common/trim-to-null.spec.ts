import { describe, expect, it } from '@jest/globals';

import { trim, trimToNull } from './trim-to-null';

describe('trimToNull', () => {
  it('trims the text', () => {
    expect(trimToNull({ value: '  Good Taste  ' })).toBe('Good Taste');
  });

  it('turns an empty or blank text into null', () => {
    expect(trimToNull({ value: '' })).toBeNull();
    expect(trimToNull({ value: '   ' })).toBeNull();
  });

  it('keeps non-string values as they came', () => {
    expect(trimToNull({ value: undefined })).toBeUndefined();
    expect(trimToNull({ value: null })).toBeNull();
    expect(trimToNull({ value: 42 })).toBe(42);
  });
});

describe('trim', () => {
  it('trims the text and keeps a blank text as empty', () => {
    expect(trim({ value: '  Maria  ' })).toBe('Maria');
    expect(trim({ value: '   ' })).toBe('');
  });

  it('keeps non-string values as they came', () => {
    expect(trim({ value: undefined })).toBeUndefined();
    expect(trim({ value: 7 })).toBe(7);
  });
});
