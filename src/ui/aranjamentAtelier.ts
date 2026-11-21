/**
 * Atelierul (ADR 0250 §1, felia 28.1↑c): pentru tabletă și pentru ecranul de lângă mașină. Aceleași acțiuni, cipuri,
 * panouri și ferestre ca Insulele (`ARANJAMENT_MODERN`), așezate altfel:
 * - uneltele de desen în coloana lor, din stânga, cu numele la vedere (zona `unelte`; pe telefon, un rând jos);
 * - bara de sus cu numele la vedere: Anulează și Reface; importul și exportul vectorilor doar cu pictograma (numele lung al
 *   importului ar împinge „Exportă G-code” sub panouri la 1280 px, ca în Insule), apoi „Exportă G-code”, plin;
 * - panourile împreună, în dreapta (proprietățile întâi), ca stânga să rămână a uneltelor.
 *
 * Datele stau aici, fără CSS, ca proba unitară să le citească; bucata la cerere (`atelier.ts`) le aduce cu CSS-ul lor.
 */
import { ARANJAMENT_MODERN, type Aranjament } from './aranjament.ts';

export const ARANJAMENT_ATELIER: Aranjament = {
  id: 'atelier',
  zone: {
    meniu: ARANJAMENT_MODERN.zone.meniu,
    sus: [
      { id: 'istoric', intrari: [{ actiune: 'istoric.anuleaza', aspect: 'eticheta' }, { actiune: 'istoric.reface', aspect: 'eticheta' }] },
      { id: 'fisier', intrari: [{ actiune: 'import.svg' }, { control: 'vectori' }, { actiune: 'export.gcode', aspect: 'principal' }] },
    ],
    unelte: [{ id: 'forme', intrari: [{ control: 'unelte' }] }],
    selectie: ARANJAMENT_MODERN.zone.selectie,
    jos: ARANJAMENT_MODERN.zone.jos,
  },
  docuri: { stanga: [], dreapta: ['proprietati', 'lista'] },
  ferestre: ARANJAMENT_MODERN.ferestre,
  // Tăierea din butoane mari (felia 28.1↑d, planșa „C · Întunecat”): rolul, − / + la adâncime și pas, cartela frezei,
  // „Trimite la mașină”.
  taierea: 'butoane',
};
