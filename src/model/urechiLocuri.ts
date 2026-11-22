import type { LocUreche, Operatie, UrechiOperatie } from './document.ts';

/**
 * Locurile alese ale urechilor (v26, ADR 0211) stau pe piesă, pe fiecare element al operației, în coordonatele formei lui.
 * Ușa (`problemaUrechi`) cere ca fiecare cheie să fie un element al operației, deci codul care schimbă nodurile unei
 * operații (degruparea, gruparea, plăcuțele, repararea, tăierea, rolurile) trece pe aici: locurile rămân doar pe nodurile
 * noi, sub numele lor noi (`redenumite`), iar ale celor plecate pleacă și ele. Fără locuri alese, doar nodurile se schimbă.
 */
export function cuNoduri(o: Operatie, noduri: string[], redenumite?: ReadonlyMap<string, string>): Operatie {
  const u = o.urechi;
  const vechi: unknown = u && Object.hasOwn(u, 'locuri') ? u.locuri : undefined;
  if (!u || typeof vechi !== 'object' || vechi === null) return { ...o, noduri };
  const ale = new Set(noduri);
  const locuri: Record<string, LocUreche[]> = {};
  for (const k of Object.keys(vechi)) {
    const n = redenumite?.get(k) ?? k;
    // Un id poate fi „__proto__” (ușa păstrează cheile ca date): proprietatea se pune, nu se atribuie.
    if (ale.has(n)) Object.defineProperty(locuri, n, { value: (vechi as Record<string, LocUreche[]>)[k], enumerable: true, writable: true, configurable: true });
  }
  return { ...o, noduri, urechi: { ...u, locuri } };
}

/** Câte urechi alese are operația (ADR 0211): punctele de pe elementele ei, doar cu modul „alese”. */
export function numarUrechiAlese(o: Operatie): number {
  const l = o.urechi?.mod === 'alese' ? o.urechi.locuri : undefined;
  if (!l) return 0;
  return o.noduri.reduce((s, n) => s + (Object.hasOwn(l, n) ? (l[n]?.length ?? 0) : 0), 0);
}

/**
 * Urechile unei operații-model (un rol salvat, ADR 0114): fără locurile alese, care sunt ale unei piese anume, iar modul
 * „alese” devine cel implicit, „egale”. Celelalte moduri (reguli, fără piesă) rămân.
 */
export function urechiDeSablon(u: UrechiOperatie | null): UrechiOperatie | null {
  if (!u || (u.mod !== 'alese' && !Object.hasOwn(u, 'locuri'))) return u;
  const { mod, locuri: _locuri, ...rest } = u;
  void _locuri;
  return mod === undefined || mod === 'alese' ? rest : { ...rest, mod };
}
