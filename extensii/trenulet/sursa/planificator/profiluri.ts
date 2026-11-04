// Profilurile (presets): mai multe masini CNC sau mai multe imprimante 3D, fiecare cu setarile ei. Una e implicita: cu
// ea se deschide pagina. Setarile de pe ecran sunt mereu ale profilului ales: ce schimbi acolo se scrie in el.
var Profiluri = (function () {
  "use strict";
  /** Un profil: numele lui și setările lui (ale unei mașini CNC sau ale unei imprimante 3D). */
  type Profil<V> = { id: string; nume: string; v: V };
  type Stare<V> = { lista: Profil<V>[]; activ: string; implicit: string };
  /** Ce vine din stocare: orice, până la `curata`. */
  type Brut = { readonly lista?: unknown; readonly activ?: unknown; readonly implicit?: unknown } | null | undefined;
  type Optiuni<V> = {
    eticheta: string; fel: string; ajutor: string;
    stare(): Stare<V>; salveaza(s: Stare<V>): void; valori(): V; aplica(v: V): void;
  };
  const idNou = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const esc = (t: unknown): string => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>)[c]!);
  const copie = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;
  function curata<V>(o: Brut, valoriCurente: V, numeImplicit: string): Stare<V> {
    // { lista: [{ id, nume, v }], activ, implicit }; fara nimic salvat, un singur profil, cu setarile de acum
    const lista = ((o && Array.isArray(o.lista) ? o.lista as ({ id?: unknown; nume?: unknown; v?: unknown } | null)[] : [])
      .filter(p => p && typeof p.id === "string" && typeof p.nume === "string" && p.v && typeof p.v === "object" && !Array.isArray(p.v)) as Profil<V>[])
      .slice(0, 30).map(p => ({ id: p.id.slice(0, 40), nume: p.nume.trim().slice(0, 40) || numeImplicit, v: p.v }));
    if (!lista.length) lista.push({ id: idNou(), nume: numeImplicit, v: copie(valoriCurente) });
    const are = (x: unknown): boolean => lista.some(p => p.id === x);
    const implicit = are(o && o.implicit) ? o!.implicit as string : lista[0]!.id;
    return { lista, activ: are(o && o.activ) ? o!.activ as string : implicit, implicit };
  }
  // opt: { eticheta, fel ("mașina" / "imprimanta"), ajutor, stare(), salveaza(s), valori(), aplica(v) }
  function ui<V>(loc: HTMLElement, opt: Optiuni<V>): { desen(): void } {
    let form: { op: "nou" | "nume" | "sterge"; text: string } | null = null;
    const activ = (s: Stare<V>): Profil<V> | undefined => s.lista.find(p => p.id === s.activ);
    function desen() {
      const s = opt.stare(), a = activ(s);
      loc.innerHTML = `<div class="prof-rand">
          <label class="prof-alege">${opt.eticheta}<select data-prof="alege">${s.lista.map(p => `<option value="${esc(p.id)}"${p.id === s.activ ? " selected" : ""}>${esc(p.nume)}${p.id === s.implicit ? " ★" : ""}</option>`).join("")}</select></label>
          <button class="btn" type="button" data-prof="nou">Nouă</button>
          <button class="btn" type="button" data-prof="nume">Redenumește</button>
          <button class="btn" type="button" data-prof="implicit"${s.activ === s.implicit ? " disabled" : ""}>${s.activ === s.implicit ? "★ Implicită" : "☆ Fă-o implicită"}</button>
          <button class="btn" type="button" data-prof="sterge"${s.lista.length < 2 ? " disabled" : ""}>Șterge</button>
        </div>
        ${form ? `<div class="prof-rand prof-form">${form.op === "sterge" ? `<span class="mic">${tr`Ștergi ${tr(opt.fel)} „${esc(a ? a.nume : "")}”? Setările ei se pierd.`}</span>`
          : `<label class="prof-alege">${form.op === "nou" ? tr`Numele ${opt.fel === "mașina" ? tr("mașinii noi") : tr("imprimantei noi")}` : "Numele nou"}<input data-prof="text" maxlength="40" value="${esc(form.text)}" autocomplete="off"></label>`}
          <button class="btn principal" type="button" data-prof="ok">${form.op === "nou" ? "Creează" : form.op === "sterge" ? "Da, șterge" : "Salvează"}</button>
          <button class="btn" type="button" data-prof="renunta">Renunță</button></div>` : ""}
        <p class="mic">${opt.ajutor}</p>`;
      const t = loc.querySelector<HTMLInputElement>('[data-prof="text"]');
      if (t) { t.focus(); t.select(); }
    }
    loc.addEventListener("change", ev => {
      // schimbarile de aici nu sunt setari ale paginii
      ev.stopPropagation();
      const el = (ev.target as Element).closest<HTMLSelectElement>('[data-prof="alege"]');
      if (!el) return;
      const s = opt.stare(), p = s.lista.find(x => x.id === el.value);
      if (!p) return;
      s.activ = p.id; form = null;
      opt.salveaza(s); opt.aplica(copie(p.v)); desen();
    });
    loc.addEventListener("keydown", ev => {
      if (!(ev.target as Element).closest('[data-prof="text"]')) return;
      if (ev.key === "Enter") { ev.preventDefault(); loc.querySelector<HTMLButtonElement>('[data-prof="ok"]')!.click(); }
      if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); form = null; desen(); }
    });
    loc.addEventListener("click", ev => {
      const b = (ev.target as Element).closest<HTMLButtonElement>("button[data-prof]");
      if (!b) return;
      const s = opt.stare(), a = activ(s), op = b.dataset.prof;
      if (op === "nou") { form = { op, text: `${opt.fel === "mașina" ? "Mașina" : "Imprimanta"} ${s.lista.length + 1}` }; desen(); return; }
      if (op === "nume") { form = { op, text: a ? a.nume : "" }; desen(); return; }
      if (op === "sterge") { form = { op, text: "" }; desen(); return; }
      if (op === "renunta") { form = null; desen(); return; }
      if (op === "implicit") { s.implicit = s.activ; opt.salveaza(s); desen(); return; }
      if (op === "ok" && form) {
        const nume = (loc.querySelector<HTMLInputElement>('[data-prof="text"]') || {} as { value?: string }).value;
        const n = String(nume || "").trim().slice(0, 40);
        if (form.op === "nou") {
          if (!n) return;
          // profilul nou porneste de la setarile de acum; il schimbi apoi cum vrei
          const p = { id: idNou(), nume: n, v: copie(opt.valori()) };
          s.lista.push(p); s.activ = p.id;
        } else if (form.op === "nume") { if (!n || !a) return; a.nume = n; }
        else if (form.op === "sterge" && a && s.lista.length > 1) {
          s.lista = s.lista.filter(p => p !== a);
          if (s.implicit === a.id) s.implicit = s.lista[0]!.id;
          s.activ = s.implicit;
          form = null; opt.salveaza(s); opt.aplica(copie(activ(s)!.v)); desen(); return;
        }
        form = null; opt.salveaza(s); desen();
      }
    });
    return { desen };
  }
  function memoreaza<V>(s: Stare<V> | null, valori: V): void {
    // setarile de pe ecran se scriu in profilul ales
    const a = s && s.lista.find(p => p.id === s.activ);
    if (a) a.v = copie(valori);
  }
  function laDeschidere<V>(s: Stare<V> | null): V | null {
    // pagina se deschide cu profilul implicit: intoarce valorile lui, daca altul era ales
    if (!s || s.activ === s.implicit) return null;
    s.activ = s.implicit;
    const p = s.lista.find(x => x.id === s.activ);
    return p ? copie(p.v) : null;
  }
  return { curata, ui, memoreaza, laDeschidere };
})();
