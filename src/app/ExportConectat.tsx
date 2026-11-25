import { useMemo } from 'react';
// Calculul acțiunilor pe care le dă fereastra asta (`actiuniDocument.ts`, `laCerere`) vine cu ea, nu în pachetul de pornire.
import '../ui/actiuniDocumentCalcul.ts';
import type { OrigineXY } from '../ir/montaj.ts';
import { esteCaleDeschisa, type Document, type Operatie } from '../model/document.ts';
import { grupeazaPeScula, taieturiFoaie, type ElementLume } from '../model/lume.ts';
import { conturElement, esteContur } from '../model/forme.ts';
import { DialogExport } from '../ui/DialogExport.tsx';
import type {
  CerereExport, CopieRand, FrezaOferita, FrezaRestOperatie, OperatieExport, OrigineFreza, Rand, RezultatInapoi, StareExport,
} from '../ui/exportRand.ts';
import { frezePotrivite, pasLateralDin, sculaDinBiblioteca } from '../model/alegereFreza.ts';
import { areCam, frezaDinCopie, type FrezaSalvata } from '../model/freza.ts';
import type { FrezaRest, Scula } from '../model/document.ts';
import { useBibliotecaProiectCuCheie } from './bibliotecaProiect.ts';
import type { Config } from './config.ts';
import { useContTinut } from './dreptCont.ts';
import { CHEIE_LOCALA, frezeMele } from './frezeMele.ts';
import { trimiteSchimbarea } from './frezeSincronizare.ts';
import { cuprinse } from '../model/ordine.ts';
import { numePlacutei, placuteCuTextIesit } from '../model/placuteIesire.ts';
import { iesireTextTinuta } from './iesireTextTinuta.ts';
import { operatieDinDialog } from './valoriOperatii.ts';
import { numarUrechiAlese } from '../model/urechiLocuri.ts';
import { mesajeGata } from '../i18n/laCerere.ts';
import { diametruCerc } from '../cam/gaurireFel.ts';
import { hartieRand } from './hartieExport.ts';

/** Originea frezei din „Frezele mele” a unei scule din document (ADR 0300 §5): numele, id-ul, valorile de lucru, tăișul. */
function origineDin(s: Scula): OrigineFreza | null {
  if (!s.biblioteca) return null;
  return {
    nume: s.nume, biblioteca: { id: s.biblioteca.id, rev: s.biblioteca.rev },
    ...(s.regim ? { regim: { turatie: s.regim.turatie, avans: s.regim.avans, plonjare: s.regim.plonjare } } : {}),
    ...(s.tais !== undefined ? { tais: s.tais } : {}),
  };
}

/** O freză de rest din document pentru fereastră (ADR 0093), cu originea ei din „Frezele mele” (felia 16.A↑b-5). */
const restDin = (r: FrezaRest): FrezaRestOperatie => ({ numar: r.scula.numar, diametru: r.scula.diametru, pasLateral: r.pasLateral, origine: origineDin(r.scula) });

/** Mesajele modulului, ca date (ADR 0086): cine îl încarcă le așteaptă (`cuMesaje`); un refuz îl vede tot el. */
export const mesaje = mesajeGata();
mesaje.catch(() => undefined);

/**
 * Dialogul de export legat de document: rândurile operațiilor și harta operațiilor noi de la Exportă. Vine la cerere, cu
 * dialogul (`App.tsx`), ca valorile operațiilor să nu stea în pachetul de pornire; aplicația păstrează doar scrierea în
 * document și exportul.
 */
type Props = {
  readonly doc: Document;
  /** Elementele în lume după `idLume` și lista lor, deja calculate de aplicație pentru pânză și listă. */
  readonly dupaIdLume: ReadonlyMap<string, ElementLume>;
  readonly lume: readonly ElementLume[];
  /** Un element în lume, în cuvinte (ca în listă). */
  readonly descriere: (e: Pick<ElementLume, 'forma' | 'matrice'>) => string;
  /** Limba activă: descrierile se refac la schimbarea ei. */
  readonly limba: string;
  readonly baza: number;
  readonly doarCitire: boolean;
  readonly stare: StareExport | null;
  /** Exportă: operațiile noi ale pieselor (după id-ul piesei), cu cererea dialogului. */
  readonly onExporta: (noi: ReadonlyMap<string, Operatie[]>, c: CerereExport) => void;
  readonly onInchide: () => void;
  readonly onReseteaza: () => void;
  /** Răspunsul la `$$` lipit (ADR 0046 §8): îl ține aplicația, comun cu timpul de lângă traseu. */
  readonly setariMasina: string;
  readonly onSetariMasina: (text: string) => void;
  /** Supracursa scrisă de om (ADR 0176): o ține aplicația, ca setările mașinii, de la o fereastră la alta. */
  readonly supracursa: string;
  readonly onSupracursa: (text: string) => void;
  /** Bifa tăieturilor cât foaia (ADR 0177): o ține aplicația, ca supracursa. */
  readonly prinFoaie: boolean;
  readonly onPrinFoaie: (bifata: boolean) => void;
  /** „Deschide în Mașina” (ADR 0132 §7), dat de aplicație doar după un export pe care senderul îl vorbește. */
  readonly onDeschideInMasina?: () => void;
  /** Deschis din „Trimite la mașină” (ADR 0250, felia 28.1↑d): butonul principal o spune, iar aplicația duce programul în Mașina. */
  readonly trimite?: boolean;
  /** Numele foii exportate, pentru titlu (ADR 0210 §5), când proiectul are mai multe. */
  readonly foaie?: string;
  /** Numele scris al foii active (ADR 0291 §5), pentru propunerea numelui fișierului. */
  readonly numeFoaie?: string;
  /** Documentul cu toate foile (ADR 0210 §5): „Toate foile” și plăcuțele tuturor. */
  readonly toate: Document;
  /** „Raportul foilor…” (ADR 0210 §6): aplicația închide exportul și deschide raportul. */
  readonly onRaport?: (p: { readonly origine: OrigineXY; readonly z0: 'sus' | 'jos' }) => void;
  /**
   * „Alege pe desen…” (ADR 0211, 3a): operația `operatie` a piesei `piesa`, cu urechile rândului; aplicația ascunde fereastra și
   * pune pânza în modul urechilor.
   */
  readonly onAlegeUrechi?: (a: { readonly piesa: string; readonly operatie: string; readonly numar: number; readonly latime: number; readonly grosime: number }) => void;
  /** Configurația aplicației: „Pune-o înapoi în bibliotecă” trimite freza în cont (ADR 0300 §5, felia 16.A↑b-6); null = doar aici. */
  readonly config?: Config | null;
};

/** Plăcuțele foii `k` (toate foile, fără el) cu textul ieșit, cu numele lor și confirmarea aleasă în fereastra CSV; altfel nimic. */
function placuteIesite(d: Document, k?: number): { readonly nume: readonly string[]; readonly confirmare: boolean } | undefined {
  const piese = new Map(d.piese.map((p) => [p.id, p]));
  const nume = placuteCuTextIesit(d, k).map((i) => numePlacutei(i, piese.get(i.piesa)));
  return nume.length > 0 ? { nume, confirmare: iesireTextTinuta() === 'confirmare' } : undefined;
}

export function ExportConectat({
  doc, dupaIdLume, lume, descriere, limba, baza, doarCitire, stare, onExporta, onInchide, onReseteaza, setariMasina, onSetariMasina,
  supracursa, onSupracursa, prinFoaie, onPrinFoaie, onDeschideInMasina, trimite, foaie, numeFoaie, toate, onRaport, onAlegeUrechi,
  config = null,
}: Props) {
  /**
   * Dialogul de export arată operațiile pieselor de pe foaie (ADR 0025): câte un rând pe operație, cu descrierea primului
   * ei element în prima instanță a piesei. Freza e comună tuturor, până la schimbarea sculei. Se calculează doar cu
   * dialogul deschis, liniar (o hartă a pieselor, o mulțime a celor văzute), o dată pe document și pe limbă.
   */
  const exportFoaie = useMemo(() => {
    const piese = new Map(doc.piese.map((p) => [p.id, p]));
    const vazute = new Set<string>();
    const lista: Array<{ readonly piesa: Document['piese'][number]; readonly instanta: string }> = [];
    for (const i of doc.foi[0]?.instante ?? []) {
      const p = vazute.has(i.piesa) ? undefined : piese.get(i.piesa);
      if (!p) continue;
      vazute.add(p.id);
      lista.push({ piesa: p, instanta: i.id });
    }
    // Ce stă în interiorul fiecărui rând (ADR 0133 §3), în prima instanță a piesei, ca rândurile: riscul îl judecă dialogul,
    // după latura aleasă acolo.
    const inauntru = cuprinse(lista.flatMap(({ piesa, instanta: inst }) => piesa.operatii.map((o) => {
      const contururi = o.noduri.flatMap((n) => {
        const e = dupaIdLume.get(`${inst}/${n}`);
        return e && esteContur(e) ? [conturElement(e)] : [];
      });
      return { cheie: `${piesa.id}/${o.id}`, piesa: piesa.id, contururi, punct: contururi[0]?.varfuri[0]?.p ?? null };
    })));
    const randuriOp: OperatieExport[] = lista.flatMap(({ piesa, instanta: inst }) => piesa.operatii.map((o) => {
      const e = dupaIdLume.get(`${inst}/${o.noduri[0] ?? ''}`);
      const cuprinseOp = inauntru.get(`${piesa.id}/${o.id}`);
      const baza = e ? descriere(e) : (piesa.nume ?? piesa.id);
      return {
        cheie: `${piesa.id}/${o.id}`,
        descriere: o.noduri.length > 1 ? `${baza} (+${o.noduri.length - 1})` : baza,
        // Câte căi deschise taie operația (ADR 0037 §12): dialogul nu oferă ce refuză exportul pe ele.
        deschise: o.noduri.filter((n) => {
          const e = dupaIdLume.get(`${inst}/${n}`);
          return e !== undefined && esteCaleDeschisa(e.forma);
        }).length,
        noduri: o.noduri.length,
        // Găurirea (ADR 0087): doar pe un rând numai cu cercuri.
        cercuri: o.noduri.length > 0 && o.noduri.every((n) => dupaIdLume.get(`${inst}/${n}`)?.forma.tip === 'cerc'),
        // Diametrele cercurilor, ca le citește găurirea (ADR 0291, felia 28.8↑h): fișa spune felul și cercul care nu se găurește.
        ...((d) => (d.length > 0 ? { diametre: d } : {}))([...new Set(o.noduri.flatMap((n) => {
          const e = dupaIdLume.get(`${inst}/${n}`);
          return e && e.forma.tip === 'cerc' ? [diametruCerc(e.forma.raza, e.matrice)] : [];
        }))].sort((a, b) => a - b)),
        // Locul în ordinea de mână (ADR 0133), dacă documentul îl are, și rândurile din interiorul formelor ei.
        ...(o.rang !== undefined ? { rang: o.rang } : {}),
        ...(cuprinseOp ? { inauntru: cuprinseOp } : {}),
        valori: {
          scula: {
            numar: o.scula.numar, diametru: o.scula.diametru,
            ...(o.scula.forma ? { forma: { tip: 'v' as const, unghi: o.scula.forma.unghi, ...(o.scula.forma.varf !== undefined ? { varf: o.scula.forma.varf } : {}) } } : {}),
            // Freza din „Frezele mele” (ADR 0300 §4, felia 16.A↑b-3): originea ei, dacă documentul o are; altfel scrisă de mână.
            origine: origineDin(o.scula),
          },
          latura: o.latura, sens: o.sens, adancime: o.adancime, pas: o.pas,
          urechi: o.urechi ? {
            numar: o.urechi.numar, latime: o.urechi.latime, grosime: o.urechi.grosime,
            ...(o.urechi.mod === 'alese' ? { mod: 'alese' as const, alese: numarUrechiAlese(o) } : o.urechi.mod !== undefined && o.urechi.mod !== 'egale' ? { mod: o.urechi.mod } : {}),
          } : null,
          rampa: o.rampa ? { lungime: o.rampa.lungime } : null,
          intrari: o.intrari ? { raza: o.intrari.raza } : null,
          colturi: o.colturi ? { tip: o.colturi.tip } : null,
          ...(o.despartire ? { despartire: true } : {}),
          ...(o.tip === 'profil' && o.latura === 'pe-linie' && o.directie ? { directie: o.directie } : {}),
          ...(o.tip === 'buzunar' && o.pasLateral !== undefined ? { tip: 'buzunar' as const, pasLateral: o.pasLateral } : {}),
          ...(o.tip === 'buzunar' && o.coborare ? { coborare: o.coborare } : {}),
          ...(o.tip === 'buzunar' && o.strategie ? { strategie: { fel: 'paralel' as const, unghi: o.strategie.unghi } } : {}),
          ...(o.tip === 'buzunar' && o.rest ? { rest: o.rest.map(restDin) } : {}),
          // Incrustația cu pereți drepți (ADR 0171): rândul o arată ca rol, cu valorile ei și frezele dopului (lipsă = ale locașului);
          // punțile dopului decupat (ADR 0174), dacă le are.
          ...(o.tip === 'buzunar' ? {
            incrustatieDreapta: o.incrustatie?.fel === 'drept' ? {
              jocLateral: o.incrustatie.jocLateral, dop: o.incrustatie.dop, sprijin: o.incrustatie.sprijin, joc: o.incrustatie.joc,
              fierastrau: o.incrustatie.fierastrau, margine: o.incrustatie.margine,
              ...(o.incrustatie.frezeDop ? { frezeDop: o.incrustatie.frezeDop.map(restDin) } : {}),
              ...(o.incrustatie.punti ? { punti: { numar: o.incrustatie.punti.numar, latime: o.incrustatie.punti.latime, grosime: o.incrustatie.punti.grosime } } : {}),
              ...(o.incrustatie.locas === 'gaura' ? { locas: 'gaura' as const } : {}),
              // Treapta (ADR 0175 §5): umărul, cu încotro (lipsă = spre interior).
              ...(o.incrustatie.treapta ? {
                treapta: {
                  adancime: o.incrustatie.treapta.adancime, latime: o.incrustatie.treapta.latime,
                  ...(o.incrustatie.treapta.spre === 'exterior' ? { spre: 'exterior' as const } : {}),
                },
              } : {}),
            } : null,
          } : {}),
          ...(o.tip === 'vcarve' ? {
            tip: 'vcarve' as const,
            fundPlat: o.fundPlat ? {
              numar: o.fundPlat.scula.numar, diametru: o.fundPlat.scula.diametru, pasLateral: o.fundPlat.pasLateral, origine: origineDin(o.fundPlat.scula),
              ...(o.fundPlat.rest ? { rest: o.fundPlat.rest.map(restDin) } : {}),
            } : null,
            // Incrustația (ADR 0170): rândul o arată ca rol, cu jocurile și marginea ei; banda (ADR 0172), cu valorile ei.
            incrustatie: o.incrustatie?.fel === 'v' ? {
              joc: o.incrustatie.joc, fierastrau: o.incrustatie.fierastrau, margine: o.incrustatie.margine, jurDop: o.incrustatie.jurDop,
              ...(o.incrustatie.banda ? { banda: {
                ...(o.incrustatie.banda.latime !== undefined ? { latime: o.incrustatie.banda.latime } : {}), decupare: o.incrustatie.banda.decupare,
                grosimePlaca: o.incrustatie.banda.grosimePlaca,
                ...(o.incrustatie.banda.freza ? {
                  freza: { numar: o.incrustatie.banda.freza.numar, diametru: o.incrustatie.banda.freza.diametru, origine: origineDin(o.incrustatie.banda.freza) },
                } : {}),
                punti: { numar: o.incrustatie.banda.punti.numar, latime: o.incrustatie.banda.punti.latime, grosime: o.incrustatie.banda.punti.grosime },
              } } : {}),
            } : null,
          } : {}),
          ...(o.tip === 'gaurire' ? { tip: 'gaurire' as const, ...(o.retragereCompleta !== undefined ? { retragereCompleta: o.retragereCompleta } : {}) } : {}),
        },
      };
    }));
    return {
      piese: lista,
      randuri: randuriOp,
      // Ordinea automată a rândurilor (ADR 0133 §3): prima tăietură a fiecărei operații în ordinea lucrării fără ranguri.
      automata: [...new Set(grupeazaPeScula(taieturiFoaie(doc, 0)).map((x) => `${x.piesa}/${x.operatie}`))],
      descrieri: new Map(lume.map((e) => [e.idLume, descriere(e)])),
    };
    // `limba`: descrierile sunt texte traduse.
  }, [doc, dupaIdLume, lume, descriere, limba]);

  /**
   * Plăcuțele foii cu textul ieșit din ele (ADR 0210 §4, răspunsul 5): o notă, sau confirmarea, dacă omul a ales-o în fereastra
   * CSV. Un obiect nou la fiecare document: o bifă pusă pe plăcuțele de dinainte nu trece pe altele.
   */
  const placute = useMemo(() => placuteIesite(doc, 0), [doc]);
  // Cu „Toate foile” (ADR 0210 §5), plăcuțele tuturor foilor.
  const placuteToate = useMemo(() => placuteIesite(toate), [toate]);

  /**
   * Exportă: valorile din dialog, ca operațiile noi ale fiecărei piese de pe foaie (aplicația le scrie într-un singur pas), cu
   * rangul fiecăreia în ordinea omului, 0 … n − 1, sau fără rang în ordinea automată (ADR 0133 §3).
   */
  /**
   * Frezele din „Frezele mele” care merg pe tăietura unui rând (ADR 0300 §4, felia 16.A↑b-3): copia fiecăreia cu T-ul ei
   * preferat (fereastra îl schimbă după celelalte freze), originea, pasul și pasul lateral.
   */
  const { stare: biblioteca, cheie: cheieBiblioteca } = useBibliotecaProiectCuCheie();
  const uid = useContTinut()?.uid ?? null;
  /** O freză din bibliotecă, cum o primește fereastra (ADR 0300 §4): copia ei, cu originea, pasul și pasul lateral. */
  const oferita = (f: FrezaSalvata): FrezaOferita => {
    const s = sculaDinBiblioteca(f, f.numar);
    return {
      id: f.id, nume: f.nume, pas: f.pas, pasLateral: pasLateralDin(f),
      scula: {
        numar: s.numar, diametru: s.diametru,
        ...(s.forma ? { forma: { tip: 'v' as const, unghi: s.forma.unghi, ...(s.forma.varf !== undefined ? { varf: s.forma.varf } : {}) } } : {}),
        origine: origineDin(s)!,
      },
    };
  };
  const frezeOferite = useMemo(() => {
    const dupaFel = new Map<string, readonly FrezaOferita[]>();
    return (r: Pick<Rand, 'tip' | 'latura'>): readonly FrezaOferita[] => {
      const k = `${r.tip}/${r.latura}`;
      const gata = dupaFel.get(k);
      if (gata) return gata;
      const lista = frezePotrivite(biblioteca.freze, [{ tip: r.tip, latura: r.latura }]).map(oferita);
      dupaFel.set(k, lista);
      return lista;
    };
  }, [biblioteca.freze]);
  // Toată biblioteca cu CAM (ADR 0300 §5, felia 16.A↑b-4), pentru nota „s-a schimbat în bibliotecă” și recunoașterea; null cât
  // nu e citită (fereastra nu spune „nu mai e în bibliotecă” înainte să știe).
  const bibliotecaToata = useMemo(() => (biblioteca.incarcata ? biblioteca.freze.filter((f) => areCam(f.fel)).map(oferita) : null), [biblioteca]);
  /**
   * „Pune-o înapoi în bibliotecă” (ADR 0300 §5, felia 16.A↑b-6): freza din copia de pe rând, în biblioteca proiectului, cu
   * id-ul ei de dinainte și o versiune nouă; în biblioteca unui cont pleacă și în cont (fără dreptul de scriere, rămâne aici,
   * ca orice schimbare). Cu id-ul încă acolo (pusă la loc în altă filă), biblioteca se citește din nou și nota se reface.
   */
  const puneInapoi = async (c: CopieRand): Promise<RezultatInapoi> => {
    const b = frezeMele(cheieBiblioteca);
    const r = await b.puneInapoi(c.id, c.rev + 1, frezaDinCopie(c));
    if (r.ok) {
      if (cheieBiblioteca !== CHEIE_LOCALA && uid !== null && config !== null) trimiteSchimbarea(cheieBiblioteca, uid, config);
      return { ok: true, freza: oferita(r.freza) };
    }
    const p = r.probleme;
    if ('id' in p && p.id === 'exista') { void b.reincarca(); return { ok: false, motiv: 'exista' }; }
    if ('lista' in p && (p.lista === 'plina' || p.lista === 'versiune')) return { ok: false, motiv: p.lista };
    return { ok: false, motiv: 'valori' };
  };

  const exporta = (c: CerereExport): void => {
    const loc = c.ordine ? new Map(c.ordine.map((k, i) => [k, i])) : null;
    const noi = new Map<string, Operatie[]>();
    for (const { piesa } of exportFoaie.piese) {
      noi.set(piesa.id, piesa.operatii.map((o) => {
        const cheie = `${piesa.id}/${o.id}`;
        const v = c.valori.get(cheie);
        const { rang: _rang, ...faraRang } = operatieDinDialog(o, v, v?.scula ?? o.scula);
        void _rang;
        const r = loc?.get(cheie);
        return r !== undefined ? { ...faraRang, rang: r } : faraRang;
      }));
    }
    onExporta(noi, c);
  };

  return (
    <DialogExport
      baza={baza}
      {...(foaie === undefined ? {} : { foaie })}
      {...(numeFoaie === undefined ? {} : { numeFoaie })}
      {...(doc.foi[0] ? { grosimeFoaie: doc.foi[0].stoc.grosime } : {})}
      hartie={hartieRand}
      operatii={exportFoaie.randuri}
      ordineAutomata={exportFoaie.automata}
      descrieri={exportFoaie.descrieri}
      doarCitire={doarCitire}
      stare={stare}
      onExporta={exporta}
      onInchide={onInchide}
      onReseteaza={onReseteaza}
      setariMasina={setariMasina}
      onSetariMasina={onSetariMasina}
      supracursa={supracursa}
      onSupracursa={onSupracursa}
      prinFoaie={prinFoaie}
      onPrinFoaie={onPrinFoaie}
      {...(onDeschideInMasina ? { onDeschideInMasina } : {})}
      {...(trimite ? { trimite } : {})}
      {...(placute ? { placute } : {})}
      {...(placuteToate ? { placuteToate } : {})}
      foi={toate.foi.length}
      {...(biblioteca.freze.length > 0 ? { frezeOferite } : {})}
      bibliotecaToata={bibliotecaToata}
      onPuneInapoi={puneInapoi}
      {...(onRaport ? { onRaport } : {})}
      {...(onAlegeUrechi ? {
        onAlegeUrechi: (cheie: string, u: { readonly numar: number; readonly latime: number; readonly grosime: number }) => {
          // Cheia rândului e `<piesă>/<operație>`; id-urile n-au „/” (`schemaDocument.ts`).
          const k = cheie.indexOf('/');
          if (k > 0) onAlegeUrechi({ piesa: cheie.slice(0, k), operatie: cheie.slice(k + 1), ...u });
        },
      } : {})}
    />
  );
}
