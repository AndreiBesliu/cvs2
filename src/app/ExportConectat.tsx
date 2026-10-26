import { useMemo } from 'react';
// Calculul acțiunilor pe care le dă fereastra asta (`actiuniDocument.ts`, `laCerere`) vine cu ea, nu în pachetul de pornire.
import '../ui/actiuniDocumentCalcul.ts';
import { esteCaleDeschisa, type Document, type Operatie } from '../model/document.ts';
import type { ElementLume } from '../model/lume.ts';
import { DialogExport, type CerereExport, type OperatieExport, type StareExport } from '../ui/DialogExport.tsx';
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
};

export function ExportConectat({
  doc, dupaIdLume, lume, descriere, limba, baza, doarCitire, stare, onExporta, onInchide, onReseteaza, setariMasina, onSetariMasina,
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
    const randuriOp: OperatieExport[] = lista.flatMap(({ piesa, instanta: inst }) => piesa.operatii.map((o) => {
      const e = dupaIdLume.get(`${inst}/${o.noduri[0] ?? ''}`);
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
        valori: {
          scula: { numar: o.scula.numar, diametru: o.scula.diametru },
          latura: o.latura, sens: o.sens, adancime: o.adancime, pas: o.pas,
          urechi: o.urechi ? { numar: o.urechi.numar, latime: o.urechi.latime, grosime: o.urechi.grosime } : null,
          rampa: o.rampa ? { lungime: o.rampa.lungime } : null,
          intrari: o.intrari ? { raza: o.intrari.raza } : null,
          colturi: o.colturi ? { tip: o.colturi.tip } : null,
          ...(o.despartire ? { despartire: true } : {}),
          ...(o.tip === 'buzunar' && o.pasLateral !== undefined ? { tip: 'buzunar' as const, pasLateral: o.pasLateral } : {}),
          ...(o.tip === 'buzunar' && o.coborare ? { coborare: o.coborare } : {}),
          ...(o.tip === 'gaurire' ? { tip: 'gaurire' as const, ...(o.retragereCompleta !== undefined ? { retragereCompleta: o.retragereCompleta } : {}) } : {}),
        },
      };
    }));
    return {
      piese: lista,
      randuri: randuriOp,
      descrieri: new Map(lume.map((e) => [e.idLume, descriere(e)])),
    };
    // `limba`: descrierile sunt texte traduse.
  }, [doc, dupaIdLume, lume, descriere, limba]);

  /** Exportă: valorile din dialog, ca operațiile noi ale fiecărei piese de pe foaie (aplicația le scrie într-un singur pas). */
  const exporta = (c: CerereExport): void => {
    const noi = new Map<string, Operatie[]>();
    for (const { piesa } of exportFoaie.piese) {
      noi.set(piesa.id, piesa.operatii.map((o) => {
        const v = c.valori.get(`${piesa.id}/${o.id}`);
        return operatieDinDialog(o, v, v?.scula ?? o.scula);
      }));
    }
    onExporta(noi, c);
  };

  return (
    <DialogExport
      baza={baza}
      operatii={exportFoaie.randuri}
      descrieri={exportFoaie.descrieri}
      doarCitire={doarCitire}
      stare={stare}
      onExporta={exporta}
      onInchide={onInchide}
      onReseteaza={onReseteaza}
      setariMasina={setariMasina}
      onSetariMasina={onSetariMasina}
    />
  );
}
