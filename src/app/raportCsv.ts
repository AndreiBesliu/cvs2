/**
 * CSV-ul listei de tăiere (ADR 0210 §6, răspunsul 7; felia 11.6↑): UTF-8 cu BOM, ca Excel să-l deschidă direct, cu `;` și
 * virgula zecimală (Excel în română, implicit) sau cu `,` și punctul. Trei tabele, unul sub altul, cu câte un rând gol între
 * ele: foile (un rând pe piesă, cu foaia, de câte ori se taie și cât e folosită; o foaie goală, un rând fără piesă), totalurile
 * pe piesă și foile pe material. Ghilimelele ca RFC 4180 (dublate înăuntru); fiecare rând se termină cu CRLF. Capetele vin
 * din mesajele exportului, deci cine îl cheamă le are încărcate (fereastra raportului).
 */
import { t } from '../i18n/t.ts';
import type { MarimeRaport, RandPiesa, RaportFoi } from '../model/raportFoi.ts';

export type SeparatorCsv = ';' | ',';

const BOM = String.fromCharCode(0xfeff);
const CRLF = String.fromCharCode(13, 10);
const CAPETE = [String.fromCharCode(10), String.fromCharCode(13), '"'];

/** O celulă: între ghilimele (dublate înăuntru) când are separatorul, ghilimele sau un capăt de rând. */
function celula(s: string, sep: SeparatorCsv): string {
  return s.includes(sep) || CAPETE.some((c) => s.includes(c)) ? `"${s.replaceAll('"', '""')}"` : s;
}

/** Un număr cu cel mult două zecimale: cu virgula lângă `;`, cu punctul lângă `,`. */
export function numarCsv(x: number, sep: SeparatorCsv): string {
  const s = String(Math.round(x * 100) / 100);
  return sep === ';' ? s.replace('.', ',') : s;
}

/** Numele piesei în raport: al ei, sau felul primului ei element („dreptunghi”). */
export function numePiesaRaport(r: Pick<RandPiesa, 'nume' | 'forma'>): string {
  if (r.nume !== null) return r.nume;
  return r.forma === null ? '—' : t(r.forma === 'cerc' ? 'export.raport.forma.cerc' : r.forma === 'cale' ? 'export.raport.forma.cale' : 'export.raport.forma.dreptunghi');
}

export const numeMarime = (din: MarimeRaport): string => t(din === 'taiata' ? 'export.raport.marime.taiata' : 'export.raport.marime.desen');

export function csvRaport(r: RaportFoi, sep: SeparatorCsv): string {
  const n = (x: number): string => numarCsv(x, sep);
  const randuri: string[][] = [[
    t('export.raport.csv.foaia'), t('export.raport.csv.de-cate-ori'), t('export.raport.csv.material'), t('export.raport.csv.latime-foii'),
    t('export.raport.csv.inaltime-foii'), t('export.raport.csv.grosime'), t('export.raport.csv.folosita'), t('export.raport.csv.piesa'),
    t('export.raport.csv.cate'), t('export.raport.csv.latime'), t('export.raport.csv.inaltime'), t('export.raport.csv.marime'),
    t('export.raport.csv.rotirea'), t('export.raport.csv.valorile'),
  ]];
  for (const f of r.foi) {
    const foaie = [f.nume, String(1 + f.identice.length), f.material ?? '', n(f.latime), n(f.inaltime), n(f.grosime), n(f.folosita)];
    if (f.piese.length === 0) randuri.push([...foaie, '', '', '', '', '', '', '']);
    for (const p of f.piese) {
      randuri.push([...foaie, numePiesaRaport(p), String(p.cate), n(p.latime), n(p.inaltime), numeMarime(p.din),
        p.rotiri.map((g) => `${n(g)}°`).join(', '), p.valori.join(', ')]);
    }
  }
  randuri.push([], [t('export.raport.totaluri')], [
    t('export.raport.csv.piesa'), t('export.raport.csv.cate'), t('export.raport.csv.latime'), t('export.raport.csv.inaltime'),
    t('export.raport.csv.marime'), t('export.raport.csv.material'), t('export.raport.csv.pe-foile'),
  ]);
  for (const p of r.piese) {
    randuri.push([numePiesaRaport(p), String(p.cate), n(p.latime), n(p.inaltime), numeMarime(p.din), p.materiale.map((m) => m ?? '').join(', '),
      p.foi.map((k) => String(k + 1)).join(', ')]);
  }
  randuri.push([], [t('export.raport.materiale')], [
    t('export.raport.csv.material'), t('export.raport.csv.latime-foii'), t('export.raport.csv.inaltime-foii'), t('export.raport.csv.grosime'),
    t('export.raport.csv.foi'),
  ]);
  for (const m of r.materiale) randuri.push([m.material ?? '', n(m.latime), n(m.inaltime), n(m.grosime), String(m.foi)]);
  return BOM + randuri.map((x) => x.map((c) => celula(c, sep)).join(sep)).join(CRLF) + CRLF;
}
