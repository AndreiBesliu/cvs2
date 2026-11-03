// Profilurile (presets): mai multe masini CNC sau mai multe imprimante 3D, fiecare cu setarile ei. Una e implicita: cu
// ea se deschide pagina. Setarile de pe ecran sunt mereu ale profilului ales: ce schimbi acolo se scrie in el.
(function () {
  "use strict";
  const idNou = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const copie = o => JSON.parse(JSON.stringify(o));
  function curata(o, valoriCurente, numeImplicit) {
    // { lista: [{ id, nume, v }], activ, implicit }; fara nimic salvat, un singur profil, cu setarile de acum
    const lista = (o && Array.isArray(o.lista) ? o.lista : [])
      .filter(p => p && typeof p.id === "string" && typeof p.nume === "string" && p.v && typeof p.v === "object" && !Array.isArray(p.v))
      .slice(0, 30).map(p => ({ id: p.id.slice(0, 40), nume: p.nume.trim().slice(0, 40) || numeImplicit, v: p.v }));
    if (!lista.length) lista.push({ id: idNou(), nume: numeImplicit, v: copie(valoriCurente) });
    const are = x => lista.some(p => p.id === x);
    const implicit = are(o && o.implicit) ? o.implicit : lista[0].id;
    return { lista, activ: are(o && o.activ) ? o.activ : implicit, implicit };
  }
  // opt: { eticheta, fel ("mașina" / "imprimanta"), ajutor, stare(), salveaza(s), valori(), aplica(v) }
  function ui(loc, opt) {
    let form = null;
    const activ = s => s.lista.find(p => p.id === s.activ);
    function desen() {
      const s = opt.stare(), a = activ(s);
      loc.innerHTML = `<div class="prof-rand">
          <label class="prof-alege">${opt.eticheta}<select data-prof="alege">${s.lista.map(p => `<option value="${esc(p.id)}"${p.id === s.activ ? " selected" : ""}>${esc(p.nume)}${p.id === s.implicit ? " ★" : ""}</option>`).join("")}</select></label>
          <button class="btn" type="button" data-prof="nou">Nouă</button>
          <button class="btn" type="button" data-prof="nume">Redenumește</button>
          <button class="btn" type="button" data-prof="implicit"${s.activ === s.implicit ? " disabled" : ""}>${s.activ === s.implicit ? "★ Implicită" : "☆ Fă-o implicită"}</button>
          <button class="btn" type="button" data-prof="sterge"${s.lista.length < 2 ? " disabled" : ""}>Șterge</button>
        </div>
        ${form ? `<div class="prof-rand prof-form">${form.op === "sterge" ? `<span class="mic">Ștergi ${opt.fel} „${esc(a ? a.nume : "")}”? Setările ei se pierd.</span>`
          : `<label class="prof-alege">${form.op === "nou" ? `Numele ${opt.fel === "mașina" ? "mașinii noi" : "imprimantei noi"}` : "Numele nou"}<input data-prof="text" maxlength="40" value="${esc(form.text)}" autocomplete="off"></label>`}
          <button class="btn principal" type="button" data-prof="ok">${form.op === "nou" ? "Creează" : form.op === "sterge" ? "Da, șterge" : "Salvează"}</button>
          <button class="btn" type="button" data-prof="renunta">Renunță</button></div>` : ""}
        <p class="mic">${opt.ajutor}</p>`;
      const t = loc.querySelector('[data-prof="text"]');
      if (t) { t.focus(); t.select(); }
    }
    loc.addEventListener("change", ev => {
      // schimbarile de aici nu sunt setari ale paginii
      ev.stopPropagation();
      const el = ev.target.closest('[data-prof="alege"]');
      if (!el) return;
      const s = opt.stare(), p = s.lista.find(x => x.id === el.value);
      if (!p) return;
      s.activ = p.id; form = null;
      opt.salveaza(s); opt.aplica(copie(p.v)); desen();
    });
    loc.addEventListener("keydown", ev => {
      if (!ev.target.closest('[data-prof="text"]')) return;
      if (ev.key === "Enter") { ev.preventDefault(); loc.querySelector('[data-prof="ok"]').click(); }
      if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); form = null; desen(); }
    });
    loc.addEventListener("click", ev => {
      const b = ev.target.closest("button[data-prof]");
      if (!b) return;
      const s = opt.stare(), a = activ(s), op = b.dataset.prof;
      if (op === "nou") { form = { op, text: `${opt.fel === "mașina" ? "Mașina" : "Imprimanta"} ${s.lista.length + 1}` }; desen(); return; }
      if (op === "nume") { form = { op, text: a ? a.nume : "" }; desen(); return; }
      if (op === "sterge") { form = { op, text: "" }; desen(); return; }
      if (op === "renunta") { form = null; desen(); return; }
      if (op === "implicit") { s.implicit = s.activ; opt.salveaza(s); desen(); return; }
      if (op === "ok" && form) {
        const nume = (loc.querySelector('[data-prof="text"]') || {}).value;
        const n = String(nume || "").trim().slice(0, 40);
        if (form.op === "nou") {
          if (!n) return;
          // profilul nou porneste de la setarile de acum; il schimbi apoi cum vrei
          const p = { id: idNou(), nume: n, v: copie(opt.valori()) };
          s.lista.push(p); s.activ = p.id;
        } else if (form.op === "nume") { if (!n || !a) return; a.nume = n; }
        else if (form.op === "sterge" && a && s.lista.length > 1) {
          s.lista = s.lista.filter(p => p !== a);
          if (s.implicit === a.id) s.implicit = s.lista[0].id;
          s.activ = s.implicit;
          form = null; opt.salveaza(s); opt.aplica(copie(activ(s).v)); desen(); return;
        }
        form = null; opt.salveaza(s); desen();
      }
    });
    return { desen };
  }
  function memoreaza(s, valori) {
    // setarile de pe ecran se scriu in profilul ales
    const a = s && s.lista.find(p => p.id === s.activ);
    if (a) a.v = copie(valori);
  }
  function laDeschidere(s) {
    // pagina se deschide cu profilul implicit: intoarce valorile lui, daca altul era ales
    if (!s || s.activ === s.implicit) return null;
    s.activ = s.implicit;
    const p = s.lista.find(x => x.id === s.activ);
    return p ? copie(p.v) : null;
  }
  window.Profiluri = { curata, ui, memoreaza, laDeschidere };
})();
