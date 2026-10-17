import { useEffect, useRef, useState } from 'react';
// Calculul acțiunilor pe care le dă fereastra asta (`actiuniDocument.ts`, `laCerere`) vine cu ea, nu în pachetul de pornire.
import '../ui/actiuniDocumentCalcul.ts';
import { ruleaza, type Registru, type RezultatActiune } from '../ui/actiuni.ts';
import { PLAFON_IMPORT, type ContextImport, type FisierImport, type ImportPregatit, type PrevizualizareImport } from '../ui/actiuniImport.ts';
import { DialogImport } from '../ui/DialogImport.tsx';

/** Locul lăsării pe planșă (mm ai foii), sau null (butonul, ori lăsate în afara pânzei). */
type Loc = { readonly x: number; readonly y: number } | null;

/**
 * Importul SVG (ADR 0035 §9): fișierul ales, px-ul și previzualizarea. Cât e deschis, documentul nu se schimbă pe altă
 * cale (aplicația e inertă sub dialog): „Importă” adaugă exact ce arată dialogul.
 */
type StareDialog = {
  readonly fisier: FisierImport | null; readonly nume: string; readonly px: 96 | 72; readonly pxAutomat: boolean;
  readonly stare: PrevizualizareImport | 'citire';
  /** Se recitește cu alt px: previzualizarea veche rămâne pe ecran (și focusul pe alegere), dar „Importă” e oprit. */
  readonly seRecitesc?: boolean;
};

type Props = {
  /** Coada fișierelor alese sau lăsate pe planșă (felia 2.8b), cel puțin unul: dialogul le trece pe rând. */
  readonly fisiere: readonly File[];
  readonly punct: Loc;
  readonly registruImport: Registru<ContextImport>;
  /** Contextul ușii SVG pentru un fișier și un px (limba, fila care doar citește, jurnalul: ale aplicației). */
  readonly contextImport: (f: FisierImport | null, px: 96 | 72, rezultat: (r: PrevizualizareImport) => void) => ContextImport;
  /** Starea și rularea lui `document.importa`, prin registrul și contextul aplicației. */
  readonly stareImporta: (p: ImportPregatit, loc: Loc) => RezultatActiune;
  readonly importa: (p: ImportPregatit, loc: Loc) => RezultatActiune;
  readonly onInchide: () => void;
};

/**
 * Starea de la care pornește dialogul pentru un fișier al cozii. Deocamdată doar SVG (după nume sau tip); celelalte
 * formate vin mai târziu. Peste plafon, fișierul nu se citește deloc (ADR 0035 §1).
 */
function stareInitiala(f: File): StareDialog {
  if (!/\.svg$/i.test(f.name) && f.type !== 'image/svg+xml') return { fisier: null, nume: f.name, px: 96, pxAutomat: false, stare: { ok: false, cod: 'tip' } };
  if (f.size > PLAFON_IMPORT.octeti) return { fisier: null, nume: f.name, px: 96, pxAutomat: false, stare: { ok: false, cod: 'octeti', detaliu: String(f.size) } };
  return { fisier: null, nume: f.name, px: 96, pxAutomat: false, stare: 'citire' };
}

/**
 * Dialogul importului legat de coadă: citirea fișierelor, recitirea Illustrator la 72 px și locul fiecărei piese. Vine la
 * cerere, cu dialogul (`App.tsx`); aplicația ține doar coada (fișierele și punctul), garda „doar citire” și inerția.
 */
export function ImportConectat({ fisiere, punct, registruImport, contextImport, stareImporta, importa, onInchide }: Props) {
  const [k, setK] = useState(0);
  const [dialog, setDialog] = useState<StareDialog>(() => stareInitiala(fisiere[0] ?? new File([], '')));
  /** Numărul ultimei citiri: un rezultat întârziat al unei citiri vechi (alt fișier, alt px, dialog închis) se aruncă. */
  const cerere = useRef(0);

  const inchide = (): void => {
    cerere.current++;
    onInchide();
  };
  /**
   * Citește fișierul ales cu `px` px pe țol. Un fișier pe care îl spune Illustrator și a cărui mapare depinde de px se
   * recitește o dată cu 72 (ADR 0035 §2), iar dialogul spune de ce.
   */
  const citeste = (f: FisierImport, px: 96 | 72, automat: boolean, vechi?: PrevizualizareImport): void => {
    const c = ++cerere.current;
    setDialog(vechi
      ? { fisier: f, nume: f.nume, px, pxAutomat: automat, stare: vechi, seRecitesc: true }
      : { fisier: f, nume: f.nume, px, pxAutomat: automat, stare: 'citire' });
    const pornit = ruleaza(registruImport, 'import.svg', contextImport(f, px, (r) => {
      if (c !== cerere.current) return;
      if (!automat && px === 96 && r.ok && r.px && r.illustrator) {
        citeste(f, 72, true);
        return;
      }
      setDialog({ fisier: f, nume: f.nume, px, pxAutomat: automat, stare: r });
    }));
    // Acțiunea oprită (fila a trecut între timp pe „doar citire”): dialogul nu așteaptă un rezultat care nu vine.
    if (!pornit.ok) inchide();
  };
  /** Un fișier al cozii: verificările sincrone, apoi octeții, apoi ușa. */
  const incepe = (f: File): void => {
    const initiala = stareInitiala(f);
    const c = ++cerere.current;
    setDialog(initiala);
    if (initiala.stare !== 'citire') return;
    f.arrayBuffer().then((b) => {
      if (c === cerere.current) citeste({ nume: f.name, octeti: new Uint8Array(b) }, 96, false);
    }, (e: unknown) => {
      if (c === cerere.current) setDialog({ fisier: null, nume: f.name, px: 96, pxAutomat: false, stare: { ok: false, cod: 'parsare', detaliu: String(e) } });
    });
  };
  // Primul fișier, la montare (o coadă nouă e o montare nouă: aplicația scoate dialogul la închidere). La demontare, un
  // rezultat întârziat nu mai are unde ajunge.
  useEffect(() => {
    const f = fisiere[0];
    if (f) incepe(f);
    return () => { cerere.current++; };
  }, []);
  /** Fișierul următor din coadă (după „Importă” sau „Sari peste”), sau închiderea dialogului. */
  const urmatorul = (): void => {
    const urm = fisiere[k + 1];
    if (!urm) {
      inchide();
      return;
    }
    setK(k + 1);
    incepe(urm);
  };

  // Locul piesei din coadă: punctul lăsat, apoi fiecare fișier următor cu 10 mm la dreapta și în jos (nu cad unul peste altul).
  const loc: Loc = punct ? { x: punct.x + 10 * k, y: punct.y - 10 * k } : null;
  const ok = dialog.stare !== 'citire' && dialog.stare.ok ? dialog.stare : null;
  const stareOk = ok ? stareImporta(ok.pregatit, loc) : null;
  return (
    <DialogImport
      nume={dialog.nume}
      stare={dialog.stare}
      pxPeTol={dialog.px}
      pxAutomat={dialog.pxAutomat}
      seRecitesc={dialog.seRecitesc === true}
      motiv={stareOk && !stareOk.ok ? stareOk.motiv : null}
      onPx={(px) => {
        if (dialog.fisier) citeste(dialog.fisier, px, dialog.pxAutomat, ok ?? undefined);
      }}
      onImporta={() => {
        // Un dublu-clic nu importă de două ori: clicul e un eveniment discret, deci React închide dialogul înaintea
        // celui de-al doilea (otrava care scotea o gardă de aici a scăpat: garda era cod mort; e2e-ul o arată).
        if (!ok || dialog.seRecitesc) return;
        if (importa(ok.pregatit, loc).ok) urmatorul();
      }}
      onInchide={inchide}
      {...(fisiere.length > 1 ? { coada: { k: k + 1, n: fisiere.length }, onSari: urmatorul } : {})}
    />
  );
}
