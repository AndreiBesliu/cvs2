/**
 * Regiunile, într-un singur tabel (`PLAN.md` §3.4, ADR 0039 §1): callable-urile și joburile lângă oameni, în
 * `europe-central2`; declanșatoarele Firestore lângă baza `nam5`, în `us-central1` (în ediția întâi, regiunile amestecate
 * au făcut un declanșator să tacă).
 */
export const REGIUNI = {
  callable: 'europe-central2',
  job: 'europe-central2',
  declansatorFirestore: 'us-central1',
} as const;
