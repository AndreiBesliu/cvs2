import { JOBURI, judecaMarcaj, limitaOre, marcajDin, type NumeJob } from '../../../shared/joburi.ts';
import { amprentaDin, PROIECTE, shaScurt, TINTE_SERVER, type Publicare } from '../../../shared/publicare.ts';
import type { Cheie, CheieSimpla } from '../../i18n/t.ts';
import type { Masura } from '../erori/date.ts';

/**
 * Diagnoza minimă (ADR 0040 §5): verificări active, fiecare cu starea, măsura și indiciul. Pură: componenta adună
 * măsurile (citirile, apelul la funcție), iar aici se judecă.
 */

export type StareVerificare = 'bine' | 'atentie' | 'esec' | 'info';

export interface Verificare {
  readonly id: 'instanta' | 'build' | 'amprenta' | 'appcheck' | 'rol' | 'nerezolvate' | 'functii' | `job:${NumeJob}`;
  readonly stare: StareVerificare;
  readonly titlu: CheieSimpla;
  /** Măsura: o cheie cu parametrii ei; `n` alege pluralul. */
  readonly masura: { readonly cheie: Cheie; readonly param?: Readonly<Record<string, string | number>> };
  readonly indiciu?: CheieSimpla;
}

export interface DateDiagnoza {
  readonly instanta: string;
  readonly proiect: string;
  readonly build: string;
  readonly appCheck: 'recaptcha' | 'proba' | 'oprit';
  readonly rol: string;
  readonly nerezolvate: Masura<number>;
  /** Codul HTTP al unui apel fără App Check la `logClientError`; trebuie să fie 401. */
  readonly functii: Masura<number>;
  /** Documentele din `marcaje`, după id (ADR 0041); un job fără document n-a rulat niciodată. */
  readonly marcaje: Masura<Readonly<Record<string, Readonly<Record<string, unknown>>>>>;
  /** Amprenta publicării (`meta/deployment`, ADR 0044); `null`: documentul lipsește. */
  readonly amprenta: Masura<Readonly<Record<string, unknown>> | null>;
  readonly acum: number;
}

/** Proiectul la care trebuie să vorbească o instanță. */
export function proiectAsteptat(instanta: string, proiect: string): boolean {
  if (instanta === 'test') return proiect === PROIECTE.test;
  if (instanta === 'live') return proiect === PROIECTE.live;
  if (instanta === 'local') return proiect.startsWith('demo-');
  return false;
}

export function verificari(d: DateDiagnoza): readonly Verificare[] {
  const v: Verificare[] = [];
  const p = { instanta: d.instanta, proiect: d.proiect };
  v.push(proiectAsteptat(d.instanta, d.proiect)
    ? { id: 'instanta', stare: 'bine', titlu: 'admin.diag.instanta', masura: { cheie: 'admin.diag.instanta.bine', param: p } }
    : { id: 'instanta', stare: 'esec', titlu: 'admin.diag.instanta', masura: { cheie: 'admin.diag.instanta.esec', param: p }, indiciu: 'admin.diag.instanta.indiciu' });
  v.push({ id: 'build', stare: 'info', titlu: 'admin.diag.build', masura: { cheie: 'admin.erori.build', param: { build: d.build, instanta: d.instanta } } });
  v.push(verificareAmprenta(d));
  v.push(d.appCheck === 'recaptcha'
    ? { id: 'appcheck', stare: 'bine', titlu: 'admin.diag.appcheck', masura: { cheie: 'admin.diag.appcheck.recaptcha' } }
    : d.appCheck === 'proba'
      ? { id: 'appcheck', stare: 'info', titlu: 'admin.diag.appcheck', masura: { cheie: 'admin.diag.appcheck.proba' } }
      : { id: 'appcheck', stare: 'atentie', titlu: 'admin.diag.appcheck', masura: { cheie: 'admin.diag.appcheck.oprit' }, indiciu: 'admin.diag.appcheck.indiciu' });
  v.push({ id: 'rol', stare: 'info', titlu: 'admin.diag.rol', masura: { cheie: 'admin.diag.rol.valoare', param: { rol: d.rol } } });
  const n = d.nerezolvate;
  v.push(!n.ok
    ? { id: 'nerezolvate', stare: 'esec', titlu: 'admin.diag.nerezolvate', masura: { cheie: 'admin.diag.nerezolvate.necunoscut', param: { motiv: n.motiv } } }
    : n.valoare === 0
      ? { id: 'nerezolvate', stare: 'bine', titlu: 'admin.diag.nerezolvate', masura: { cheie: 'admin.diag.nerezolvate.zero' } }
      : { id: 'nerezolvate', stare: 'atentie', titlu: 'admin.diag.nerezolvate', masura: { cheie: 'admin.diag.nerezolvate.cate', param: { n: n.valoare } }, indiciu: 'admin.diag.nerezolvate.indiciu' });
  const f = d.functii;
  const t = 'admin.diag.functii' as const;
  const i = 'admin.diag.functii.indiciu' as const;
  v.push(!f.ok
    ? { id: 'functii', stare: 'esec', titlu: t, masura: { cheie: 'admin.diag.functii.nu-raspunde', param: { motiv: f.motiv } }, indiciu: i }
    : f.valoare === 401
      ? { id: 'functii', stare: 'bine', titlu: t, masura: { cheie: 'admin.diag.functii.bine' } }
      : f.valoare >= 200 && f.valoare < 300
        ? { id: 'functii', stare: 'esec', titlu: t, masura: { cheie: 'admin.diag.functii.fara-impunere' } }
        : { id: 'functii', stare: 'esec', titlu: t, masura: { cheie: 'admin.diag.functii.cod', param: { cod: f.valoare } }, indiciu: i });
  for (const j of JOBURI) v.push(verificareJob(j, d));
  return v;
}

/** Ora unei publicări, pe scurt: `AAAA-LL-ZZ HH:MM UTC`. */
function oraScurta(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

/**
 * Amprenta publicării (ADR 0044): proiectul ei, build-ul paginii față de commit-ul publicat pe hosting, serverul (funcțiile,
 * regulile, indecșii) față de pagină, modificările necomise (pe live, imposibile: live se publică doar din workflow).
 */
function verificareAmprenta(d: DateDiagnoza): Verificare {
  const id = 'amprenta';
  const titlu = 'admin.diag.amprenta' as const;
  if (!d.amprenta.ok) return { id, stare: 'esec', titlu, masura: { cheie: 'admin.diag.amprenta.necitit', param: { motiv: d.amprenta.motiv } } };
  if (d.amprenta.valoare === null) return { id, stare: 'atentie', titlu, masura: { cheie: 'admin.diag.amprenta.lipsa' }, indiciu: 'admin.diag.amprenta.lipsa-indiciu' };
  const a = amprentaDin(d.amprenta.valoare);
  if (a === 'nevalid') return { id, stare: 'atentie', titlu, masura: { cheie: 'admin.diag.amprenta.nevalid' } };
  if (a.projectId !== d.proiect) return { id, stare: 'esec', titlu, masura: { cheie: 'admin.diag.amprenta.alt-proiect', param: { proiect: a.projectId } } };
  const publicari = Object.values(a.tinte).filter((x): x is Publicare => x !== undefined);
  const necomis = publicari.some((x) => !x.arboreCurat);
  if (necomis && d.instanta === 'live') return { id, stare: 'esec', titlu, masura: { cheie: 'admin.diag.amprenta.necomis-live' } };
  const h = a.tinte.hosting;
  if (!h) return { id, stare: 'atentie', titlu, masura: { cheie: 'admin.diag.amprenta.fara-hosting' }, indiciu: 'admin.diag.amprenta.lipsa-indiciu' };
  const sha = shaScurt(h.gitSha);
  if (sha !== d.build) {
    return { id, stare: 'atentie', titlu, masura: { cheie: 'admin.diag.amprenta.alt-build', param: { build: d.build, sha } }, indiciu: 'admin.diag.amprenta.alt-build-indiciu' };
  }
  const param = { sha, cand: oraScurta(h.deployedAt), cine: h.deployedBy };
  if (necomis) return { id, stare: 'info', titlu, masura: { cheie: 'admin.diag.amprenta.necomis', param } };
  // Serverul: fiecare țintă publicată din alt commit decât pagina, sau niciodată prin script („—”).
  const server = [...new Set(TINTE_SERVER.map((t) => a.tinte[t]).map((x) => (x ? shaScurt(x.gitSha) : '—')))].filter((x) => x !== sha);
  if (server.length > 0) return { id, stare: 'info', titlu, masura: { cheie: 'admin.diag.amprenta.server-altul', param: { ...param, server: server.join(', ') } } };
  return { id, stare: 'bine', titlu, masura: { cheie: 'admin.diag.amprenta.bine', param } };
}

/** Un job din `JOBURI`, judecat din marcajul lui (ADR 0041 §3). */
function verificareJob(j: (typeof JOBURI)[number], d: DateDiagnoza): Verificare {
  const id = `job:${j.nume}` as const;
  const titlu: CheieSimpla = `admin.diag.job.${j.nume}`;
  const ind = 'admin.diag.job.indiciu' as const;
  if (!d.marcaje.ok) return { id, stare: 'esec', titlu, masura: { cheie: 'admin.diag.job.necitit', param: { motiv: d.marcaje.motiv } } };
  const doc = d.marcaje.valoare[j.nume];
  const m = doc === undefined ? null : marcajDin(doc);
  const r = judecaMarcaj(m, j, d.acum);
  const eroare = m !== null && m !== 'nevalid' ? m.ultimaEroare ?? '—' : '—';
  const ore = r.oreDeLaSucces ?? 0;
  switch (r.motiv) {
    case 'niciodata': return { id, stare: r.stare, titlu, masura: { cheie: 'admin.diag.job.niciodata' }, indiciu: 'admin.diag.job.niciodata-indiciu' };
    case 'ruleaza': return { id, stare: r.stare, titlu, masura: { cheie: 'admin.diag.job.ruleaza' } };
    case 'fara-final': return { id, stare: r.stare, titlu, masura: { cheie: 'admin.diag.job.fara-final' }, indiciu: ind };
    case 'esecuri': return { id, stare: r.stare, titlu, masura: { cheie: 'admin.diag.job.esecuri', param: { n: m !== null && m !== 'nevalid' ? m.esecuriLaRand : 0, eroare } }, indiciu: ind };
    case 'un-esec': return { id, stare: r.stare, titlu, masura: { cheie: 'admin.diag.job.un-esec', param: { eroare } }, indiciu: ind };
    case 'fara-succes': return { id, stare: r.stare, titlu, masura: { cheie: 'admin.diag.job.fara-succes', param: { eroare } }, indiciu: ind };
    case 'vechi': return { id, stare: r.stare, titlu, masura: { cheie: 'admin.diag.job.vechi', param: { ore, limita: limitaOre(j) } }, indiciu: ind };
    case 'nevalid': return { id, stare: r.stare, titlu, masura: { cheie: 'admin.diag.job.nevalid' } };
    case 'bine': return { id, stare: r.stare, titlu, masura: { cheie: 'admin.diag.job.bine', param: { ore } } };
  }
}
