import { useEffect, useMemo } from 'react';
import type { ImaginePeFoaie } from '../canvas/protocol.ts';
import type { Document } from '../model/document.ts';
import { imaginiReliefuri, reliefuriFoaie, useDesenReliefuri, type DesenFacut } from './reliefDesen.ts';

type Props = {
  readonly doc: Document;
  readonly indexFoaie: number;
  /** Imaginile reliefurilor pentru pânză, de fiecare dată când se schimbă un relief ori sosește un desen. */
  readonly onImagini: (imagini: readonly ImaginePeFoaie[]) => void;
  /** Desenele, după cheie (Z-ul, pentru panou). */
  readonly onDesene: (desene: ReadonlyMap<string, DesenFacut | null>) => void;
  readonly jurnal: (e: unknown) => void;
};

/**
 * Reliefurile foii active (ADR 0310 §7), adusă la cerere doar când foaia are un relief: aplicația ține în pornire doar
 * verificarea (`areRelief`). Nu desenează nimic: dă pânzei imaginile umbrite (peste imaginile foii, sub vectori) și panoului
 * desenele. Lista rămâne aceeași cât nu se schimbă niciun relief, ca pânza să primească pixelii doar atunci.
 */
export default function ReliefuriFoii({ doc, indexFoaie, onImagini, onDesene, jurnal }: Props) {
  const acum = useMemo(() => reliefuriFoaie(doc, indexFoaie), [doc, indexFoaie]);
  const semn = JSON.stringify(acum.map((r) => [r.id, r.cheie, r.x, r.y, r.latime, r.inaltime, r.rotire, r.oglindita]));
  const reliefuri = useMemo(() => acum, [semn]);
  const desene = useDesenReliefuri(reliefuri, jurnal);
  useEffect(() => { onImagini(imaginiReliefuri(reliefuri, desene)); }, [reliefuri, desene]);
  useEffect(() => { onDesene(desene); }, [desene]);
  return null;
}
