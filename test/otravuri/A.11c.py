# Lista de otrăvuri a feliei A.11c (cronologia unui om, „Utilizare: sesiuni”; ADR 0262 §6), 24.11.2026, alese de autor:
# serverul (permisiunea, forma contului, contul cerut, pagina, ordinea, „mai vechi”, lista albă la citire, auditul), partea pură
# a filei (lista albă, aruncatele, „mai vechi”, ordinea sesiunilor, durata, clipa) și pagina (dreptul dat filei, numele,
# catalogul, pagina următoare).
# Unitarele și serverul se rulează cu `scripts/otravuri.py` (serverul în `firebase emulators:exec`, cu funcțiile); setul
# „e2e”, cu `scripts/otravuri-emulatoare.py`.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


S = 'functions/src/utilizare/actiuni.ts'
A = 'src/admin/utilizatori/activitate.ts'
F = 'src/admin/utilizatori/Activitatea.tsx'

o('S01', S, "    if (!drepturi.permisiuni.has('utilizare.sesiuni')) throw new HttpsError('permission-denied', 'cronologia cere „Utilizare: sesiuni”');\n", '',
  'server', 'oricine citește cronologia oricui')
o('S02', S, "drepturi.permisiuni.has('utilizare.sesiuni')", "drepturi.permisiuni.has('utilizare.citeste')", 'server',
  'cronologia o dă permisiunea sumelor, nu a sesiunilor')
o('S03', S, "  if (typeof tinta !== 'string' || !RE_UID.test(tinta)) throw argument('contul');", "  if (typeof tinta !== 'string') throw argument('contul');",
  'server', 'un cont cu altă formă (o cale) trece')
o('S04', S, "db.collection(COLECTIE_UTILIZARE).where('uid', '==', tinta)", "db.collection(COLECTIE_UTILIZARE).where('personal', '==', false)", 'server',
  'cronologia unui om aduce loturile tuturor')
o('S05', S, "    if (pana !== undefined) q = q.where('primit', '<', Timestamp.fromMillis(pana));\n", '', 'server', 'pagina următoare e tot prima')
o('S06', S, "orderBy('primit', 'desc')", "orderBy('primit', 'asc')", 'server', 'cele mai vechi întâi')
o('S07', S, 'maiVechi: s.size > PAGINA_CRONOLOGIE', 'maiVechi: false', 'server', 'fila nu află că mai sunt loturi')
o('S08', S, '  const evenimente = ev.map((e) => evenimentDin(e, Number.MAX_SAFE_INTEGER)).filter((e): e is Eveniment => e !== null);',
  '  const evenimente = ev as Eveniment[];', 'server', 'un eveniment scris altfel pleacă așa cum e')
o('S09', S, "actiune: 'utilizare.cronologie'", "actiune: 'setari.utilizare'", 'server', 'citirea cronologiei nu intră în audit ca atare')

o('U01', A, '    const evenimente = ev.map((e) => evenimentDin(e, Number.MAX_SAFE_INTEGER)).filter((e): e is Eveniment => e !== null);',
  '    const evenimente = ev as Eveniment[];', 'activitate', 'fila arată orice a venit, fără lista albă')
o('U02', A, "aruncate: (nr(l['aruncate']) ?? 0) + ev.length - evenimente.length,", "aruncate: nr(l['aruncate']) ?? 0,", 'activitate',
  'evenimentele sărite nu se numără')
o('U03', A, "maiVechi: x['maiVechi'] === true", 'maiVechi: false', 'activitate', '„Mai vechi” nu apare niciodată')
o('U04', A, '.sort((a, b) => b.inceput - a.inceput);', '.sort((a, b) => a.inceput - b.inceput);', 'activitate', 'cele mai vechi sesiuni întâi')
o('U05', A, '      durata: (evenimente.at(-1)?.t ?? t0) - t0,', '      durata: evenimente.at(-1)?.t ?? t0,', 'activitate',
  'durata se socotește de la pornirea paginii, nu de la primul pas')
o('U06', A, '  return h > 0 ?', '  return false ?', 'activitate', 'o oră se scrie în minute')

o('E01', 'src/admin/PaginaAdmin.tsx', "poateActivitate={p.permisiuni.has('utilizare.sesiuni')}", "poateActivitate={p.permisiuni.has('conturi.citeste')}", 'e2e',
  'activitatea apare oricui citește conturile')
o('E02', F, "<span className=\"admin-slab\">{textClipa(e.t)}</span>{' '}<DescrierePas p={p} nume={nume} />",
  "<span className=\"admin-slab\">{textClipa(e.t)}</span>{' '}<code>{p.id}</code>", 'e2e', 'pașii arată id-urile, fără nume, fel și rezultat')
o('E03', 'src/admin/PaginaAdmin.tsx', " poateActivitate={p.permisiuni.has('utilizare.sesiuni')} aducator={aducator} tinta={tintaConturi} />",
  " poateActivitate={p.permisiuni.has('utilizare.sesiuni')} tinta={tintaConturi} />", 'e2e', 'fila Utilizatori nu primește catalogul: niciun nume')
o('E04', F, 'cronologiaContului(con, uid, inainte.at(-1)?.primit)', 'cronologiaContului(con, uid)', 'e2e', '„Mai vechi” aduce din nou prima pagină')

SETURI = {
    'activitate': ['test/unit/admin.activitate.test.ts'],
    'server': ['functions/test/utilizare.emulator.test.ts'],
}
E2E = ['test/e2e-emulator/utilizatori.emulator.spec.ts']
GREP = {k: 'activitatea unui om' for k in ['E01', 'E02', 'E03', 'E04']}
