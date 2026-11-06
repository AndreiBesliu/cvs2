/**
 * Limba paginii (ADR 0165). În cvs2, limba lui (`window.cvs2.limba`), fixă cât trăiește cadrul: la o limbă nouă, intrarea
 * repornește pagina, fără pierderi (ADR 0164). Singură (claude.ai, copia de pe calculator), pagina e în română.
 *
 * Româna stă în cod, neschimbată; engleza vine din dicționar (`window.TexteEN`, adus de intrare doar în engleză), pe două căi:
 * - `tr` pentru textele cu valori (un șablon: tr`Am pus: ${x}.`; cheia are {0}, {1}… în locul valorilor, iar traducerea le
 *   poate muta) și pentru cele care nu ajung pe pagină (README-ul arhivei, mesajele motoarelor); un cuvânt cu două sensuri
 *   primește un context (tr("placă", "pat"): în engleză se caută întâi „placă@pat”, în română rămâne „placă”);
 * - textele fixe care ajung pe pagină (marcajul, butoanele, mesajele) se traduc acolo, întregi: fiecare nod de text și
 *   atributele `title`, `aria-label`, `placeholder`, `alt`, la pornire și la fiecare schimbare (un `MutationObserver`).
 * Ce nu are intrare rămâne românesc. În română, nimic nu se observă și `tr` dă chiar textul.
 */
var Limba = (function (glob: typeof globalThis) {
  "use strict";
  const w = glob as unknown as Window;
  const en = !!(w.cvs2 && w.cvs2.limba === "en");
  const dictionar: Readonly<Record<string, string>> = (en && w.TexteEN) || {};
  const ATRIBUTE = ["title", "aria-label", "placeholder", "alt"];
  const FARA = new Set(["SCRIPT", "STYLE", "TEXTAREA"]);

  /** Textul unui șir sau al unui șablon (cu valorile puse ca de JavaScript), sau traducerea lui. */
  function tr(s: TemplateStringsArray | string, ...v: unknown[]): string {
    if (typeof s === "string") return en ? ((typeof v[0] === "string" ? dictionar[s + "@" + v[0]] : undefined) ?? dictionar[s] ?? s) : s;
    let cheie = s[0]!, text = s[0]!;
    for (let i = 1; i < s.length; i++) { cheie += "{" + (i - 1) + "}" + s[i]; text += String(v[i - 1]) + s[i]; }
    const t = en ? dictionar[cheie] : undefined;
    return t === undefined ? text : t.replace(/\{(\d+)\}/g, (m, k) => (+k < v.length ? String(v[+k]) : m));
  }

  /** Un fragment de pe pagină, întreg (fără spațiile de la capete), sau null dacă n-are traducere. */
  function fragment(s: string): string | null {
    const k = s.replace(/\s+/g, " ").trim();
    const t = k ? dictionar[k] : undefined;
    if (t === undefined || t === k) return null;
    const m = /^(\s*)[\s\S]*?(\s*)$/.exec(s)!;
    return m[1] + t + m[2];
  }
  function traduText(n: Text): void {
    if (n.parentElement && FARA.has(n.parentElement.tagName)) return;
    const t = fragment(n.data);
    if (t !== null && t !== n.data) n.data = t;
  }
  function traduAtribute(e: Element): void {
    for (const a of ATRIBUTE) {
      const v = e.getAttribute(a);
      const t = v === null ? null : fragment(v);
      if (t !== null && t !== v) e.setAttribute(a, t);
    }
  }
  /** Textele și atributele unui arbore de pe pagină. */
  function traduArbore(r: Node): void {
    if (r.nodeType === 3) { traduText(r as Text); return; }
    if (r.nodeType !== 1 && r.nodeType !== 11) return;
    if (r.nodeType === 1) { if (FARA.has((r as Element).tagName)) return; traduAtribute(r as Element); }
    const d = (r.ownerDocument || r) as Document;
    const w = d.createTreeWalker(r, 1 | 4);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n.nodeType === 3) traduText(n as Text);
      else if (FARA.has((n as Element).tagName)) continue;
      else traduAtribute(n as Element);
    }
  }
  /** Traduce pagina de acum și tot ce intră pe ea după (doar în engleză). */
  function urmareste(r: Element): void {
    if (!en) return;
    traduArbore(r);
    new MutationObserver(lista => {
      for (const m of lista) {
        if (m.type === "childList") m.addedNodes.forEach(traduArbore);
        else if (m.type === "characterData") traduText(m.target as Text);
        else if (m.type === "attributes") traduAtribute(m.target as Element);
      }
    }).observe(r, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATRIBUTE });
  }

  // în cadru, marcajul e deja pus (intrarea îl pune înaintea scripturilor): de acum, tot ce intră pe pagină se traduce
  if (en && typeof document !== "undefined" && document.body) urmareste(document.body);
  return { limba: en ? "en" as const : "ro" as const, tr, urmareste, traduArbore, zecimal: en ? "." : ",", locala: en ? "en-GB" : "ro-RO" };
})(typeof globalThis !== "undefined" ? globalThis : window);

/** `Limba.tr`, scurt: textul românesc din cod, în limba paginii. */
function tr(s: TemplateStringsArray | string, ...v: unknown[]): string { return Limba.tr(s, ...v); }
