/**
 * Scriitorul DXF R2007 (AC1021) al exportului 2D (ADR 0088; `PLAN.md` T18, „exact”): cercul e CIRCLE, liniile și arcele
 * vecine sunt o LWPOLYLINE cu bulge, cubicele vecine o SPLINE de grad 3 cu nodurile triple (exactă, fără puncte de
 * potrivire). Unitățile sunt mm ($INSUNITS = 4), straturile sunt rolurile (`vectori.ts`), fiecare cu culoarea lui.
 *
 * Fișierul are ce cere formatul de la R2000 încoace, ca programele stricte să-l deschidă fără reparații: tabelele cu
 * handle-urile și proprietarii lor, blocurile *Model_Space și *Paper_Space, dicționarul rădăcină cu ACAD_GROUP și
 * ACAD_LAYOUT și cele două layout-uri. Numerele se scriu cu toate cifrele (rotunjirea la cel mai scurt text care se
 * citește înapoi identic), fără exponent.
 */
import { STRATURI, type Entitate, type Strat, type VectoriFoaie } from './vectori.ts';

/** Culoarea AutoCAD (ACI) a fiecărui strat. */
export const CULORI_DXF: Readonly<Record<Strat, number>> = {
  EXTERIOR: 1, INTERIOR: 5, PE_LINIE: 3, PE_O_PARTE: 30, BUZUNAR: 6, GAURIRE: 4, FARA_OPERATIE: 7, FOAIE: 8,
};

/** Numărul, exact și fără exponent (1e-7 → 0.0000001). */
export function nrDxf(x: number): string {
  if (!Number.isFinite(x)) throw new Error(`număr nefinit în DXF: ${x}`);
  if (x === 0) return '0';
  const s = String(x);
  if (!/e/i.test(s)) return s;
  return x.toFixed(20).replace(/\.?0+$/, '');
}

export function scrieDxf(v: VectoriFoaie): string {
  const out: string[] = [];
  const g = (cod: number, val: string | number): void => { out.push(String(cod), typeof val === 'number' ? nrDxf(val) : val); };
  let urmator = 1;
  const handle = (): string => (urmator++).toString(16).toUpperCase();
  // Handle-urile structurii, întâi: tabelele, înregistrările și obiectele se leagă unele de altele prin ele.
  const H = {
    vport: handle(), vportActiv: handle(), ltype: handle(), byBlock: handle(), byLayer: handle(), continuous: handle(),
    layer: handle(), style: handle(), standard: handle(), view: handle(), ucs: handle(), appid: handle(), acad: handle(),
    dimstyle: handle(), dimStandard: handle(), blockRecord: handle(), brModel: handle(), brPaper: handle(),
    blocModel: handle(), sfarsitModel: handle(), blocPaper: handle(), sfarsitPaper: handle(),
    radacina: handle(), grupuri: handle(), layouturi: handle(), layoutModel: handle(), layoutPaper: handle(),
  };
  const folosite = STRATURI.filter((s) => v.entitati.some((e) => e.strat === s));
  const straturi = new Map<string, string>([['0', handle()], ...folosite.map((s) => [s, handle()] as const)]);
  const entitati = v.entitati.map((e) => ({ e, h: handle() }));
  const c = v.cutie;

  const sectiune = (nume: string, corp: () => void): void => { g(0, 'SECTION'); g(2, nume); corp(); g(0, 'ENDSEC'); };
  const tabel = (nume: string, h: string, n: number, corp: () => void, extra?: () => void): void => {
    g(0, 'TABLE'); g(2, nume); g(5, h); g(330, '0'); g(100, 'AcDbSymbolTable'); g(70, String(n));
    extra?.();
    corp();
    g(0, 'ENDTAB');
  };
  const inregistrare = (tip: string, h: string, tabelH: string, subclasa: string, codHandle = 5): void => {
    g(0, tip); g(codHandle, h); g(330, tabelH); g(100, 'AcDbSymbolTableRecord'); g(100, subclasa);
  };

  sectiune('HEADER', () => {
    g(9, '$ACADVER'); g(1, 'AC1021');
    g(9, '$DWGCODEPAGE'); g(3, 'ANSI_1252');
    g(9, '$INSBASE'); g(10, 0); g(20, 0); g(30, 0);
    g(9, '$EXTMIN'); g(10, c.minX); g(20, c.minY); g(30, 0);
    g(9, '$EXTMAX'); g(10, c.maxX); g(20, c.maxY); g(30, 0);
    g(9, '$LIMMIN'); g(10, 0); g(20, 0);
    g(9, '$LIMMAX'); g(10, v.latime); g(20, v.inaltime);
    g(9, '$INSUNITS'); g(70, '4');
    g(9, '$MEASUREMENT'); g(70, '1');
    g(9, '$LUNITS'); g(70, '2');
    g(9, '$HANDSEED'); g(5, urmator.toString(16).toUpperCase());
  });
  sectiune('CLASSES', () => undefined);
  sectiune('TABLES', () => {
    tabel('VPORT', H.vport, 1, () => {
      inregistrare('VPORT', H.vportActiv, H.vport, 'AcDbViewportTableRecord');
      g(2, '*Active'); g(70, '0');
      g(10, 0); g(20, 0); g(11, 1); g(21, 1);
      g(12, (c.minX + c.maxX) / 2); g(22, (c.minY + c.maxY) / 2);
      g(13, 0); g(23, 0); g(14, 10); g(24, 10); g(15, 10); g(25, 10);
      g(16, 0); g(26, 0); g(36, 1); g(17, 0); g(27, 0); g(37, 0);
      g(40, Math.max(c.maxY - c.minY, 1) * 1.1); g(41, Math.max(c.maxX - c.minX, 1) / Math.max(c.maxY - c.minY, 1));
      g(42, 50); g(43, 0); g(44, 0); g(50, 0); g(51, 0);
      g(71, '0'); g(72, '100'); g(73, '1'); g(74, '3'); g(75, '0'); g(76, '0'); g(77, '0'); g(78, '0');
    });
    tabel('LTYPE', H.ltype, 3, () => {
      for (const [h, nume, text] of [[H.byBlock, 'ByBlock', ''], [H.byLayer, 'ByLayer', ''], [H.continuous, 'Continuous', 'Solid line']] as const) {
        inregistrare('LTYPE', h, H.ltype, 'AcDbLinetypeTableRecord');
        g(2, nume); g(70, '0'); g(3, text); g(72, '65'); g(73, '0'); g(40, 0);
      }
    });
    tabel('LAYER', H.layer, straturi.size, () => {
      for (const [nume, h] of straturi) {
        inregistrare('LAYER', h, H.layer, 'AcDbLayerTableRecord');
        g(2, nume); g(70, '0'); g(62, String(nume === '0' ? 7 : CULORI_DXF[nume as Strat])); g(6, 'Continuous'); g(370, '-3');
      }
    });
    tabel('STYLE', H.style, 1, () => {
      inregistrare('STYLE', H.standard, H.style, 'AcDbTextStyleTableRecord');
      g(2, 'Standard'); g(70, '0'); g(40, 0); g(41, 1); g(50, 0); g(71, '0'); g(42, 2.5); g(3, 'txt'); g(4, '');
    });
    tabel('VIEW', H.view, 0, () => undefined);
    tabel('UCS', H.ucs, 0, () => undefined);
    tabel('APPID', H.appid, 1, () => {
      inregistrare('APPID', H.acad, H.appid, 'AcDbRegAppTableRecord');
      g(2, 'ACAD'); g(70, '0');
    });
    tabel('DIMSTYLE', H.dimstyle, 1, () => {
      inregistrare('DIMSTYLE', H.dimStandard, H.dimstyle, 'AcDbDimStyleTableRecord', 105);
      g(2, 'Standard'); g(70, '0');
    }, () => { g(100, 'AcDbDimStyleTable'); g(71, '0'); });
    tabel('BLOCK_RECORD', H.blockRecord, 2, () => {
      for (const [h, nume, layout] of [[H.brModel, '*Model_Space', H.layoutModel], [H.brPaper, '*Paper_Space', H.layoutPaper]] as const) {
        inregistrare('BLOCK_RECORD', h, H.blockRecord, 'AcDbBlockTableRecord');
        g(2, nume); g(340, layout);
      }
    });
  });
  sectiune('BLOCKS', () => {
    for (const [bloc, sfarsit, br, nume, paper] of [[H.blocModel, H.sfarsitModel, H.brModel, '*Model_Space', false], [H.blocPaper, H.sfarsitPaper, H.brPaper, '*Paper_Space', true]] as const) {
      g(0, 'BLOCK'); g(5, bloc); g(330, br); g(100, 'AcDbEntity');
      if (paper) g(67, '1');
      g(8, '0'); g(100, 'AcDbBlockBegin'); g(2, nume); g(70, '0'); g(10, 0); g(20, 0); g(30, 0); g(3, nume); g(1, '');
      g(0, 'ENDBLK'); g(5, sfarsit); g(330, br); g(100, 'AcDbEntity');
      if (paper) g(67, '1');
      g(8, '0'); g(100, 'AcDbBlockEnd');
    }
  });
  sectiune('ENTITIES', () => {
    for (const { e, h } of entitati) scrieEntitate(g, e, h, H.brModel);
  });
  sectiune('OBJECTS', () => {
    g(0, 'DICTIONARY'); g(5, H.radacina); g(330, '0'); g(100, 'AcDbDictionary'); g(281, '1');
    g(3, 'ACAD_GROUP'); g(350, H.grupuri); g(3, 'ACAD_LAYOUT'); g(350, H.layouturi);
    g(0, 'DICTIONARY'); g(5, H.grupuri); g(330, H.radacina); g(100, 'AcDbDictionary'); g(281, '1');
    g(0, 'DICTIONARY'); g(5, H.layouturi); g(330, H.radacina); g(100, 'AcDbDictionary'); g(281, '1');
    g(3, 'Layout1'); g(350, H.layoutPaper); g(3, 'Model'); g(350, H.layoutModel);
    for (const [h, nume, br, ordine] of [[H.layoutModel, 'Model', H.brModel, 0], [H.layoutPaper, 'Layout1', H.brPaper, 1]] as const) {
      g(0, 'LAYOUT'); g(5, h); g(330, H.layouturi);
      g(100, 'AcDbPlotSettings'); g(1, ''); g(4, ''); g(6, '');
      g(40, 0); g(41, 0); g(42, 0); g(43, 0); g(44, 0); g(45, 0); g(46, 0); g(47, 0); g(48, 0); g(49, 0);
      g(140, 0); g(141, 0); g(142, 1); g(143, 1); g(70, '688'); g(72, '1'); g(73, '0'); g(74, '5'); g(7, ''); g(75, '16');
      g(76, '0'); g(77, '2'); g(78, '300'); g(147, 1); g(148, 0); g(149, 0);
      g(100, 'AcDbLayout'); g(1, nume); g(70, '1'); g(71, String(ordine));
      g(10, 0); g(20, 0); g(11, v.latime); g(21, v.inaltime); g(12, 0); g(22, 0); g(32, 0);
      g(14, c.minX); g(24, c.minY); g(34, 0); g(15, c.maxX); g(25, c.maxY); g(35, 0);
      g(146, 0); g(13, 0); g(23, 0); g(33, 0); g(16, 1); g(26, 0); g(36, 0); g(17, 0); g(27, 1); g(37, 0);
      g(76, '0'); g(330, br);
    }
  });
  g(0, 'EOF');
  return `${out.join('\n')}\n`;
}

function scrieEntitate(g: (cod: number, val: string | number) => void, e: Entitate, h: string, proprietar: string): void {
  const antet = (tip: string, subclasa: string): void => { g(0, tip); g(5, h); g(330, proprietar); g(100, 'AcDbEntity'); g(8, e.strat); g(100, subclasa); };
  if (e.fel === 'cerc') {
    antet('CIRCLE', 'AcDbCircle');
    g(10, e.centru.x); g(20, e.centru.y); g(30, 0); g(40, e.raza);
  } else if (e.fel === 'polilinie') {
    antet('LWPOLYLINE', 'AcDbPolyline');
    g(90, String(e.varfuri.length)); g(70, e.inchis ? '1' : '0'); g(43, 0);
    for (const p of e.varfuri) {
      g(10, p.x); g(20, p.y);
      if (p.bulge !== 0) g(42, p.bulge);
    }
  } else {
    // Bézier în lanț: k bucăți, 3k + 1 puncte de control, nodurile 0 ×4, 1 ×3, …, k − 1 ×3, k ×4.
    const k = (e.puncte.length - 1) / 3;
    const noduri = [0, 0, 0, 0];
    for (let i = 1; i < k; i++) noduri.push(i, i, i);
    noduri.push(k, k, k, k);
    antet('SPLINE', 'AcDbSpline');
    g(210, 0); g(220, 0); g(230, 1);
    g(70, '8'); g(71, '3'); g(72, String(noduri.length)); g(73, String(e.puncte.length)); g(74, '0');
    g(42, 0.0000001); g(43, 0.0000001);
    for (const u of noduri) g(40, u);
    for (const p of e.puncte) { g(10, p.x); g(20, p.y); g(30, 0); }
  }
}
