import type { enTutorial } from './tutorial.en.ts';
import type { DictionarRoPentru } from './tipuri.ts';

/** Panoul testului pas cu pas (ADR 0072), în română: exact cheile din engleză (`tutorial.en.ts`). */
export const roTutorial = {
  'tutorial.titlu': 'Testul pas cu pas',
  'tutorial.pas': 'Pasul {n} din {total}',
  'tutorial.faci': 'Ce faci',
  'tutorial.vezi': 'Ce trebuie să vezi',
  'tutorial.bine': 'Bine',
  'tutorial.nu': 'Nu',
  'tutorial.sarit': 'Sărit',
  'tutorial.nota': 'Ce ai văzut, pe scurt',
  'tutorial.poza': 'Poză',
  'tutorial.poza.titlu': 'Salvează imaginea planșei la pasul acesta (rămâne în browser și intră în raport)',
  'tutorial.poze': 'Poze la pasul acesta: {n}',
  'tutorial.poza.gata': 'Poza e salvată ({n} la pasul acesta).',
  'tutorial.poza.esec': 'Poza n-a mers: {motiv}',
  'tutorial.inapoi': 'Înapoi',
  'tutorial.inainte': 'Înainte',
  'tutorial.progres': '{bine} bine · {nu} nu · {sarit} sărite · {ramas} rămase',
  'tutorial.raport': 'Descarcă raportul',
  'tutorial.raport.gata': 'Raportul e descărcat ({fisier}): trimite-mi fișierul.',
  'tutorial.raport.esec': 'Raportul nu s-a putut face: {motiv}',
  'tutorial.reia': 'Începe din nou',
  'tutorial.reia.sigur': 'Da, șterge rezultatele și pozele',
  'tutorial.strange': 'Strânge',
  'tutorial.deschide': 'Deschide',
  'tutorial.inchide': 'Închide (rezultatele rămân)',
  'tutorial.incarca': 'Se încarcă testul…',
  'tutorial.eroare': 'Testul nu s-a putut încărca: {motiv}',
  'tutorial.fara-memorie': 'Fără memorie locală, rezultatele țin doar cât e deschisă fila.',
} as const satisfies DictionarRoPentru<typeof enTutorial>;
