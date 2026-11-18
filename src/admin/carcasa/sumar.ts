import { collection, getCount, getDocs, limit, orderBy, query, Timestamp, where, type Query } from 'firebase/firestore/lite';
import { COLECTIE_CONTURI } from '../../../shared/conturiPlan.ts';
import { COLECTIE_SUGESTII } from '../../../shared/sugestii.ts';
import { COLECTIE_TICHETE } from '../../../shared/tichete.ts';
import type { Conexiune } from '../../cloud/conexiune.ts';
import { masoaraDiagnoza } from '../diagnoza/FilaDiagnoza.tsx';
import type { Verificare } from '../diagnoza/verificari.ts';
import { motivDin, type Masura } from '../erori/date.ts';
import { intamplareDin, type Intamplare, type ParteAzi } from './date.ts';

/**
 * Rezumatul de la intrare (ADR 0260 §1): cifrele care cer o mână, Diagnoza (punctul din bară și joburile de noapte) și
 * ultimele întâmplări din audit. Citit la intrare și la „Reîncarcă”, o dată (Firestore Lite, fără ascultători), prin
 * aceleași reguli ca filele, și doar pentru părțile pe care rolul le vede (`partiAzi`): o parte lipsă nu se citește deloc.
 * Cifrele sunt numărători (`count`) pe indexuri simple, fără index compus nou.
 */
export interface Sumar {
  readonly erori?: Masura<number>;
  readonly tichete?: Masura<number>;
  readonly sugestii?: Masura<number>;
  readonly conturi?: Masura<number>;
  readonly diagnoza?: readonly Verificare[];
  readonly intamplari?: Masura<readonly Intamplare[]>;
}

/** Câte întâmplări arată Azi. */
export const PLAFON_INTAMPLARI = 8;
const ZI = 86_400_000;

const numara = (q: Query): Promise<Masura<number>> => getCount(q).then(
  (s) => ({ ok: true as const, valoare: s.data().count }),
  (e: unknown) => ({ ok: false as const, motiv: motivDin(e) }),
);

export async function citesteSumarul(con: Conexiune, parti: ReadonlySet<ParteAzi>, d: {
  readonly instanta: string; readonly build: string; readonly rol: string; readonly eu: string;
}): Promise<Sumar> {
  const col = (c: string) => collection(con.db, c);
  const [erori, tichete, sugestii, conturi, diagnoza, intamplari] = await Promise.all([
    parti.has('erori') ? numara(query(col('errorLogs'), where('rezolvat', '==', false))) : null,
    parti.has('tichete') ? numara(query(col(COLECTIE_TICHETE), where('stare', '==', 'nou'))) : null,
    parti.has('sugestii') ? numara(query(col(COLECTIE_SUGESTII), where('stare', '==', 'noua'))) : null,
    parti.has('conturi') ? numara(query(col(COLECTIE_CONTURI), where('creatLa', '>=', Timestamp.fromMillis(Date.now() - 7 * ZI)))) : null,
    // Fără sonda funcțiilor: o cerere activă, refuzată cu 401 (în consola browserului), doar în fila Diagnoză.
    parti.has('joburi') ? masoaraDiagnoza(con, d.instanta, d.build, d.rol, false) : null,
    parti.has('intamplari')
      ? getDocs(query(col('audit'), orderBy('cand', 'desc'), limit(PLAFON_INTAMPLARI))).then(
        (s) => ({ ok: true as const, valoare: s.docs.map((x) => intamplareDin(x.id, x.data(), d.eu)) }),
        (e: unknown) => ({ ok: false as const, motiv: motivDin(e) }),
      )
      : null,
  ]);
  return {
    ...(erori ? { erori } : {}), ...(tichete ? { tichete } : {}), ...(sugestii ? { sugestii } : {}), ...(conturi ? { conturi } : {}),
    ...(diagnoza ? { diagnoza } : {}), ...(intamplari ? { intamplari } : {}),
  };
}
