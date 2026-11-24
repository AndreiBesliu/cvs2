# Lista de otrăvuri a feliei 16.A↑h-1 (fereastra „Frezele mele” ca listă; ADR 0302 §3), aleasă de autor: vederea ținută,
# fișa doar de citit (valorile, silueta în română), editorul la „Editează” / „Freză nouă”, întoarcerea la fișă (Salvează,
# Renunță, „←”), focusul, comutatorul (cu o schimbare nesalvată), telefonul.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit. o(id, fis, vechi, nou, set, ce):
# `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


W = 'src/app/FrezeleMele.tsx'

o('H01', W, "    return localStorage.getItem(CHEIE_VEDERE) === 'configurator' ? 'configurator' : 'lista';",
  "    return 'lista';", 'e2e', 'vederea aleasă nu se citește după reîncărcare')
o('H02', W, '    localStorage.setItem(CHEIE_VEDERE, v);\n', '', 'e2e', 'vederea aleasă nu se ține')
o('H03', W, "  const cuEditor = aleasa === 'nou' || vedere === 'configurator' || editeaza;",
  "  const cuEditor = aleasa === 'nou' || editeaza;", 'e2e', '„Configurator” nu deschide editorul la alegere')
o('H04', W, "    if (vedere === 'lista') laFisa();\n    setMesaj(t('freze.stare.salvat'));", "    setMesaj(t('freze.stare.salvat'));", 'e2e',
  'după „Salvează”, editorul rămâne deschis în „Listă”')
o('H05', W, "      if (vedere === 'lista') laFisa();\n    }", '    }', 'e2e', '„Renunță” nu întoarce la fișă')
o('H06', W, "                  disabled={vedere === 'configurator' && !schimbata && aleasa !== 'nou'} onClick={renunta}>",
  "                  disabled={!schimbata && aleasa !== 'nou'} onClick={renunta}>", 'e2e',
  '„Renunță” fără schimbări, oprit și în „Listă”: editorul nu mai are ieșire spre fișă')
o('H07', W, "    if (vedere === 'lista' && aleasa !== 'nou') pleaca(laFisa);", '    if (false) pleaca(laFisa);', 'e2e',
  '„←” din editor duce la listă, nu la fișă')
o('H08', W, "onClick={() => { setPas('lista'); setStergere(false); }}>← {t('freze.inapoi')}</button>",
  "onClick={() => { setStergere(false); }}>← {t('freze.inapoi')}</button>", 'e2e', '„←” din fișă nu întoarce la listă (telefon)')
o('H09', W, '  const editeazaFisa = (): void => {\n    setEditeaza(true);', '  const editeazaFisa = (): void => {\n    setEditeaza(false);',
  'e2e', '„Editează” nu deschide editorul')
o('H10', W, "    geometria.push(['numar', t('freze.numar'), `T${f.numar}`]);", "    geometria.push(['numar', t('freze.numar'), `${f.numar}`]);",
  'e2e', 'T-ul fără „T” în fișă')
o('H11', W, "    if (f.tais !== undefined) geometria.push(['tais', t('freze.tais'), `${nr(f.tais)} ${mm}`]);",
  "    geometria.push(['tais', t('freze.tais'), `${nr(f.tais ?? 0)} ${mm}`]);", 'e2e', 'tăișul necunoscut apare ca 0 mm')
o('H12', W, "                {aleasa !== 'nou' && vedere === 'configurator' ? (", "                {aleasa !== 'nou' ? (", 'e2e',
  '„Duplică” și „Șterge” și în editorul din listă')
o('H13', W, "    deFocus.current = '[data-freze=\"editeaza\"]';\n  };", '  };', 'e2e', 'înapoi la fișă, focusul se pierde')
o('H14', W, "    setMesaj('');\n    deFocus.current = '[data-freze-camp=\"nume\"]';\n  };", "    setMesaj('');\n  };", 'e2e',
  '„Editează”: focusul nu ajunge pe nume')
o('H15', W, 'Ø{textNumar(f.diametru, ro)}</text>', 'Ø{textNumar(f.diametru)}</text>', 'e2e', 'cota siluetei cu punct în română')
o('H16', W, "    if (v === 'lista' && aleasa !== 'nou') pleaca(aplica);\n    else aplica();", '    aplica();', 'e2e',
  'spre „Listă”, o schimbare nesalvată se pierde')

SETURI = {}
E2E = ['test/e2e/freze.spec.ts']
# Proba pe emulatoare (`freze.emulator.spec.ts`) trece prin fișă la fiecare schimbare; nu are otrăvuri proprii aici.
