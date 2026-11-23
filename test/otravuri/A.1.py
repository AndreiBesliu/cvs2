# Lista de otrăvuri a feliei A.1 (carcasa adminului, ADR 0260 §1 și completarea din 13.11), 17.11.2026, alese de autor: partea
# pură (bara laterală și grupurile ei, părțile filei Azi pe care le vede un rol, fila deschisă, punctul Diagnozei, numărul
# de lângă filă, întâmplările din audit, căutarea, ultima rezolvare) și pagina pe emulatoare (Azi întâi, numerele, punctul,
# un rol parțial care nu citește ce nu vede, căutarea care deschide rândul, lista goală, eroarea citirii, rândurile
# schițate, „fără rol”, meniul contului).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit. Setul „e2e” e pe
# emulatoare (`test/e2e-emulator/azi.emulator.spec.ts`): rulează doar cu 4173 și porturile emulatoarelor libere, prin bucla
# din raportul feliei (build, apoi `firebase emulators:exec` cu Playwright prin `node`), nu prin `otravuri.py … e2e`.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


D = 'src/admin/carcasa/date.ts'
P = 'src/admin/personal/date.ts'
TD = 'src/admin/tichete/date.ts'
PA = 'src/admin/PaginaAdmin.tsx'
SU = 'src/admin/carcasa/sumar.ts'
ST = 'src/admin/carcasa/stari.tsx'
AZ = 'src/admin/azi/FilaAzi.tsx'
ER = 'src/admin/erori/FilaErori.tsx'
TI = 'src/admin/tichete/FilaTichete.tsx'

# Partea pură (unitare).
o('U01', D, "['sugestii', are('sugestii.citeste')],", "['sugestii', are('sugestii.citeste', 'sugestii.scrie')],", 'carcasa',
  'cifra sugestiilor și pentru cine doar scrie (vede doar sugestiile lui)')
o('U02', D, "['asteapta', owner],", "['asteapta', true],", 'carcasa', '„Ce așteaptă de la tine” pentru orice rol')
o('U03', D, "['intamplari', are('audit.citeste')],", "['intamplari', are('audit.citeste', 'erori.citeste')],", 'carcasa',
  'întâmplările din audit fără „Audit: citește”')
o('U04', D, "partiAzi(owner, permisiuni).size > 0 ? ['azi' as const] : []", "['azi' as const]", 'carcasa',
  'Azi în bară și pentru un rol fără nimic de urmărit')
o('U05', D, '.filter((g) => g.file.length > 0)', '', 'carcasa', 'un grup fără nicio filă vizibilă rămâne în bară')
o('U06', D, "{ grup: 'probleme', file: ['erori', 'tichete', 'diagnoza'] },", "{ grup: 'probleme', file: ['tichete', 'erori', 'diagnoza'] },",
  'carcasa', 'ordinea filelor din grupul Probleme')
o('U07', D, "v.some((x) => x.stare === 'esec') ? 'esec' : v.some((x) => x.stare === 'atentie') ? 'atentie' : null",
  "v.some((x) => x.stare === 'atentie') ? 'atentie' : v.some((x) => x.stare === 'esec') ? 'esec' : null", 'carcasa',
  'punctul galben peste un Eșec')
o('U08', D, "v.some((x) => x.stare === 'atentie') ? 'atentie' : null", "v.some((x) => x.stare === 'atentie' || x.stare === 'info') ? 'atentie' : null",
  'carcasa', 'o informație aprinde punctul')
o('U09', D, 'm.valoare > 0 ? m.valoare : null', 'm.valoare >= 0 ? m.valoare : null', 'carcasa', 'numărul 0 lângă filă')
o('U10', D, "['conturi', 'utilizatori']", "['conturi', 'personal']", 'carcasa', 'o întâmplare a unui cont duce în Personal')
o('U11', D, "d['rol'] === null || d['rol'] === undefined ? 'client' : 'personal'", "d['rol'] === null ? 'client' : 'personal'", 'carcasa',
  'un rând de audit fără rol nu e al unui client')
o('U12', D, "d['rezolvat'] === true ? 'admin.azi.ev.eroare-rezolvata'", "d['rezolvat'] !== undefined ? 'admin.azi.ev.eroare-rezolvata'", 'carcasa',
  'redeschiderea unei erori se spune „rezolvată”')
o('U13', D, "esteStareTichet(d['stare']) ? d['stare'] : null", "d['stare'] as StareTichet", 'carcasa',
  'o stare necunoscută a tichetului trece în text')
o('U14', D, "s.normalize('NFD').replace(/\\p{M}/gu, '').toLowerCase()", 's.toLowerCase()', 'carcasa', 'căutarea ține diacriticele')
o('U15', D, '.slice(0, max)', '.slice(0, max + 1)', 'carcasa', 'mai mult de 5 rânduri pe fel')
o('U16', D, 'if (c.length < 2) return [];', 'if (c.length < 1) return [];', 'carcasa', 'o literă caută deja')
o('U17', D, '`${g.id} ${g.text} ${g.detaliu}`', '`${g.text} ${g.detaliu}`', 'carcasa', 'căutarea nu găsește după id (amprentă)')
o('U18', D, 'd.getTime() > m.getTime()', 'd.getTime() < m.getTime()', 'carcasa', 'ultima rezolvare e cea mai veche')
o('U19', D, "(d['rezolvat'] === true ? dataDin(d['marcatLa']) : null)", "dataDin(d['marcatLa'])", 'carcasa',
  'o redeschidere trece drept ultima rezolvare')
o('U20', D, 'return vizibile.includes(ceruta) ? ceruta : vizibile[0] ?? \'cont\';', 'return ceruta;', 'carcasa',
  'o adresă cu o filă pe care rolul n-o vede o deschide')
o('U21', D, "v.filter((x) => !x.id.startsWith('job:') && (x.stare === 'atentie' || x.stare === 'esec'));",
  "v.filter((x) => x.stare === 'atentie' || x.stare === 'esec');", 'carcasa', 'joburile numărate și ca alte probleme')
o('U22', P, "FILE.filter((f): f is Exclude<Fila, 'azi'> => f !== 'azi')", "FILE.filter((f): f is Exclude<Fila, 'azi'> => true)", 'carcasa',
  'fileVizibile știe de Azi')
o('U23', TD, "rezolvatLa: dataDin(d['rezolvatLa']),", 'rezolvatLa: null,', 'tichete', 'rândul tichetului pierde data rezolvării')
o('U24', 'src/admin/diagnoza/verificari.ts', '  if (f !== undefined) {', '  if (true) {', 'diagnoza',
  'Diagnoza fără sonda funcțiilor (rezumatul de la intrare) cade sau o judecă')

# Pagina pe emulatoare (`azi.emulator.spec.ts`).
o('E01', PA, "?? { fila: 'azi', document: null, ancora: null });", "?? { fila: 'erori', document: null, ancora: null });", 'e2e',
  'pagina se deschide pe Erori, nu pe Azi')
o('E02', PA, '{n ? <span className="admin-numar" data-numar="">{n}</span> : null}', '{null}', 'e2e', 'bara fără numere')
o('E03', PA, 'const punct = punctDiagnoza(sumar?.diagnoza ?? null);', 'const punct = punctDiagnoza(null);', 'e2e', 'fără punctul Diagnozei')
o('E04', SU, "parti.has('erori') ? numara(", "true ? numara(", 'e2e', 'rezumatul citește erorile și pentru un rol fără ele')
o('E05', SU, "where('stare', '==', 'nou')", "where('stare', '==', 'rezolvat')", 'e2e', 'tichetele „noi” numără altă stare')
o('E06', PA, 'setTinta(x ? { ...x, fila: f } : null);', 'setTinta(null);', 'e2e', 'rezultatul căutării nu deschide rândul')
o('E07', AZ, 'i.fila !== null && c?.vede(i.fila) ?', 'false ?', 'e2e', 'întâmplările nu duc în fila lor')
o('E08', AZ, 'CARTELE.filter((c) => parti.has(c.parte))', 'CARTELE', 'e2e', 'Azi arată cifrele filelor pe care rolul nu le vede')
o('E09', ER, "randuri.length > 0 || filtru !== 'nerezolvate' ? null", 'true ? null', 'e2e', 'lista goală fără ultima rezolvare')
o('E10', ST, "{c?.vede('diagnoza') ? (", '{false ? (', 'e2e', 'eroarea citirii fără „Deschide Diagnoza”')
o('E11', TI, "{lista === null ? <SeIncarca text={t('admin.tic.se-incarca')} />",
  "{lista === null ? <p className=\"admin-mesaj\" aria-busy=\"true\">{t('admin.tic.se-incarca')}</p>", 'e2e', 'fără rândurile schițate')
o('E12', PA, "        <p data-admin=\"fara-rol-pasi\">{t('admin.cont.fara-rol-pasi')}</p>\n", '', 'e2e', '„fără rol” fără ce face omul')
o('E13', PA, '<LegaturaFila fila="cont" data-admin="meniu-contul-meu"', '<LegaturaFila fila="azi" data-admin="meniu-contul-meu"', 'e2e',
  '„Contul meu” din meniu duce în altă parte')
# Găsite de porțile lente pe 18.11 (emulatoarele): sonda funcțiilor la intrare (401 în consolă), `data-grup` ciocnit cu
# rândurile Erori, bara care iese din ecran pe telefon.
o('E14', SU, 'masoaraDiagnoza(con, d.instanta, d.build, d.rol, false)', 'masoaraDiagnoza(con, d.instanta, d.build, d.rol, true)', 'e2e',
  'rezumatul de la intrare face sonda funcțiilor (401 în consolă la fiecare intrare)')
o('E15', PA, 'data-grup-bara={g.grup}', 'data-grup={g.grup}', 'e2e', 'titlurile barei poartă atributul rândurilor din fila Erori')
o('E16', 'src/admin/admin.css', '    flex-direction: row;\n    flex-wrap: wrap;\n    gap: 2px var(--sp-1);', '    flex-direction: row;\n    gap: 2px var(--sp-1);',
  'e2e', 'pe telefon, bara iese din ecran în dreapta')

SETURI = {
    'carcasa': ['test/unit/admin.carcasa.test.ts', 'test/unit/admin.personal.test.ts'],
    'tichete': ['test/unit/tichete.test.ts'],
    'diagnoza': ['test/unit/admin.test.ts'],
}
E2E = ['test/e2e-emulator/azi.emulator.spec.ts']
# Proba fiecărei otrăvi de emulatoare (`--grep` pe titlul ei), pentru `scripts/otravuri-emulatoare.py`.
T1, T2, T3, T4, T5 = 'owner: Azi întâi', 'un rol cu o singură permisiune', 'căutarea din antet', 'lista goală are semnul', 'intrarea și'
GREP = {
    'E01': T1, 'E02': T1, 'E03': T1, 'E04': T2, 'E05': T1, 'E06': T3, 'E07': T1, 'E08': T2, 'E09': T4, 'E10': T4, 'E11': T4,
    'E12': T5, 'E13': T1, 'E14': T1, 'E15': T1, 'E16': T1,
}
