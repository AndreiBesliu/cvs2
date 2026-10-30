# Sabotajele feliei 4.A↑ „calculul CAM în bazinul de workere” (ADR 0109), 30.10.2026: fiecare mecanism al codecului IR, al
# bazinului CAM, al calculului mutat și al legăturii din interfață, stricat o dată; proba care îl apără trebuie să pice.
# Alese de autorul feliei (plasa autorului, nu runda independentă din `PLAN.md` §4.3).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


IMP = 'src/jobs/impachetare.ts'
BAZ = 'src/jobs/bazinCam.ts'
CAL = 'src/jobs/calculCam.ts'
LUC = 'src/jobs/lucratorCam.ts'
EXP = 'src/ui/actiuniExportCalcul.ts'
APP = 'src/app/App.tsx'

E2E = ['test/e2e/cam-bazin.spec.ts']

SETURI = {
    'cam': ['test/unit/cam.bazin.test.ts'],
    'cam2': ['test/unit/cam.bazin.test.ts', 'test/unit/export.calcul.test.ts', 'test/unit/rezumat.test.ts', 'test/unit/placa02.test.ts',
             'test/unit/simulare.export.test.ts', 'test/unit/animatie.timp.test.ts'],
}

# ---- codecul IR ----
o('C01', IMP, "sens: masca & ORAR ? 'orar' : 'trigonometric'", "sens: masca & ORAR ? 'trigonometric' : 'orar'", 'cam', 'sensul arcelor inversat')
o('C02', IMP, "const AXE: readonly Axa[] = ['X', 'Y', 'Z', 'A'];", "const AXE: readonly Axa[] = ['Y', 'X', 'Z', 'A'];", 'cam',
  'axele în altă ordine (simetric la împachetare: doar ordinea câmpurilor o vede)')
o('C03', IMP, 'const element = masca & ELEMENT ? text() : undefined, operatie = masca & OPERATIE ? text() : undefined;',
  'const operatie = masca & OPERATIE ? text() : undefined, element = masca & ELEMENT ? text() : undefined;', 'cam',
  'elementul și operația etichetei citite în altă ordine')
o('C04', IMP, "  if (k !== numere.length || t !== texte.length || s !== scule.length) throw new Error('programul împachetat are date în plus');\n", '', 'cam',
  'datele în plus trec')
o('C05', IMP, "        const la = tinta(masca), x = ia(), y = ia();", "        const la = tinta(masca), y = ia(), x = ia();", 'cam', 'centrul arcului cu X și Y schimbate')
o('C06', IMP, "scula: scule[s++] as Scula", "scula: scule[s] as Scula", 'cam', 'toate schimbările primesc prima sculă')
o('C07', IMP, "      case 'pauza': pune(m.secunde); break;", "      case 'pauza': pune(Math.fround(m.secunde)); break;", 'cam', 'secundele trec prin float32')
o('C08', IMP, "      default: throw new Error(`programul împachetat are o mișcare de fel necunoscut (${String(feluri[i])}) la ${i}`);", '      default: break;',
  'cam', 'un fel necunoscut e sărit în tăcere')

# ---- bazinul CAM ----
o('B01', BAZ, '      w.terminate();\n    }\n    function cade', '    }\n    function cade', 'cam', 'workerul nu se oprește la capăt')
o('B02', BAZ, "    semnal?.addEventListener('abort', anuleaza);\n", '', 'cam', 'anularea nu oprește workerul')
o('B03', BAZ, '      if (e.data.ok) rezolva(e.data.raspuns);\n      else respinge(new Error(e.data.motiv));', '      rezolva(e.data.raspuns);', 'cam',
  'o excepție a calculului trece drept răspuns')
o('B04', BAZ, "    w.onerror = (e) => { e.preventDefault(); cade(new LucratorCazut(`workerul CAM a căzut: ${e.message || 'fără mesaj'}`)); };",
  "    w.onerror = (e) => { e.preventDefault(); cade(new CalculAnulat()); };", 'cam', 'workerul căzut trece drept anulare (nu ajunge în jurnal)')
o('B05', BAZ, "  if (typeof __CNCVS2_CONSTRUIT__ === 'undefined' && typeof Worker === 'undefined') return inProces(cerere, transfer, o.semnal);",
  "  if (typeof __CNCVS2_CONSTRUIT__ === 'undefined') return inProces(cerere, transfer, o.semnal);", 'cam', 'workerul nu se folosește niciodată în afara build-ului')
o('B06', BAZ, '  if (o.semnal?.aborted) throw new CalculAnulat();\n  if (typeof', '  if (typeof', 'cam', 'o cerere deja anulată pornește calculul')
o('B07', BAZ, "    const termen = setTimeout(() => { cade(new LucratorCazut(`calculul CAM n-a răspuns în ${Math.round(termenMs / 1000)} s`)); }, termenMs);",
  "    const termen = setTimeout(() => { cade(new Error(`calculul CAM n-a răspuns în ${Math.round(termenMs / 1000)} s`)); }, termenMs);", 'cam',
  'termenul trece drept refuz, nu drept defecțiune')
o('B08', BAZ, "  return calculeaza({ fel: 'timp', program, foaie, setari }, transferabileProgram(program), o) as Promise<RezumatJob>;",
  "  return calculeaza({ fel: 'timp', program, foaie, setari }, [], o) as Promise<RezumatJob>;", 'cam', 'programul timpului copiat, nu transferat')

# ---- calculul mutat și workerul ----
o('K01', CAL, '  const r = programDinDocument(doc);\n  return r.ok', '  const r = programDinDocument(doc, REGIM_IMPLICIT, 1);\n  return r.ok', 'cam',
  'traseul cu supracursă (alt program decât al documentului)')
o('K02', CAL, '  const job = programDinDocument(doc, REGIM_IMPLICIT, 0);\n  if (!job.ok) return { ok: false, motiv: job.motiv };\n  const p = pregatesteProgram',
  '  const job = programDinDocument(doc, REGIM_IMPLICIT, 1);\n  if (!job.ok) return { ok: false, motiv: job.motiv };\n  const p = pregatesteProgram', 'cam',
  'vederea 3D cu supracursă')
o('K03', CAL, "      return { raspuns: r, transfer: r.ok ? deTransferat([r.program.octeti, ...r.fisiere.map((f) => f.octeti), ...vederiSimulare(r.simulare)]) : [] };",
  "      return { raspuns: r, transfer: [] };", 'cam', 'octeții și mutările exportului copiate, nu transferate')
o('K04', CAL, "    simulare: pregatesteProgram(job.program, 0), foaie: { latime, inaltime, grosime },",
  "    simulare: pregatesteProgram(job.program, 0), foaie: { latime, inaltime, grosime: grosime + 1 },", 'cam2', 'simularea exportului pe o foaie mai groasă')
o('K05', CAL, "      ? unesteRezumate(e.fisiere.map((f) => rezumatJob(f, f.scula ? [f.scula] : sculeProgram(job.program), p.setariMasina)))",
  "      ? rezumatJob(e.exportat, sculeProgram(job.program), p.setariMasina)", 'cam2', 'fișierele separate: rezumatul doar al primului')
o('K06', LUC, '    lucrator.postMessage({ id, ok: true, raspuns }, transfer);', '    lucrator.postMessage({ id, ok: true, raspuns });', 'cam',
  'workerul nu transferă răspunsul')

# ---- firul principal ----
o('M01', EXP, '  return r.ok ? { ...r, traseu: { program, foaie, setari } } : r;\n}', '  return r;\n}', 'cam',
  'timpul de lângă traseu fără programul lui (animația n-ar mai porni)')
o('M02', EXP, '  return { ...rest, simulare: (s) => simuleazaExport(simulare, foaie, s) };',
  "  return { ...rest, simulare: (s) => simuleazaExport({ ok: false, motiv: 'x', miscare: -1 }, foaie, s) };", 'cam', 'exportul fără simulare')
o('M03', EXP, '  const r = await exportInBazin(doc, p, semnal ? { semnal } : {});', '  const r = await exportInBazin(doc, p, {});', 'cam',
  'exportul nu mai poate fi anulat')
o('M04', APP, '    if (!c || c.rev === doc.rev) return;\n    c.ac.abort();', '    if (!c || c.rev === doc.rev) return;', 'e2e',
  'un document schimbat nu oprește workerul traseului')
o('M05', APP, "    setTraseu((v) => (v?.stare !== 'calcul' ? v : v.miscari ? { ...v, stare: 'gata' } : null));\n  }, [doc.rev]);",
  '  }, [doc.rev]);', 'e2e', 'un document schimbat nu scoate calculul vechi din pânză')
