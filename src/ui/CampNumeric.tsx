import { useEffect, useRef, useState, type ReactNode } from 'react';
import { t } from '../i18n/t.ts';
import type { RezultatActiune } from './actiuni.ts';
import { citesteNumar, textNumar } from './numar.ts';
import { useLimba } from './useLimba.ts';

type Props = {
  /** Eticheta câmpului, pentru cititorul de ecran (rândul are și eticheta vizibilă). */
  readonly eticheta: string;
  /** Valoarea din document. */
  readonly valoare: number;
  readonly unitate: string;
  /** Primește semn (o coordonată, un unghi); o dimensiune nu. */
  readonly semn?: boolean;
  /** `data-camp`, pentru teste și pentru aranjament. */
  readonly camp: string;
  readonly dezactivat?: boolean;
  readonly titlu?: string;
  /** Aplică valoarea (o acțiune a registrului): rezultatul ei, cu motivul unui refuz. */
  readonly onAplica: (x: number) => RezultatActiune;
};

/**
 * Câmpul numeric unic (ADR 0038 §5): cifre cu punct sau virgulă (și semn, unde mărimea îl are). Enter sau ieșirea din câmp
 * aplică, Escape revine la valoarea din document. O valoare greșită, sau refuzată de acțiune, rămâne în câmp cu motivul și
 * nu se aplică. Valoarea din document se arată cu `textNumar` (se citește înapoi exact): o confirmare fără nicio schimbare
 * nu e o comandă.
 */
export function CampNumeric({ eticheta, valoare, unitate, semn = false, camp, dezactivat = false, titlu, onAplica }: Props): ReactNode {
  const limba = useLimba();
  const dinDocument = textNumar(valoare, limba === 'ro');
  const [text, setText] = useState(dinDocument);
  const [motiv, setMotiv] = useState<string | null>(null);
  // Cât omul a scris ceva neaplicat (sau a lăsat o valoare greșită), documentul nu-i suprascrie textul; altfel câmpul
  // urmează documentul (o anulare, o mutare pe pânză). Doar focusul nu contează: ieșirea dintr-un câmp neatins nu aplică
  // nimic, nici măcar un text rămas în urma documentului.
  const [editez, setEditez] = useState(false);
  useEffect(() => {
    if (!editez) {
      setText(dinDocument);
      setMotiv(null);
    }
  }, [dinDocument, editez]);

  const revino = (): void => {
    setText(dinDocument);
    setMotiv(null);
    setEditez(false);
  };
  const aplica = (): void => {
    if (!editez) return;
    const x = citesteNumar(text, semn);
    if (x === null) {
      setMotiv(t('motiv.valoare-invalida'));
      return;
    }
    if (x === valoare) {
      revino();
      return;
    }
    const r = onAplica(x);
    if (r.ok) {
      setMotiv(null);
      setEditez(false);
    } else {
      setMotiv(t(r.motiv));
    }
  };
  // Un clic în afara câmpului (pe pânză, de pildă) poate schimba selecția înainte de blur, iar câmpul, legat de selecție,
  // se demonta fără să aplice: valoarea scrisă se pierdea (recenzia 2.8e, F1). Faza de captură a ferestrei vine înaintea
  // oricărui alt ascultător, deci valoarea ajunge pe forma de atunci; blur-ul de după nu mai are ce aplica.
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
    <span className="camp-numeric">
      <input
        ref={camp_}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        value={text}
        data-camp={camp}
        aria-label={eticheta}
        aria-invalid={motiv !== null}
        disabled={dezactivat}
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
      <span className="camp-unitate">{unitate}</span>
      {motiv !== null && <span className="camp-motiv" role="alert" data-motiv={camp}>{motiv}</span>}
    </span>
  );
}
