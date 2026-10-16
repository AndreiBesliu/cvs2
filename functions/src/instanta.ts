/**
 * Instanța pe care rulează funcția, citită din proiect, nu de la client (ADR 0039 §5). Același cod rulează pe test și pe
 * live; nicio ramură nu schimbă comportamentul după instanță, doar eticheta din jurnal.
 */
export type Instanta = 'test' | 'live' | 'local' | 'necunoscuta';

export function instantaDinProiect(proiect: string = process.env['GCLOUD_PROJECT'] ?? ''): Instanta {
  if (proiect === 'cncvectorstudio-test') return 'test';
  if (proiect === 'cncvectorstudio') return 'live';
  if (proiect.startsWith('demo-')) return 'local';
  return 'necunoscuta';
}
