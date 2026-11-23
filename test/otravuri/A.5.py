# Lista de otrăvuri a feliei A.5 (Utilizatori și Personal după schițe; ADR 0260 §5–§6), 23.11.2026, alese de autor: partea
# pură (filtrele pe plan și numerele lor, căutarea în conturile încărcate, dreptul pe scurt, istoricul planului din audit,
# ziua pe scurt, grupele matricei și eticheta despărțită) și paginile pe emulatoare (tabelul cu filtrele și căutarea,
# alegerea care nu sare înapoi, panoul contului, istoricul doar cu „Audit: citește”, nimic trimis cât lista se recitește,
# contul găsit de căutarea din antet; oamenii cu felul intrării, invitațiile în aceeași listă, matricea și editarea pe
# coloană, rolul folosit care nu se șterge, așezarea pe lățimi). Felia nu schimbă serverul, nici regulile.
# Unitarele se rulează cu `scripts/otravuri.py`, cele de pe emulatoare cu `scripts/otravuri-emulatoare.py` (docs/otravuri.md),
# dintr-o clonă, după commit. o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


V = 'src/admin/utilizatori/vedere.ts'
D = 'src/admin/personal/date.ts'
ED = 'src/admin/erori/date.ts'
FU = 'src/admin/utilizatori/FilaUtilizatori.tsx'
FP = 'src/admin/personal/FilaPersonal.tsx'
PA = 'src/admin/PaginaAdmin.tsx'
CU = 'src/admin/utilizatori/utilizatori.css'
CP = 'src/admin/personal/personal.css'
RO = 'src/i18n/admin.ro.ts'

# Partea pură (unitare).
o('U01', V, "['toate', ...PLANURI]", "[...PLANURI, 'toate']", 'utilizatori', '„Toate” ajunge ultimul filtru')
o('U02', V, "f === 'toate' || planAfisat(c, acum) === f", "f === 'toate' || c.plan === f", 'utilizatori',
  'filtrul merge pe planul ținut: o probă trecută rămâne la „Probă”, personalul la planul lui ținut')
o('U03', V, '{ toate: conturi.length, proba: 0,', '{ toate: 0, proba: 0,', 'utilizatori', '„Toate” arată mereu 0')
o('U04', V, 'for (const c of conturi) n[planAfisat(c, acum)] += 1;', 'for (const c of conturi) n[planAfisat(c, 0)] += 1;', 'utilizatori',
  'numerele se socotesc ca la ora 0: nicio probă nu apare expirată')
o('U05', V, 'const c = simplu(q.trim());', 'const c = q.trim().toLowerCase();', 'utilizatori', 'căutarea cu diacritice nu găsește numele')
o('U06', V, "simplu(`${x.uid} ${x.email ?? ''} ${x.nume ?? ''}`)", "simplu(`${x.uid} ${x.email ?? ''}`)", 'utilizatori', 'căutarea nu se uită în nume')
o('U07', V, "simplu(`${x.uid} ${x.email ?? ''} ${x.nume ?? ''}`)", "simplu(`${x.email ?? ''} ${x.nume ?? ''}`)", 'utilizatori', 'căutarea nu se uită în uid')
o('U08', V, 'const c = simplu(q.trim());', 'const c = simplu(q);', 'utilizatori', 'o căutare doar din spații nu găsește nimic')
o('U09', V, "  if (plan === 'gratuit') return { fel: 'nelimitat' };\n", '', 'utilizatori', 'la Gratuit, dreptul nu spune „nelimitat”')
o('U10', V, "return plan === 'expirat' ? { fel: 'din', data: c.probaPana } : null;", "return { fel: 'din', data: c.probaPana };", 'utilizatori',
  'un cont dezactivat (sau al personalului) cu o probă ținută arată „din …”')
o('U11', V, '  if (c.probaPana === null) return null;\n', '', 'utilizatori', 'un plan necunoscut (expirat, fără dată) arată „din” fără dată')
o('U12', V, "new Set(['conturi.creeaza', 'conturi.gratuit',", "new Set(['conturi.gratuit',", 'utilizatori', 'deschiderea contului lipsește din istoric')
o('U13', V, '.sort((a, b) => t(b) - t(a));', '.sort((a, b) => t(a) - t(b));', 'utilizatori', 'istoricul, cel mai vechi întâi')
o('U14', V, "probaPana: plan === 'proba' && typeof pana === 'number' ? new Date(pana) : null,", "probaPana: typeof pana === 'number' ? new Date(pana) : null,", 'utilizatori',
  'un pas „Gratuit” sau „Dezactivat” arată un sfârșit de probă')
o('U15', V, 'plan: estePlanTinut(plan) ? plan : null,', "plan: typeof plan === 'string' ? plan as PlanTinut : null,", 'utilizatori',
  'un plan necunoscut din audit trece drept cunoscut')
o('U16', V, "creare: r.actiune === 'conturi.creeaza',", "creare: r.cine === 'client',", 'utilizatori', 'deschiderea se ghicește după cine a făcut-o, nu după acțiune')
o('U17', ED, "new Intl.DateTimeFormat(limba, { dateStyle: 'short' }).format(d) : '—';", "new Intl.DateTimeFormat(limba, { dateStyle: 'short', timeStyle: 'short' }).format(d) : '—';",
  'utilizatori', 'ziua pe scurt vine cu oră')
o('U18', D, 'grupe.set(zona, [...(grupe.get(zona) ?? []), p]);', 'grupe.set(zona, [p]);', 'personal', 'o zonă ține doar ultima ei permisiune')
o('U19', D, "const zona = p.slice(0, p.indexOf('.'));", 'const zona = p;', 'personal', 'fiecare permisiune e zona ei: nicio grupare')
o('U20', D, "const k = text.indexOf(': ');", "const k = text.lastIndexOf(': ');", 'personal', 'eticheta se rupe la ultimul „:”')
o('U21', D, "return k < 0 ? { zona: text, fapta: '' }", "return k < 0 ? { zona: '', fapta: text }", 'personal', 'o etichetă fără „:” ajunge faptă, fără zonă')
o('U22', D, 'fapta: text.slice(k + 2) };', 'fapta: text.slice(k + 1) };', 'personal', 'fapta începe cu un spațiu')
o('U23', RO, "'admin.perm.erori.rezolva': 'Erori: rezolvă',", "'admin.perm.erori.rezolva': 'Erorile: rezolvă',", 'personal',
  'două permisiuni ale aceleiași zone au zone diferite în etichetă (matricea le-ar despărți)')

# Paginile pe emulatoare: Utilizatori.
o('E01', FU, 'const gasite = cautaConturi(conturi, cautat);', 'const gasite = conturi;', 'e2e', 'căutarea nu filtrează')
o('E02', FU, 'const numere = numarPePlan(gasite, acum);', 'const numere = numarPePlan(conturi, acum);', 'e2e', 'numerele filtrelor nu urmează căutarea')
o('E03', FU, 'const aratate = pePlan(gasite, filtru, acum);', "const aratate = pePlan(gasite, 'toate', acum);", 'e2e', 'filtrul pe plan nu filtrează')
o('E04', FU, '  if (lista?.ok && alesAcum !== ales) setAles(alesAcum);\n', '', 'e2e', 'alegerea sare înapoi când filtrul se ridică')
o('E05', FU, 'useState<string | null>(tinta?.id ?? null);', 'useState<string | null>(null);', 'e2e', 'contul găsit de căutarea din antet nu vine ales')
o('E06', FU, '{poateIstoric ? <Istoric con={con} eu={eu} uid={c.uid} rev={rev} limba={limba} /> : null}', '<Istoric con={con} eu={eu} uid={c.uid} rev={rev} limba={limba} />', 'e2e',
  'istoricul se cere și fără „Audit: citește” (regulile îl refuză)')
o('E07', FU, "query(collection(con.db, 'audit'), where('tinta', '==', `${COLECTIE_CONTURI}/${uid}`), limit(PLAFON_ISTORIC))", "query(collection(con.db, 'audit'), limit(PLAFON_ISTORIC))", 'e2e',
  'istoricul arată rândurile de audit ale tuturor conturilor')
o('E08', FU, '  }, [con, eu, uid, rev]);', '  }, [con, eu, uid]);', 'e2e', 'istoricul nu se recitește după o schimbare de plan')
o('E09', FU, "const ocupat = lucru.faza === 'lucreaza' || seCiteste;", "const ocupat = lucru.faza === 'lucreaza';", 'e2e',
  'cât lista se recitește, o schimbare pleacă pe planul vechi')
o('E10', FU, '<FormularPlan key={`${c.vazut.plan}/${c.vazut.probaPana}`} c={c}', '<FormularPlan c={c}', 'e2e',
  'formularul rămâne pe alegerea veche după ce planul contului s-a schimbat')
o('E11', FU, ' data-ales={c.uid === alesAcum} onClick={() => { alege(c.uid); }}>', ' data-ales={c.uid === alesAcum}>', 'e2e', 'rândul tabelului nu alege contul')
o('E12', FU, '<span className="admin-slab" data-util="numar">{conturi.length}</span>', '<span className="admin-slab" data-util="numar">{gasite.length}</span>', 'e2e',
  'numărul din titlu urmează căutarea, nu conturile încărcate')
o('E13', FU, "t(poateAdministra ? 'admin.util.text-administreaza' : 'admin.util.text-citeste')", "t(poateAdministra ? 'admin.util.text-citeste' : 'admin.util.text-administreaza')", 'e2e',
  'textul filei, pe dos')
o('E14', FU, '      {poateAdministra ? (\n        <>\n          <h4>', '      {c ? (\n        <>\n          <h4>', 'e2e', 'schimbarea planului se arată și cui doar citește')
o('E15', FU, "{t('admin.erori.cu-numar', { nume: t(f === 'toate' ? 'admin.erori.toate' : `admin.util.plan.${f}`), n: numere[f] })}",
  "{t(f === 'toate' ? 'admin.erori.toate' : `admin.util.plan.${f}`)}", 'e2e', 'filtrele n-au numere')
o('E16', FU, "{' · '}<span className=\"admin-slab\">{t(p.creare ? 'admin.azi.ev.cont-nou' : `admin.azi.cine.${p.cine}`)}</span>",
  "{' · '}<span className=\"admin-slab\">{t(`admin.azi.cine.${p.cine}`)}</span>", 'e2e', 'deschiderea contului apare ca făcută de „un client”')
o('E17', PA, "poateIstoric={p.permisiuni.has('audit.citeste')}", 'poateIstoric={true}', 'e2e', 'istoricul se arată oricui vede fila')
o('E18', CU, '@media (max-width: 1100px) {\n  .util .admin-erori-corp {', '@media (max-width: 100px) {\n  .util .admin-erori-corp {', 'e2e',
  'între 800 și 1 100 px, panoul rămâne lângă tabel (adresele se rup pe trei rânduri)')
o('E19', FU, "{d === null ? '—' : d.fel === 'nelimitat' ? t('admin.util.drept.nelimitat')", "{d === null ? '' : d.fel === 'nelimitat' ? t('admin.util.drept.nelimitat')", 'e2e',
  'un cont fără termen de arătat are celula goală')

# Paginile pe emulatoare: Personal.
o('E20', FP, 'const are = editat === id ? bife.has(p) : r?.permisiuni.includes(p) === true;', 'const are = editat === id ? bife.has(p) : r !== null;', 'e2e',
  'matricea arată toate permisiunile ca date')
o('E21', FP, '      {adauga ? <Adauga roluri={roluri} ocupat={ocupat} fa={fa} limba={limba} /> : null}', '      <Adauga roluri={roluri} ocupat={ocupat} fa={fa} limba={limba} />', 'e2e',
  'formularul „Adaugă un om” stă mereu deschis')
o('E22', FP, 'const expirata = i.expiraLa !== null && i.expiraLa.getTime() <= acum;', 'const expirata = i.expiraLa !== null && i.expiraLa.getTime() >= acum;', 'e2e',
  'invitația în termen apare expirată (și invers)')
o('E23', FP, 'disabled={ocupat || editat !== null || folosit(r.id)} title=', 'disabled={ocupat || editat !== null} title=', 'e2e', 'un rol folosit se poate șterge din pagină')
o('E24', FP, 'oameni.some((o) => o.rol === id) || invitatii.some((i) => i.rol === id);', 'oameni.some((o) => o.rol === id);', 'e2e',
  'un rol folosit doar de o invitație trece drept nefolosit')
o('E25', FP, '<button type="button" disabled={ocupat || editat !== null} data-personal="editeaza"', '<button type="button" disabled={ocupat} data-personal="editeaza"', 'e2e',
  'cât se editează un rol, se poate porni editarea altuia (prima se pierde)')
o('E26', FP, '<button type="button" disabled={ocupat || editat !== null} data-personal="rol-nou-buton"', '<button type="button" disabled={ocupat} data-personal="rol-nou-buton"', 'e2e',
  'cât se editează un rol, „Rol nou” îi ia locul')
o('E27', FP, '    setBife(new Set(r?.permisiuni ?? []));\n', '    setBife(new Set());\n', 'e2e', 'editarea unui rol pornește fără bifele lui')
o('E28', FP, "    setNume(r?.nume ?? '');\n", "    setNume('');\n", 'e2e', 'editarea unui rol pornește fără numele lui')
o('E29', FP, "...(editat === NOU ? {} : { id: editat }), nume, permisiuni }", '...{}, nume, permisiuni }', 'e2e', 'un rol editat se salvează ca rol nou (cel vechi rămâne)')
o('E30', FP, "{ consola: 'admin.pers.sursa.consola', invitatie: 'admin.pers.sursa.invitatie', 'cont-creat': 'admin.pers.sursa.cont-creat' }",
  "{ consola: 'admin.pers.sursa.consola', invitatie: 'admin.pers.sursa.cont-creat', 'cont-creat': 'admin.pers.sursa.invitatie' }", 'e2e',
  'felul intrării, pe dos: contul cu parolă apare ca Google')
o('E31', FP, "{t(SURSE[o.sursa])}{o.adaugatLa ? ` · ${ziScurta(o.adaugatLa, limba)}` : ''}</span>", '{t(SURSE[o.sursa])} · {ziScurta(o.adaugatLa, limba)}</span>', 'e2e',
  'un om fără dată arată „· —” după felul intrării')
o('E32', FP, "{e.fapta === '' ? null : <th scope=\"row\" title={t(`admin.perm.${p}.text`)}>{e.fapta}</th>}", "{e.fapta === '' ? null : <th scope=\"row\">{e.fapta}</th>}", 'e2e',
  'descrierea permisiunii lipsește de pe rândul ei')
o('E33', FP, "<td className=\"admin-slab\">{t('admin.pers.tot')}</td>", '<td className="admin-slab" />', 'e2e', 'coloana owner-ului e goală')
o('E34', FP, "{t('admin.pers.invitatie-trimisa')} · {t(expirata", "{t(expirata", 'e2e', 'invitația nu spune că e o invitație')
o('E35', FP, '<span className="admin-cip">{numeRol(i.rol, roluri) ?? ', '<span className="admin-cip">{i.rol ?? ', 'e2e', 'invitația își arată rolul cu id-ul, nu cu numele')
o('E36', FP, '<button type="button" data-personal="renunta-rol" onClick={() => { setEditat(null); }}>', '<button type="submit" data-personal="renunta-rol">', 'e2e',
  '„Renunță” salvează rolul')
o('E37', CP, '@media (max-width: 1200px) {\n  .pers-doua {', '@media (max-width: 900px) {\n  .pers-doua {', 'e2e', 'la 1 100 px, matricea rămâne înghesuită lângă oameni')
o('E38', FP, '    <div className="pers pers-doua">', '    <div className="pers">', 'e2e', 'matricea stă sub oameni și pe un ecran lat')

SETURI = {
    'utilizatori': ['test/unit/admin.utilizatori.test.ts'],
    'personal': ['test/unit/admin.personal.test.ts'],
}
E2E = ['test/e2e-emulator/utilizatori.emulator.spec.ts', 'test/e2e-emulator/personal.emulator.spec.ts']
# Proba fiecărei otrăvi de emulatoare: fișierul și titlul ei (`--grep`, o expresie regulată: fără paranteze).
SU, SP = E2E
T1, T2, T3 = (SU, 'owner-ul vede conturile în tabel'), (SU, 'un rol care doar citește conturile'), (SU, 'un cont găsit de căutarea din antet')
P1, P2, P3 = (SP, 'owner-ul: un rol din bife'), (SP, 'invitația: omul intră cu Google'), (SP, 'matricea rol × permisiune')
GREP = {
    'E01': T1, 'E02': T1, 'E03': T1, 'E04': T1, 'E05': T3, 'E06': T2, 'E07': T1, 'E08': T1, 'E09': T1, 'E10': T1, 'E11': T1, 'E12': T1,
    'E13': T2, 'E14': T2, 'E15': T1, 'E16': T1, 'E17': T2, 'E18': T1, 'E19': T1,
    'E20': P3, 'E21': P1, 'E22': P3, 'E23': P3, 'E24': P3, 'E25': P3, 'E26': P3, 'E27': P3, 'E28': P3, 'E29': P3, 'E30': P3, 'E31': P3,
    'E32': P3, 'E33': P3, 'E34': P3, 'E35': P3, 'E36': P3, 'E37': P3, 'E38': P3,
}
