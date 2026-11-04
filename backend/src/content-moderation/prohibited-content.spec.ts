import { describe, expect, it } from '@jest/globals';

import { containsLink, containsProhibitedTerm } from './prohibited-content';

describe('containsProhibitedTerm', () => {
  const terms = ['otario', 'merda', 'puta', 'viado', 'pessoa ruim'];

  it.each([
    'Seu OTÁRIO',
    'otário',
    'Que merda!',
    '(merda)',
    'puta',
    'Essa pessoa ruim aqui',
    'Pessoa   ruim',
    'pessoa-ruim',
  ])('blocks %s', (text) => {
    expect(containsProhibitedTerm(text, terms)).toBe(true);
  });

  it.each([
    'Alimento enviado, boa reputação e sem disputa',
    'Produto desviado da rota',
    'merdas',
    'pessoa boa e ruim',
    '',
  ])('accepts %s', (text) => {
    expect(containsProhibitedTerm(text, terms)).toBe(false);
  });

  it('ignores a term with no letters or numbers', () => {
    expect(containsProhibitedTerm('Texto comum - sem nada', ['-', '...'])).toBe(false);
  });

  it('accepts anything when the list is empty', () => {
    expect(containsProhibitedTerm('merda', [])).toBe(false);
  });
});

describe('containsLink', () => {
  it.each([
    'Veja em HTTPS://exemplo.com.br/oferta',
    'http://exemplo',
    'ftp://arquivos',
    'www.exemplo.com',
    'WWW.exemplo',
    'exemplo.com.br',
    'exemplo.com',
    'site.org',
    'Compre em LOJA.STORE agora',
    'pão.com.br',
    'instagram.com/fulano',
    'wa.me/5518999991234',
    'bit.ly/abc',
    'fulano@gmail.com',
    'fulano@empresa.es',
  ])('blocks %s', (text) => {
    expect(containsLink(text)).toBe(true);
  });

  it.each([
    '(18) 99999-1234',
    '@perfil',
    'Pacote de 1.5kg. Retirar às 18h.Trazer sacola',
    'Padaria Silva Ltda.ME',
    'Mercado Bom S.A.',
    'Av.Brasil, 100',
    'site.comida',
    'R$ 2.50/kg',
    'Sem pontuação',
    '',
  ])('accepts %s', (text) => {
    expect(containsLink(text)).toBe(false);
  });
});
