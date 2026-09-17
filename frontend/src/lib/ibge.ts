const cache = new Map<string, Promise<string[]>>();

export function citiesOf(uf: string): Promise<string[]> {
  const key = uf.toUpperCase();
  let entry = cache.get(key);
  if (!entry) {
    entry = fetchCities(key).catch(() => {
      cache.delete(key);
      return [];
    });
    cache.set(key, entry);
  }
  return entry;
}

async function fetchCities(uf: string): Promise<string[]> {
  const res = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`,
  );
  if (!res.ok) throw new Error(`IBGE ${res.status}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .map((m) =>
      m && typeof m === 'object' && 'nome' in m ? String((m as { nome: unknown }).nome) : '',
    )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
