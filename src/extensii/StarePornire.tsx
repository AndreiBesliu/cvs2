/**
 * Starea unei extensii care n-a pornit sau pornește greu (ADR 0232 §A.1), peste cadrul ei: semnul și numele extensiei, o
 * frază pe înțeles și trei ieșiri: „Încearcă din nou” (cadrul pornește din nou), „Vezi în bibliotecă” (pagina ei, unde sunt
 * „Actualizează” și „Scoate”) și „Închide”. Eroarea brută, versiunea și de unde a venit pachetul stau sub „Detalii”, pliate,
 * pentru autorul extensiei, cu „Copiază”. La o pornire grea nu e nimic de arătat acolo: cadrul încă lucrează.
 */
import { useState, type ReactNode } from 'react';
import { t } from '../i18n/t.ts';
import type { ExtensieInstalata } from './depozit.ts';
import { SemnInstalat } from './Semn.tsx';

/** După atâta „Pornesc extensia…”, omul primește ieșirile; pornirea nu se oprește. */
export const TIMP_PORNIRE_GREA_MS = 10_000;

/** Versiunea și de unde a venit pachetul, pe un rând. */
function textPachet(e: ExtensieInstalata): string {
  const versiune = e.manifest.versiune;
  return e.sursa.fel === 'fisier' ? t('extensii.stare.pachet.fisier', { versiune, sursa: e.sursa.nume })
    : e.sursa.fel === 'adresa' ? t('extensii.stare.pachet.adresa', { versiune, sursa: e.sursa.adresa })
      : t('extensii.stare.pachet.biblioteca', { versiune });
}

export function StarePornire({ extensie, stare, onDinNou, onBiblioteca, onInchide }: {
  readonly extensie: ExtensieInstalata;
  readonly stare: { readonly fel: 'esuat'; readonly mesaj: string } | { readonly fel: 'greu' };
  readonly onDinNou: () => void;
  readonly onBiblioteca: () => void;
  readonly onInchide: () => void;
}): ReactNode {
  const [copiat, setCopiat] = useState(false);
  const nume = extensie.manifest.nume;
  const esuat = stare.fel === 'esuat';
  const pachet = textPachet(extensie);
  const copiaza = (): void => {
    if (!esuat) return;
    // Un refuz al browserului (o pagină fără drept la clipboard) lasă textul la vedere, de selectat cu mâna.
    void navigator.clipboard.writeText(`${nume}\n${pachet}\n${stare.mesaj}`).then(() => { setCopiat(true); }, () => undefined);
  };
  return (
    <section className="stare-pornire" data-testid="stare-pornire" data-fel={stare.fel} role={esuat ? 'alert' : 'status'} aria-labelledby="stare-pornire-titlu">
      <SemnInstalat extensie={extensie} marime={48} />
      <h2 id="stare-pornire-titlu">{t(esuat ? 'extensii.stare.esuat.titlu' : 'extensii.stare.greu.titlu', { nume })}</h2>
      <p data-testid="stare-text">{t(esuat ? 'extensii.stare.esuat.text' : 'extensii.stare.greu.text')}</p>
      <div className="butoane">
        <button type="button" data-extensii="porneste-din-nou" onClick={onDinNou}>{t('extensii.stare.din-nou')}</button>
        <button type="button" data-extensii="vezi-in-biblioteca" onClick={onBiblioteca}>{t('extensii.stare.biblioteca')}</button>
        <button type="button" data-extensii="inchide-extensia" onClick={onInchide}>{t('extensii.stare.inchide')}</button>
      </div>
      {esuat && (
        <details>
          <summary>{t('extensii.stare.detalii')}</summary>
          <p className="stare-pachet" data-testid="stare-pachet">{pachet}</p>
          <p className="stare-mesaj" data-testid="stare-mesaj">{stare.mesaj}</p>
          <button type="button" className="stare-copiaza" data-extensii="copiaza-detalii" onClick={copiaza}>
            {t(copiat ? 'extensii.stare.copiat' : 'extensii.stare.copiaza')}
          </button>
        </details>
      )}
    </section>
  );
}
