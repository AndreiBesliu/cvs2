import { conversieInBazin, exportInBazin, legareInBazin, panouriInBazin, potrivireInBazin, reparareInBazin, simulareInBazin, taiereInBazin, timpInBazin, traseuInBazin, verificareInBazin } from '../jobs/bazinCam.ts';
import { fireImplicite, simuleazaInBazin, SimulareAnulata } from '../jobs/bazin.ts';
import { despacheteaza, impacheteaza } from '../jobs/impachetare.ts';
import type { DopExportat, ParteDesprinsa } from '../jobs/protocolCam.ts';
import type { Program } from '../ir/ir.ts';
import type { Montaj } from '../ir/montaj.ts';
import type { Document } from '../model/document.ts';
import { doarFoaia, numeFoaie } from '../model/foi.ts';
import { hartiFinisare, ordinePasi } from '../model/finisare.ts';
import type { ResurseRelief } from '../relief/resurse.ts';
import { bazaFisier, cuBaza } from '../post/numeFisier.ts';
import { cereMesaje } from '../i18n/laCerere.ts';
import { t } from '../i18n/t.ts';
import { scrieZip, type IntrareArhiva } from '../io/scrieZip.ts';
import { CONTRACTE } from '../post/contracte/index.ts';
import { sha256Hex, type FisierExportat } from '../post/export.ts';
import { faraComentarii, foiIdentice, numeInArhiva } from '../post/foi.ts';
import { inceputProgram } from '../post/inceput.ts';
import type { CerereReparare, OptiuniReparare, RezultatReparare, VerificarePanou } from '../model/reparare.ts';
import type { CerereConversie, RezultatConversie } from '../model/conversie.ts';
import type { CerereLegare, OptiuniLegare, RezultatLegare } from '../model/legareCai.ts';
import type { CererePanouri } from '../model/panouri.ts';
import type { CerereTaiere, RezultatTaiere } from '../model/taiere.ts';
import { aleseCuSurori, catePuse, CUTITE_PIESA, type AlegereSurori, type SuroriConversie, type SuroriTaiere } from '../model/surori.ts';
import { cereAlegerea } from './intrebareSurori.ts';
import type { OptiuniVerificare } from '../model/verificare.ts';
import { reliefPentru } from '../sim/banda.ts';
import { campPentruFoaie, dimensiuni, type ParametriCamp } from '../sim/camp.ts';
import type { DateScula, GrupSimulare } from '../sim/nucleu.ts';
import type { ProgramSimulat } from '../sim/program.ts';
import type { FereastraRelief, InceputFisier, ParametriExport, ProgramSimulare, RaspunsPotrivire, ReliefSimulat, RezultatExport, RezumatJob, SimulareExport } from './actiuniExportTipuri.ts';

// Cine cheamă calculul își recunoaște anularea (nu se arată) și workerul căzut (merge în jurnal).
export { CalculAnulat, LucratorCazut } from '../jobs/bazinCam.ts';

/** Câte piese desprinse numește avertismentul; celelalte se numără. */
export const PIESE_DESPRINSE_NUMITE = 5;

/**
 * Avertismentul probei urechilor (ADR 0210, felia 11.3↑c), în limba omului: câte piese ale foii se desprind și care (valorile
 * plăcuței, sau numele piesei, cu locul pe foaie), sau nimic. Workerul dă doar părțile; textul se face aici, cu `t`.
 */
export function avertismentDesprinse(doc: Document, desprinse: readonly ParteDesprinsa[]): string[] {
  if (desprinse.length === 0) return [];
  const instante = new Map((doc.foi[0]?.instante ?? []).map((i) => [i.id, i]));
  const piese = new Map(doc.piese.map((p) => [p.id, p]));
  const nume = (d: ParteDesprinsa): string | null => {
    const i = instante.get(d.instanta);
    const valori = Object.values(i?.campuri ?? {}).map((v) => v.trim()).filter((v) => v !== '').join(' ');
    return valori !== '' ? valori : (i ? piese.get(i.piesa)?.nume?.trim() || null : null);
  };
  const numite = desprinse.slice(0, PIESE_DESPRINSE_NUMITE).map((d) => {
    const loc = t('export.urechi.loc', { x: String(Math.round(d.x)), y: String(Math.round(d.y)) });
    const n = nume(d);
    return n === null ? loc : t('export.urechi.piesa', { nume: n, loc });
  });
  const rest = desprinse.length - numite.length;
  return [t('export.urechi.desprinse', { n: desprinse.length, piese: [...numite, ...(rest > 0 ? [t('export.urechi.inca', { n: String(rest) })] : [])].join('; ') })];
}

/**
 * Operațiile pieselor desprinse care încă nu sunt „unde ține” (ADR 0211, b: butonul „Pune urechile unde țin”), ca rânduri ale
 * ferestrei exportului (`piesă/operație`), o dată fiecare, în ordinea pieselor desprinse.
 */
export function operatiiDesprinse(doc: Document, desprinse: readonly ParteDesprinsa[]): string[] {
  const rez: string[] = [];
  for (const d of desprinse) {
    const k = d.operatie.indexOf('/');
    const o = doc.piese.find((p) => p.id === d.operatie.slice(0, k))?.operatii.find((x) => x.id === d.operatie.slice(k + 1));
    if (o?.urechi && o.urechi.mod !== 'lemn' && !rez.includes(d.operatie)) rez.push(d.operatie);
  }
  return rez;
}

/**
 * Resursele reliefurilor finisate pe foaia documentului (ADR 0312): straturile lor din baza `cncvs2-relief`, citite aici (pe
 * firul principal) și trimise workerului CAM. Fără finisări, nimic (și nicio bucată adusă).
 */
async function resurse(doc: Document): Promise<ResurseRelief | undefined> {
  const harti = hartiFinisare(doc, 0);
  if (harti.length === 0) return undefined;
  const m = await import('../app/reliefStocare.ts');
  return m.resurseRelief(harti);
}

/** Avertismentele foii, cu al pieselor desprinse la capăt: mesajele exportului întâi (le are deja fereastra care exportă). */
async function cuDesprinse(doc: Document, avertismente: readonly string[], desprinse: readonly ParteDesprinsa[]): Promise<string[]> {
  if (desprinse.length === 0) return [...avertismente];
  await cereMesaje('export');
  return [...avertismente, ...avertismentDesprinse(doc, desprinse)];
}

/**
 * Exportul propriu-zis (documentul → profilele → IR → postul ales, ADR 0083 → octeții cu SHA-256), în workerul CAM (ADR
 * 0109): firul principal primește doar octeții, rezumatul și mutările simulării, transferate. Se încarcă la cerere.
 * `semnal` anulează calculul (un export nou, un parametru schimbat, fereastra închisă): workerul se oprește. Piesele
 * desprinse (proba urechilor) se spun printre avertismente.
 */
export async function calculeazaExport(doc: Document, p: ParametriExport, semnal?: AbortSignal, toate?: Document): Promise<RezultatExport> {
  if (p.toateFoile && toate) return calculeazaToateFoile(toate, doc.foi[0]?.id ?? '', p, semnal);
  const r = await exportInBazin(doc, p, semnal ? { semnal } : {}, await resurse(doc));
  if (!r.ok) return r;
  const { simulare, foaie, desprinse, ...rest } = r;
  const undeTine = operatiiDesprinse(doc, desprinse);
  const numit = cuNumele(rest, p);
  return {
    ...numit, inceput: inceputuri([...numit.fisiere, ...numit.dopuri.flatMap((d) => d.fisiere)], p), avertismente: await cuDesprinse(doc, rest.avertismente, desprinse), ...(undeTine.length > 0 ? { undeTine } : {}),
    simulare: (s) => simuleazaExport(simulare, foaie, s),
  };
}

/**
 * Începutul fiecărui fișier scris (ADR 0292), din textul lui, după comentariile dialectului postului: ce primește controlerul
 * întâi, până la prima mișcare de tăiere.
 */
function inceputuri(fisiere: readonly { readonly nume: string; readonly text: string }[], p: ParametriExport): InceputFisier[] {
  const { comentariu } = CONTRACTE[p.post ?? 'grbl-11'];
  return fisiere.map((f) => ({ nume: f.nume, ...inceputProgram(f.text, comentariu) }));
}

/**
 * Numele ales de om (ADR 0291 §5) în locul bazei `cncvs2-<colț>`: pe fișierele foii, pe ale dopurilor și pe cele pentru Mașina.
 * Octeții rămân; fără nume ales, rezultatul e același obiect.
 */
function cuNumele<R extends { readonly fisiere: readonly FisierExportat[]; readonly dopuri: readonly DopExportat[]; readonly masina?: readonly FisierExportat[] }>(
  r: R, p: ParametriExport,
): R {
  if (p.numeFisier === undefined) return r;
  const numit = <F extends { readonly nume: string }>(f: F): F => ({ ...f, nume: cuBaza(f.nume, p.origine, p.numeFisier) });
  return {
    ...r, fisiere: r.fisiere.map(numit), dopuri: r.dopuri.map((d) => ({ ...d, fisiere: d.fisiere.map(numit) })),
    ...(r.masina ? { masina: r.masina.map(numit) } : {}),
  };
}

/**
 * „Toate foile” (ADR 0210 §5): câte un program pe foaie, fiecare exact cel al documentului doar cu foaia ei (aceiași parametri),
 * cerut workerului CAM pe rând; o foaie fără nimic de tăiat se sare. Foile identice (aceleași fișiere, cu programele egale fără
 * comentarii: o copie legată a foii diferă doar în id-ul instanței din comentarii) ies o dată, cu programul primei și „-x<N>” în nume; fișierele lor și ale dopurilor intră într-o arhivă `.zip` stocată, cu aceiași octeți la
 * fiecare export. Panoul mașinii, simularea și rezumatul sunt ale foii active (`activa`). Confirmarea ieșirii din foaie trece
 * doar pe aceeași ieșire (foaia activă, sau una identică cu ea); o altă foaie din care iese freza se exportă singură, cu
 * confirmarea ei: aici, refuz cu numele ei.
 */
async function calculeazaToateFoile(doc: Document, activa: string, p: ParametriExport, semnal?: AbortSignal): Promise<RezultatExport> {
  const { toateFoile: _toate, ...baza } = p;
  const contract = CONTRACTE[p.post ?? 'grbl-11'];
  const facute: Array<{ readonly k: number; readonly nume: string; readonly d: Document; readonly r: Extract<Awaited<ReturnType<typeof exportInBazin>>, { ok: true }> }> = [];
  const goale: string[] = [];
  for (const [k, f] of doc.foi.entries()) {
    const d = doarFoaia(doc, f.id), nume = numeFoaie(f, k, (n) => t('foaia.n', { n: String(n) }));
    // Nimic de tăiat: nicio tăietură și nicio finisare a reliefului (ADR 0312).
    if (ordinePasi(d, 0).length === 0) {
      goale.push(nume);
      continue;
    }
    const r = await exportInBazin(d, baza, semnal ? { semnal } : {}, await resurse(d));
    if (!r.ok) return { ok: false, motiv: 'cereConfirmare' in r ? `${nume}: freza iese din foaie; exportă foaia singură, cu confirmarea ei` : `${nume}: ${r.motiv}` };
    facute.push({ k, nume, d, r });
  }
  const activ = facute.find((x) => doc.foi[x.k]?.id === activa) ?? facute[0];
  if (!activ) return { ok: false, motiv: 'nicio foaie n-are ce tăia' };
  // Semnătura unei foi: fișierele ei și ale dopurilor, cu numele și amprenta programului fără comentarii (ce face mașina).
  const fisiereFoii = (r: (typeof facute)[number]['r']): FisierExportat[] => [...r.fisiere, ...r.dopuri.flatMap((d) => d.fisiere)];
  const semnaturi = await Promise.all(facute.map(async ({ r }) => JSON.stringify(await Promise.all(
    fisiereFoii(r).map(async (x) => [x.nume, await sha256Hex(new TextEncoder().encode(faraComentarii(x.text)))]),
  ))));
  const intrari: IntrareArhiva[] = [];
  /** Fișierele foii active din arhivă (ADR 0292): numele lor de acolo și textul, pentru începutul lor. */
  const aleActivei: Array<{ readonly nume: string; readonly text: string }> = [];
  let linii = 0;
  const foi = foiIdentice(semnaturi).flatMap((g) => {
    const prim = facute[g[0] ?? -1];
    if (!prim) return [];
    // Rezultatul pe foi (ADR 0291, 7a): timpul pe operații al programului ei; foaia activă, însemnată.
    const activa = g.some((j) => facute[j] === activ);
    const fisiere = fisiereFoii(prim.r).map((x) => {
      linii += x.linii;
      const intrare = { nume: cuBaza(numeInArhiva(x.nume, prim.k + 1, g.length, p.origine, contract.numeScurt), p.origine, p.numeFisier), octeti: x.octeti };
      intrari.push(intrare);
      if (activa) aleActivei.push({ nume: intrare.nume, text: x.text });
      return intrare.nume;
    });
    const identice = g.slice(1).flatMap((j) => facute[j]?.nume ?? []);
    return [{
      nume: prim.nume, identice, fisiere, secunde: prim.r.rezumat.ok ? prim.r.rezumat.total.secunde : null, rezumat: prim.r.rezumat,
      ...(activa ? { activa: true as const } : {}),
    }];
  });
  const z = scrieZip(intrari);
  if (!z.ok) return { ok: false, motiv: z.motiv };
  const arhiva = contract.numeScurt ? 'CNCVS2.ZIP' : cuBaza(`${bazaFisier(p.origine)}-foile.zip`, p.origine, p.numeFisier);
  const zip: FisierExportat = {
    text: '', octeti: z.octeti, sha256: await sha256Hex(z.octeti), linii, extensie: 'zip', aproximari: 0, sectiuni: [], scula: null, nume: arhiva,
  };
  const secunde = foi.every((f) => f.secunde !== null) ? foi.reduce((s, f) => s + (f.secunde ?? 0) * (1 + f.identice.length), 0) : null;
  const { simulare, foaie, rezumat, sender, fisiere } = activ.r;
  const avertismente = (await Promise.all(facute.map(async ({ nume, d, r }) => (await cuDesprinse(d, r.avertismente, r.desprinse)).map((a) => `${nume}: ${a}`)))).flat();
  const undeTine = [...new Set(facute.flatMap(({ d, r }) => operatiiDesprinse(d, r.desprinse)))];
  return {
    ok: true, program: zip, fisiere: [zip], dopuri: [], inceput: inceputuri(aleActivei, p), rezumat, sender, ...(sender ? { masina: fisiere.map((f) => ({ ...f, nume: cuBaza(f.nume, p.origine, p.numeFisier) })) } : {}),
    avertismente, ...(undeTine.length > 0 ? { undeTine } : {}),
    foi: { arhiva, foi, goale, secunde },
    simulare: (s) => simuleazaExport(simulare, foaie, s),
  };
}

/**
 * Simularea programului exportat (ADR 0047 §5): mutările nucleului (IR-ul, în coordonatele documentului, pregătit în
 * workerul CAM), pe toată foaia, la 0,25 mm, în bazinul de workere. Un refuz sau un worker căzut nu oprește exportul:
 * dialogul spune de ce lipsește simularea.
 */
export async function simuleazaExport(
  p: ProgramSimulat, foaie: { readonly latime: number; readonly inaltime: number; readonly grosime: number }, semnal?: AbortSignal,
): Promise<SimulareExport> {
  if (!p.ok) return { ok: false, motiv: p.motiv, eroare: false };
  const camp = campPentruFoaie(foaie), d = dimensiuni(camp.celula, camp.latime, camp.inaltime);
  try {
    const r = await simuleazaInBazin({ camp, scula: p.scula, mutari: p.mutari, ...(p.apoi ? { apoi: p.apoi } : {}), fund: -foaie.grosime }, fireImplicite(), semnal ? { semnal } : {});
    return {
      ok: true, amprenta: r.amprenta, volum: r.volum, adancimeMax: r.adancimeMax, prinFoaie: r.prinFoaie, grosime: foaie.grosime,
      celula: camp.celula, celule: [d.nx, d.ny],
      fire: r.fire, ms: r.ms, previzualizare: { latime: r.previzualizare.latime, inaltime: r.previzualizare.inaltime, z: r.previzualizare.z },
    };
  } catch (e) {
    const motiv = e instanceof Error ? e.message : String(e);
    return e instanceof SimulareAnulata ? { ok: false, motiv, eroare: false, anulata: true } : { ok: false, motiv, eroare: true };
  }
}

/**
 * Verificarea vectorilor (ADR 0124): problemele contururilor foii (sau ale formelor alese), în workerul CAM (ADR 0109).
 * `semnal` anulează calculul (un document schimbat, panoul închis): promisiunea e respinsă cu `CalculAnulat`.
 */
export function verificaVectorii(doc: Document, optiuni: OptiuniVerificare, semnal?: AbortSignal, indexFoaie = 0): Promise<VerificarePanou> {
  return verificareInBazin(doc, optiuni, semnal ? { semnal } : {}, indexFoaie);
}

/**
 * O reparație a verificării (ADR 0124 §10), pe documentul din clipa cererii, în workerul CAM: piesele schimbate și instanțele
 * de șters, pe care acțiunea `document.repara` le aplică într-un pas, doar dacă documentul e încă același.
 */
export function reparaVectorii(doc: Document, cerere: CerereReparare, optiuni: OptiuniReparare, semnal?: AbortSignal, indexFoaie = 0): Promise<RezultatReparare> {
  return reparareInBazin(doc, cerere, optiuni, semnal ? { semnal } : {}, indexFoaie);
}

/**
 * Legarea căilor (ADR 0182, felia 10.3↑o), pe documentul din clipa cererii, în workerul CAM: piesele schimbate și instanțele
 * de șters, pe care acțiunea `document.repara` le aplică într-un pas, doar dacă documentul e încă același.
 */
export function leagaVectorii(doc: Document, cerere: CerereLegare, optiuni: OptiuniLegare, semnal?: AbortSignal, indexFoaie = 0): Promise<RezultatLegare> {
  return legareInBazin(doc, cerere, optiuni, semnal ? { semnal } : {}, indexFoaie);
}

/**
 * Tăierea cu o linie dreaptă (ADR 0180, felia 10.3↑), pe documentul din clipa cererii, în workerul CAM: instanțele tăiate și
 * părțile lor, pe care acțiunea `document.taie` le aplică într-un pas, doar dacă documentul e încă același.
 */
export async function taieVectorii(doc: Document, cerere: CerereTaiere, semnal?: AbortSignal, indexFoaie = 0, laIntrebare?: () => void): Promise<RezultatTaiere & { readonly surori?: SuroriTaiere }> {
  const o = semnal ? { semnal } : {};
  const r = await taiereInBazin(doc, cerere, o, indexFoaie);
  if (r.ok || r.motiv !== 'impartita') return r;
  const s = await surori(doc, cerere.alese, indexFoaie, CUTITE_PIESA.has(cerere.cutit.fel), 'taie', semnal, laIntrebare);
  if (s.alegere === null) return { ok: false, motiv: 'renuntat' };
  if (s.alegere === 'piesa') {
    const x = await taiereInBazin(doc, { ...cerere, surori: 'piesa' }, o, indexFoaie);
    return x.ok ? { ...x, surori: { mod: 'piesa' } } : x;
  }
  const x = await taiereInBazin(await desprinse(doc, s.foaie, s.ids), cerere, o, indexFoaie);
  if (!x.ok) return x;
  // Se desprind doar instanțele tăiate; cele care pleacă (decuparea) sau rămân neatinse își păstrează surorile.
  const taiate = new Set(x.degrupate.map((d) => d.instanta.id));
  return { ...x, surori: { mod: 'desprinde', ids: s.ids.filter((id) => taiate.has(id)) } };
}

/**
 * Alegerea unei operații care ar schimba o piesă pusă de mai multe ori (felia 10.3↑m): instanțele alese cu surori ale foii, de
 * câte ori e pusă piesa lor și răspunsul (cel ținut, sau al benzii; null: omul a renunțat, sau semnalul s-a anulat: cine a
 * cerut calculul verifică oricum anularea înaintea rezultatului). `laIntrebare` spune panoului că așteaptă răspunsul.
 */
/**
 * Documentul de calcul pentru «Desprinde și …», prin calculul acțiunilor (bucata lui, la cerere, are deja desprinderea și
 * plăcuțele): importate aici, modulele pieselor legate ar ieși într-o bucată comună (+1,9 kB), iar aduse direct, la cerere, într-una
 * a lor (+2,4 kB), măsurat.
 */
async function desprinse(doc: Document, idFoaie: string, ids: readonly string[]): Promise<Document> {
  const m = await import('./actiuniDocumentCalcul.ts');
  return m.documentDesprins(doc, idFoaie, ids);
}

async function surori(doc: Document, alese: readonly string[], indexFoaie: number, piesa: boolean, fel: 'taie' | 'converteste', semnal?: AbortSignal,
  laIntrebare?: () => void): Promise<{ readonly foaie: string; readonly ids: readonly string[]; readonly alegere: AlegereSurori | null }> {
  const foaie = doc.foi[indexFoaie]?.id ?? '';
  const ids = aleseCuSurori(doc, foaie, alese);
  laIntrebare?.();
  const alegere = await cereAlegerea({ n: catePuse(doc, foaie, ids), piesa, fel }, semnal);
  return { foaie, ids, alegere };
}

/**
 * Tăierea în panouri (ADR 0181 §7, felia 10.3↑k), pe documentul din clipa cererii, în workerul CAM: degruparea și grupurile
 * panourilor, pe care acțiunea `document.taie` le aplică într-un pas, doar dacă documentul e încă același.
 */
export async function taiePanourile(doc: Document, cerere: CererePanouri, semnal?: AbortSignal, indexFoaie = 0, laIntrebare?: () => void): Promise<RezultatTaiere & { readonly surori?: SuroriTaiere }> {
  const o = semnal ? { semnal } : {};
  const r = await panouriInBazin(doc, cerere, o, indexFoaie);
  if (r.ok || r.motiv !== 'impartita') return r;
  // Panourile depind de locul fiecărei instanțe pe foaie: doar «Desprinde și taie». Fiecare formă aleasă ajunge într-un panou
  // (tăiată, grupată sau numită), deci toate cele cu surori se desprind.
  const s = await surori(doc, cerere.alese, indexFoaie, false, 'taie', semnal, laIntrebare);
  if (s.alegere === null) return { ok: false, motiv: 'renuntat' };
  const x = await panouriInBazin(await desprinse(doc, s.foaie, s.ids), cerere, o, indexFoaie);
  return x.ok ? { ...x, surori: { mod: 'desprinde', ids: s.ids } } : x;
}

/**
 * Conversia vectorilor (ADR 0180, felia 10.3↑d), pe documentul din clipa cererii, în workerul CAM: piesele schimbate, pe care
 * acțiunea `document.converteste` le aplică într-un pas, doar dacă documentul e încă același.
 */
export async function convertesteVectorii(doc: Document, cerere: CerereConversie, semnal?: AbortSignal, indexFoaie = 0, laIntrebare?: () => void): Promise<RezultatConversie & { readonly surori?: SuroriConversie }> {
  const o = semnal ? { semnal } : {};
  const r = await conversieInBazin(doc, cerere, o, indexFoaie);
  if (r.ok || r.motiv !== 'impartita') return r;
  const s = await surori(doc, cerere.alese, indexFoaie, true, 'converteste', semnal, laIntrebare);
  if (s.alegere === null) return { ok: false, motiv: 'renuntat' };
  if (s.alegere === 'piesa') {
    const x = await conversieInBazin(doc, { ...cerere, surori: 'piesa' }, o, indexFoaie);
    return x.ok ? { ...x, surori: { mod: 'piesa' } } : x;
  }
  const desprins = await desprinse(doc, s.foaie, s.ids);
  const x = await conversieInBazin(desprins, cerere, o, indexFoaie);
  return x.ok ? { ...x, surori: { mod: 'desprinde', desprins, alese: s.ids, foaie: s.foaie } } : x;
}

/** Ce ține `ProgramSimulare.date`: scula și mutările nucleului (IR-ul, în coordonatele documentului), cu grupurile de după schimbări. */
type DateSimulare = { readonly scula: DateScula; readonly mutari: Float64Array; readonly apoi?: readonly GrupSimulare[] };

/**
 * Programul documentului pentru vederea 3D (ADR 0057 §1): același CAM ca traseul și exportul (fără supracursă), apoi
 * mutările nucleului, cu fața plăcii la Z 0, în workerul CAM (ADR 0109); simularea, în bazin. Cu `dop` (de la 0), programul
 * dopului acela, pe semifabricatul lui (ADR 0178); oricum, și lista dopurilor foii. `semnal` anulează calculul (un document
 * schimbat, vederea închisă): promisiunea e respinsă cu `CalculAnulat`.
 */
export async function programSimulare(doc: Document, semnal?: AbortSignal, dop?: number): Promise<ProgramSimulare> {
  const r = await simulareInBazin(doc, semnal ? { semnal } : {}, dop, await resurse(doc));
  if (!r.ok) return r;
  const { scula, mutari, apoi } = r.simulare;
  const date: DateSimulare = { scula, mutari, ...(apoi ? { apoi } : {}) };
  return { ok: true, foaie: r.foaie, date, dopuri: r.dopuri, ...(r.motivDopuri !== undefined ? { motivDopuri: r.motivDopuri } : {}) };
}

/**
 * „Împreună (secțiunea)” (ADR 0179): dopul în V cu numărul `dop` (de la 0) întors în locașul lui, cu potrivirea măsurată,
 * în workerul CAM. `semnal` o anulează (altă alegere, un document schimbat, vederea închisă).
 */
export async function potrivireSimulata(doc: Document, dop: number, semnal?: AbortSignal): Promise<RaspunsPotrivire> {
  return potrivireInBazin(doc, dop, semnal ? { semnal } : {}, await resurse(doc));
}

/** Fereastra plăcii întregi, la celula implicită (sau dublată, peste plafonul celulelor: ADR 0047 §1). */
export function fereastraFoii(foaie: { readonly latime: number; readonly inaltime: number }): FereastraRelief {
  const c = campPentruFoaie(foaie);
  return { x0: c.x0, y0: c.y0, latime: c.latime, inaltime: c.inaltime, celula: c.celula };
}

/**
 * Relieful unei ferestre (ADR 0057 §2, §4): placa întreagă, sau o parte a ei la 0,1 mm; în bazinul de workere, cu
 * anularea vederii (un document schimbat, o fereastră nouă, vederea închisă). Ca la simularea exportului, `eroare` = s-a
 * stricat ceva (merge în jurnal); un refuz sau o anulare nu.
 */
export async function simuleazaRelief(
  program: Extract<ProgramSimulare, { ok: true }>, fereastra: FereastraRelief, semnal?: AbortSignal,
): Promise<ReliefSimulat> {
  const { scula, mutari, apoi } = program.date as DateSimulare;
  const camp: ParametriCamp = { ...fereastra, sus: 0 };
  const relief = reliefPentru(camp);
  if (!relief) return { ok: false, motiv: `fereastra de ${fereastra.latime} × ${fereastra.inaltime} mm nu încape în relief la ${fereastra.celula} mm`, eroare: false };
  try {
    const r = await simuleazaInBazin({ camp, scula, mutari, ...(apoi ? { apoi } : {}), fund: -program.foaie.grosime, relief }, fireImplicite(), semnal ? { semnal } : {});
    if (!r.relief) return { ok: false, motiv: 'simularea n-a întors relieful', eroare: true };
    return {
      ok: true, fereastra, latime: r.relief.latime, inaltime: r.relief.inaltime, bloc: r.relief.bloc, z: r.relief.z, sus: r.sus,
      fund: r.fund, adancimeMax: r.adancimeMax, prinFoaie: r.prinFoaie, fire: r.fire, ms: r.ms,
    };
  } catch (e) {
    const motiv = e instanceof Error ? e.message : String(e);
    return e instanceof SimulareAnulata ? { ok: false, motiv, eroare: false, anulata: true } : { ok: false, motiv, eroare: true };
  }
}

/**
 * Programul documentului pentru traseu (ADR 0038 §2), în workerul CAM (ADR 0109), despachetat pe firul principal pentru
 * stratul traseului și animație. `semnal` anulează calculul (un document schimbat, un „Arată traseul” nou): promisiunea e
 * respinsă cu `CalculAnulat`.
 */
export async function programTraseu(doc: Document, semnal?: AbortSignal): Promise<
  | { readonly ok: true; readonly program: Program; readonly urechiLemn?: readonly { readonly x: number; readonly y: number }[] }
  | { readonly ok: false; readonly motiv: string }
> {
  const r = await traseuInBazin(doc, semnal ? { semnal } : {}, await resurse(doc));
  return r.ok ? { ok: true, program: despacheteaza(r.program), ...(r.urechiLemn ? { urechiLemn: r.urechiLemn } : {}) } : r;
}

/**
 * Timpul jobului de lângă traseu (ADR 0046 §8), în workerul CAM: programul traseului prin același post și același contract
 * ca exportul, cu montajul stânga-jos și Z0 sus, apoi rezumatul (`timpProgram` din `src/jobs/rezumat.ts`). Programul și
 * mașina lui vin cu rezumatul: animația traseului (ADR 0099) pornește din cipul timpului.
 */
export async function timpTraseu(program: Program, foaie: Montaj['foaie'], setari: string | undefined, semnal?: AbortSignal): Promise<RezumatJob> {
  const r = await timpInBazin(impacheteaza(program), foaie, setari, semnal ? { semnal } : {});
  return r.ok ? { ...r, traseu: { program, foaie, setari } } : r;
}
