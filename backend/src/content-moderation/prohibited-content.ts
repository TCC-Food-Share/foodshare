import { normalizeText } from '../common/normalize-text';

export const PROHIBITED_CONTENT = 'PROHIBITED_CONTENT';

const KNOWN_TLDS = [
  'com',
  'net',
  'org',
  'br',
  'gov',
  'edu',
  'io',
  'co',
  'info',
  'biz',
  'xyz',
  'site',
  'online',
  'store',
  'shop',
  'app',
  'link',
  'ly',
  'tv',
  'gg',
];

const LINK_PATTERNS = [
  /[a-z][a-z0-9+.-]*:\/\//,
  /\bwww\.\S/,
  /[a-z0-9._+-]+@[a-z0-9-]+\.[a-z]{2,}/,
  new RegExp(`\\b(?:[a-z0-9-]+\\.)+(?:${KNOWN_TLDS.join('|')})(?![a-z0-9-])`),
  /\b[a-z0-9-]+\.[a-z]{2,}\/\S/,
];

const toWords = (value: string): string =>
  normalizeText(value)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

export function containsProhibitedTerm(text: string, terms: string[]): boolean {
  const words = ` ${toWords(text)} `;
  return terms.some((term) => {
    const termWords = toWords(term);
    return termWords !== '' && words.includes(` ${termWords} `);
  });
}

export function containsLink(text: string): boolean {
  const normalized = normalizeText(text);
  return LINK_PATTERNS.some((pattern) => pattern.test(normalized));
}
