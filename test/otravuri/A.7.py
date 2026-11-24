# Lista de otrăvuri a feliei A.7 (adminul pe telefon; ADR 0260 §10), 24.11.2026, alese de autor: bara de jos (arătată, filele
# după drepturi, „Mai mult”), sertarul (ascuns, închis de o filă aleasă și de Escape), butonul ☰, proiectul doar pe calculator
# și locul de sub bara de jos.
# Toate pe emulatoare, cu `scripts/otravuri-emulatoare.py`.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


C = 'src/admin/admin.css'
P = 'src/admin/PaginaAdmin.tsx'

o('E01', C, """  .admin-jos {
    display: flex;""", """  .admin-jos {
    display: none;""", 'e2e', 'pe telefon nu e nicio bară jos')
o('E02', C, """  .admin-bara {
    display: none;
    width: auto;""", """  .admin-bara {
    display: flex;
    width: auto;""", 'e2e', 'bara laterală rămâne deschisă pe telefon, peste conținut')
o('E03', P, '  useEffect(() => { setSertar(false); }, [aratata]);\n', '', 'e2e', 'sertarul rămâne deschis după o filă aleasă')
o('E04', P, "if (e.key === 'Escape') setSertar(false);", "if (e.key === 'Escape') return;", 'e2e', 'Escape nu închide sertarul')
o('E05', P, """<button type="button" data-jos="mai-mult" aria-expanded={sertar} aria-controls="admin-bara" onClick={() => { setSertar((x) => !x); }}>""",
  """<button type="button" data-jos="mai-mult" aria-expanded={sertar} aria-controls="admin-bara">""", 'e2e', '„Mai mult” nu deschide nimic')
o('E06', P, 'FILE_JOS.filter((f) => vizibile.includes(f))', 'FILE_JOS', 'e2e', 'jos apar și filele pe care rolul nu le vede')
o('E07', C, """  .tic-proiect [data-tic='descarca-proiect'] {
    display: none;""", """  .tic-proiect [data-tic='descarca-proiect'] {
    display: inline-flex;""", 'e2e', 'proiectul se descarcă și de pe telefon')
o('E08', C, '    padding: var(--sp-4) var(--sp-4) calc(var(--sp-4) + 56px + env(safe-area-inset-bottom, 0px));', '    padding: var(--sp-4);', 'e2e',
  'bara de jos acoperă capătul conținutului (butonul trimiterii)')
o('E09', C, """  .admin-meniu-file {
    display: inline-flex;""", """  .admin-meniu-file {
    display: none;""", 'e2e', 'pe telefon nu e ☰')

SETURI = {}
E2E = ['test/e2e-emulator/conversatia.emulator.spec.ts']
TEL = 'bara de jos cu Azi, Erori, Tichete'
GREP = {k: TEL for k in ['E01', 'E02', 'E03', 'E04', 'E05', 'E07', 'E08', 'E09']}
GREP['E06'] = 'un rol doar cu tichetele: jos'
