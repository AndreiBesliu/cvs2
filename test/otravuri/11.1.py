# Lista de otrăvuri a feliei 11.1↑ (foile: foaia activă și lista cu foile, ADR 0210 §1, §5), 07.11.2026, alese de autor:
# vederea (foaia activă, documentul văzut din ea, numele din id, materialul doar ca text), comenzile (id-ul liber, piesele care
# pleacă odată cu foaia, locul foii noi și materialul ei, ultima foaie, capătul listei, eticheta fără spații și golul, mutarea
# care păstrează locul, la capăt), jurnalul (valoarea veche a etichetei, locul câmpului, ultima foaie, instanța dublă, mutarea
# foii, inversele), registrul (foaia nouă activă, vecina de dinainte, selecția golită, foaia din meniu, plafonul etichetei,
# numele care nu vine la copie, foaia țintă, desenul pe foaia activă, foaia curentă), tastele (Ctrl + PgUp e al browserului),
# foaia ținută în browser și legăturile din interfață (e2e: exportul, ținerea, PgUp, confirmarea, tragerea, meniul pânzei,
# cipul, materialul, traseul, rândurile foii active).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit; e2e-ul, cu
# `CNCVS2_E2E_RETEA=127.0.5` și configul local (`.tmp/pw.config.ts`, portul worktree-ului).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


FO = 'src/model/foi.ts'
FC = 'src/model/foiComenzi.ts'
JF = 'src/model/jurnalFoi.ts'
JU = 'src/model/jurnal.ts'
CA = 'src/ui/actiuniDocumentCalcul.ts'
AD = 'src/ui/actiuniDocument.ts'
SC = 'src/ui/scurtaturi.ts'
FA = 'src/app/foaiaActiva.ts'
AP = 'src/app/App.tsx'
LV = 'src/ui/ListaVectori.tsx'
MF = 'src/ui/MeniuFoaie.tsx'
ED = 'src/app/Editare.tsx'
PP = 'src/app/PanouProprietati.tsx'

# Vederea.
o('V01', FO, '  return k < 0 ? 0 : k;', '  return 0;', 'foi', 'foaia activă e mereu prima')
o('V02', FO, '  return { ...doc, foi: [f] };', '  return doc;', 'foi', 'documentul văzut din foaie e documentul întreg (exportul ia prima foaie)')
o('V03', FO, '  return sablon(m ? Number(m[1]) : index + 1);', '  return sablon(index + 1);', 'foi', 'numele arătat se schimbă la mutarea foii')
o('V04', FO, "typeof foaie.material === 'string' && foaie.material.trim() !== ''", "typeof foaie.material === 'string'", 'foi',
  'un material din spații e o etichetă')
# Comenzile.
o('C01', FC, '  while (folosite.has(`f${n}`)) n++;\n', '', 'foi', 'id-ul foii noi poate fi unul folosit')
o('C02', FC, '(pe.has(piesa.id) && !altundeva.has(piesa.id) ?', '(pe.has(piesa.id) ?', 'foi', 'o piesă pusă și pe altă foaie pleacă odată cu foaia')
o('C03', FC, 'pozitie: k + 1, piese: [] }, id };', 'pozitie: k, piese: [] }, id };', 'foi', 'foaia nouă vine înaintea celei active')
o('C04', FC, ' instante: [], ...(material !== null ? { material } : {}),', ' instante: [],', 'foi', 'foaia nouă fără materialul celei active')
o('C05', FC, '  if (doc.foi.length <= 1) return null;\n', '', 'foi', 'ultima foaie se poate șterge')
o('C06', FC, 'if (k < 0 || la < 0 || la >= doc.foi.length) return null;', 'if (k < 0 || la < 0) return null;', 'foi',
  'foaia de la capăt se mută mai jos')
o('C07', FC, '  const curat = valoare.trim();', '  const curat = valoare;', 'foi', 'spațiile de la capete rămân în etichetă')
o('C08', FC, "nou: curat === '' ? null : { valoare: curat }", 'nou: { valoare: curat }', 'foi', 'golul scrie un text gol, nu scoate eticheta')
o('C09', FC, "comenzi.push({ tip: 'adauga', foaie: spre, instanta, pozitie: tinta.instante.length + k });",
  "comenzi.push({ tip: 'adauga', foaie: spre, instanta: { ...instanta, x: 0 }, pozitie: tinta.instante.length + k });", 'foi',
  'piesa mutată nu-și păstrează locul')
o('C10', FC, 'pozitie: tinta.instante.length + k });', 'pozitie: k });', 'foi', 'piesele mutate vin la începutul foii, nu la capăt')
# Jurnalul.
o('J01', JF, 'if (are !== (c.vechi !== null) || (c.vechi !== null && !Object.is(foaie[c.camp], c.vechi.valoare))) {', 'if (false) {', 'foi',
  'eticheta nu verifică valoarea veche')
o('J02', JF, '      foi[fi] = { ...foaie, [c.camp]: c.nou.valoare };',
  '      const { [c.camp]: _v, ...rest } = foaie;\n      foi[fi] = { ...rest, [c.camp]: c.nou.valoare };', 'foi', 'câmpul scris trece la capătul foii')
o('J03', JF, "  if (doc.foi.length === 1) throw new Error('sterge-foaie: documentul ar rămâne fără foi');\n", '', 'foi',
  'jurnalul lasă documentul fără foi')
o('J04', JF, "      if (existente.has(i.id)) throw new Error(`instanța ${i.id} există deja`);\n", '', 'foi', 'o foaie adusă cu o instanță dublă trece')
o('J05', JF, '    foi.splice(c.la, 0, f);', '    foi.splice(c.de, 0, f);', 'foi', 'mutarea foii nu o mută')
o('J06', JU, "case 'muta-foaie': return { tip: c.tip, foaie: c.foaie, de: c.la, la: c.de };",
  "case 'muta-foaie': return { tip: c.tip, foaie: c.foaie, de: c.de, la: c.la };", 'foi', 'anularea mutării foii o mută iar')
o('J07', JU, "camp: c.camp, vechi: c.nou, nou: c.vechi };", 'camp: c.camp, vechi: c.nou, nou: c.nou };', 'foi', 'anularea etichetei n-o întoarce')
# Registrul.
o('A01', CA, '      ctx.activeazaFoaie?.(id);\n', '', 'calcul', 'foaia nouă nu devine activă')
o('A02', CA, 'const vecina = h.doc.foi[k - 1] ?? h.doc.foi[k + 1];', 'const vecina = h.doc.foi[k + 1] ?? h.doc.foi[k - 1];', 'calcul',
  'ștearsă cea activă, devine activă următoarea, nu cea de dinainte')
o('A03', CA, '      if (!c) return;\n      ctx.scrie(executa(h, c));\n      ctx.selecteaza([]);\n', '      if (!c) return;\n      ctx.scrie(executa(h, c));\n',
  'calcul', 'selecția rămâne pe piesele plecate pe altă foaie')
o('A04', CA, '  return ctx.foaieAleasa?.() ?? foaieCtx(ctx).id;', '  return foaieCtx(ctx).id;', 'calcul', 'meniul altei foi lucrează pe cea activă')
o('A05', CA, "return ctx.etichetaNoua().valoare.trim().length > PLAFON.numeLungime ? 'motiv.eticheta-lunga' : true;", 'return true;', 'calcul',
  'o etichetă peste 200 de caractere nu e refuzată din timp')
o('A06', CA, 'const { instante: _instante, nume: _nume, ...restFoaie } = sursa;', 'const { instante: _instante, ...restFoaie } = sursa;', 'calcul',
  'copia foii ia și numele')
o('A07', CA, "return tinta === foaieCtx(ctx, doc).id || !doc.foi.some((f) => f.id === tinta) ? 'motiv.aceeasi-foaie' : true;", 'return true;', 'calcul',
  'mutarea pe aceeași foaie (sau una necunoscută) nu e refuzată')
o('D01', AD, '  const instanta: Instanta = { id, piesa: id, x, y, rotire: 0 };\n  const foaie = foaieCtx(ctx, h.doc);',
  '  const instanta: Instanta = { id, piesa: id, x, y, rotire: 0 };\n  const foaie = h.doc.foi[0]!;', 'calcul', 'ce se adaugă merge pe prima foaie')
o('D02', AD, '  const f = doc.foi[indexFoaieActiva(doc, id)];', '  const f = doc.foi[0];', 'calcul', 'acțiunile lucrează pe prima foaie')
# Tastele și foaia ținută.
o('K01', SC, "  if (CU_MODIFICATORI.has(e.key)) return `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`;\n", '', 'taste',
  'Ctrl + PgUp / PgDn schimbă foaia (și iau tasta browserului)')
o('P01', FA, '/^[A-Za-z0-9_-]{1,64}$/', '/^.{0,64}$/', 'foi', 'foaia ținută primește orice text, și golul')
# Interfața (e2e).
o('U01', AP, '    document: () => doarFoaia(curenta.current.istoric.doc, curenta.current.foaie),', '    document: () => curenta.current.istoric.doc,', 'e2e',
  'exportul scrie prima foaie, nu pe cea activă')
o('U02', AP, '    tineFoaia(id);\n', '', 'e2e', 'foaia activă nu se ține: după reîncărcare, prima')
o('U03', AP, "    'foaia-anterioara': () => { foaiaVecina(-1); },", "    'foaia-anterioara': () => { foaiaVecina(1); },", 'e2e', 'PgUp merge înainte')
o('U04', MF, "if (id === 'foaie.sterge' && piese > 0) {", "if (id === 'foaie.sterge' && piese > 99) {", 'e2e', 'foaia cu piese se șterge fără confirmare')
o('U05', LV, '      actiuni.muta(instanta, id);\n', '', 'e2e', 'rândul tras peste altă foaie nu se mută')
o('U06', ED, 'ruleaza: () => { mutaPe(f.id); },', 'ruleaza: () => { mutaPe(null); },', 'e2e', '„Mută pe Foaia 2” face o foaie nouă')
o('U07', AP, '        if (doc.foi.length < 2 || !f) return null;', '        if (!f) return null;', 'e2e', 'cipul foii apare și cu o singură foaie')
o('U08', PP, "onAplica={(x) => onEticheta('material', x)}", "onAplica={(x) => onEticheta('nume', x)}", 'e2e', 'materialul scris ajunge în nume')
o('U09', AP, '    calculeazaTraseuRef.current();\n  }, [idActiva, traseuArata]);', '  }, [idActiva, traseuArata]);', 'e2e',
  'traseul arătat rămâne al foii de dinainte')
o('U10', LV, '{!f.activa ? null : randuri.length === 0 ? (', '{randuri.length === 0 ? (', 'e2e', 'rândurile foii active apar sub fiecare foaie')

SETURI = {
    'foi': ['test/unit/foi.test.ts', 'test/unit/foi.actiuni.test.ts'],
    'calcul': ['test/unit/foi.actiuni.test.ts', 'test/unit/actiuni.calcul.paritate.test.ts'],
    'taste': ['test/unit/scurtaturi.test.ts'],
}
E2E = ['test/e2e/foi.spec.ts']
