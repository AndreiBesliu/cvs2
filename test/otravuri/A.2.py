# Lista de otrăvuri a feliei A.2 (Erori și Diagnoza, ADR 0260 §2 și §7), 18.11.2026, alese de autor: partea pură (filtrul pe
# sursă, eroarea aleasă, aparițiile pe 14 zile pe calendarul local, barele graficului, sumarul și ordinea Diagnozei) și
# paginile pe emulatoare (detaliul alături fără să împingă lista, numerele filtrului, alegerea care nu sare înapoi,
# graficul din aparițiile citite, marcarea doar cu `erori.rezolva`, problemele întâi, ora verificării, ecranul îngust).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit. Setul „e2e” e pe
# emulatoare (`test/e2e-emulator/erori.emulator.spec.ts`): rulează doar cu 4173 și porturile emulatoarelor libere, prin bucla
# din raportul feliei (build, apoi `firebase emulators:exec` cu Playwright prin `node`, câte o probă pe otravă, după GREP),
# nu prin `otravuri.py … e2e`.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


EV = 'src/admin/erori/vedere.ts'
DV = 'src/admin/diagnoza/vedere.ts'
ER = 'src/admin/erori/FilaErori.tsx'
DG = 'src/admin/diagnoza/FilaDiagnoza.tsx'
CSS = 'src/admin/admin.css'

# Partea pură (unitare).
o('U01', EV, "r.filter((g) => s === 'toate' || g.sursa === s)",
  "r.filter((g) => s === 'toate' || g.sursa === s || (s === 'client' && g.sursa !== 'server'))", 'vederi',
  'o sursă necunoscută trece drept browser')
o('U02', EV, 'ales !== null && r.some((g) => g.id === ales) ? ales', 'ales !== null ? ales', 'vederi',
  'o alegere ascunsă de filtru rămâne aleasă')
o('U03', EV, ': r[0]?.id ?? null;', ': null;', 'vederi', 'fără alegere, nimic ales (detaliul gol)')
o('U04', EV, 'if (d === null || d.getTime() > acum.getTime()) continue;', 'if (d === null) continue;', 'vederi',
  'o apariție de după „acum” se numără')
o('U05', EV, 'const k = Math.round(', 'const k = Math.floor(', 'vederi',
  'zilele numărate în ore întregi de 24 (primăvara, aparițiile unei zile trec în cea de după)')
o('U06', EV, 'v[zile - 1 - k] = (v[zile - 1 - k] ?? 0) + 1;', 'v[k] = (v[k] ?? 0) + 1;', 'vederi',
  'azi la începutul graficului, nu la capăt')
o('U07', EV, 'const max = Math.max(0, ...valori);', 'const max = valori.reduce((s, x) => s + x, 0);', 'vederi',
  'barele raportate la total, nu la ziua cea mai plină')
o('U08', EV, 'const r = Math.min(raza, h, w / 2);', 'const r = Math.min(raza, w / 2);', 'vederi',
  'o bară mai joasă decât raza iese sub axă')
o('U09', EV, 'const w = (latime - (valori.length - 1) * spatiu) / valori.length;', 'const w = latime / valori.length;', 'vederi',
  'barele fără spațiu între ele (ultima iese din grafic)')
o('U10', DV, "atentie: cate('atentie'),", "atentie: cate('atentie') + cate('info'),", 'vederi',
  'informațiile numărate ca Atenție')
o('U11', DV, "(s === 'esec' ? 0 : s === 'atentie' ? 1 : 2)", "(s === 'atentie' ? 0 : s === 'esec' ? 1 : 2)", 'vederi',
  'Atenția înaintea Eșecului')
o('U12', DV, 'v.toSorted((a, b) => rang(a.stare) - rang(b.stare))',
  "v.filter((x) => x.stare !== 'info').toSorted((a, b) => rang(a.stare) - rang(b.stare))", 'vederi',
  'informațiile dispar din listă')

# Paginile pe emulatoare (`erori.emulator.spec.ts`).
o('E01', CSS, '.admin-erori-corp {\n  display: flex;\n  align-items: flex-start;',
  '.admin-erori-corp {\n  display: flex;\n  flex-direction: column-reverse;\n  align-items: flex-start;', 'e2e',
  'eroarea aleasă deasupra listei, care se mută la fiecare alegere')
o('E02', ER, "{n === null ? nume : t('admin.erori.cu-numar', { nume, n })}", '{nume}', 'e2e', 'filtrul fără numere')
o('E03', ER, "numara(query(col, where('rezolvat', '==', false)))", 'numara(query(col))', 'e2e',
  'numărul nerezolvatelor numără toate erorile')
o('E04', ER, '}, [con, rev]);', '}, [con]);', 'e2e', 'numerele nu se reîmprospătează după marcare')
o('E05', ER, '  if (lista?.ok && alesAcum !== ales) setAles(alesAcum);\n', '', 'e2e',
  'alegerea sare înapoi pe o eroare ascunsă între timp de filtru')
o('E06', ER, 'const aratate = lista?.ok ? filtreazaSursa(lista.valoare, sursa) : [];', 'const aratate = lista?.ok ? lista.valoare : [];',
  'e2e', 'filtrul pe sursă nu filtrează')
o('E07', ER, '<GraficAparitii aparitii={aparitii.valoare} />', '<GraficAparitii aparitii={aparitii.valoare.slice(0, 1)} />', 'e2e',
  'graficul doar din ultima apariție')
o('E08', ER, "aria-label={t('admin.erori.grafic-eticheta', { n: total })}", "aria-label={t('admin.erori.grafic-eticheta', { n: zile.length })}",
  'e2e', 'eticheta graficului fără totalul aparițiilor')
o('E09', ER, '{poateMarca ? (', '{true ? (', 'e2e', 'butonul de marcare și pentru un rol care doar citește')
o('E10', ER, '<DetaliuGrup key={grup.id} con={con}', '<DetaliuGrup con={con}', 'e2e',
  'detaliul refolosit: aparițiile erorii de dinainte sub titlul celei noi, cât se citesc ale ei')
o('E11', DG, '{problemeIntai(rezultat.v).map((v) => (', '{rezultat.v.map((v) => (', 'e2e', 'problemele nu vin întâi')
o('E12', DG, '<strong>{sumar[s]}</strong>', '<strong>{sumar.bine}</strong>', 'e2e', 'sumarul arată aceeași cifră peste tot')
o('E13', DG, '{rezultat ? (', '{false ? (', 'e2e', 'fără ora verificării')
o('E14', CSS, '@media (max-width: 800px) {\n  .admin-erori-corp {\n    flex-direction: column;\n',
  '@media (max-width: 800px) {\n  .admin-erori-corp {\n', 'e2e', 'sub 800 px, detaliul rămâne alături, strivit')
# Găsite de bancul vizual pe 18.11: graficul gol fără nicio vorbă, textul rândurilor centrat.
o('E15', ER, "{total === 0 ? <p className=\"admin-slab\" data-grafic=\"gol\">", "{false ? <p className=\"admin-slab\" data-grafic=\"gol\">", 'e2e',
  'fără nicio apariție în 14 zile, o axă goală în loc de propoziție')
o('E16', CSS, '  grid-template-columns: minmax(0, 1fr);\n  justify-content: stretch;\n', '', 'e2e',
  'textul rândurilor centrat de regula globală a butoanelor')

SETURI = {
    'vederi': ['test/unit/admin.vederi.test.ts'],
}
E2E = ['test/e2e-emulator/erori.emulator.spec.ts']
# Proba fiecărei otrăvi de emulatoare (`--grep` pe titlul ei), pentru bucla locală.
T1, T2, T3 = 'Erori: lista în stânga', 'Diagnoza: sumarul', 'un rol care doar citește erorile'
GREP = {
    'E01': T1, 'E02': T1, 'E03': T1, 'E04': T1, 'E05': T1, 'E06': T1, 'E07': T1, 'E08': T1, 'E09': T3, 'E10': T1,
    'E11': T2, 'E12': T2, 'E13': T2, 'E14': T1, 'E15': T1, 'E16': T1,
}
