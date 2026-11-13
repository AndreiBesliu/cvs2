import { useEffect, useRef, useState, type ReactNode } from 'react';
import { t } from '../i18n/t.ts';
import type { RezultatActiune } from './actiuni.ts';

type Props = {
  /** Eticheta câmpului, pentru cititorul de ecran (rândul are și eticheta vizibilă). */
  readonly eticheta: string;
  /** Textul din document; gol: niciunul, iar câmpul arată exemplul. */
  readonly valoare: string;
  readonly exemplu?: string;
  /** `data-camp`, pentru teste și pentru aranjament. */
  readonly camp: string;
  /** Câte caractere primește câmpul (plafonul documentului). */
  readonly lungime: number;
  readonly dezactivat?: boolean;
  readonly titlu?: string;
  /** Aplică textul (o acțiune a registrului): rezultatul ei, cu motivul unui refuz. */
  readonly onAplica: (text: string) => RezultatActiune;
};

/**
 * Câmpul de text al panoului (ADR 0210 §1: numele și materialul foii), purtat ca `CampNumeric`: Enter sau ieșirea din câmp
 * aplică (spațiile de la capete nu contează; un câmp gol șterge textul), Escape revine la textul din document. Un text refuzat
 * rămâne în câmp, cu motivul; un text neschimbat nu e o comandă.
 */
export function CampText({ eticheta, valoare, exemplu, camp, lungime, dezactivat = false, titlu, onAplica }: Props): ReactNode {
  const [text, setText] = useState(valoare);
  const [motiv, setMotiv] = useState<string | null>(null);
  // Cât omul scrie, documentul nu-i suprascrie textul; altfel câmpul urmează documentul (o anulare, altă foaie activă).
  const [editez, setEditez] = useState(false);
  useEffect(() => {
    if (!editez) {
      setText(valoare);
      setMotiv(null);
    }
  }, [valoare, editez]);

  const revino = (): void => {
    setText(valoare);
    setMotiv(null);
    setEditez(false);
  };
  const aplica = (): void => {
    if (!editez) return;
    if (text.trim() === valoare.trim()) {
      revino();
      return;
    }
    const r = onAplica(text);
    if (r.ok) {
      setMotiv(null);
      setEditez(false);
    } else {
      setMotiv(t(r.motiv));
    }
  };
  // Ca la `CampNumeric` (recenzia 2.8e, F1): un clic în afara câmpului aplică textul înaintea oricărui alt ascultător, ca el să
  // ajungă pe foaia de atunci, nu să se piardă cu demontarea câmpului.
  const camp_ = useRef<HTMLInputElement>(null);
  const aplicaAcum = useRef(aplica);
  aplicaAcum.current = aplica;
  useEffect(() => {
    if (!editez) return undefined;
    const laApasare = (e: PointerEvent): void => {
      if (e.target !== camp_.current) aplicaAcum.current();
    };
    window.addEventListener('pointerdown', laApasare, true);
    return () => { window.removeEventListener('pointerdown', laApasare, true); };
  }, [editez]);

  return (
    <span className="camp-text">
      <input
        ref={camp_}
        type="text"
        autoComplete="off"
        value={text}
        maxLength={lungime}
        data-camp={camp}
        aria-label={eticheta}
        aria-invalid={motiv !== null}
        disabled={dezactivat}
        {...(exemplu ? { placeholder: exemplu } : {})}
        {...(titlu ? { title: titlu } : {})}
        onChange={(e) => {
          setText(e.target.value);
          setMotiv(null);
          setEditez(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            aplica();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            revino();
          }
        }}
        onBlur={aplica}
      />
      {motiv !== null && <span className="camp-motiv" role="alert" data-motiv={camp}>{motiv}</span>}
    </span>
  );
}
