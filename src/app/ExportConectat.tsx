import { useMemo } from 'react';
// Calculul acțiunilor pe care le dă fereastra asta (`actiuniDocument.ts`, `laCerere`) vine cu ea, nu în pachetul de pornire.
import '../ui/actiuniDocumentCalcul.ts';
import { esteCaleDeschisa, type Document, type Operatie } from '../model/document.ts';
import { grupeazaPeScula, taieturiFoaie, type ElementLume } from '../model/lume.ts';
import { conturElement } from '../model/forme.ts';
import { DialogExport, type CerereExport, type OperatieExport, type StareExport } from '../ui/DialogExport.tsx';
import { cuprinse } from '../model/ordine.ts';
import { operatieDinDialog } from './valoriOperatii.ts';
import { mesajeGata } from '../i18n/laCerere.ts';

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
  /** „Deschide în Mașina” (ADR 0132 §7), dat de aplicație doar după un export pe care senderul îl vorbește. */
  readonly onDeschideInMasina?: () => void;
};

export function ExportConectat({
  doc, dupaIdLume, lume, descriere, limba, baza, doarCitire, stare, onExporta, onInchide, onReseteaza, setariMasina, onSetariMasina,
  onDeschideInMasina,
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
        return e ? [conturElement(e)] : [];
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
        // Locul în ordinea de mână (ADR 0133), dacă documentul îl are, și rândurile din interiorul formelor ei.
        ...(o.rang !== undefined ? { rang: o.rang } : {}),
        ...(cuprinseOp ? { inauntru: cuprinseOp } : {}),
        valori: {
          scula: {
            numar: o.scula.numar, diametru: o.scula.diametru,
            ...(o.scula.forma ? { forma: { tip: 'v' as const, unghi: o.scula.forma.unghi, ...(o.scula.forma.varf !== undefined ? { varf: o.scula.forma.varf } : {}) } } : {}),
          },
          latura: o.latura, sens: o.sens, adancime: o.adancime, pas: o.pas,
          urechi: o.urechi ? { numar: o.urechi.numar, latime: o.urechi.latime, grosime: o.urechi.grosime } : null,
          rampa: o.rampa ? { lungime: o.rampa.lungime } : null,
          intrari: o.intrari ? { raza: o.intrari.raza } : null,
          colturi: o.colturi ? { tip: o.colturi.tip } : null,
          ...(o.despartire ? { despartire: true } : {}),
          ...(o.tip === 'profil' && o.latura === 'pe-linie' && o.directie ? { directie: o.directie } : {}),
          ...(o.tip === 'buzunar' && o.pasLateral !== undefined ? { tip: 'buzunar' as const, pasLateral: o.pasLateral } : {}),
          ...(o.tip === 'buzunar' && o.coborare ? { coborare: o.coborare } : {}),
          ...(o.tip === 'buzunar' && o.strategie ? { strategie: { fel: 'paralel' as const, unghi: o.strategie.unghi } } : {}),
          ...(o.tip === 'buzunar' && o.rest ? { rest: o.rest.map((r) => ({ numar: r.scula.numar, diametru: r.scula.diametru, pasLateral: r.pasLateral })) } : {}),
          ...(o.tip === 'vcarve' ? {
            tip: 'vcarve' as const,
            fundPlat: o.fundPlat ? {
              numar: o.fundPlat.scula.numar, diametru: o.fundPlat.scula.diametru, pasLateral: o.fundPlat.pasLateral,
              ...(o.fundPlat.rest ? { rest: o.fundPlat.rest.map((r) => ({ numar: r.scula.numar, diametru: r.scula.diametru, pasLateral: r.pasLateral })) } : {}),
            } : null,
            // Incrustația (ADR 0170): rândul o arată ca rol, cu jocurile și marginea ei.
            incrustatie: o.incrustatie
              ? { joc: o.incrustatie.joc, fierastrau: o.incrustatie.fierastrau, margine: o.incrustatie.margine, jurDop: o.incrustatie.jurDop } : null,
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
   * Exportă: valorile din dialog, ca operațiile noi ale fiecărei piese de pe foaie (aplicația le scrie într-un singur pas), cu
   * rangul fiecăreia în ordinea omului, 0 … n − 1, sau fără rang în ordinea automată (ADR 0133 §3).
   */
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
      {...(onDeschideInMasina ? { onDeschideInMasina } : {})}
    />
  );
}
