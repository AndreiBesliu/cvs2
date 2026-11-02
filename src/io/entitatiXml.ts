/**
 * Garda entităților XML a ușilor care citesc XML din fișierul omului (ADR 0035 §1): importul SVG și fonturile SVG (ADR 0140
 * §7). Un modul al ei, mic, ca textul s-o ia fără ușa SVG întreagă.
 */
import { PLAFON_IMPORT, type CodEntitati } from './svgCoduri.ts';

/**
 * Entitățile XML, judecate pe text înaintea parserului (ADR 0035 §1): nicio entitate parametru sau externă, nicio valoare
 * cu `&` sau `<`, nicio valoare implicită în `<!ATTLIST>`, iar expansiunea (aparițiile × lungimea) cel mult cât plafonul
 * de octeți. Codul motivului (fără text din fișier), sau null.
 */
export function problemaEntitati(text: string): CodEntitati | null {
  // Valorile implicite din <!ATTLIST> se pun pe fiecare element (Edge le aplică): o amplificare pe care numărătoarea
  // entităților n-o vede (recenzia 2.7c). O declarație cu o valoare literală se refuză; #IMPLIED / #REQUIRED trec.
  for (let de = text.indexOf('<!ATTLIST'); de >= 0;) {
    const sfarsit = text.indexOf('>', de);
    if (sfarsit < 0) break;
    const declaratie = text.slice(de, sfarsit);
    if (declaratie.includes('"') || declaratie.includes("'")) return 'attlist';
    de = text.indexOf('<!ATTLIST', sfarsit);
  }
  const valori = new Map<string, string>();
  let declaratii = 0;
  let de = text.indexOf('<!ENTITY');
  while (de >= 0) {
    let i = de + '<!ENTITY'.length;
    const spatiu = (): void => { while (i < text.length && /[\t\n\r ]/.test(text[i] ?? '')) i++; };
    spatiu();
    if (text[i] === '%') return 'parametru';
    const nume = /^[^\s"'>%&;]+/.exec(text.slice(i, i + 256))?.[0];
    if (!nume) return 'fara-nume';
    i += nume.length;
    spatiu();
    const ghilimea = text[i];
    if (ghilimea !== '"' && ghilimea !== "'") return 'externa';
    const sfarsit = text.indexOf(ghilimea, i + 1);
    if (sfarsit < 0) return 'neterminata';
    const valoare = text.slice(i + 1, sfarsit);
    if (/[&<]/.test(valoare)) return 'valoare';
    // XML 1.0 §4.2 (și Edge): la o declarație dublă contează prima (recenzia 2.7c: ultima ascundea o valoare uriașă).
    if (!valori.has(nume)) valori.set(nume, valoare);
    if (++declaratii > PLAFON_IMPORT.entitati) return 'numar';
    de = text.indexOf('<!ENTITY', sfarsit);
  }
  let expandat = 0;
  for (const [nume, valoare] of valori) {
    const ref = `&${nume};`;
    let aparitii = 0;
    for (let i = text.indexOf(ref); i >= 0; i = text.indexOf(ref, i + ref.length)) aparitii++;
    expandat += aparitii * valoare.length;
    if (expandat > PLAFON_IMPORT.octeti) return 'expansiune';
  }
  return null;
}
