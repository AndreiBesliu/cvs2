# Lista de otrăvuri a feliilor 11.1↑c (comenzile foii pe pânză, sub fiecare foaie; ADR 0210 §1) și 14.C↑d (butonul Admin din
# meniul global, doar pentru personal; ADR 0132 §11), 24.11.2026, alese de autor: foaia de sub cursor (marginile, fâșia de sub
# foaie, scara stricată), locul rândului, ordinea comenzilor, rândul la vedere (foaia activă, mausul, întrebarea), ștergerea
# cu întrebare, refuzul stins, „Toate foile” oprit, rândurile sub foaia lor, fereastra Mașina, CSS-ul rândului; butonul Admin
# (planul, legătura, fila nouă, grupul din meniu, grupul gol, telefonul).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit (în cloud: docs/lucru-in-cloud.md,
# „Otrăvurile”; e2e-ul, cu configul repo-ului, pe 4173).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


CC = 'src/ui/controaleFoiCalcul.ts'
MF = 'src/ui/MeniuFoaie.tsx'
AP = 'src/app/App.tsx'
ED = 'src/app/Editare.tsx'
AR = 'src/ui/aranjament.ts'
CS = 'src/app/stil.css'

# Partea pură (unitare, pe hârtie).
o('C01', CC, 'cursor.y >= -sub &&', 'cursor.y >= 0 &&', 'calcul', 'fâșia de sub foaie nu mai ține de ea')
o('C02', CC, 'const sub = (DISTANTA_RAND_PX + INALTIME_RAND_PX) / scara;', 'const sub = INALTIME_RAND_PX / scara;', 'calcul',
  'fâșia e doar cât rândul, fără distanța până la el')
o('C03', CC, 'const sub = (DISTANTA_RAND_PX + INALTIME_RAND_PX) / scara;', 'const sub = (DISTANTA_RAND_PX + INALTIME_RAND_PX) * scara;', 'calcul',
  'fâșia crește cu scara, în loc să scadă')
o('C04', CC, 'cursor.x <= f.x + f.latime &&', 'cursor.x <= f.latime &&', 'calcul', 'marginea din dreapta nu ține seama de locul foii')
o('C05', CC, 'cursor.y <= f.inaltime) return f.id;', 'cursor.y <= f.inaltime + sub) return f.id;', 'calcul', 'și fâșia de deasupra foii ține de ea')
o('C06', CC, 'if (cursor.x >= f.x &&', 'if (cursor.x > f.x &&', 'calcul', 'marginea din stânga nu ține de foaie')
o('C07', CC, 'if (cursor === null || !(scara > 0)) return null;', 'if (cursor === null) return null;', 'calcul', 'o scară stricată alege o foaie')
o('C08', CC, 'sus: vedere.ty + DISTANTA_RAND_PX };', 'sus: vedere.ty - DISTANTA_RAND_PX };', 'calcul', 'rândul stă peste marginea foii, nu sub ea')
o('C09', CC, 'stanga: vedere.tx + f.x * vedere.scara,', 'stanga: vedere.tx + f.x,', 'calcul', 'rândul vecinei nu urmează scara vederii')
o('C10', CC, "  ['foaie.muta-sus', 'actiune.foaie-muta-sus'],\n  ['foaie.muta-jos', 'actiune.foaie-muta-jos'],",
  "  ['foaie.muta-jos', 'actiune.foaie-muta-jos'],\n  ['foaie.muta-sus', 'actiune.foaie-muta-sus'],", 'calcul', 'mutările stau în altă ordine decât în meniu')

# Rândul pe pânză (e2e).
o('E01', MF, 'vizibil={f.activa || peste === f.id}', 'vizibil={f.activa}', 'e2e', 'mausul pe o foaie vecină nu-i arată rândul')
o('E02', MF, 'vizibil={f.activa || peste === f.id}', 'vizibil={true}', 'e2e', 'toate rândurile se văd mereu')
o('E03', MF, 'vizibil={f.activa || peste === f.id}', 'vizibil={peste === f.id}', 'e2e', 'rândul foii active se vede doar cu mausul pe ea')
o('E04', MF, "data-vizibil={vizibil || intreaba || extins ? 'da' : 'nu'}", "data-vizibil={vizibil || extins ? 'da' : 'nu'}", 'e2e',
  'întrebarea ștergerii se stinge când mausul pleacă de pe foaie')
o('E05', MF, "if (id === 'foaie.sterge' && f.piese > 0) {\n                    onIntreaba(f.id);", "if (false) {\n                    onIntreaba(f.id);", 'e2e',
  'o foaie cu piese se șterge fără întrebare')
o('E06', MF, "onClick={() => { onIntreaba(null); onExtinde(null); actiuni.ruleaza('foaie.sterge', f.id); }}", 'onClick={() => { onIntreaba(null); onExtinde(null); }}', 'e2e',
  '„Șterge foaia” din întrebare nu șterge')
o('E07', MF, 'data-meniu-foaie-articol="sterge-nu" onClick={() => { onIntreaba(null); }}', 'data-meniu-foaie-articol="sterge-nu" onClick={() => { }}', 'e2e',
  '„Renunță” lasă întrebarea pe rând')
o('E08', MF, 'aria-label={t(eticheta)} disabled={!s.ok}', 'aria-label={t(eticheta)} disabled={false}', 'e2e', 'un refuz nu stinge butonul')
o('E09', MF, "title={s.ok ? t(eticheta) : `${t(eticheta)}: ${t(s.motiv)}`}", 'title={t(eticheta)}', 'e2e', 'butonul stins nu-și spune motivul')
o('E10', MF, "title={t('lista.foaie-proprietati')} onClick={() => { onExtinde(null); actiuni.proprietati(f.id); }} />", "title={t('lista.foaie-proprietati')} onClick={() => { onExtinde(null); actiuni.aseaza(f.id); }} />", 'e2e',
  '„Nume, mărime și material…” deschide așezarea')
o('E11', MF, "title={t('lista.foaie-aseaza')} onClick={() => { onExtinde(null); actiuni.aseaza(f.id); }} />", "title={t('lista.foaie-aseaza')} onClick={() => { onExtinde(null); actiuni.proprietati(f.id); }} />", 'e2e',
  '„Așază pe foi…” deschide panoul foii')
o('E12', MF, "aria-label={t('lista.foaie-proprietati')}\n", "aria-label={t('lista.foaie-aseaza')}\n", 'e2e', 'numele accesibil al primului buton e al altuia')
o('E13', AP, 'if (!toateFoile || doc.foi.length < 2) return [una(activa, indexActiva, 0)];', 'if (doc.foi.length < 2) return [una(activa, indexActiva, 0)];', 'e2e',
  'cu „Toate foile pe pânză” oprit rămân și rândurile foilor nevăzute')
o('E14', AP, 'return doc.foi.map((f, k) => una(f, k, (locuri[k] ?? 0) - x0));', 'return doc.foi.map((f, k) => una(f, k, locuri[k] ?? 0));', 'e2e',
  'rândurile stau față de prima foaie, nu față de cea activă')
o('E15', AP, "inaltime: f.stoc.inaltime, piese: f.instante.length, activa: k === indexActiva,", "inaltime: f.stoc.inaltime, piese: f.instante.length, activa: k === 0,", 'e2e',
  'prima foaie e socotită mereu cea activă')
o('E16', AP, "inaltime: f.stoc.inaltime, piese: f.instante.length, activa: k === indexActiva,", "inaltime: f.stoc.inaltime, piese: 0, activa: k === indexActiva,", 'e2e',
  'rândul nu știe că foaia are piese (ștergere fără întrebare)')
o('E17', AP, '{!doarCiteste(mod) && !acoperita && !urechiAlese && !modImagine ? (\n                  <Suspense fallback={null}><ControaleFoi',
  '{!doarCiteste(mod) && !urechiAlese && !modImagine ? (\n                  <Suspense fallback={null}><ControaleFoi', 'e2e', 'rândurile rămân și sub fereastra Mașina')
o('E18', CS, ".controale-foaie[data-vizibil='da'],\n.controale-foaie:hover,", '.controale-foaie:hover,', 'e2e', 'rândul la vedere rămâne transparent')
o('E19', CS, "  pointer-events: auto;\n  opacity: 0;\n  transition: opacity 0.12s;", "  pointer-events: auto;\n  opacity: 1;\n  transition: opacity 0.12s;", 'e2e',
  'rândul unei foi vecine se vede și fără maus')
o('E20', CS, ".controale-foaie[data-vizibil='da'],\n.controale-foaie:hover,\n.controale-foaie:focus-within {", ".controale-foaie[data-vizibil='da'],\n.controale-foaie:focus-within {", 'e2e',
  'cu mausul chiar pe rând, rândul se stinge')

# Butonul Admin.
o('A01', ED, "const butonAdmin = contul?.drept?.plan === 'personal' ? (", 'const butonAdmin = contul?.drept ? (', 'e2e', 'butonul apare la orice cont')
o('A02', ED, "const butonAdmin = contul?.drept?.plan === 'personal' ? (", 'const butonAdmin = contul ? (', 'e2e', 'butonul apare la orice om cu contul deschis')
o('A03', ED, "const butonAdmin = contul?.drept?.plan === 'personal' ? (", "const butonAdmin = contul?.drept?.plan !== 'personal' ? (", 'e2e', 'butonul apare la clienți, nu la personal')
o('A04', ED, 'href="/admin" target="_blank" rel="noopener" data-editare="admin"', 'href="/admin" rel="noopener" data-editare="admin"', 'e2e', 'pagina de administrare ia locul proiectului')
o('A05', ED, 'href="/admin" target="_blank" rel="noopener" data-editare="admin"', 'href="/" target="_blank" rel="noopener" data-editare="admin"', 'e2e', 'butonul nu duce la /admin')
o('A06', ED, 'href="/admin" target="_blank" rel="noopener" data-editare="admin"', 'href="/admin" target="_blank" data-editare="admin"', 'e2e', 'fila nouă primește fereastra care a deschis-o')
o('A07', ED, "title={t('editare.admin.titlu')}>", "title={t('editare.admin')}>", 'e2e', 'titlul nu spune că se deschide altă filă')
o('A08', AR, "      { id: 'personal', intrari: [{ control: 'admin' }] },\n", '', 'aranjament', 'meniul n-are grupul butonului Admin')
o('A09', CS, ".meniu-global > .grup[data-grup='personal']:has(.loc-admin:empty) {\n  display: none;\n}", '', 'e2e', 'grupul gol ocupă loc în meniu')
o('A10', CS, "@media (max-width: 40rem) {\n  .meniu-global > .grup[data-grup='personal'] {\n    display: none;\n  }\n}", '', 'e2e', 'butonul apare și pe telefon')
o('A11', CS, ".meniu-global > .grup[data-grup='personal'] {\n  margin-left: auto;\n}", '', 'e2e', 'butonul se lipește de file, nu stă la mijloc')

SETURI = {
    'calcul': ['test/unit/controaleFoi.test.ts'],
    'aranjament': ['test/unit/aranjament.test.ts'],
}
E2E = ['test/e2e/controale-foi.spec.ts', 'test/e2e/admin-buton.spec.ts']
