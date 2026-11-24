import { useRef } from 'react';

/**
 * Mesajul de după „Salvează”, ținut până sosește citirea de după. Formularele Setărilor se umplu din nou din fiecare citire
 * sosită (`key={citiri}`): un mesaj dat la răspunsul salvării l-ar lăsa pe om să scrie într-un formular care urmează să fie
 * aruncat, cu ce a scris. Până la citire, formularul rămâne „ocupat” (butonul oprit). Văzut pe 24.11, în completul
 * 45449914076: citirea a întârziat, iar proba, care scria imediat după mesaj, și-a pierdut valoarea.
 *
 * `tine(mesaj)` la răspunsul salvării; `citit()` la fiecare citire sosită, bună sau căzută (salvarea s-a făcut oricum).
 */
export function useMesajDupaCitire(arata: (mesaj: string) => void): { readonly tine: (mesaj: string) => void; readonly citit: () => void } {
  const tinut = useRef<string | null>(null);
  return {
    tine: (mesaj) => { tinut.current = mesaj; },
    citit: () => {
      const mesaj = tinut.current;
      if (mesaj === null) return;
      tinut.current = null;
      arata(mesaj);
    },
  };
}
