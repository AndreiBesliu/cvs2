# Lista de otrăvuri a feliei 3.Xi-3 (extensiile, descoperirea; ADR 0232 §C), 24.11.2026, alese de autor: data din „ce e nou”
# (catalogul, lista bibliotecii), rândurile de după versiunea omului, vestea despre o versiune nouă (ținută, citită cu
# îngăduință, consumată la actualizare și la scoatere, fără cerere la pornire), numele din `.zip`, numele evenimentului
# paletei; apoi, cap-coadă: data pe pagină, „Ce e nou” în confirmare, punctul, paleta, `.zip`-ul lăsat pe planșă, refuzul
# arhivei la Import, captura mărită, „Scoate” lângă „Actualizează la …”.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


SH = 'shared/biblioteca.ts'
SB = 'scripts/biblioteca.ts'
BT = 'src/extensii/biblioteca.ts'
NO = 'src/extensii/noi.ts'
ZI = 'src/extensii/zip.ts'
DE = 'src/extensii/descoperire.ts'
EX = 'src/extensii/Extensii.tsx'
BI = 'src/extensii/Biblioteca.tsx'
IN = 'src/extensii/Instalare.tsx'
PR = 'src/extensii/parti.tsx'
CM = 'src/extensii/CapturaMarita.tsx'
PL = 'src/ui/Paleta.tsx'
IC = 'src/app/ImportConectat.tsx'
CS = 'src/extensii/extensii.css'
RO = 'src/i18n/carcasa.ro.ts'
EN = 'src/i18n/carcasa.en.ts'

# --- unitare: data, rândurile noi, vestea, numele din zip ---
o('U01', SH, "return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === x;", "return !Number.isNaN(d.getTime());", 'descoperire',
  'o zi care nu există (30 februarie) trece drept dată')
o('U03', SH, "...(esteData(o.data) ? { data: o.data } : {}) });", "...(o.data !== undefined ? { data: o.data as string } : {}) });", 'descoperire',
  'o dată greșită din catalog ajunge pe ecran')
o('U04', SH, "  if (noutati && dataSarita) sarite.push(`${id}: noutati.data`);\n", "", 'descoperire',
  'o dată greșită cade pe tăcute, fără numele ei')
o('U05', SH, "if (o.data !== undefined && !esteData(o.data)) dataSarita = true;", "if (o.data !== undefined && !esteData(o.data)) return null;", 'descoperire',
  'o dată greșită aruncă tot „ce e nou”')
o('U06', BT, "filter((n) => de === null || comparaVersiuni(n.versiune, de) === 1)", "filter((n) => de === null || comparaVersiuni(n.versiune, de) !== -1)", 'descoperire',
  '„ce e nou” arată și versiunea pe care omul o are deja')
o('U07', BT, "filter((n) => de === null || comparaVersiuni(n.versiune, de) === 1)", "filter((n) => comparaVersiuni(n.versiune, de ?? '') === 1)", 'descoperire',
  'la o instalare nouă, „ce e nou” e gol')
o('U08', NO, "if (r && stareRand(r, x.manifest).fel === 'actualizeaza') noi[x.id] = r.versiune;", "if (r && stareRand(r, x.manifest).fel !== 'instalata') noi[x.id] = r.versiune;", 'descoperire',
  'vestea numără și o versiune mai veche din bibliotecă, sau una pe care fila n-o poate instala')
o('U09', NO, "return x !== undefined && comparaVersiuni(x.manifest.versiune, versiune) === -1;", "return x !== undefined;", 'descoperire',
  'vestea rămâne și după actualizare')
o('U10', NO, "return x !== undefined && comparaVersiuni(x.manifest.versiune, versiune) === -1;", "return comparaVersiuni(x?.manifest.versiune ?? '0', versiune) === -1;", 'descoperire',
  'vestea rămâne și după ce extensia a fost scoasă')
o('U11', NO, "if (typeof x !== 'object' || x === null || (x as { v?: unknown }).v !== 1) return {};", "if (typeof x !== 'object' || x === null) return {};", 'descoperire',
  'o veste scrisă de altă versiune a formatului e citită ca a noastră')
o('U12', NO, "filter(([id, v]) => ID.test(id) && typeof v === 'string' && RE_VERSIUNE_BIBLIOTECA.test(v))", "filter(([, v]) => typeof v === 'string' && RE_VERSIUNE_BIBLIOTECA.test(v))", 'descoperire',
  'un id ciudat din stocare trece drept extensie')
o('U13', NO, "filter(([id, v]) => ID.test(id) && typeof v === 'string' && RE_VERSIUNE_BIBLIOTECA.test(v))", "filter(([id, v]) => ID.test(id) && typeof v === 'string')", 'descoperire',
  'o versiune care nu e din numere trece')
o('U14', NO, "if (Object.keys(noi).length === 0) stocare?.removeItem(CHEIE_EXTENSII_NOI);\n    else stocare", "stocare", 'descoperire',
  'fără nimic de spus, cheia rămâne în stocare')
o('U15', NO, "  } catch {\n    return {};\n  }\n}\n\n/** Scrie vestea", "  } catch (e) {\n    throw e;\n  }\n}\n\n/** Scrie vestea", 'descoperire',
  'o stocare care aruncă oprește citirea veștii')
o('U17', ZI, "    if (p + 46 > eocd || v.getUint32(p, true) !== 0x02014b50) return null;\n", "    if (p + 46 > eocd) return null;\n", 'descoperire',
  'o intrare fără semnătura directorului nu mai e refuzată')
o('U16', ZI, "    if (p + 46 > eocd || v.getUint32(p, true) !== 0x02014b50) return null;\n", "    if (v.getUint32(p, true) !== 0x02014b50) return null;\n", 'descoperire',
  'o intrare promisă dincolo de sfârșitul directorului e citită')
o('U18', ZI, "    p += 46 + ln + le + lc;\n  }\n  return nume;", "    p += 46 + ln + le;\n  }\n  return nume;", 'descoperire',
  'comentariul unei intrări nu e sărit')
o('U19', DE, "export const EVENIMENT_PALETA = 'cncvs2-extensii';", "export const EVENIMENT_PALETA = 'cncvs2-extensiile';", 'descoperire',
  'gazda ascultă alt eveniment decât cel al paletei')
o('U20', SB, "if (n.data !== undefined && !esteData(n.data)) return gresit(", "if (n.data !== undefined && typeof n.data !== 'string') return gresit(", 'constructie',
  'lista bibliotecii primește o dată greșită')
o('U21', SB, "return { versiune: n.versiune, ...t, ...(n.data !== undefined ? { data: n.data } : {}) };", "return { versiune: n.versiune, ...t };", 'constructie',
  'data scrisă în listă nu ajunge în catalog')


# --- e2e: „Ce e nou” ---
o('N01', PR, "{n.data !== undefined && <small> · <time dateTime={n.data}>{dataText(n.data, limba)}</time></small>}", "", 'e2e',
  'data versiunii nu se mai arată')
o('N02', PR, "toLocaleDateString(limba === 'ro' ? 'ro-RO' : 'en-GB')", "toLocaleDateString('ro-RO')", 'e2e',
  'în engleză, data e scrisă românește')
o('N03', PR, "new Date(`${iso}T12:00:00`)", "new Date(`${iso}T12:00:00`.replace(/-(\\d\\d)T/, (_, z: string) => `-${String(Number(z) - 1).padStart(2, '0')}T`))", 'e2e',
  'data alunecă o zi înapoi')
o('N04', IN, "      {actualizare && <Noutati noutati={noutatiDupa(rand.noutati, s.de)} limba={limba} test=\"confirmare-noutati\" />}\n", "", 'e2e',
  'confirmarea actualizării nu mai spune ce e nou')
o('N05', IN, "noutatiDupa(rand.noutati, s.de)", "noutatiDupa(rand.noutati, null)", 'e2e',
  'confirmarea arată și versiunile pe care omul le are')

# --- e2e: punctul ---
o('V01', EX, "{versiuniNoi > 0 && <span className=\"buton-punct\" data-testid=\"extensii-punct\" aria-hidden=\"true\" />}", "", 'e2e',
  'butonul n-are punct')
o('V02', EX, "const numeButon = versiuniNoi > 0 ? t('extensii.buton.noi', { n: versiuniNoi }) : t('extensii.buton');", "const numeButon = t('extensii.buton');", 'e2e',
  'numele butonului nu spune de versiunea nouă')
o('V03', DE, "    setNoi(n);\n    scrieNoi(n);", "    setNoi(n);", 'e2e',
  'vestea nu se ține în browser: după reîncărcare, punctul a plecat')
o('V04', DE, "const [noi, setNoi] = useState(() => citesteNoi());", "const [noi, setNoi] = useState(() => ({} as ReturnType<typeof citesteNoi>));", 'e2e',
  'la pornire, vestea ținută nu se citește')
o('V05', DE, "    if (!listaCitita) return;\n", "", 'e2e',
  'lista goală de la început șterge vestea înainte să se citească extensiile')
o('V06', DE, "catalog?.fel === 'ok' ? noiDupaCatalog(catalog.catalog.extensii, lista) : pastreazaNoi(noi, lista)", "catalog?.fel === 'ok' ? noiDupaCatalog(catalog.catalog.extensii, lista) : noi", 'e2e',
  'fără catalog (după reîncărcare), vestea nu scade când extensia se scoate')
o('V07', CS, ".buton-punct {\n  position: absolute;", ".buton-punct {\n  display: none;\n  position: absolute;", 'e2e',
  'punctul nu se vede')
o('V08', EX, "  const versiuniNoi = useVeste(biblioteca, lista, listaCitita);", "  const versiuniNoi = useVeste(null, lista, listaCitita);", 'e2e',
  'catalogul venit nu mai aduce vestea')
o('V09', RO, "'extensii.buton.noi': { one: 'Extensii (o versiune nouă)',", "'extensii.buton.noi': { one: 'Extensii',", 'e2e',
  'în română, numele butonului nu spune de versiunea nouă')

# --- e2e: paleta ---
o('P01', PL, "    elemente: [...elemente, ...extensii]", "    elemente: [...elemente]", 'e2e',
  'paleta nu arată extensiile instalate')
o('P02', PL, "      window.dispatchEvent(new CustomEvent(EVENIMENT_EXTENSII, { detail: { deschide: e.id.slice(DESCHIDE_EXTENSIA.length) } satisfies CerereExtensiiPaleta }));\n", "", 'e2e',
  'alegerea unei extensii în paletă doar închide paleta')
o('P03', PL, "      // O extensie: paleta se închide, iar gazda extensiilor o deschide (ca din meniul ei).\n      onInchide();\n", "", 'e2e',
  'paleta rămâne deschisă peste extensia aleasă')
o('P05', PL, "const numeleLui = (e: ElementPaleta): string => (e.nume === undefined ? t(e.eticheta) : t(e.eticheta, { nume: e.nume }));", "const numeleLui = (e: ElementPaleta): string => t(e.eticheta);", 'e2e',
  'rândul din paletă nu spune numele extensiei')
o('P06', DE, "      if (x) acum.current.deschide(x);", "      if (x) acum.current.deschide(acum.current.lista[0] ?? x);", 'e2e',
  'paleta deschide altă extensie decât cea aleasă')
o('P07', EN, "'paleta.deschide-extensie': 'Open {nume}',", "'paleta.deschide-extensie': 'Deschide {nume}',", 'e2e',
  'în engleză, rândul din paletă e în română')

# --- e2e: .zip-ul lăsat pe planșă ---
o('Z01', EX, "  useZipLasat((f) => { setMeniu(null); setCerere({ fel: 'fisier', fisier: f }); });\n", "", 'e2e',
  'un .zip de extensie lăsat pe planșă ajunge la Import')
o('Z02', DE, "      tinta.dispatchEvent(new DragEvent('dragleave', { bubbles: true }));\n", "", 'e2e',
  'planșa rămâne cu „Lasă aici” după ce extensia a fost luată')
o('Z03', DE, "return numeZip(new Uint8Array(await f.arrayBuffer()))?.includes(MANIFEST) ?? false;", "return numeZip(new Uint8Array(await f.arrayBuffer()))?.some((n) => n.endsWith(MANIFEST)) ?? false;", 'e2e',
  'un manifest dintr-un dosar al arhivei trece drept extensie')
o('Z04', DE, "        (tinta.isConnected ? tinta : document.body).dispatchEvent(dinNou);\n", "", 'e2e',
  'un .zip care nu e extensie dispare: nu mai ajunge la Import')
o('Z05', DE, "return numeZip(new Uint8Array(await f.arrayBuffer()))?.includes(MANIFEST) ?? false;", "return numeZip(new Uint8Array(await f.arrayBuffer())) !== null;", 'e2e',
  'orice arhivă trece drept extensie')
o('Z06', IC, "cod: /\\.zip$/i.test(f.name) ? 'zip' : 'tip' } };", "cod: 'tip' } };", 'e2e',
  'refuzul unei arhive la Import nu mai spune de unde se instalează o extensie')

# --- e2e: captura mărită ---
o('C01', BI, "{marire ? <button type=\"button\" data-extensii=\"captura\" title={t('extensii.captura.mareste')} onClick={() => { setMarita(i); }}>{img}</button> : img}", "{img}", 'e2e',
  'capturile nu se mai măresc')
o('C02', BI, "const marire = !matchMedia('(max-width: 40rem)').matches;", "const marire = true;", 'e2e',
  'pe telefon, capturile devin butoane de mărit')
o('C03', BI, "onClick={() => { setMarita(i); }}>{img}</button>", "onClick={() => { setMarita(0); }}>{img}</button>", 'e2e',
  'orice captură o deschide pe prima')
o('C04', CM, "const muta = (pas: number): void => { onLoc((loc + pas + n) % n); };", "const muta = (pas: number): void => { onLoc(Math.min(n - 1, Math.max(0, loc + pas))); };", 'e2e',
  'săgețile se opresc la capete')
o('C05', CM, "if (n > 1) muta(e.key === 'ArrowRight' ? 1 : -1);", "if (n > 1) muta(1);", 'e2e',
  '← merge tot înainte')
o('C06', CM, "      e.preventDefault();\n      e.stopPropagation();\n      onInchide();", "      e.preventDefault();\n      onInchide();", 'e2e',
  'Escape închide și biblioteca de sub captură')
o('C07', BI, "            locCapturi.current?.querySelectorAll<HTMLButtonElement>('[data-extensii=\"captura\"]')[i]?.focus();\n", "", 'e2e',
  'la închidere, focusul nu se întoarce pe captură')
o('C08', CM, "<span className=\"captura-loc\" data-testid=\"captura-loc\" aria-live=\"polite\">{loc + 1} / {n}</span>", "<span className=\"captura-loc\" data-testid=\"captura-loc\" aria-live=\"polite\">{loc} / {n}</span>", 'e2e',
  'locul capturii începe de la zero')
o('C09', CM, "<span data-testid=\"captura-legenda\">{c.alt}</span>", "<span data-testid=\"captura-legenda\">{capturi[0]?.alt}</span>", 'e2e',
  'legenda rămâne a primei capturi')
o('C10', CS, "  max-width: 100%;\n  max-height: calc(100vh - 6rem);", "  max-width: 18rem;\n  max-height: calc(100vh - 6rem);", 'e2e',
  'captura „mărită” e cât cea din pagină')
o('C11', CM, "onClick={() => { muta(-1); }}><span aria-hidden=\"true\">‹</span>", "onClick={() => { muta(1); }}><span aria-hidden=\"true\">‹</span>", 'e2e',
  'butonul ‹ merge înainte')
o('C12', CM, "data-extensii=\"captura-inchide\" aria-label={t('extensii.captura.inchide')} title={t('extensii.captura.inchide')}\n        onClick={onInchide}>", "data-extensii=\"captura-inchide\" aria-label={t('extensii.captura.inchide')} title={t('extensii.captura.inchide')}>", 'e2e',
  '× al capturii nu face nimic')

# --- e2e: „Scoate” lângă „Actualizează la …” ---
o('S01', BI, "            {instalata && (\n              <button type=\"button\" data-extensii=\"pagina-scoate\"", "            {instalata && s.fel !== 'actualizeaza' && (\n              <button type=\"button\" data-extensii=\"pagina-scoate\"", 'e2e',
  'cu o versiune nouă în bibliotecă, extensia nu se mai poate scoate')
o('S02', CS, "  .pagina-actiuni button:first-child:nth-last-child(3) {\n    flex-basis: 100%;\n  }\n", "", 'e2e',
  'pe telefon, cele trei gesturi se înghesuie pe un rând')

SETURI = {
    'descoperire': ['test/unit/extensii.descoperire.test.ts'],
    'constructie': ['test/unit/biblioteca.constructie.test.ts'],
}
E2E = ['test/e2e/extensii.descoperire.spec.ts']
