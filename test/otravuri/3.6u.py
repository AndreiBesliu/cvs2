# Lista de otrăvuri a feliei 3.6u (filmele timelapse, ADR 0194 §C), 17.11.2026, alese de autor: driverul K1 (`elapseVideoList`:
# numele doar din cifre, începutul în secunde și plafonul lui, fișierul sigur, textul JSON în JSON, plafonul listei, cererea
# printre citiri, filmele în cadrul citit; adresa filmului: gazda verificată, numele, calea), sesiunea (filmele ținute, cadrul
# doar cu filme, cererea rară, numărată separat de istoric), filmul fiecărei imprimări (fișierul, toleranța, cea mai apropiată,
# câte unul, începutul imprimantei) și fereastra, prin e2e (linkul, fila nouă fără trimitător, cererea la final și la
# deschiderea cardului).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


NL = chr(10)
CR = 'src/machine/imprimanta/creality.ts'
SE = 'src/machine/imprimanta/sesiune.ts'
IS = 'src/app/istoricImprimari.ts'
II = 'src/app/IstoricImprimanta.tsx'
PI = 'src/app/PanouImprimanta.tsx'

# Driverul K1: lista filmelor.
o('F01', CR, "typeof nume !== 'string' || !NUME_FILM.test(nume) || inceput", "typeof nume !== 'string' || inceput", 'fil',
  'un nume nesigur (`../x.mp4`) primit')
o('F02', CR, 'export const NUME_FILM = /^\\d{1,20}\\.mp4$/;', 'export const NUME_FILM = /^\\d{1,20}\\.mp4/;', 'fil',
  'un nume cu ceva după `.mp4` (`1.mp4?x=1`) primit')
o('F03', CR, '!NUME_FILM.test(nume) || inceput === null || inceput <= 0 || inceput >= 1e10)', '!NUME_FILM.test(nume) || inceput === null || inceput <= 0)',
  'fil', 'un început absurd (după anul 2286) primit')
o('F04', CR, 'return { nume, inceput: inceput * 1000, fisier:', 'return { nume, inceput, fisier:', 'fil', 'începutul rămâne în secunde')
o('F05', CR, 'fisier: g === null ? null : numeSigur(numeDin(g)) };', 'fisier: g === null ? null : numeDin(g) };', 'fil', 'un fișier nesigur ținut')
o('F06', CR, "const fil = listaJson(r['elapseVideoList']);", "const fil = Array.isArray(r['elapseVideoList']) ? r['elapseVideoList'] as unknown[] : null;",
  'fil', 'lista ca text JSON în JSON pierdută')
o('F07', CR, 'fil.slice(0, MAX_FILME).map(filmDin)', 'fil.map(filmDin)', 'fil', 'o listă uriașă fără plafon')
o('F08', CR, 'new Set([CERERE_STARE, CERERE_FISIERE, CERERE_ISTORIC, CERERE_FILME])', 'new Set([CERERE_STARE, CERERE_FISIERE, CERERE_ISTORIC])', 'fil',
  'filmele necerute la legare')
o('F09', CR, 'filme: c.filme, raspuns:', 'filme: null, raspuns:', 'fil', 'filmele nu trec în cadrul citit')
# Adresa filmului.
o('A01', CR, 'return GAZDA.test(gazda) && NUME_FILM.test(nume) ?', 'return NUME_FILM.test(nume) ?', 'fil', 'o gazdă cu `@`, `/`, `?` primită')
o('A02', CR, 'const GAZDA = /^(?:[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)*|\\[[0-9A-Fa-f:.]+\\])$/;', 'const GAZDA = /^[^/]+$/;', 'fil',
  'o gazdă cu port sau `@` primită')
o('A03', CR, 'GAZDA.test(gazda) && NUME_FILM.test(nume) ?', 'GAZDA.test(gazda) ?', 'fil', 'un nume nesigur ajunge în adresă')
o('A04', CR, '`http://${gazda}/downloads/video/${nume}`', '`http://${gazda}:9999/downloads/video/${nume}`', 'fil', 'filmul cerut pe 9999, nu pe 80')
o('A05', CR, 'adresaFilm: adresaFilmK1,', 'adresaFilm: () => null,', 'fil', 'driverul fără adresa filmului')
# Sesiunea.
o('S01', SE, 'filme: c.filme ?? this.s.filme,', 'filme: c.filme,', 'fil', 'un cadru fără filme le uită')
o('S02', SE, 'if (schimbari || c.fisiere !== null || c.istoric !== null || c.filme !== null) {', 'if (schimbari || c.fisiere !== null || c.istoric !== null) {',
  'fil', 'un cadru doar cu filme nu le ține')
o('S03', SE, 'const la = this.filmeCeruteLa;' + NL + "    if (c === null || this.s.legatura !== 'conectat' || (la !== null && this.ceas.acum() - la < PAUZA_ISTORIC_MS)) return false;",
  'const la = this.filmeCeruteLa;' + NL + "    if (c === null || this.s.legatura !== 'conectat' || la === -1) return false;", 'fil', 'filmele cerute oricât de des')
o('S04', SE, '    if (t === this.s.driver.cerereFilme) this.filmeCeruteLa = this.ceas.acum();' + NL, '', 'fil',
  'cererea de la legare nu ține loc deschiderii cardului')
o('S05', SE, 'const c = this.s.driver.cerereFilme;', 'const c = this.s.driver.cerereIstoric;', 'fil', 'cererea filmelor trimite istoricul')
o('S06', SE, 'private filmeCeruteLa: number | null = null;', 'private get filmeCeruteLa(): number | null { return this.istoricCerutLa; }' + NL +
  '  private set filmeCeruteLa(x: number | null) { this.istoricCerutLa = x; }', 'fil', 'o singură pauză pentru istoric și filme')
# Filmul fiecărei imprimări.
o('P01', IS, 'if (d <= TOLERANTA_MS && (f.fisier === null || f.fisier === x.fisier)) perechi.push', 'if (d <= TOLERANTA_MS) perechi.push', 'fil',
  'filmul altui fișier legat')
o('P02', IS, '(f.fisier === null || f.fisier === x.fisier)', '(f.fisier === x.fisier)', 'fil', 'un film care nu-și spune fișierul, nelegat')
o('P03', IS, 'if (d <= TOLERANTA_MS && (f.fisier', 'if (d < TOLERANTA_MS && (f.fisier', 'fil', 'filmul la exact 10 min, nelegat')
o('P04', IS, 'perechi.sort((p, q) => p.d - q.d);' + NL + '  const luate = new Set<number>();' + NL + '  for (const p of perechi) {' + NL + '    const f = filme[p.b];',
  'const luate = new Set<number>();' + NL + '  for (const p of perechi) {' + NL + '    const f = filme[p.b];', 'fil', 'nu cel mai apropiat întâi')
o('P05', IS, 'if (f === undefined || out[p.a] !== null || luate.has(p.b)) continue;', 'if (f === undefined || luate.has(p.b)) continue;', 'fil',
  'o imprimare ia mai multe filme (ultimul, cel mai departe)')
o('P06', IS, 'if (f === undefined || out[p.a] !== null || luate.has(p.b)) continue;', 'if (f === undefined || out[p.a] !== null) continue;', 'fil',
  'un film legat de două imprimări')
o('P07', IS, 'filmePe(toate.map((x) => ({ fisier: x.r.fisier, inceput: x.inceput })), filme)',
  'filmePe(toate.map((x) => ({ fisier: x.r.fisier, inceput: x.r.inceput })), filme)', 'fil', 'filmul după ceasul ferestrei, nu al imprimantei')
o('P08', IS, 'return toate.map((x, k) => ({ ...x.r, film: pe[k] ?? null }))', 'return toate.map((x) => ({ ...x.r }))', 'fil', 'niciun rând cu film')
# Fereastra, prin e2e.
o('U01', II, 'rel="noopener noreferrer"', 'rel="noopener"', 'e2e', 'fila filmului primește adresa cvs2 (trimitătorul)')
o('U02', II, '<a href={film} target="_blank" rel=', '<a href={film} rel=', 'e2e', 'filmul se deschide peste cvs2, nu într-o filă nouă')
o('U03', II, 'const film = r.film === null ? null : adresaFilm(r.film);', 'const film = null;', 'e2e', 'niciun link al filmului')
o('U04', PI, 'adresaFilm={(nume) => (st.adresa === null ? null : st.driver.adresaFilm(st.adresa.gazda, nume))}', 'adresaFilm={() => null}', 'e2e',
  'fereastra fără adresa filmului')
o('U05', PI, 'useEffect(() => { if (vizibila && conectata) { sesiune.cereIstoric(); sesiune.cereFilme(); } }, [vizibila, conectata]);',
  'useEffect(() => { if (vizibila && conectata) { sesiune.cereIstoric(); } }, [vizibila, conectata]);', 'e2e', 'fereastra deschisă nu cere filmele')
o('U06', PI, 'useInregistrare(st, stare, din, () => { sesiune.cereIstoric(); sesiune.cereFilme(); });',
  'useInregistrare(st, stare, din, () => { sesiune.cereIstoric(); });', 'e2e', 'filmele necerute la final')
o('U07', PI, 'uneste(st.istoric, cvs2, numeIstoric, st.fisiere, st.filme)', 'uneste(st.istoric, cvs2, numeIstoric, st.fisiere)', 'e2e',
  'filmele neunite cu istoricul')
o('U08', PI, 'useEffect(() => { if (vizibila && conectata) { sesiune.cereIstoric(); sesiune.cereFilme(); } }, [vizibila, conectata]);',
  'useEffect(() => { if (vizibila && conectata) { sesiune.cereFilme(); } }, [vizibila, conectata]);', 'e2e', 'fereastra deschisă nu cere istoricul')
o('U09', PI, '} }, [vizibila, conectata]);', '} }, [conectata]);', 'e2e', 'cererile doar la legare, nu la deschiderea ferestrei')

SETURI = {
    'fil': ['test/unit/imprimanta.filme.test.ts', 'test/unit/imprimanta.sesiune.test.ts', 'test/unit/imprimanta.creality.test.ts',
            'test/unit/imprimanta.driver.test.ts'],
}
# Doar cele două probe e2e ale feliei (liniile lor la commit-ul probat), ca fiecare otravă să nu ruleze tot fișierul.
E2E = ['test/e2e/imprimanta.spec.ts:1400', 'test/e2e/imprimanta.spec.ts:1452']
