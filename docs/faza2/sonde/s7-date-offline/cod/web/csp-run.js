// Rulează validatorul ales într-o pagină cu sau fără CSP strict (fără 'unsafe-eval').
(async () => {
  const q = new URLSearchParams(location.search);
  const lib = q.get('lib'), N = Number(q.get('n') || 50000), REPS = Number(q.get('reps') || 7), NF = Number(q.get('nf') || 10);
  const violations = [];
  document.addEventListener('securitypolicyviolation', (e) => violations.push(e.violatedDirective + ' ' + e.blockedURI));
  const out = { lib, page: location.pathname };
  try {
    await new Promise((ok, ko) => { const s = document.createElement('script'); s.src = `b-${lib}.js`; s.onload = ok; s.onerror = ko; document.head.append(s); });
    const { validate, makeDoc, addUnknownFields, faults } = globalThis.S7;
    const doc = addUnknownFields(makeDoc(N));
    let t = performance.now(); const r0 = validate(doc); out.coldMs = +(performance.now() - t).toFixed(1); out.ok = r0.ok;
    const times = [];
    for (let i = 0; i < REPS; i++) { t = performance.now(); validate(doc); times.push(performance.now() - t); }
    times.sort((a, b) => a - b); out.medianMs = +times[Math.floor(REPS / 2)].toFixed(1);
    const F = faults(doc).slice(0, NF); let rej = 0, exact = 0; const miss = [];
    for (const f of F) {
      const at = (o, p) => p.slice(0, -1).reduce((x, k) => x[k], o); const par = at(doc, f.path), key = f.path[f.path.length - 1], old = par[key];
      f.apply(doc); const r1 = validate(doc); par[key] = old; const d = doc;
      if (!r1.ok) rej++;
      if (r1.issues.some((i) => i.path.join('.') === f.path.join('.'))) exact++; else miss.push(f.name + (r1.ok ? ' [ACCEPTAT]' : ' @' + (r1.issues[0]?.path.join('.') ?? '?')));
    }
    out.faultRejected = rej; out.faultExact = exact; out.miss = miss;
  } catch (e) { out.error = String(e).slice(0, 200); }
  out.violations = [...new Set(violations)];
  window.__done = out;
})();
