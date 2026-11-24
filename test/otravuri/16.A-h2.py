# Lista de otrăvuri a feliei 16.A↑h-2 (grupurile omului în „Frezele mele”; ADR 0302 §4), aleasă de autor: modelul (marginile
# grupului, curățarea, citirea, ordinea grupurilor, unirea fără deosebire de majuscule, redenumirea: numele existent, versiunea,
# refuzul), fișierul CSV, depozitul și fereastra (titlul cu „✎”, „Grup nou…”, focusul, Escape, motivul refuzului, câmpul din
# editor, grupul din fișă).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit. o(id, fis, vechi, nou, set, ce):
# `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


F = 'src/model/freza.ts'
C = 'src/io/frezeFisier.ts'
M = 'src/app/frezeMele.ts'
W = 'src/app/FrezeleMele.tsx'

o('G01', F, "  return [...g.normalize('NFC').trim()].length > MARGINI_FREZA.grup ? 'grup-lung' : null;", '  return null;', 'model',
  'un grup prea lung trece')
o('G02', F, "  if (/[\\u0000-\\u001f\\u007f-\\u009f]/u.test(g)) return 'grup-caractere';\n", '', 'model', 'un grup cu caractere de control trece')
o('G03', F, "    grup: typeof f.grup === 'string' && f.grup.trim() !== '' ? f.grup.normalize('NFC').trim() : undefined,",
  '    grup: f.grup,', 'model', 'grupul nu se curăță la capete; unul gol rămâne')
o('G04', F, "\n    && (x['grup'] === undefined || typeof x['grup'] === 'string');", ';', 'model', 'un grup care nu e text se citește')
o('G05', F, ".sort((a, b) => a.nume.localeCompare(b.nume, 'ro', { sensitivity: 'base' }))", '', 'model',
  'grupurile omului nu stau după nume')
o('G06', F, '      const k = cheieNume(f.grup);', '      const k = f.grup;', 'model', '„Lemn” și „LEMN” sunt două grupuri')
o('G07', F, '  return [...omului, ...felurile];', '  return [...felurile, ...omului];', 'model', 'felurile înaintea grupurilor omului')
o('G08', F, "  const grup = curat === '' ? undefined : (existent ?? curat);", "  const grup = curat === '' ? undefined : curat;", 'model',
  'redenumit spre un grup existent, numele lui nu se ia')
o('G09', F, '(ale(f) ? curata({ ...f, grup, rev: f.rev + 1, schimbatLa: acum }) : f)', '(ale(f) ? curata({ ...f, grup, rev: f.rev, schimbatLa: acum }) : f)',
  'model', 'redenumirea nu crește versiunea (contul n-o vede)')
o('G10', F, "  if (!lista.some(ale)) return { ok: false, motiv: 'lipsa' };\n", '', 'model', 'un grup care nu e se „redenumește” fără refuz')
o('C01', C, "      ...(grup === '' ? {} : { grup }),", '      grup,', 'fisier', 'o celulă goală dă un grup gol')
o('C02', C, "'tais', 'taisuri', 'nota', 'grup'] as const;", "'tais', 'taisuri', 'nota'] as const;", 'fisier', 'coloana `grup` nu se citește')
o('D01', M, "      return { ok: false, probleme: r.motiv === 'lipsa' ? { id: 'lipsa' } : { grup: r.motiv } };",
  "      return { ok: false, probleme: { id: 'lipsa' } };", 'depozit', 'refuzul numelui se spune ca „lipsă”')
o('E01', W, '                    {g.grup !== null && !scrie ? (', '                    {false && !scrie ? (', 'e2e', 'fără „✎” pe titlul grupului')
o('E02', W, "                  if (v === NOU) { setGrupNou(''); setMesaj('');", "                  if (false) { setGrupNou(''); setMesaj('');", 'e2e',
  '„Grup nou…” mută freza într-un grup cu numele opțiunii')
o('E03', W, "if (v === NOU) { setGrupNou(''); setMesaj(''); deFocus.current = '[data-freze=\"grup-nou\"]'; }",
  "if (v === NOU) { setGrupNou(''); setMesaj(''); }", 'e2e', '„Grup nou…”: focusul nu ajunge în câmpul numelui')
o('E04', W, "setMesaj(''); deFocus.current = '[data-freze=\"grup-nume-nou\"]'; }}>", "setMesaj(''); }}>", 'e2e',
  '„✎”: focusul nu ajunge în câmpul numelui')
o('E05', W, '    if (redenumit) setRedenumit(null);\n    else ', '    ', 'e2e', 'Escape la redenumire închide fereastra')
o('E06', W, """      setRedenumit(null);
      setMesaj(t('freze.stare.salvat'));""", """      setMesaj(t('freze.stare.salvat'));""", 'e2e', 'redenumit, câmpul rămâne deschis (titlul nu se vede)')
o('E07', W, "    fel: c.fel, nota: c.nota.trim() === '' ? undefined : c.nota.trim(), grup: c.grup.trim() === '' ? undefined : c.grup.trim(),",
  "    fel: c.fel, nota: c.nota.trim() === '' ? undefined : c.nota.trim(), grup: undefined,", 'e2e', 'câmpul „Grupul” din editor nu se salvează')
o('E08', W, "    fel: f.fel, nume: numeGol ? '' : f.nume, nota: f.nota ?? '', grup: f.grup ?? '',",
  "    fel: f.fel, nume: numeGol ? '' : f.nume, nota: f.nota ?? '', grup: '',", 'e2e', 'editorul nu arată grupul frezei')
o('E09', W, "              <select data-freze=\"muta\" value={f.grup ?? ''} disabled={doarCitire}",
  "              <select data-freze=\"muta\" value=\"\" disabled={doarCitire}", 'e2e', 'fișa nu arată grupul frezei')

SETURI = {
    'model': ['test/unit/freza.test.ts'],
    'fisier': ['test/unit/frezeFisier.test.ts'],
    'depozit': ['test/unit/frezeMele.test.ts'],
}
E2E = ['test/e2e/freze.spec.ts']
