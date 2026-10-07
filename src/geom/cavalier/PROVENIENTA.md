# Proveniența codului cavalier

**Ce e:** portul TypeScript al bibliotecii Rust `cavalier_contours` (offset paralel și boolean pe polilinii cu arce,
cu `bulge`). L-am adus în repo după decizia T5 (`docs/adr/0005-offsetul-cavalier.md`).

**Sursa:**
- depozitul: <https://github.com/msurguy/cavalier-contours-js>;
- tag-ul `v0.1.1`, commit `2e126aa65dce6d03daf767431ab1f393b28df949`;
- `src/` e identic cu HEAD-ul din 07.10.2026 (`4d1d536`), fiindcă după tag s-a schimbat doar demo-ul;
- e aceeași versiune cu pachetul npm `cavalier-contours-js@0.1.1`, măsurat de sonda s1.

**Licența:** MIT OR Apache-2.0, după alegerea utilizatorului. Ambele texte stau alături: `LICENSE-MIT` și
`LICENSE-APACHE`. Copyright-ul rămâne al autorilor.

## Ce am schimbat (07.10.2026, felia 1.4)

Codul de rulare e neschimbat. Schimbările sunt doar două:
1. **Importurile relative** au trecut de la `.js` la `.ts`, inclusiv cele două importuri făcute doar pentru efect, din
   `index.ts`. Node rulează TypeScript-ul direct și cere extensia reală.
2. **118 aserțiuni `!`**, pe 109 linii din 9 fișiere. Toate sunt la citiri din tablouri, cerute de
   `noUncheckedIndexedAccess`. TypeScript le șterge la compilare, deci nu schimbă ce se execută.

**Cum s-a probat:**
- **comparația linie cu linie** cu sursa originală (unde importurile au fost rescrise la fel): 25 de fișiere, 109 linii
  diferite, iar fiecare diferență e un `!` adăugat. Nimic altceva;
- **martorul pozitiv** `test/unit/cavalier.martor.test.ts`: copia de aici și pachetul npm original dau ieșiri identice,
  bit cu bit, pe 10 forme × 10 distanțe. Rulează în CI.

## Ce urmează (`PLAN.md`, T5)

- **Etapa 2, gărzile:**
  - curățarea intrării;
  - validarea structurală a ieșirii;
  - rezoluția declarată, de 0,01 mm.
- **Testul „paralele”:** `lineLineIntr` compară un produs vectorial nenormalizat, în mm², cu 1e-5, o lungime. Se trece
  la unghiul normalizat (`docs/faza2/sonde/s1-geometrie/VERIFICARE.md`, C-mecanismul semicercului).
- **Etapa 9:** reparațiile din Rust 0.8 / 0.9 (#79, #82, #83, vârfurile repetate), cu suita densă.

Fiecare schimbare de comportament de aici trece prin martor: întâi se actualizează diferența așteptată, cu motivul,
apoi se schimbă codul.

## Ciclurile interne

Modulele lui au cicluri de import, pe care le explică și comentariul din `index.ts` (registrele de offset și de boolean
rup ciclul la rulare). Regula „fără cicluri” nu se aplică aici. În schimb, regula `cavalier-doar-prin-fatada` lasă
codul acesta să fie importat doar de `src/geom/offset.ts`, deci ciclurile nu ies din dosar.
