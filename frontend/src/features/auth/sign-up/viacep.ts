export interface CepAddress {
  street: string;
  city: string;
  state: string;
}

/**
 * Consulta o endereço de um CEP na ViaCEP. Devolve `null` quando o CEP não tem
 * 8 dígitos, não existe (`{ erro: true }`), ou a chamada falha / expira (~4 s).
 */
export async function lookupCep(cep: string): Promise<CepAddress | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!data || typeof data !== 'object' || 'erro' in data) return null;
    const d = data as Record<string, unknown>;
    return {
      street: typeof d.logradouro === 'string' ? d.logradouro : '',
      city: typeof d.localidade === 'string' ? d.localidade : '',
      state: typeof d.uf === 'string' ? d.uf : '',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
