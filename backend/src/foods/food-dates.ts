const BRASILIA_TIME_ZONE = 'America/Sao_Paulo';

// en-CA formats as yyyy-mm-dd, which compares as text in date order.
const isoDateInBrasilia = new Intl.DateTimeFormat('en-CA', {
  timeZone: BRASILIA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** DT26: the expiration date is stored at UTC midnight, as the registration does. */
export function isExpirationDateInPast(expirationDate: string): boolean {
  return new Date(expirationDate) < startOfTodayUtc();
}

/** The calendar day (yyyy-mm-dd) of an instant in Brasília, the time zone the screens show. */
export function dateInBrasilia(instant: Date): string {
  return isoDateInBrasilia.format(instant);
}

/** True if the given day (yyyy-mm-dd) comes after today in Brasília. */
export function isAfterTodayInBrasilia(date: string): boolean {
  return date.slice(0, 10) > dateInBrasilia(new Date());
}

/** Midnight of the given day (yyyy-mm-dd) in Brasília. Brazil has had no daylight saving since 2019. */
export function brasiliaMidnight(date: string): Date {
  return new Date(`${date.slice(0, 10)}T03:00:00.000Z`);
}
