import { useLayoutEffect, type RefObject } from 'react';

/**
 * Ține un panou plutitor al barei în fereastră: așezat sub butonul lui, iar dacă iese pe dreapta (o fereastră îngustă, un
 * buton spre capătul barei), mutat spre stânga cât iese, fără să treacă de marginea stângă. Folosit de panourile extensiei
 * (editarea) și de opțiunile Cuțitului (ADR 0181 §2).
 */
export function useInFereastra(ref: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const aseaza = (): void => {
      el.style.left = '';
      const r = el.getBoundingClientRect();
      const iese = r.right - (window.innerWidth - 8);
      if (iese > 0) el.style.left = `${-Math.min(iese, Math.max(0, r.left - 8))}px`;
    };
    aseaza();
    window.addEventListener('resize', aseaza);
    return () => { window.removeEventListener('resize', aseaza); };
  }, [ref]);
}
