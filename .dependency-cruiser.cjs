/**
 * Regulile de import din `PLAN.md` §3.3. Fiecare regulă are o capcană în `test/capcane/`: un fișier care o încalcă
 * intenționat. `scripts/verifica-importuri.mjs` cere EXACT încălcările capcanelor, nici mai multe, nici mai puține.
 * Dacă o regulă ajunge să nu mai prindă nimic (o cale greșită, o expresie stricată), capcana ei dispare din raport și
 * CI-ul pică: plasa nu poate fi vidă în tăcere.
 *
 * Căile acceptă `test/capcane/<modul>/` alături de `src/<modul>/`, ca fiecare capcană să cadă sub regula ei.
 */
const modul = (nume) => `^(src|test/capcane)/${nume}/`;

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'fara-cicluri',
      severity: 'error',
      comment: 'Fără dependențe circulare în codul nostru. Cavalier, adus în repo, are cicluri interne (registrele care rup '
        + 'ciclul de rulare); ele rămân închise acolo, prin regula fațadei de mai jos.',
      from: { pathNot: '^src/geom/cavalier/' },
      to: { circular: true },
    },
    {
      name: 'cavalier-doar-prin-fatada',
      severity: 'error',
      comment: 'Codul cavalier se folosește doar prin fațada src/geom/offset.ts (T5, ADR 0005).',
      from: { path: '^(src|test/capcane)/', pathNot: '^src/geom/(cavalier/|offset\.ts$)' },
      to: { path: '^src/geom/cavalier/' },
    },
    {
      name: 'oracolele-fara-src',
      severity: 'error',
      comment: 'Oracolele judecă rezultatul fără să împrumute nimic din codul judecat (zero importuri din src/).',
      from: { path: '^test/(oracles|capcane/oracles)/' },
      to: { path: '^src/' },
    },
    {
      name: 'geom-izolat',
      severity: 'error',
      comment: 'Geometria nu importă nimic din restul aplicației.',
      from: { path: modul('geom') },
      to: { path: '^src/', pathNot: '^src/geom/' },
    },
    {
      name: 'i18n-izolat',
      severity: 'error',
      comment: 'Textele nu importă nimic din restul aplicației.',
      from: { path: modul('i18n') },
      to: { path: '^src/', pathNot: '^src/i18n/' },
    },
    {
      name: 'shared-izolat',
      severity: 'error',
      comment: 'Catalogul comun (client + server) nu importă nimic din src/.',
      from: { path: '^(shared|test/capcane/shared)/' },
      to: { path: '^src/' },
    },
    {
      name: 'model-doar-geom',
      severity: 'error',
      comment: 'Modelul documentului importă doar geometria.',
      from: { path: modul('model') },
      to: { path: '^src/', pathNot: '^src/(model|geom)/' },
    },
    {
      name: 'cam-fara-post-sim-masina-interfata',
      severity: 'error',
      comment: 'CAM-ul produce IR; nu știe de post, de simulare, de mașină sau de interfață.',
      from: { path: modul('cam') },
      to: { path: '^src/(post|sim|machine|ui|canvas|admin|app|cloud)/' },
    },
    {
      name: 'post-doar-ir',
      severity: 'error',
      comment: 'Postul importă doar IR-ul și contractele lui: nu știe de document și nu face geometrie.',
      from: { path: modul('post') },
      to: { path: '^src/', pathNot: '^src/(post|ir)/' },
    },
    {
      name: 'sim-doar-ir',
      severity: 'error',
      comment: 'Simularea importă doar IR-ul (și tipurile sculelor).',
      from: { path: modul('sim') },
      to: { path: '^src/', pathNot: '^src/(sim|ir)/' },
    },
    {
      name: 'masina-fara-post-si-document',
      severity: 'error',
      comment: 'Senderul primește programul ca date (octeți + manifest); nu importă postul și nici documentul.',
      from: { path: modul('machine') },
      to: { path: '^src/(post|model|cam|geom)/' },
    },
    {
      name: 'functiile-doar-shared',
      severity: 'error',
      comment: 'Funcțiile Firebase importă doar catalogul comun.',
      from: { path: '^(functions/src|test/capcane/functions)/' },
      to: { path: '^src/' },
    },
  ],
  options: {
    parser: 'swc',
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '^(node_modules|dist|docs)/' },
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      extensions: ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.d.ts'],
    },
    moduleSystems: ['es6', 'cjs'],
  },
};
