/**
 * Bifa „Închide bucățile” (ADR 0180 §3), ținută în browser pentru toate proiectele (implicit bifată): aceeași în panoul Taie
 * și în bara uneltei Cuțit (ADR 0181 §2).
 */
const CHEIE_INCHIDE = 'cncvs2.taiere-inchide';

export function citesteInchide(): boolean {
  try {
    return localStorage.getItem(CHEIE_INCHIDE) !== '0';
  } catch {
    return true;
  }
}

export function scrieInchide(v: boolean): void {
  try {
    localStorage.setItem(CHEIE_INCHIDE, v ? '1' : '0');
  } catch {
    // Fără stocare (fereastră privată, date blocate): alegerea ține doar cât pagina.
  }
}
