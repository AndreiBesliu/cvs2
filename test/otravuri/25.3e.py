# Lista de otrăvuri a feliei 25.3↑e (rezultatul pe fiecare culoare, ADR 0228), 17.11.2026, alese de autor: nucleul culorilor
# cu `peLinii` (contururile doar ale culorilor rămase pe contururi, plasa sărită fără ele, curbele doar pe arcele lor), liniile
# pe culori (o singură reducere, doar culorile pe linii, piesele contururilor alături și în ordinea paletei, numărătorile
# tuturor, legarea și peste contururi), calculul (felul fiecărei culori, „Ca Rezultatul”), ușa (opțiunile liniilor în cerere,
# căile laolaltă) și fereastra (lista din pastilă, ștergerea la un număr nou, grosimea, opțiunile și părțile late după felul
# culorilor). Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), din worktree-ul feliei (în afara Drive-ului), după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CU = 'src/trasare/culori.ts'
MC = 'src/trasare/medianeCulori.ts'
CT = 'src/jobs/calculTrasare.ts'
CA = 'src/ui/actiuniImportCalcul.ts'
FE = 'src/ui/FereastraTrasare.tsx'

o('E01', CU, '  const peContur = (l: number): boolean => bifata(l) && o.peLinii?.[l] !== true;',
  '  const peContur = (l: number): boolean => bifata(l);', 'nuc', 'culorile pe linii primesc și contururi')
o('E02', CU, '  if (o.doarEtichete === true || (o.peLinii !== undefined && !Array.from({ length: K }, (_, l) => peContur(l)).includes(true))) {',
  '  if (o.doarEtichete === true) {', 'nuc', 'cu toate culorile pe linii, plasa se face degeaba')
o('E03', CU, '  const folosit = (a: Arc): boolean => peContur(a.stanga) || peContur(a.dreapta);',
  '  const folosit = (a: Arc): boolean => bifata(a.stanga) || bifata(a.dreapta);', 'nuc',
  'curbele se potrivesc și pe arcele culorilor pe linii (lucru degeaba, granițele numărate greșit)')
o('E04', CU, '    if (!peContur(L)) continue;', '    if (!bifata(L)) continue;', 'nuc', 'piesele de contur și pentru culorile pe linii')
o('E05', MC, '(c.bifata && (oc.peLinii ? oc.peLinii[k] === true : true) ?', '(c.bifata ?', 'nuc',
  'liniile mediane și pentru culorile pe contururi (două piese pe culoare)')
o('E06', MC, '  const rc = (cu.culori ?? traseazaCulori)(img, oc.peLinii ? oc : { ...oc, doarEtichete: true });',
  '  const rc0 = (cu.culori ?? traseazaCulori)(img, { ...oc, doarEtichete: true }), rc = rc0.ok && oc.peLinii ? (cu.culori ?? traseazaCulori)(img, oc) : rc0;',
  'nuc', 'reducerea culorilor de două ori')
o('E07', MC, '  const piese: PiesaRezultat[] = [...rc.piese], late: CaiTrasate[] = [];',
  '  const piese: PiesaRezultat[] = [], late: CaiTrasate[] = [];', 'nuc', 'piesele culorilor pe contururi pierdute')
o('E08', MC, '  let nCai = rc.raport.contururi, varfuri = rc.raport.varfuri, abatere = rc.raport.abatere;',
  '  let nCai = 0, varfuri = 0, abatere = 0;', 'nuc', 'raportul (și plafonul) fără căile contururilor')
o('E09', MC, '  piese.sort((a, b) => a.culoare - b.culoare);\n', '', 'nuc', 'piesele nu mai sunt în ordinea paletei')
o('E10', MC, '    return e === 255 || e === fundal ? -1 : e;',
  '    return e === 255 || e === fundal || (oc.peLinii !== undefined && oc.peLinii[e] !== true) ? -1 : e;', 'nuc',
  'legarea se oprește la culorile pe contururi')
o('E11', CT, "    return x === 'ca' ? c.rezultat === 'mediane' : x === 'mediane';", "    return x === 'mediane';", 'usa',
  '„Ca Rezultatul” nu mai ia Rezultatul de sus')
o('E12', CT, "    const x = c.culori?.rezultate?.[k] ?? 'ca';", "    const x = 'ca';", 'usa', 'felul ales al culorilor, ignorat')
o('E13', CA, "  const peLinii = a.rezultat === 'mediane' || (peCulori && (a.culori.rezultate ?? []).includes('mediane'));",
  "  const peLinii = a.rezultat === 'mediane';", 'usa', 'cererea fără opțiunile liniilor când doar o culoare e pe linii')
o('E14', CA, '      if (peLinie) peLinie[k + j] = c.peLinie?.[j] ?? (c.deschisa ? 1 : 0);',
  '      if (peLinie) peLinie[k + j] = c.peLinie?.[j] ?? 1;', 'usa', 'buclele contururilor, laolaltă, „pe linie”')
o('E15', CA, '  const peLinie = lista.some((c) => c.peLinie) || (deschisa && lista.some((c) => !c.deschisa)) ? new Uint8Array(nc) : null;',
  '  const peLinie = lista.some((c) => c.peLinie) ? new Uint8Array(nc) : null;', 'usa',
  'laolaltă, fără `peLinie`: buclele contururilor citite „pe linie”')
o('F01', FE, "  const peLinii = alegeri.rezultat === 'mediane' || (peCulori && (alegeri.culori.rezultate ?? []).includes('mediane'));",
  "  const peLinii = alegeri.rezultat === 'mediane';", 'e2e', 'opțiunile liniilor ascunse când doar o culoare e pe linii')
o('F02', FE, '  const arataLate = peLinii && om.semnaleaza && caleLate !== null;',
  "  const arataLate = alegeri.rezultat === 'mediane' && om.semnaleaza && caleLate !== null;", 'e2e',
  'părțile late nesemnalate când doar o culoare e pe linii')
o('F03', FE, "    const g = felCuloare(k) === 'mediane' ? culori?.piese.find((p) => p.culoare === k)?.grosimePx : undefined;",
  "    const g = alegeri.rezultat === 'mediane' ? culori?.piese.find((p) => p.culoare === k)?.grosimePx : undefined;", 'e2e',
  'grosimea pastilei după Rezultatul de sus, nu după felul culorii')
o('F04', FE, '    const id = setTimeout(() => { onSchimba({ culori: { numar, legaturi: [], bifate: null, rezultate: null } }); }, 250);',
  '    const id = setTimeout(() => { onSchimba({ culori: { numar, legaturi: [], bifate: null, rezultate: c.rezultate } }); }, 250);', 'e2e',
  'numărul din glisor nu șterge felurile')
o('F05', FE, '          onSchimba({ culori: { numar: e.target.checked ? null : n, legaturi: [], bifate: null, rezultate: null } });',
  '          onSchimba({ culori: { numar: e.target.checked ? null : n, legaturi: [], bifate: null, rezultate: c.rezultate } });', 'e2e',
  '„Automat” nu șterge felurile')
o('F06', FE, '    r[k] = v;\n', '    r[0] = v;\n', 'e2e', 'lista din pastilă schimbă altă culoare')
o('F07', FE, "    return r === 'ca' ? alegeri.rezultat : r;", "    return r === 'ca' ? 'contururi' : r;", 'e2e',
  '„Ca Rezultatul” citit mereu Contururi în fereastră')
o('F08', FE, "<select value={c.rezultate?.[k] ?? 'ca'}", '<select value="ca"', 'e2e', 'lista din pastilă nu arată felul ales')
o('F09', FE, "    const r = c.rezultate && b >= 0 ? { rezultate: c.rezultate.map((x, j) => (j === a ? 'ca' : x)) } : {};",
  '    const r = {};', 'e2e', 'culoarea legată își păstrează felul ales (opțiunile liniilor rămân fără nicio culoare pe linii)')

SETURI = {
    'nuc': ['test/unit/trasare.rezultat.culori.test.ts', 'test/unit/trasare.mediane.culori.test.ts', 'test/unit/trasare.culori.test.ts'],
    'usa': ['test/unit/import.imagine.test.ts'],
}
E2E = ['test/e2e/trasare-culori.spec.ts']
