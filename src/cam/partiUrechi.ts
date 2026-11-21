import { cerculArcului, numarSegmente, segment, type Contur } from '../geom/conturBaza.ts';
import { cutieContur } from '../geom/cutie.ts';
import type { Document } from '../model/document.ts';
import { taieturiFoaie } from '../model/lume.ts';
import { conturDeTaiat } from './contur.ts';

/**
 * Părțile ținute în foaie de urechi (ADR 0210, felia 11.3↑c): fiecare contur închis tăiat prin toată foaia de un profil
 * exterior cu urechi, în fiecare instanță a foii, ca poligon (arcele în coarde). Proba urechilor de la export
 * (`sim/desprinse.ts`) caută înăuntrul fiecăruia lemn legat de marginea foii. Urechile unui profil interior țin miezul, nu
 * piesa, iar un profil care nu trece prin foaie nu desprinde nimic: nu se judecă.
 */

/** Săgeata cea mai mare a coardelor unui arc (mm): mult sub celula probei. */
export const TOLERANTA_PARTI = 0.01;

const EPS_GROSIME = 1e-9;

export type ParteCuUrechi = {
  readonly instanta: string;
  /** Id-ul în lume al elementului tăiat (`<instanță>/<element>`). */
  readonly element: string;
  /** Vârfurile poligonului, x0, y0, x1, y1, …, în coordonatele documentului (fără vârful de închidere repetat). */
  readonly poligon: Float64Array;
  /** Mijlocul cutiei conturului: locul spus omului. */
  readonly x: number;
  readonly y: number;
};

/** Părțile foii active (`doc.foi[0]`, ca la export), în ordinea tăieturilor; un element tăiat de două astfel de profile, o dată. */
export function partiCuUrechi(doc: Document): ParteCuUrechi[] {
  const foaie = doc.foi[0];
  if (!foaie) return [];
  const vazute = new Set<string>();
  const rez: ParteCuUrechi[] = [];
  for (const t of taieturiFoaie(doc, 0)) {
    if (t.tip !== 'profil' || t.latura !== 'exterior' || t.urechi === null || t.adancime < foaie.stoc.grosime - EPS_GROSIME) continue;
    if (vazute.has(t.idLume)) continue;
    const c = conturDeTaiat(t);
    if (!c.ok || !c.contur.inchis || c.contur.varfuri.length < 2) continue;
    vazute.add(t.idLume);
    const k = cutieContur(c.contur);
    rez.push({ instanta: t.instanta, element: t.idLume, poligon: poligon(c.contur, TOLERANTA_PARTI), x: (k.minX + k.maxX) / 2, y: (k.minY + k.maxY) / 2 });
  }
  return rez;
}

/**
 * Conturul închis ca poligon: liniile rămân, fiecare arc devine coarde cu săgeata cel mult `tol` (r · (1 − cos(φ / 2)) ≤
 * tol pe fiecare pas φ). O cubică rămasă (conturul de tăiat le are în biarce) trece ca linie între capete.
 */
export function poligon(c: Contur, tol: number): Float64Array {
  const xs: number[] = [];
  for (let i = 0; i < numarSegmente(c); i++) {
    const { a, b, s } = segment(c, i);
    xs.push(a.x, a.y);
    if (s.tip !== 'A' || !(Math.abs(s.bulge) > 1e-12)) continue;
    const k = cerculArcului(a, b, s.bulge);
    const pas = k.raza > tol ? 2 * Math.acos(1 - tol / k.raza) : Math.PI / 2;
    const n = Math.max(1, Math.ceil(Math.abs(k.baleiaj) / pas));
    for (let j = 1; j < n; j++) {
      const u = k.start + (k.baleiaj * j) / n;
      xs.push(k.centru.x + k.raza * Math.cos(u), k.centru.y + k.raza * Math.sin(u));
    }
  }
  return Float64Array.from(xs);
}
