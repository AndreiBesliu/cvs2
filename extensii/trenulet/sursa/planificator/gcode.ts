// G-code direct, fara ArtCAM: postul si bucatile de CAM din cvs2 (CNC Vector Studio 2), portate aici.
//
// - Postul unic (cvs2 src/post/post.ts, ADR 0009) cu contractele de dialect ca DATE (src/post/contracte/): GRBL 1.1,
//   grblHAL si FluidNC copiate; Mach3, NcStudio, RichAuto si Syntec scrise aici dupa aceleasi reguli, NEPROBATE pe masina.
// - Formatorul de numere (src/post/numere.ts): zecimale fixe, punctul zecimal scris mereu, fara numere nefinite.
// - CAM-ul (src/cam/profil.ts, urechi.ts, parcurgere.ts, traseu.ts, gaurire.ts): trecerile pe adancime, profilul exterior
//   cu urechile (puntile) pe profilul Z(s), parcurgerea buclei cu arcele pastrate ca arce, gaurirea prin ciocanire.
// - IR-ul (src/ir/ir.ts): miscarile in coordonatele foii (originea stanga-jos, Z = 0 pe fata de sus); montajul il aplica postul.
// Poliliniile sunt cele din cnc.js: [x, y, bulge], bulge-ul segmentului care pleaca din varf.
var TrenGCode = (function (glob: typeof globalThis) {
  "use strict";
  type Vf = [number, number, number];
  type Pl = Vf[];
  type Xy = { x: number; y: number };
  /** Ținta unei mișcări: doar axele scrise se schimbă. */
  type La = { X?: number; Y?: number; Z?: number };
  type Scula = { numar: number; nume: string; diametru: number; forma?: { tip: string; unghi: number } | undefined };
  type Miscare =
    | { tip: "rapida"; la: La }
    | { tip: "taiere"; la: La; avans: number }
    | { tip: "arc"; la: La; centru: Xy; sens: "trigonometric" | "orar"; avans: number }
    | { tip: "pauza"; secunde: number }
    | { tip: "eticheta"; text: string }
    | { tip: "schimba-scula"; scula: Scula; turatie: number };
  type Program = { scula: Scula; turatie: number; zSigur: number; miscari: Miscare[]; axe?: string[] };
  type Montaj = { foaie: { latime: number; inaltime: number; grosime: number }; origine: string; z0: string };
  /** Dialectul unui controler, ca date (contractele din cvs2). */
  type Contract = { extensie: string; zecimaleMm: number; unitati: string; comentariu: { deschidere: string; inchidere: string } | null; liniaMaxima: number;
    pauza: { cuvant: string; unitate: string }; arc: { coardaMinimaRezolutii: number; unghiMinim: number; razaMaxima: number; baleiajMaxim: number };
    elice: boolean; antet: string[]; wcs: string; final: string[]; nume: string; probat: boolean; scula: string[] };
  type OptiuniPost = { asteptareAx: number; strategieScula?: string };
  /** Reușita (cu ce a ieșit) sau motivul pentru care nu se poate. */
  type Rez<T> = ({ ok: true } & T) | { ok: false; motiv: string };
  type Cerc = { centru: Xy; raza: number; start: number; baleiaj: number };
  type Segment = { a: Xy; b: Xy; bulge: number; cerc: Cerc | null; brut: Cerc | null; L: number };
  /** Un nod al profilului Z(s) de-a lungul buclei. */
  type Nod = { s: number; z: number };
  type Urechi = { numar: number; latime: number; varf: number };
  type Parametri = { zSigur: number; avans: number; avansPlonjare: number };
  type Cale = { v: Pl; inchis: boolean };
  type Bucla = Cale & { nume: string; faraUrechi: boolean; punti: number[][] };
  type Axa = { pasiPeMm: number; vitezaMaxima: number; acceleratie: number };
  type ProfilMasina = { nume: string; sursa: string; axe: Partial<Record<string, Axa>>; deviatieJonctiune: number; toleranteArc: number;
    firmware: { blocuriPlanificator: number; pasPauza: number; vitezaMinimaJonctiune: number; avansMinim: number } };
  type Optiuni = typeof IMPLICIT & { estimare?: ProfilMasina | null | undefined };
  type Tesire = { tip: "v"; unghi: number; latime: number; santuri?: boolean } | { tip: "rotunjire"; raza: number; varf: number };
  /** Ce citește G-code-ul din setările motorului CNC. */
  type SetariCnc = { freza: number; grosime: number; tesire: Tesire | null; stift_margine: number; placa: [number, number]; sant_adancime: number;
    pivot_adancime: number; doua_fete: boolean; placa_margine: number };
  /** O piesă așezată pe placă, cum o dă motorul CNC. */
  type Loc = { piesa: { nume: string; titlu?: string }; contur: Pl; santuri: Pl[]; marcaje: Pl[]; tesire: Pl[]; margini: Pl[]; treceriLocas?: Pl[]; pivoti?: Pl[] };
  /** O rampă lipită: suprafața finită, de unde e lemn peste o cotă, șanțurile (în coordonatele rampei). */
  type Rampa = { nume: string; L: number; latime: number; H: number; plat: number; zSus: (x: number) => number; inceputLa: (z: number) => number | null;
    santuri: [number, number][][] };
  // ce cere G-code-ul din motorul CNC (o interfață, nu tipul lui întreg: cele două se cer una pe alta)
  const CNC = (): { decaleaza(v: Pl, d: number): Pl | null } => glob.TrenCNC;

  // ---------------------------------------------------------------------------------------------- numere (numere.ts)
  const VALOARE_MAXIMA = 1e9;
  function numar(v: number, zec: number): string {
    if (!Number.isFinite(v)) throw new RangeError(`un număr nefinit (${v}) nu se scrie în program`);
    if (Math.abs(v) >= VALOARE_MAXIMA) throw new RangeError(`valoarea ${v} nu e o cotă de mașină`);
    const t = v.toFixed(zec);
    return /^-0\.?0*$/.test(t) ? t.slice(1) : t;
  }
  const rotunjit = (v: number, zec: number) => Number(numar(v, zec));
  const DIACRITICE: Record<string, string | undefined> = { "ă": "a", "â": "a", "î": "i", "ș": "s", "ş": "s", "ț": "t", "ţ": "t", "Ă": "A", "Â": "A", "Î": "I", "Ș": "S", "Ş": "S", "Ț": "T", "Ţ": "T" };
  const textAscii = (text: string, interzise: string): string => [...text].map(c => DIACRITICE[c] ?? c).filter(c => c >= " " && c <= "~" && !interzise.includes(c)).join("");

  // ---------------------------------------------------------------------------------------------- contractele
  const BAZA_GRBL = {
    extensie: "nc", zecimaleMm: 3, unitati: "G21", comentariu: { deschidere: "(", inchidere: ")" }, liniaMaxima: 70,
    pauza: { cuvant: "G4 P", unitate: "s" }, arc: { coardaMinimaRezolutii: 10, unghiMinim: 1e-4, razaMaxima: 1e4, baleiajMaxim: Math.PI },
    elice: true, antet: ["G90 G17 {unitati} G94", "G40 G49 G80"], wcs: "G54", final: ["M30"],
  };
  const CONTRACTE = {
    // din cvs2 (documentate dupa sonda s8; GRBL 1.1h e controlerul owner-ului)
    "grbl-11": { ...BAZA_GRBL, nume: "GRBL 1.1", probat: true, scula: ["fisiere-separate", "m0-comentariu"] },
    grblhal: { ...BAZA_GRBL, nume: "grblHAL", probat: true, scula: ["fisiere-separate", "m6-controler", "m0-comentariu"] },
    fluidnc: { ...BAZA_GRBL, nume: "FluidNC", probat: true, scula: ["fisiere-separate", "m6-controler", "m0-comentariu"] },
    // scrise aici, dupa dialectele lor obisnuite; de incercat intai in aer
    mach3: { ...BAZA_GRBL, nume: "Mach3", extensie: "tap", probat: false, scula: ["fisiere-separate", "m6-controler", "m0-comentariu"] },
    ncstudio: { ...BAZA_GRBL, nume: "NcStudio (Weihong)", probat: false, elice: false, antet: ["G90 G17 {unitati}"], scula: ["fisiere-separate", "m0-comentariu"] },
    richauto: { ...BAZA_GRBL, nume: "RichAuto (DSP)", probat: false, elice: false, comentariu: null, antet: ["G90 G17 {unitati}"], scula: ["fisiere-separate"] },
    syntec: { ...BAZA_GRBL, nume: "Syntec", probat: false, antet: ["G90 G17 {unitati} G94", "G40 G49 G80"], scula: ["fisiere-separate", "m6-controler", "m0-comentariu"] },
  } satisfies Record<string, Contract>;

  // ---------------------------------------------------------------------------------------------- IR si montaj (ir.ts, montaj.ts)
  function baleiajArc(start: Xy, capat: Xy, centru: Xy, trig: boolean): number {
    let b = Math.atan2(capat.y - centru.y, capat.x - centru.x) - Math.atan2(start.y - centru.y, start.x - centru.x);
    if (trig) { while (b <= 1e-12) b += 2 * Math.PI; } else { while (b >= -1e-12) b -= 2 * Math.PI; }
    return b;
  }
  function transformareMontaj(m: Montaj) {
    const { latime, inaltime, grosime } = m.foaie;
    const e = m.origine === "dreapta-jos" || m.origine === "dreapta-sus" ? -latime : 0;
    const f = m.origine === "dreapta-sus" || m.origine === "stanga-sus" ? -inaltime : 0;
    return { a: 1, b: 0, c: 0, d: 1, e, f, dz: m.z0 === "jos" ? grosime : 0 };
  }

  // ---------------------------------------------------------------------------------------------- postul (post.ts)
  const PLAFON_LINII = 2000000, TOLERANTA_APROXIMARE = 0.001, SCULA_MAXIMA = 255;
  class EroarePost extends Error {}
  const CODOR = new TextEncoder();
  const DESCRIERE_STRATEGIE: Record<string, string | undefined> = { "m6-controler": "scula: M6 la controler", "m0-comentariu": "scula: M0, cu scula in comentariu" };

  function posteaza(program: Program, montaj: Montaj, k: Contract, optiuni: OptiuniPost): Rez<{ text: string; linii: number }> {
    try { return { ok: true, ...scrie(program, montaj, k, optiuni) }; }
    catch (e) { if (e instanceof EroarePost || e instanceof RangeError) return { ok: false, motiv: e.message }; throw e; }
  }
  function posteazaPeScule(program: Program, montaj: Montaj, k: Contract, optiuni: OptiuniPost): Rez<{ fisiere: { scula: Scula; text: string; linii: number }[] }> {
    // un program intreg pe scula (antet, WCS, axul cu turatia ei, final), in ordinea programului
    const parti: { scula: Scula; turatie: number; miscari: Miscare[] }[] = [{ scula: program.scula, turatie: program.turatie, miscari: [] }];
    for (const m of program.miscari) {
      if (m.tip === "schimba-scula") parti.push({ scula: m.scula, turatie: m.turatie, miscari: [] });
      else parti[parti.length - 1]!.miscari.push(m);
    }
    const fisiere: { scula: Scula; text: string; linii: number }[] = [];
    for (const p of parti) {
      if (!p.miscari.some(m => m.tip === "taiere" || m.tip === "arc")) continue;
      const r = posteaza({ ...program, scula: p.scula, turatie: p.turatie, miscari: p.miscari }, montaj, k, { ...optiuni, strategieScula: "fisiere-separate" });
      if (!r.ok) return { ok: false, motiv: `T${p.scula.numar}: ${r.motiv}` };
      fisiere.push({ scula: p.scula, text: r.text, linii: r.linii });
    }
    if (!fisiere.length) return { ok: false, motiv: tr("programul n-are nicio tăiere") };
    return { ok: true, fisiere };
  }

  function scrie(program: Program, montaj: Montaj, k: Contract, optiuni: OptiuniPost) {
    type Poz = { x: number | undefined; y: number | undefined; z: number | undefined };
    const strategie = optiuni.strategieScula || k.scula[0]!;
    if (!k.scula.includes(strategie)) throw new EroarePost(tr`${k.nume} nu acceptă schimbarea sculei „${strategie}”`);
    const schimbari = program.miscari.some(m => m.tip === "schimba-scula");
    if (schimbari && strategie === "fisiere-separate") throw new EroarePost("cu fișiere separate pe sculă, programul se scrie cu posteazaPeScule");
    const zec = k.zecimaleMm, rezolutie = 10 ** -zec;
    const t = transformareMontaj(montaj);
    const n = (v: number) => numar(v, zec);
    const antet = k.antet.map((l: string) => l.replace("{unitati}", k.unitati));
    const linii: string[] = [];
    const adauga = (linie: string) => {
      if (CODOR.encode(linie).length > k.liniaMaxima) throw new EroarePost(tr`linia ${linii.length + 1} are peste ${k.liniaMaxima} de octeți: ${linie.slice(0, 40)}…`);
      if (linii.length >= PLAFON_LINII) throw new EroarePost(tr`programul trece de ${PLAFON_LINII} de linii`);
      linii.push(linie);
    };
    const comentariu = (text: string) => {
      if (!k.comentariu) return;           // controlerul nu primeste comentarii
      const { deschidere, inchidere } = k.comentariu, loc = k.liniaMaxima - deschidere.length - inchidere.length;
      adauga(`${deschidere}${textAscii(text, deschidere + inchidere).slice(0, loc)}${inchidere}`);
    };
    const doc: Poz = { x: undefined, y: undefined, z: undefined }, scris: Poz = { x: undefined, y: undefined, z: undefined };
    let avansCurent: number | undefined;
    const masina = (x: number, y: number) => ({ x: t.a * x + t.c * y + t.e, y: t.b * x + t.d * y + t.f });
    const avans = (f: number) => {
      if (!(f > 0) || !Number.isFinite(f)) throw new EroarePost(tr`avans nevalid: ${f}`);
      if (avansCurent === f) return "";
      avansCurent = f;
      return ` F${numar(f, 1)}`;
    };
    const cuvinte = (la: La) => {
      const x = la.X ?? doc.x, y = la.Y ?? doc.y;
      let text = "";
      if (la.X !== undefined || la.Y !== undefined) {
        const m = masina(x ?? 0, y ?? 0);
        if (la.X !== undefined) { text += ` X${n(m.x)}`; scris.x = rotunjit(m.x, zec); }
        if (la.Y !== undefined) { text += ` Y${n(m.y)}`; scris.y = rotunjit(m.y, zec); }
        doc.x = x; doc.y = y;
      }
      if (la.Z !== undefined) { const z = la.Z + t.dz; text += ` Z${n(z)}`; scris.z = rotunjit(z, zec); doc.z = la.Z; }
      return text;
    };
    const pePozitie = (la: La) => {
      if (la.Z !== undefined && (scris.z === undefined || rotunjit(la.Z + t.dz, zec) !== scris.z)) return false;
      if (la.X !== undefined || la.Y !== undefined) {
        const x = la.X ?? doc.x, y = la.Y ?? doc.y;
        if (x === undefined || y === undefined) return false;
        const m = masina(x, y);
        if (la.X !== undefined && (scris.x === undefined || rotunjit(m.x, zec) !== scris.x)) return false;
        if (la.Y !== undefined && (scris.y === undefined || rotunjit(m.y, zec) !== scris.y)) return false;
      }
      return true;
    };
    const arc = (mv: Extract<Miscare, { tip: "arc" }>) => {
      if (doc.x === undefined || doc.y === undefined || scris.x === undefined || scris.y === undefined) throw new EroarePost("un arc cere poziția XY de start");
      const startDoc = { x: doc.x, y: doc.y }, capatDoc = { x: mv.la.X ?? doc.x, y: mv.la.Y ?? doc.y };
      const c = masina(mv.centru.x, mv.centru.y), s = masina(startDoc.x, startDoc.y), e = masina(capatDoc.x, capatDoc.y);
      const trig = mv.sens === "trigonometric";
      const raza = Math.hypot(s.x - c.x, s.y - c.y), u0 = Math.atan2(s.y - c.y, s.x - c.x);
      const baleiaj = baleiajArc(startDoc, capatDoc, mv.centru, trig);
      const bucati = Math.max(1, Math.ceil(Math.abs(baleiaj) / k.arc.baleiajMaxim - 1e-9));
      const zStart = doc.z;
      const segmentat = raza > k.arc.razaMaxima || (!k.elice && mv.la.Z !== undefined && zStart !== undefined && mv.la.Z !== zStart);
      for (let i = 1; i <= bucati; i++) {
        const ultima = i === bucati, ui = u0 + (baleiaj * i) / bucati;
        const capatMasina = ultima ? e : { x: c.x + raza * Math.cos(ui), y: c.y + raza * Math.sin(ui) };
        const zBucata = mv.la.Z === undefined || zStart === undefined ? undefined : zStart + ((mv.la.Z - zStart) * i) / bucati;
        const sx = scris.x ?? 0, sy = scris.y ?? 0, ex = rotunjit(capatMasina.x, zec), ey = rotunjit(capatMasina.y, zec);
        const coarda = Math.hypot(ex - sx, ey - sy);
        const dreapta = coarda < k.arc.coardaMinimaRezolutii * rezolutie || Math.abs(baleiaj / bucati) < k.arc.unghiMinim;
        const z = zBucata === undefined ? "" : ` Z${n(zBucata + t.dz)}`;
        if (segmentat) {
          const pasMaxim = 2 * Math.acos(1 - TOLERANTA_APROXIMARE / raza);
          const segmente = Math.max(1, Math.ceil(Math.abs(baleiaj / bucati) / pasMaxim));
          const uStart = u0 + (baleiaj * (i - 1)) / bucati;
          for (let q = 1; q <= segmente; q++) {
            const uq = uStart + (baleiaj / bucati) * (q / segmente);
            const pq = q === segmente ? capatMasina : { x: c.x + raza * Math.cos(uq), y: c.y + raza * Math.sin(uq) };
            const zq = zStart === undefined || mv.la.Z === undefined ? "" : ` Z${n(zStart + (mv.la.Z - zStart) * ((i - 1 + q / segmente) / bucati) + t.dz)}`;
            adauga(`G1 X${n(pq.x)} Y${n(pq.y)}${zq}${avans(mv.avans)}`);
          }
        } else if (dreapta) {
          adauga(`G1 X${n(capatMasina.x)} Y${n(capatMasina.y)}${z}${avans(mv.avans)}`);
        } else {
          const i0 = c.x - sx, j0 = c.y - sy;     // I / J din startul deja rotunjit
          adauga(`${trig ? "G3" : "G2"} X${n(capatMasina.x)} Y${n(capatMasina.y)}${z} I${n(i0)} J${n(j0)}${avans(mv.avans)}`);
        }
        scris.x = ex; scris.y = ey;
        if (zBucata !== undefined) { scris.z = rotunjit(zBucata + t.dz, zec); doc.z = zBucata; }
      }
      doc.x = capatDoc.x; doc.y = capatDoc.y;
    };
    const zSigur = program.zSigur;
    const pauza = (sec: number) => `${k.pauza.cuvant}${k.pauza.unitate === "s" ? numar(sec, 3) : String(Math.round(sec * 1000))}`;
    const pornesteAx = (turatie: number) => {
      if (!(turatie > 0) || !Number.isInteger(turatie)) throw new EroarePost(tr`turație nevalidă: ${turatie}`);
      adauga(`M3 S${turatie}`);
      adauga(pauza(optiuni.asteptareAx));
    };
    const descrieScula = (s: Scula) => `scula T${s.numar} ${s.nume} D${numar(s.diametru, 3)}`;
    const { foaie } = montaj;
    comentariu("Trenulet - planificatorul de circuite");
    comentariu(`post ${k.nume}`);
    comentariu(`origine ${montaj.origine}, Z0 ${montaj.z0}, foaia ${numar(foaie.latime, 3)} x ${numar(foaie.inaltime, 3)} x ${numar(foaie.grosime, 3)} mm`);
    comentariu(descrieScula(program.scula));
    if (schimbari && strategie !== "fisiere-separate") comentariu(DESCRIERE_STRATEGIE[strategie]!);
    for (const l of antet) adauga(l);
    adauga(k.wcs);
    adauga(`G0${cuvinte({ Z: zSigur })}`);
    pornesteAx(program.turatie);
    for (const mv of program.miscari) {
      switch (mv.tip) {
        case "rapida": { if (pePozitie(mv.la)) break; const w = cuvinte(mv.la); if (w) adauga(`G0${w}`); break; }
        case "taiere": { const w = cuvinte(mv.la); if (w) adauga(`G1${w}${avans(mv.avans)}`); break; }
        case "arc": arc(mv); break;
        case "pauza": adauga(pauza(mv.secunde)); break;
        case "eticheta": comentariu(mv.text); break;
        case "schimba-scula": {
          const s = mv.scula;
          if (!Number.isInteger(s.numar) || s.numar < 0 || s.numar > SCULA_MAXIMA) throw new EroarePost(tr`numărul sculei T${s.numar} nu e între 0 și ${SCULA_MAXIMA}`);
          if (!pePozitie({ Z: zSigur })) adauga(`G0${cuvinte({ Z: zSigur })}`);
          adauga("M5");
          if (strategie === "m0-comentariu") { comentariu(`SCHIMBA SCULA: T${s.numar} ${s.nume} D${numar(s.diametru, 3)}, apoi zero Z`); adauga("M0"); }
          else { comentariu(descrieScula(s)); adauga(`T${s.numar} M6`); }
          for (const l of antet) adauga(l);
          adauga(k.wcs);
          scris.x = scris.y = scris.z = undefined; doc.x = doc.y = undefined; avansCurent = undefined;
          adauga(`G0${cuvinte({ Z: zSigur })}`);
          pornesteAx(mv.turatie);
          break;
        }
        default: throw new EroarePost(`mișcare necunoscută: ${JSON.stringify(mv)}`);
      }
    }
    if (!pePozitie({ Z: zSigur })) adauga(`G0${cuvinte({ Z: zSigur })}`);
    adauga("M5");
    for (const l of k.final) adauga(l);
    return { text: linii.join("\n") + "\n", linii: linii.length };
  }

  // ---------------------------------------------------------------------------------------------- CAM
  const EPS_RUPTURA = 1e-6, EPS_VARF = 1e-9, BULGE_MINIM = 1e-6;
  function cerculArcului(a: Xy, b: Xy, bulge: number): Cerc {
    const dx = b.x - a.x, dy = b.y - a.y, coarda = Math.hypot(dx, dy);
    const k = (1 - bulge * bulge) / (4 * bulge);
    const centru = { x: (a.x + b.x) / 2 - dy * k, y: (a.y + b.y) / 2 + dx * k };
    const raza = (coarda * (1 + bulge * bulge)) / (4 * Math.abs(bulge));
    return { centru, raza, start: Math.atan2(a.y - centru.y, a.x - centru.x), baleiaj: 4 * Math.atan(bulge) };
  }
  function segmente(v: Pl, inchis: boolean): Segment[] {
    // segmentele unei polilinii, cu lungimea exacta (arcul ca r·|θ|)
    const n = v.length, out: Segment[] = [];
    for (let i = 0; i < (inchis ? n : n - 1); i++) {
      const p = v[i], q = v[(i + 1) % n], a = { x: p![0], y: p![1] }, b = { x: q![0], y: q![1] }, bulge = p![2] || 0;
      const brut = bulge !== 0 ? cerculArcului(a, b, bulge) : null;
      const L = brut ? brut.raza * Math.abs(brut.baleiaj) : Math.hypot(b.x - a.x, b.y - a.y);
      // `cerc`: arcul care se scrie arc (traseu.ts: nu cel plat sau sub 1e-6 mm); `brut`: orice arc (parcurgere.ts)
      out.push({ a, b, bulge, cerc: brut && Math.abs(bulge) >= BULGE_MINIM && L >= EPS_RUPTURA ? brut : null, brut, L });
    }
    return out;
  }
  const lungimeBucla = (v: Pl): number => segmente(v, true).reduce((t, s) => t + s.L, 0);
  function punctPeSegment(s: Segment, f: number, cerc: Cerc | null = s.brut): Xy {
    if (!cerc) return { x: s.a.x + (s.b.x - s.a.x) * f, y: s.a.y + (s.b.y - s.a.y) * f };
    const u = cerc.start + cerc.baleiaj * f;
    return { x: cerc.centru.x + cerc.raza * Math.cos(u), y: cerc.centru.y + cerc.raza * Math.sin(u) };
  }
  function punctPeBucla(v: Pl, s: number): Xy {
    // punctul de la distanta s de varful 0, pe bucla inchisa
    const seg = segmente(v, true), P = seg.reduce((t, x) => t + x.L, 0);
    s = ((s % P) + P) % P;
    for (const x of seg) { if (s <= x.L) return punctPeSegment(x, x.L > 0 ? s / x.L : 0); s -= x.L; }
    return { x: v[0]![0], y: v[0]![1] };
  }
  function incepeLa(v: Pl, s: number): Pl {
    // bucla inchisa pornita din pozitia s: segmentul de acolo se taie in doua (linie / arc pe acelasi cerc)
    const seg = segmente(v, true), n = v.length;
    let s0 = 0;
    for (let i = 0; i < n; i++) {
      const x = seg[i];
      if (s <= s0 + x!.L || i === n - 1) {
        const f = x!.L > 0 ? Math.min(1, Math.max(0, (s - s0) / x!.L)) : 0;
        const roteste = (k: number) => [...v.slice(k), ...v.slice(0, k)];
        if (f * x!.L <= EPS_RUPTURA) return roteste(i);
        if ((1 - f) * x!.L <= EPS_RUPTURA) return roteste((i + 1) % n);
        const th = 4 * Math.atan(x!.bulge), p = punctPeSegment(x!, f);
        const out: Pl = [[p.x, p.y, Math.tan(((1 - f) * th) / 4)]];
        for (let k = 1; k < n; k++) out.push(v[(i + k) % n]!.slice() as Vf);
        out.push([v[i]![0], v[i]![1], Math.tan((f * th) / 4)]);
        return out;
      }
      s0 += x!.L;
    }
    return v;
  }
  const inverseaza = (v: Pl, inchis: boolean): Pl => {
    const n = v.length, out: Pl = [];
    for (let i = n - 1; i >= 0; i--) { const prev = i > 0 ? v[i - 1] : (inchis ? v[n - 1] : null); out.push([v[i]![0], v[i]![1], prev ? -(prev[2] || 0) : 0]); }
    return out;
  };

  function adancimiTreceri(adancime: number, pas: number) {
    if (!(adancime > 0)) return tr`adâncimea trebuie să fie pozitivă (${adancime})`;
    if (!(pas > 0)) return tr`pasul trebuie să fie pozitiv (${pas})`;
    const n = Math.max(1, Math.ceil(adancime / pas - 1e-9));
    if (n > 1000) return tr`${n} treceri: pasul ${pas} mm e prea mic`;
    return Array.from({ length: n }, (_, i) => (i + 1 === n ? adancime : ((i + 1) * adancime) / n));
  }
  // urechile (urechi.ts, ADR 0028)
  function geometrieUrechi(lungime: number, u: { numar: number; latime: number }) {
    const S = lungime / u.numar;
    if (u.latime > 0.9 * S) return tr`urechile nu încap: ${u.numar} urechi de ${u.latime} mm pe o buclă de ${lungime.toFixed(2)} mm`;
    const centre: number[] = [];
    for (let k = 0; k < u.numar; k++) centre.push((k + 0.5) * S);
    return { S, h: u.latime / 2, l: Math.min(u.latime / 2, 0.45 * (S - u.latime)), centre };
  }
  function noduriProfil(lungime: number, u: Urechi, d: number): Nod[] | string {
    const g = geometrieUrechi(lungime, u);
    if (typeof g === "string") return g;
    const noduri: Nod[] = [{ s: 0, z: -d }];
    for (const c of g.centre) noduri.push({ s: c - g.h - g.l, z: -d }, { s: c - g.h, z: -u.varf }, { s: c + g.h, z: -u.varf }, { s: c + g.h + g.l, z: -d });
    noduri.push({ s: lungime, z: -d });
    return noduri;
  }
  function zLa(noduri: readonly Nod[], s: number): number {
    for (let i = 1; i < noduri.length; i++) {
      const a = noduri[i - 1], b = noduri[i];
      if (s <= b!.s) {
        if (a!.z === b!.z || b!.s - a!.s <= 0) return b!.z;
        const t = Math.min(1, Math.max(0, (s - a!.s) / (b!.s - a!.s)));
        return a!.z + (b!.z - a!.z) * t;
      }
    }
    return noduri[noduri.length - 1]!.z;
  }
  const avansCoborare = (lung: number, dz: number, avans: number, avansPlonjare: number) => (dz < 0 ? Math.min(avans, (avansPlonjare * Math.hypot(lung, dz)) / -dz) : avans);
  function parcurge(v: Pl, noduri: readonly Nod[], avans: number, avansPlonjare: number): Rez<{ miscari: Miscare[] }> {
    // bucla inchisa cu profilul Z(s), pe pozitii DESFASURATE (s si s + P sunt acelasi punct), de la primul nod la ultimul
    // (parcurgere.ts, fara degajari): fiecare segment se taie in nodurile din el, arcele raman arce, Z doar unde se schimba
    const segs = segmente(v, true), n = segs.length;
    const primul = noduri[0], ultimul = noduri[noduri.length - 1];
    if (n === 0 || !primul || !ultimul || noduri.length < 2) return { ok: true, miscari: [] };
    const sDe = primul.s, sLa = ultimul.s;
    const seg: (Segment & { inceput: number })[] = [];
    let P = 0;
    for (const x of segs) { seg.push({ ...x, inceput: P }); P += x.L; }
    if (!(P > 0)) return { ok: true, miscari: [] };
    const m: Miscare[] = [];
    let zCur = primul.z, urm = 1;
    let k = Math.max(0, Math.floor(sDe / P) * n - n);
    const capatul = (kk: number) => { const x = seg[kk % n], baza = Math.floor(kk / n) * P; return (baza === 0 ? x!.inceput : baza + x!.inceput) + x!.L; };
    while (capatul(k) <= sDe + EPS_RUPTURA) k++;
    for (; ; k++) {
      const x = seg[k % n], baza = Math.floor(k / n) * P;
      const s0 = baza === 0 ? x!.inceput : baza + x!.inceput, s1 = s0 + x!.L;
      if (s0 >= sLa - EPS_RUPTURA) break;
      const sA = Math.max(s0, sDe), cerc = x!.brut;
      const peVarf = s1 <= sLa + EPS_RUPTURA, sCapat = peVarf ? s1 : sLa, tinte: { s: number; z: number; capat: boolean }[] = [];
      while (urm < noduri.length - 1 && noduri[urm]!.s < sCapat - EPS_RUPTURA) {
        const nod = noduri[urm];
        if (nod!.s > sA + EPS_RUPTURA) tinte.push({ s: nod!.s, z: nod!.z, capat: false });
        else if (nod!.z !== zCur) return { ok: false, motiv: `nod de profil la sub ${EPS_RUPTURA} mm de pornire, cu altă cotă (${nod!.z} față de ${zCur})` };
        urm++;
      }
      let zCapat: number;
      if (peVarf && Math.abs(sLa - s1) > EPS_RUPTURA) {
        zCapat = zLa(noduri, s1);
        while (urm < noduri.length - 1 && noduri[urm]!.s <= s1 + EPS_RUPTURA) { zCapat = noduri[urm]!.z; urm++; }
      } else { zCapat = ultimul.z; urm = noduri.length - 1; }
      tinte.push({ s: sCapat, z: zCapat, capat: peVarf });
      let sPrec = sA;
      for (const t of tinte) {
        const p = t.capat ? x!.b : punctPeSegment(x!, (t.s - s0) / x!.L, cerc);
        const la = t.z === zCur ? { X: p.x, Y: p.y } : { X: p.x, Y: p.y, Z: t.z };
        const lung = t.s - sPrec, f = avansCoborare(lung, t.z - zCur, avans, avansPlonjare);
        if (cerc && lung >= EPS_RUPTURA) m.push({ tip: "arc", la, centru: cerc.centru, sens: cerc.baleiaj > 0 ? "trigonometric" : "orar", avans: f });
        else m.push({ tip: "taiere", la, avans: f });
        zCur = t.z; sPrec = t.s;
      }
      if (!peVarf || s1 >= sLa - EPS_RUPTURA) break;
    }
    return { ok: true, miscari: m };
  }
  // rampa (rampa.ts, ADR 0029): bucla se taie continuu, fara ridicare intre treceri; pe fiecare trecere freza coboara pe o
  // rampa de Lr = min(lungime; P/2) de-a lungul buclei, apoi face o tura plina la adancime, care trece din nou peste rampa
  const RAMPA_MINIMA = 1;
  const profilTura = (P: number, d: number, urechi: Urechi | null): Nod[] | string => (urechi && d > urechi.varf + EPS_VARF ? noduriProfil(P, urechi, d) : [{ s: 0, z: -d }, { s: P, z: -d }]);
  const peTura = (s: number, P: number) => s - Math.floor(s / P) * P;
  const zProfil = (tura: readonly Nod[], P: number, s: number) => zLa(tura, peTura(s, P));
  function noduriPe(tura: readonly Nod[], P: number, a: number, b: number): Nod[] {
    const interior: Nod[] = [];
    for (let m = Math.floor(a / P); m * P <= b; m++) for (const n of tura) { const s = m * P + n.s; if (s > a + EPS_RUPTURA && s < b - EPS_RUPTURA) interior.push({ s, z: n.z }); }
    interior.sort((x, y) => x.s - y.s);
    const rez = [{ s: a, z: zProfil(tura, P, a) }];
    for (const n of interior) if (n.s > rez[rez.length - 1]!.s + EPS_RUPTURA) rez.push(n);
    rez.push({ s: b, z: zProfil(tura, P, b) });
    return rez;
  }
  function noduriRampa(tura: readonly Nod[], P: number, e: number, Lr: number, dPrec: number, d: number) {
    const zR = (s: number) => -(dPrec + ((d - dPrec) * (s - e)) / Lr);
    const profil = noduriPe(tura, P, e, e + Lr), rez: Nod[] = [];
    for (let i = 0; i < profil.length; i++) {
      const u = profil[i], capat = i === profil.length - 1;
      rez.push({ s: u!.s, z: capat ? u!.z : i === 0 ? Math.max(-dPrec, u!.z) : Math.max(zR(u!.s), u!.z) });
      if (capat) break;
      const v = profil[i + 1], du = zR(u!.s) - u!.z, dv = zR(v!.s) - v!.z;
      if ((du > 0 && dv < 0) || (du < 0 && dv > 0)) {
        const s = u!.s + ((v!.s - u!.s) * du) / (du - dv);
        if (s > u!.s + EPS_RUPTURA && s < v!.s - EPS_RUPTURA) rez.push({ s, z: zR(s) });
      }
    }
    return rez;
  }
  function buclaCuRampa(c: Pl, adancimi: readonly number[], lungime: number, urechi: Urechi | null, avans: number, avansPlonjare: number): Rez<{ miscari: Miscare[] }> {
    const P = lungimeBucla(c);
    if (!(P > 0)) return { ok: true, miscari: [] };
    if (!(lungime >= RAMPA_MINIMA)) return { ok: false, motiv: tr`rampa de ${lungime} mm e sub ${RAMPA_MINIMA} mm: ar fi o plonjare` };
    const Lr = Math.min(lungime, P / 2);
    if (Lr < RAMPA_MINIMA) return { ok: false, motiv: tr`rampa nu încape pe bucla de ${P.toFixed(3)} mm` };
    const zone: [number, number][] = [];
    if (urechi) {
      const g = geometrieUrechi(P, urechi);
      if (typeof g === "string") return { ok: false, motiv: g };
      for (const cc of g.centre) zone.push([cc - g.h - g.l, cc + g.h + g.l]);
    }
    const scoate = (s: number) => { const t = peTura(s, P); for (const [lo, hi] of zone) if (t > lo && t < hi) return s + (hi - t); return s; };
    const m: Miscare[] = [];
    let e = 0, dPrec = 0;
    for (let k = 0; k < adancimi.length; k++) {
      const d = adancimi[k]!, tura = profilTura(P, d, urechi);
      if (typeof tura === "string") return { ok: false, motiv: tura };
      const ultima = k === adancimi.length - 1, urmatoarea = ultima ? e + Lr : scoate(e + Lr);
      const r = parcurge(c, [...noduriRampa(tura, P, e, Lr, dPrec, d), ...noduriPe(tura, P, e + Lr, urmatoarea + P).slice(1)], avans, avansPlonjare);
      if (!r.ok) return r;
      for (const x of r.miscari) m.push(x);
      e = urmatoarea; dPrec = d;
    }
    return { ok: true, miscari: m };
  }
  function taieCale(m: Miscare[], v: Pl, inchis: boolean, p: Parametri) {
    // linia si arcele unei polilinii, de la varful 0 (traseu.ts, taieBucla fara urechi)
    for (const x of segmente(v, inchis)) {
      if (x.cerc) m.push({ tip: "arc", la: { X: x.b.x, Y: x.b.y }, centru: x.cerc.centru, sens: x.bulge > 0 ? "trigonometric" : "orar", avans: p.avans });
      else m.push({ tip: "taiere", la: { X: x.b.x, Y: x.b.y }, avans: p.avans });
    }
  }
  function traseuPeLinie(m: Miscare[], v: Pl, inchis: boolean, adancimi: readonly number[], p: Parametri, directa: boolean) {
    // o cale taiata pe linie (santurile, marcajele, tesirea), pe treceri; cu `directa`, o cale deschisa nu se ridica intre
    // treceri: coboara la capat si se intoarce (cererea owner-ului din cvs2, 28.10: „coborarea directa intre treceri")
    let cale = v;
    for (const [i, d] of adancimi.entries()) {
      const start = cale[0];
      if (!directa || i === 0 || inchis) {
        m.push({ tip: "rapida", la: { Z: p.zSigur } });
        m.push({ tip: "rapida", la: { X: start![0], Y: start![1] } });
      }
      m.push({ tip: "taiere", la: { Z: -d }, avans: p.avansPlonjare });
      taieCale(m, cale, inchis, p);
      if (directa && !inchis && i < adancimi.length - 1) cale = inverseaza(cale, false);
      else m.push({ tip: "rapida", la: { Z: p.zSigur } });
    }
  }
  function traseuProfilExterior(m: Miscare[], bucla: Pl, adancimi: readonly number[], p: Parametri, urechi: Urechi | null, rampa: number): string | null {
    // trecerile profilului: rapid deasupra pornirii, coborare cu avansul de plonjare, bucla (cu urechile pe trecerile
    // care le traverseaza), ridicare (traseu.ts, traseuProfil fara intrari). Cu rampa: pana la fata de sus, apoi toate
    // trecerile pe rampa, fara ridicare intre ele.
    const L = lungimeBucla(bucla), start = bucla[0];
    if (rampa) {
      m.push({ tip: "rapida", la: { Z: p.zSigur } });
      m.push({ tip: "rapida", la: { X: start![0], Y: start![1] } });
      m.push({ tip: "taiere", la: { Z: 0 }, avans: p.avansPlonjare });
      const r = buclaCuRampa(bucla, adancimi, rampa, urechi, p.avans, p.avansPlonjare);
      if (!r.ok) return r.motiv;
      for (const x of r.miscari) m.push(x);
      m.push({ tip: "rapida", la: { Z: p.zSigur } });
      return null;
    }
    for (const d of adancimi) {
      m.push({ tip: "rapida", la: { Z: p.zSigur } });
      m.push({ tip: "rapida", la: { X: start![0], Y: start![1] } });
      m.push({ tip: "taiere", la: { Z: -d }, avans: p.avansPlonjare });
      if (urechi && d > urechi.varf + EPS_VARF) {
        const noduri = noduriProfil(L, urechi, d);
        if (typeof noduri === "string") return noduri;
        const r = parcurge(bucla, noduri, p.avans, p.avansPlonjare);
        if (!r.ok) return r.motiv;
        for (const x of r.miscari) m.push(x);
      } else taieCale(m, bucla, true, p);
      m.push({ tip: "rapida", la: { Z: p.zSigur } });
    }
    return null;
  }
  function pornireUrechi(bucla: Pl, u: Urechi | null): Pl {
    // faza buclei: urechile cat mai pe portiuni lungi si drepte (sau cu raza mare), nu pe cuplaje; pornirea in mijlocul
    // unei laturi, nu intr-un colt
    const seg = segmente(bucla, true), L = seg.reduce((t, s) => t + s.L, 0);
    const g = u ? geometrieUrechi(L, u) : null;
    const pozitii: number[] = []; let acc = 0;
    for (const s of seg) { pozitii.push(acc); acc += s.L; }
    const unde = (s: number) => { s = ((s % L) + L) % L; let i = 0; while (i < seg.length - 1 && pozitii[i + 1]! <= s) i++; return { i, s0: pozitii[i] }; };
    const bun = (s: number, cat: number) => {
      const { i, s0 } = unde(s), x = seg[i];
      const neted = !x!.cerc || x!.cerc.raza >= 30;
      return neted && s - cat >= s0! - 1e-6 && s + cat <= s0! + x!.L + 1e-6 ? x!.L : 0;
    };
    let best = { s: 0, scor: -1 };
    const pasi = 96, perioada = g && typeof g !== "string" ? g.S : L;
    for (let k = 0; k < pasi; k++) {
      const s = (k + 0.5) * perioada / pasi;
      let scor = bun(s, 0) * 0.001;                                // pornirea pe o latura neteda
      if (g && typeof g !== "string") for (const c of g.centre) scor += bun(s + c, g.h + g.l) > 0 ? 1 + bun(s + c, g.h + g.l) / 1000 : 0;
      if (scor > best.scor) best = { s, scor };
    }
    return incepeLa(bucla, best.s);
  }
  function traseuGaurire(m: Miscare[], centru: readonly [number, number, ...number[]], D: number, adancime: number, pas: number, p: Parametri): string | null {
    // ciocanirea in centru (gaurire.ts): pasi de cel mult `pas`, ridicare de 1 mm intre ei, iesire la Z sigur la fiecare al 3-lea
    const adancimi = adancimiTreceri(adancime, pas);
    if (typeof adancimi === "string") return adancimi;
    m.push({ tip: "rapida", la: { Z: p.zSigur } });
    m.push({ tip: "rapida", la: { X: centru[0], Y: centru[1] } });
    for (const [k, d] of adancimi.entries()) {
      if (k > 0) {
        const fund = adancimi[k - 1];
        if (k % 3 === 0) { m.push({ tip: "rapida", la: { Z: p.zSigur } }); m.push({ tip: "rapida", la: { Z: -fund! + 0.5 } }); }
        else m.push({ tip: "rapida", la: { Z: -fund! + 1 } });
      }
      m.push({ tip: "taiere", la: { Z: -d }, avans: p.avansPlonjare });
    }
    m.push({ tip: "rapida", la: { Z: p.zSigur } });
    return null;
  }
  function ordineApropiata<C extends Cale>(cai: readonly C[], de?: readonly number[] | null): C[] {
    // cele mai apropiate cai, pe rand; o cale deschisa porneste din capatul mai apropiat
    const rest = cai.slice(), out: C[] = [];
    let aici: readonly number[] = de || [0, 0];
    while (rest.length) {
      let bi = 0, bd = Infinity, inv = false;
      rest.forEach((c, i: number) => {
        const a = c.v[0], b = c.v[c.v.length - 1];
        const da = Math.hypot(a![0] - aici[0]!, a![1] - aici[1]!), db = c.inchis ? Infinity : Math.hypot(b![0] - aici[0]!, b![1] - aici[1]!);
        if (da < bd) { bd = da; bi = i; inv = false; }
        if (db < bd) { bd = db; bi = i; inv = true; }
      });
      const c = rest.splice(bi, 1)[0]!;
      const v = inv ? inverseaza(c!.v, false) : c!.v;
      out.push({ ...c, v });
      aici = c!.inchis ? v[0]! : v[v.length - 1]!;
    }
    return out;
  }

  // ---------------------------------------------------------------------------------------------- timpul (cvs2 src/sim/timp.ts)
  // Modelul planificatorului GRBL 1.1h (gnea/grbl v1.1h: planner.c, motion_control.c mc_arc, stepper.c), rulat pe TEXTUL
  // G-code: pasii, versorii, limitele pe axe, jonctiunile, profilul trapez / triunghi, fereastra de 15 blocuri. Profilul
  // masinii (ir/masina.ts, ir/masini/grbl11h.ts): setarile din fabrica, sau cele citite din raspunsul la `$$`.
  const PROFIL_GRBL_11H: ProfilMasina = {
    nume: "GRBL 1.1h", sursa: "implicit",
    axe: { X: { pasiPeMm: 250, vitezaMaxima: 500, acceleratie: 10 }, Y: { pasiPeMm: 250, vitezaMaxima: 500, acceleratie: 10 }, Z: { pasiPeMm: 250, vitezaMaxima: 500, acceleratie: 10 } },
    deviatieJonctiune: 0.01, toleranteArc: 0.002,
    firmware: { blocuriPlanificator: 15, pasPauza: 0.05, vitezaMinimaJonctiune: 0, avansMinim: 1 },
  };
  const SETARI_AXE: [number, keyof Axa][] = [[100, "pasiPeMm"], [110, "vitezaMaxima"], [120, "acceleratie"]], AXE_SETARI = ["X", "Y", "Z", "A"];
  const esteSetareProfil = (n: number) => n === 11 || n === 12 || SETARI_AXE.some(([b]) => n >= b && n < b + AXE_SETARI.length);
  function profilDinSetari(text: string, baza = PROFIL_GRBL_11H): { ok: true; citite: number; profil: ProfilMasina } | { ok: false; motiv: string; linie: number } {
    // raspunsul masinii la `$$` peste profilul de baza: $11, $12, $100–$123 (masina.ts, profilDinSetari)
    const valori = new Map<number, number>(), linii = text.split(/\r?\n/);
    for (const [i, brut] of linii.entries()) {
      const m = /^\s*\$(\d+)\s*=\s*([^\s(]*)\s*(\(.*\))?\s*$/.exec(brut);
      if (!m) continue;
      const nr = Number(m[1]);
      if (!esteSetareProfil(nr)) continue;
      const tv = m[2] || "", v = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(tv) ? Number(tv) : NaN, zeroValid = nr === 11;
      if (!Number.isFinite(v) || v < 0 || (v === 0 && !zeroValid)) return { ok: false, motiv: `$${nr} = „${tv}”: ${zeroValid ? tr("trebuie să fie un număr ≥ 0") : tr("trebuie să fie un număr pozitiv")}`, linie: i + 1 };
      if (valori.has(nr)) return { ok: false, motiv: tr`$${nr} e scris de două ori`, linie: i + 1 };
      valori.set(nr, v);
    }
    if (!valori.size) return { ok: false, motiv: tr("textul nu conține nicio setare de mișcare ($11, $12, $100–$123): e răspunsul la $$?"), linie: 0 };
    const axe = { ...baza.axe };
    for (const [k, axa] of AXE_SETARI.entries()) {
      const ex = baza.axe[axa], scrise = SETARI_AXE.map(([n]) => valori.has(n + k));
      if (!ex && scrise.some(Boolean) && !scrise.every(Boolean)) return { ok: false, motiv: tr`axa ${axa} e scrisă doar pe jumătate`, linie: 0 };
      if (!ex && !scrise.some(Boolean)) continue;
      const noua = ex ? { ...ex } : { pasiPeMm: 0, vitezaMaxima: 0, acceleratie: 0 };
      for (const [n, camp] of SETARI_AXE) { const v = valori.get(n + k); if (v !== undefined) noua[camp] = v; }
      axe[axa] = noua;
    }
    return { ok: true, citite: valori.size, profil: { ...baza, sursa: "setari", axe, deviatieJonctiune: valori.get(11) ?? baza.deviatieJonctiune, toleranteArc: valori.get(12) ?? baza.toleranteArc } };
  }
  function timpBloc(v0: number, v1: number, v: number, a: number, L: number) {
    const vi = Math.min(v0, v), ve = Math.min(v1, v);
    const dAcc = (v * v - vi * vi) / (2 * a), dDec = (v * v - ve * ve) / (2 * a);
    if (dAcc + dDec <= L) return (v - vi) / a + (v - ve) / a + (L - dAcc - dDec) / v;
    const vp = Math.min(v, Math.sqrt(Math.max(vi * vi, ve * ve, (2 * a * L + vi * vi + ve * ve) / 2)));
    return (vp - vi) / a + (vp - ve) / a;
  }
  const lround = (x: number) => (x < 0 ? -Math.round(-x) : Math.round(x));
  function estimeazaTimp(text: string, profil = PROFIL_GRBL_11H, cuOpriri = false): Rez<{ secunde: number; pauze: number; taiere: number; rapide: number; opriri: number; liniiLimitate: number }> {
    // -> { ok, secunde, pauze, taiere, rapide, opriri, liniiLimitate } (estimeaza din timp.ts, pe o singura portiune)
    const AXE = ["X", "Y", "Z"], axe = AXE.map(a => profil.axe[a]);
    if (axe.some(x => !x)) return { ok: false, motiv: tr("profilul n-are X, Y și Z") };
    const fw = profil.firmware, vmax = axe.map(a => a!.vitezaMaxima / 60), amax = axe.map(a => a!.acceleratie), pasi = axe.map(a => a!.pasiPeMm);
    const dj = profil.deviatieJonctiune, tol = profil.toleranteArc, vMinJ2 = (fw.vitezaMinimaJonctiune / 60) ** 2, avansMinim = fw.avansMinim / 60;
    const acum = { secunde: 0, pauze: 0, taiere: 0, rapide: 0 };
    // planificatorul cu fereastra lui
    const coada: { mm: number; acc: number; nominala: number; intrareMaxima2: number }[] = []; let intrare2 = 0;
    const executaPrimul = () => {
      const b = coada[0]; if (!b) return;
      let e2 = 0;
      for (let k = coada.length - 1; k >= 1; k--) { const c = coada[k]; e2 = Math.min(c!.intrareMaxima2, e2 + 2 * c!.acc * c!.mm); }
      const iesire2 = coada.length === 1 ? 0 : Math.min(e2, intrare2 + 2 * b.acc * b.mm);
      acum.secunde += timpBloc(Math.sqrt(intrare2), Math.sqrt(iesire2), b.nominala, b.acc, b.mm);
      intrare2 = iesire2; coada.shift();
    };
    const goleste = () => { while (coada.length) executaPrimul(); intrare2 = 0; };
    const limitate = new Set<number>();
    let opriri = 0, linieCurenta = 0, nominalaAnt = 0, versorAnt = [0, 0, 0], miscare = 0, avans = 0, ax = "oprit", turatie = 0;
    const poz: [number, number, number] = [0, 0, 0], pozPasi: [number, number, number] = [0, 0, 0];
    const limita = (max: readonly number[], v: readonly number[]) => { let l = Infinity; for (let k = 0; k < 3; k++) if (v[k] !== 0) l = Math.min(l, max[k]! / Math.abs(v[k]!)); return l; };
    const linie = (tinta: readonly number[], rapid: boolean) => {
      const delta = [0, 0, 0]; let pasiMax = 0;
      for (let k = 0; k < 3; k++) { const tp = lround(tinta[k]! * pasi[k]!); pasiMax = Math.max(pasiMax, Math.abs(tp - pozPasi[k]!)); delta[k] = (tp - pozPasi[k]!) / pasi[k]!; pozPasi[k] = tp; }
      if (pasiMax === 0) return;
      const mm = Math.hypot(...delta), u = delta.map(d => d / mm);
      const acc = limita(amax, u), vitezaRapida = limita(vmax, u);
      let nominala = rapid ? vitezaRapida : avans;
      if (!rapid && nominala > vitezaRapida) { nominala = vitezaRapida; limitate.add(linieCurenta); }
      if (!(nominala > avansMinim)) nominala = avansMinim;
      let j2: number;
      if (!coada.length) j2 = 0;
      else {
        let cos = 0; const ju = [0, 0, 0];
        for (let k = 0; k < 3; k++) { cos -= versorAnt[k]! * u[k]!; ju[k] = u[k]! - versorAnt[k]!; }
        if (cos > 0.999999) j2 = vMinJ2;
        else if (cos < -0.999999) j2 = Infinity;
        else { const n = Math.hypot(...ju), aj = limita(amax, ju.map(x => x / n)), sn = Math.sqrt(0.5 * (1 - cos)); j2 = Math.max(vMinJ2, (aj * dj * sn) / (1 - sn)); }
      }
      const intrareMaxima2 = Math.min(nominala > nominalaAnt ? nominalaAnt ** 2 : nominala ** 2, j2);
      nominalaAnt = nominala; versorAnt = u;
      if (rapid) acum.rapide += mm; else acum.taiere += mm;
      coada.push({ mm, acc, nominala, intrareMaxima2 });
      if (coada.length >= fw.blocuriPlanificator) executaPrimul();
    };
    const arc = (tinta: readonly number[], i: number, j: number, orar: boolean) => {
      const [px, py, pz] = poz, cx = px + i, cy = py + j, raza = Math.hypot(i, j);
      let r0 = -i, r1 = -j;
      const rt0 = tinta[0]! - cx, rt1 = tinta[1]! - cy;
      let unghi = Math.atan2(r0 * rt1 - r1 * rt0, r0 * rt0 + r1 * rt1);
      if (orar) { if (unghi >= -5e-7) unghi -= 2 * Math.PI; } else if (unghi <= 5e-7) unghi += 2 * Math.PI;
      const segmente = Math.floor(Math.abs(0.5 * unghi * raza) / Math.sqrt(tol * (2 * raza - tol)));
      if (segmente > 0) {
        const theta = unghi / segmente, liniar = (tinta[2]! - pz) / segmente;
        let cosT = 2 - theta * theta; const sinT = theta * 0.16666667 * (cosT + 4); cosT *= 0.5;
        let numar = 0; const p = [px, py, pz];
        for (let q = 1; q < segmente; q++) {
          if (numar < 12) { const ri = r0 * sinT + r1 * cosT; r0 = r0 * cosT - r1 * sinT; r1 = ri; numar++; }
          else { const c = Math.cos(q * theta), sn = Math.sin(q * theta); r0 = -i * c + j * sn; r1 = -i * sn - j * c; numar = 0; }
          p[0] = cx + r0; p[1] = cy + r1; p[2]! += liniar;
          linie(p, false);
        }
      }
      linie(tinta, false);
    };
    const linii = text.split("\n");
    for (let n = 0; n < linii.length; n++) {
      linieCurenta = n + 1;
      const curat = linii[n]!.replace(/\([^)]*\)?/g, "").replace(/;.*/, "").replace(/[\s/]/g, "").toUpperCase();
      if (!curat) continue;
      const cuv = [...curat.matchAll(/([A-Z])([+-]?(?:\d+\.?\d*|\.\d+))/g)].map((m): [string, number] => [m[1]!, Number(m[2])]);
      if (cuOpriri && cuv.some(([l, v]) => l === "M" && (v === 0 || v === 1 || v === 6))) { goleste(); opriri++; continue; }
      let g4 = false, gMiscare: number | undefined, mAx: string | undefined, sfarsit = false;
      const v: Record<string, number | undefined> = {};
      for (const [l, x] of cuv) {
        if (l === "G") { if ([0, 1, 2, 3, 80].includes(x)) gMiscare = x; else if (x === 4) g4 = true; }
        else if (l === "M") { if (x === 3 || x === 4) mAx = "pornit"; else if (x === 5) mAx = "oprit"; else if (x === 2 || x === 30) sfarsit = true; }
        else v[l] = x;
      }
      if (v.F !== undefined) avans = v.F / 60;
      if (v.S !== undefined) { if (v.S !== turatie && ax !== "oprit") goleste(); turatie = v.S; }
      if (mAx !== undefined && mAx !== ax) { goleste(); ax = mAx; }
      if (g4 && v.P !== undefined) { goleste(); const pz = Math.ceil(v.P / fw.pasPauza - 1e-9) * fw.pasPauza; acum.pauze += pz; acum.secunde += pz; }
      if (gMiscare !== undefined) miscare = gMiscare;
      const areAxe = v.X !== undefined || v.Y !== undefined || v.Z !== undefined;
      if (!g4 && miscare !== 80 && areAxe) {
        const tinta = AXE.map((a, k): number => (v[a] === undefined ? poz[k]! : v[a]));
        if (miscare === 0 || miscare === 1) linie(tinta, miscare === 0);
        else arc(tinta, v.I || 0, v.J || 0, miscare === 2);
        for (let k = 0; k < 3; k++) poz[k] = tinta[k]!;
      }
      if (sfarsit) { goleste(); miscare = 1; ax = "oprit"; }
    }
    goleste();
    return { ok: true, ...acum, opriri, liniiLimitate: limitate.size };
  }

  // ---------------------------------------------------------------------------------------------- lucrarea
  const IMPLICIT = {
    controler: "grbl-11", strategieScula: "fisiere-separate", origine: "stanga-jos", z0: "sus",
    turatie: 18000, avans: 1000, avansPlonjare: 300, zSigur: 5, asteptareAx: 3,
    pasContur: 3, supracursa: 0.3, pasSant: 1.5, marcaj: 1, coborareDirecta: false,
    sens: "urcare", urechi: { numar: 3, latime: 12, grosime: 2.5 }, rampa: true, lungimeRampa: 30,
    scula: { numar: 1, nume: "freza dreapta" },
    tesire: { numar: 2, nume: "freza de tesit", diametru: 6, turatie: 18000, avans: 1000, latimeSant: 0.8 },
    adancimeGauri: 5,
  };

  function buclePlaca(locuri: readonly Loc[], o: Optiuni, P: SetariCnc): Rez<{ bucle: Bucla[]; urechi: Urechi | null }> {
    // traseul centrului frezei la decupare, pe fiecare piesa, cu pornirea aleasa ca puntile sa cada pe laturi netede;
    // `punti`: mijloacele puntilor (pentru previzualizare)
    const D = P.freza, R = D / 2;
    let urechi: Urechi | null = null;
    if (o.urechi && o.urechi.numar > 0) {
      if (o.urechi.grosime >= P.grosime) return { ok: false, motiv: tr`puntile de ${o.urechi.grosime} mm nu încap în placa de ${P.grosime} mm` };
      if (o.urechi.latime < D) return { ok: false, motiv: tr`puntile de ${o.urechi.latime} mm sunt mai scurte decât freza (Ø${D}): n-ar ține` };
      urechi = { numar: o.urechi.numar, latime: o.urechi.latime, varf: P.grosime - o.urechi.grosime };
    }
    const bucle: Bucla[] = [];
    for (const l of locuri) {
      const off = CNC().decaleaza(l.contur, R);              // trigonometric, cu piesa in stanga
      if (!off) return { ok: false, motiv: tr`${l.piesa.titlu || l.piesa.nume}: offsetul conturului n-a ieșit` };
      // urcare: materialul pastrat (piesa) in dreapta mersului, deci bucla orara (profil.ts, ADR 0027)
      const v0 = o.sens === "urcare" ? inverseaza(off, true) : off;
      const L = lungimeBucla(v0), g = urechi ? geometrieUrechi(L, urechi) : null;
      const faraUrechi = typeof g === "string";
      const v = pornireUrechi(v0, faraUrechi ? null : urechi);
      const punti = urechi && !faraUrechi ? g!.centre.map(c => { const q = punctPeBucla(v, c); return [q.x, q.y]; }) : [];
      bucle.push({ v, inchis: true, nume: l.piesa.titlu || l.piesa.nume, faraUrechi, punti });
    }
    return { ok: true, bucle, urechi };
  }
  function programFata(locuri: readonly Loc[], o: Optiuni, P: SetariCnc, fata: string): Rez<{ program: Program; avertismente?: string[] }> {
    // fata: "simpla" (totul), "fata1" (gauri, marcaje, santuri, locasuri, tesirea fetei), "fata2" (santuri, locasuri, decupare, tesire)
    const D = P.freza, R = D / 2, p = { zSigur: o.zSigur, avans: o.avans, avansPlonjare: o.avansPlonjare };
    const m: Miscare[] = [], avertismente: string[] = [];
    const scula = { numar: o.scula.numar, nume: o.scula.nume, diametru: D };
    const T = P.tesire;
    const sus = fata !== "fata2", jos = fata !== "fata1";
    // 1. gaurile pentru stifturi (doar pe fata 1, la doua fete)
    if (fata === "fata1") {
      m.push({ tip: "eticheta", text: "gaurile pentru stifturi" });
      for (const x of [P.stift_margine, P.placa[0] - P.stift_margine]) {
        const e = traseuGaurire(m, [x, P.placa[1] / 2], D, P.grosime + o.adancimeGauri, Math.max(1, o.pasContur), p);
        if (e) return { ok: false, motiv: e };
      }
    }
    // 2. marcajele (punctele de numerotare), doar pe fata
    const marcaje = sus ? locuri.flatMap(l => l.marcaje.map(v => ({ v, inchis: false }))) : [];
    if (marcaje.length) {
      m.push({ tip: "eticheta", text: `marcaje, ${o.marcaj} mm` });
      for (const c of ordineApropiata(marcaje)) traseuPeLinie(m, c.v, false, [o.marcaj], p, false);
    }
    // 3. santurile
    const santuri = locuri.flatMap(l => l.santuri.map(v => ({ v, inchis: false })));
    if (santuri.length) {
      const ad = adancimiTreceri(P.sant_adancime, o.pasSant);
      if (typeof ad === "string") return { ok: false, motiv: ad };
      m.push({ tip: "eticheta", text: `santuri, ${P.sant_adancime} mm` });
      for (const c of ordineApropiata(santuri, ultima(m))) traseuPeLinie(m, c.v, false, ad, p, o.coborareDirecta);
    }
    // 3b. locasurile limbilor de macaz (la adancimea santului), apoi gaurile pivotilor
    const locas = locuri.flatMap(l => (l.treceriLocas || []).map(v => ({ v, inchis: false })));
    if (locas.length) {
      const ad = adancimiTreceri(P.sant_adancime, o.pasSant);
      if (typeof ad === "string") return { ok: false, motiv: ad };
      m.push({ tip: "eticheta", text: `locasurile limbilor de macaz, ${P.sant_adancime} mm` });
      for (const c of ordineApropiata(locas, ultima(m))) traseuPeLinie(m, c.v, false, ad, p, o.coborareDirecta);
    }
    const pivoti = locuri.flatMap(l => (l.pivoti || []).map((v): Cale => ({ v: [[(v[0]![0] + v[1]![0]) / 2, (v[0]![1] + v[1]![1]) / 2, 0]], inchis: true })));
    if (pivoti.length) {
      const adP = P.sant_adancime + P.pivot_adancime;
      m.push({ tip: "eticheta", text: `gaurile pivotilor, ${numar(adP, 2)} mm` });
      for (const c of ordineApropiata(pivoti, ultima(m))) { const e = traseuGaurire(m, c.v[0]!, D, adP, Math.max(1, o.pasSant), p); if (e) return { ok: false, motiv: e }; }
    }
    // 4. decuparea: profilul exterior cu urechi, la grosime + supracursa (cu rampa, daca e ceruta)
    if (jos) {
      const adancime = P.grosime + o.supracursa;
      const ad = adancimiTreceri(adancime, o.pasContur);
      if (typeof ad === "string") return { ok: false, motiv: ad };
      const b = buclePlaca(locuri, o, P);
      if (!b.ok) return b;
      const rampa = o.rampa ? o.lungimeRampa : 0;
      m.push({ tip: "eticheta", text: `decupare, ${numar(adancime, 2)} mm, ${b.urechi ? b.urechi.numar + " punti" : "fara punti"}${rampa ? ", pe rampa" : ""}` });
      for (const c of ordineApropiata(b.bucle, ultima(m))) {
        const urechi = c.faraUrechi ? null : b.urechi;
        if (c.faraUrechi && b.urechi) avertismente.push(tr`${c.nume}: prea mică pentru ${b.urechi.numar} punți; e decupată fără punți`);
        const e = traseuProfilExterior(m, c.v, ad, p, urechi, rampa);
        if (e) return { ok: false, motiv: `${c.nume}: ${e}` };
      }
    }
    // 5. tesirea, cu freza ei (o schimbare de scula)
    if (T) {
      const loops = locuri.flatMap(l => l.tesire.map(v => ({ v, inchis: true })));
      const linii = locuri.flatMap(l => l.margini.map(v => ({ v, inchis: false })));
      if (loops.length || linii.length) {
        const ts = { numar: o.tesire.numar, nume: o.tesire.nume, diametru: o.tesire.diametru,
                     forma: T.tip === "v" ? { tip: "v", unghi: T.unghi } : undefined };
        m.push({ tip: "schimba-scula", scula: ts, turatie: o.tesire.turatie });
        const pt = { zSigur: o.zSigur, avans: o.tesire.avans, avansPlonjare: o.avansPlonjare };
        const dCont = T.tip === "v" ? T.latime / Math.tan(T.unghi * Math.PI / 360) : T.raza;
        const dSant = T.tip === "v" ? o.tesire.latimeSant / Math.tan(T.unghi * Math.PI / 360) : 0;
        m.push({ tip: "eticheta", text: `tesire, ${numar(dCont, 2)} mm` });
        for (const c of ordineApropiata(loops)) {
          if (o.rampa) { const e = traseuProfilExterior(m, c.v, [dCont], pt, null, o.lungimeRampa); if (e) return { ok: false, motiv: e }; }
          else traseuPeLinie(m, c.v, true, [dCont], pt, false);
        }
        if (linii.length && dSant > 0) {
          m.push({ tip: "eticheta", text: `tesirea santurilor, ${numar(dSant, 2)} mm` });
          for (const c of ordineApropiata(linii, ultima(m))) traseuPeLinie(m, c.v, false, [dSant], pt, false);
        }
      }
    }
    return { ok: true, program: { scula, turatie: o.turatie, zSigur: o.zSigur, miscari: m }, avertismente };
  }
  // ---------------------------------------------------------------------------------------------- rampa in S, din blocul lipit
  // Suprafata depinde doar de x (lungimea rampei) si urca mereu, deci freza dreapta, mergand de-a lungul lui x, nu intra
  // in ea daca varful sta la inaltimea suprafetei din fata ei (x + R): marginea din fata urmareste exact profilul, iar
  // intre treceri raman creste de cel mult panta x (R - sqrt(R^2 - (pas/2)^2)), sub 0,03 mm la pasul de 1 mm.
  // Coordonatele: X de la fata capatului de jos, Y de la latura lunga, Z de la varful blocului (capatul de sus).
  function programRampa(r: Rampa, o: Optiuni, P: SetariCnc): Rez<{ program: Program; avertismente?: string[] }> {
    // r: { L, latime, H, plat, zSus(x) (suprafata finita, absolut), inceputLa(z) (de unde e lemn peste z), santuri: [[[x, y]...]] }
    const D = P.freza, R = D / 2, H = r.H, p = { zSigur: o.zSigur, avans: o.avans, avansPlonjare: o.avansPlonjare };
    const m: Miscare[] = [], zc = (x: number) => r.zSus(Math.min(r.L, Math.max(0, x + R)));
    const zJos = r.zSus(0), adaos = 0.5, pas = o.pasContur, pasX = 0.5;
    const pana = (z: number, x0 = 0) => {
      // cel mai mare x in care freza poate cobori la z (zc + adaos <= z); zc creste cu x
      if (zc(x0) + adaos > z) return null;
      let a = x0, b = r.L + R;
      if (zc(b) + adaos <= z) return b;
      for (let i = 0; i < 50; i++) { const c = (a + b) / 2; if (zc(c) + adaos <= z) a = c; else b = c; }
      return a;
    };
    const lat = (pasLat: number) => { const ys: number[] = []; for (let y = 0; y < r.latime - 1e-9; y += pasLat) ys.push(y); ys.push(r.latime); return ys; };
    // 1. degrosarea: pe niveluri, de sus in jos, doar unde e lemn deasupra nivelului si suprafata e cu adaosul dedesubt
    const ysD = lat(Math.min(0.7 * D, 4));
    m.push({ tip: "eticheta", text: `rampa: degrosare, pasi de ${numar(pas, 2)} mm, adaos ${numar(adaos, 1)} mm` });
    for (let k = 1; H - k * pas > zJos + 1e-6; k++) {
      const z = H - k * pas, a = r.inceputLa(z);
      if (a === null) continue;
      const b = pana(z);
      if (b === null || b <= a + 0.2) continue;
      const x0 = a - R - 1;
      m.push({ tip: "rapida", la: { Z: p.zSigur } });
      m.push({ tip: "rapida", la: { X: x0, Y: ysD[0]! } });
      m.push({ tip: "taiere", la: { Z: z - H }, avans: p.avansPlonjare });
      ysD.forEach((y, j) => {
        if (j) m.push({ tip: "taiere", la: { Y: y }, avans: p.avans });
        m.push({ tip: "taiere", la: { X: j % 2 ? x0 : b }, avans: p.avans });
      });
      m.push({ tip: "rapida", la: { Z: p.zSigur } });
    }
    // 2. finisarea: treceri de-a lungul rampei, la 1 mm una de alta, cu varful frezei pe suprafata din fata ei
    const ysF = lat(1);
    let xA = 0;
    while (xA < r.L && zc(xA) <= zJos + 1e-9) xA += pasX;
    xA = Math.max(-R, xA - 2 - pasX);
    let xB = xA;
    while (xB < r.L && r.zSus(xB) < H - 1e-9) xB += pasX;
    xB = Math.min(r.L, xB + 2);
    const xs: number[] = [];
    for (let x = xA; x < xB - 1e-9; x += pasX) xs.push(x);
    xs.push(xB);
    m.push({ tip: "eticheta", text: "rampa: finisare, treceri la 1 mm" });
    m.push({ tip: "rapida", la: { Z: p.zSigur } });
    m.push({ tip: "rapida", la: { X: xA, Y: ysF[0]! } });
    m.push({ tip: "taiere", la: { Z: zc(xA) - H }, avans: p.avansPlonjare });
    ysF.forEach((y, j) => {
      const sir = j % 2 ? xs.slice().reverse() : xs;
      if (j) m.push({ tip: "taiere", la: { Y: y }, avans: p.avans });
      for (const x of sir.slice(1)) m.push({ tip: "taiere", la: { X: x, Z: zc(x) - H }, avans: p.avans });
    });
    m.push({ tip: "rapida", la: { Z: p.zSigur } });
    // 3. santurile, la adancimea lor sub suprafata finita
    const ad = adancimiTreceri(P.sant_adancime, o.pasSant);
    if (typeof ad === "string") return { ok: false, motiv: ad };
    m.push({ tip: "eticheta", text: `rampa: santuri, ${P.sant_adancime} mm sub suprafata` });
    for (const v of r.santuri) {
      const pct: [number, number][] = [];
      for (let i = 0; i + 1 < v.length; i++) {
        const [xa, ya] = v[i]!, [xb, yb] = v[i + 1]!, L = Math.hypot(xb - xa, yb - ya), n = Math.max(1, Math.ceil(L / pasX));
        for (let k = i ? 1 : 0; k <= n; k++) pct.push([xa + (xb - xa) * k / n, ya + (yb - ya) * k / n]);
      }
      for (const d of ad) {
        m.push({ tip: "rapida", la: { Z: p.zSigur } });
        m.push({ tip: "rapida", la: { X: pct[0]![0], Y: pct[0]![1] } });
        m.push({ tip: "taiere", la: { Z: zc(pct[0]![0]) - d - H }, avans: p.avansPlonjare });
        for (const [x, y] of pct.slice(1)) m.push({ tip: "taiere", la: { X: x, Y: y, Z: zc(x) - d - H }, avans: p.avans });
        m.push({ tip: "rapida", la: { Z: p.zSigur } });
      }
    }
    return { ok: true, program: { scula: { numar: o.scula.numar, nume: o.scula.nume, diametru: D }, turatie: o.turatie, zSigur: o.zSigur, miscari: m } };
  }
  function ultima(m: readonly Miscare[]): [number, number] | null {
    let x: number | undefined, y: number | undefined;
    for (let i = m.length - 1; i >= 0 && (x === undefined || y === undefined); i--) {
      const la = (m[i] as { la?: La }).la; if (!la) continue;
      if (x === undefined && la.X !== undefined) x = la.X;
      if (y === undefined && la.Y !== undefined) y = la.Y;
    }
    return x === undefined || y === undefined ? null : [x, y];
  }

  function genereaza({ placi, calibrare, rampe, P, W, H, setari }: { placi: readonly { locuri: readonly Loc[] }[];
    calibrare: { contur: Pl; santuri: Pl[]; marcaje: Pl[]; tesire: Pl[]; margini: Pl[] } | null; rampe?: readonly Rampa[] | null; P: SetariCnc; W: number; H: number;
    setari: Partial<Optiuni> }) {
    const o = { ...IMPLICIT, ...setari, urechi: { ...IMPLICIT.urechi, ...(setari.urechi || {}) }, tesire: { ...IMPLICIT.tesire, ...(setari.tesire || {}) }, scula: { ...IMPLICIT.scula, ...(setari.scula || {}) } };
    const k = (CONTRACTE as Record<string, Contract | undefined>)[o.controler];
    if (!k) throw new Error("controler necunoscut: " + o.controler);
    const strategie = k.scula.includes(o.strategieScula) ? o.strategieScula : k.scula[0]!;
    const montajPlaca = { foaie: { latime: W, inaltime: H, grosime: P.grosime }, origine: o.origine, z0: o.z0 };
    const oglinda = (v: Pl): Pl => v.map(([x, y, b]) => [x, H - y, -b]);
    const ogl = (l: Loc): Loc => ({ ...l, contur: oglinda(l.contur), santuri: l.santuri.map(oglinda), marcaje: [], tesire: l.tesire.map(oglinda), margini: l.margini.map(oglinda),
                        treceriLocas: (l.treceriLocas || []).map(oglinda), pivoti: (l.pivoti || []).map(oglinda) });
    const fisiere: { nume: string; text: string }[] = [],
      rezumat: { nume: string; baza: string; scula: Scula; linii: number; timp: ReturnType<typeof estimeazaTimp> | null }[] = [], avertismente: string[] = [];
    const scrieProgram = (baza: string, locuri: readonly Loc[] | null, fata: string | null, gata?: ReturnType<typeof programRampa>, montajAles?: Montaj) => {
      const r = gata || programFata(locuri!, o, P, fata!);
      if (!r.ok) throw new Error(baza + ": " + r.motiv);
      const montaj = montajAles || montajPlaca;
      avertismente.push(...(r.avertismente || []).map((a: string) => baza + ": " + a));
      const prog = { axe: ["X", "Y", "Z"], ...r.program };
      const optiuni = { asteptareAx: o.asteptareAx, strategieScula: strategie };
      const timp = (text: string) => (o.estimare ? estimeazaTimp(text, o.estimare, strategie !== "fisiere-separate") : null);
      if (strategie === "fisiere-separate") {
        const x = posteazaPeScule(prog, montaj, k, optiuni);
        if (!x.ok) throw new Error(baza + ": " + x.motiv);
        x.fisiere.forEach(f => {
          const nume = `gcode/${baza}_T${f.scula.numar}.${k.extensie}`;
          fisiere.push({ nume, text: f.text });
          rezumat.push({ nume, baza, scula: f.scula, linii: f.linii, timp: timp(f.text) });
        });
      } else {
        const x = posteaza(prog, montaj, k, optiuni);
        if (!x.ok) throw new Error(baza + ": " + x.motiv);
        const nume = `gcode/${baza}.${k.extensie}`;
        fisiere.push({ nume, text: x.text });
        rezumat.push({ nume, baza, scula: prog.scula, linii: x.linii, timp: timp(x.text) });
      }
      return prog;
    };
    const programe: Program[] = [], vizual: { v: Pl; punti: number[][] }[][] = [];
    placi.forEach((pl, i: number) => {
      // traseul decuparii si puntile, pe fata 1 (cum se vede placa in previzualizare)
      const b = buclePlaca(pl.locuri, o, P);
      vizual.push(b.ok ? b.bucle.map(c => ({ v: c.v, punti: c.punti })) : []);
      if (P.doua_fete) {
        programe.push(scrieProgram(`placa_${i + 1}_fata1`, pl.locuri, "fata1"));
        programe.push(scrieProgram(`placa_${i + 1}_fata2`, pl.locuri.map(ogl), "fata2"));
      } else programe.push(scrieProgram(`placa_${i + 1}`, pl.locuri, "simpla"));
    });
    if (calibrare) {
      // placa de calibrare, pusa in coltul de jos al placii, la margine
      const dx = P.placa_margine, dy = P.placa_margine, t = (v: Pl): Pl => v.map(([x, y, b]) => [x + dx, y + dy, b]);
      const loc = { piesa: { nume: "placa_calibrare", titlu: tr("Placa de calibrare") }, contur: t(calibrare.contur), santuri: calibrare.santuri.map(t),
                    marcaje: calibrare.marcaje.map(t), tesire: calibrare.tesire.map(t), margini: calibrare.margini.map(t) };
      programe.push(scrieProgram("calibrare", [loc], "simpla"));
    }
    // rampele lipite: blocul are originea lui (capatul de jos, latura lunga, varful blocului)
    for (const rp of rampe || []) {
      const montajRampa = { foaie: { latime: rp.L, inaltime: rp.latime, grosime: rp.H }, origine: o.origine, z0: o.z0 };
      programe.push(scrieProgram(rp.nume, null, null, programRampa(rp, o, P), montajRampa));
    }
    return { fisiere, rezumat, avertismente, contract: k, strategie, programe, vizual };
  }

  return { CONTRACTE, IMPLICIT, PROFIL_GRBL_11H, genereaza, posteaza, posteazaPeScule, programFata, programRampa, adancimiTreceri, noduriProfil, parcurge,
    buclaCuRampa, estimeazaTimp, profilDinSetari, numar };
})(typeof globalThis !== "undefined" ? globalThis : window);
