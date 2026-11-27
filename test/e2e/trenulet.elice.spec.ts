/**
 * Elicea în atelierul Easy 3Draw (ADR 0282, felia 3.Tq), pe pagina de sine stătătoare a planificatorului (din aceleași surse
 * ca pachetul):
 * - fila nouă „Elice” (familia `propulsie`): elicea implicită (3 palete, Ø72, pasul 0,7, răsucită), cu numele, cotele și
 *   textul (pasul 50 mm; 63° lângă butuc, 13° la vârf; consola la vârf 0,9 mm pe strat);
 * - „Ca LEGO 15790” (cotele din LDraw, față de axa piesei): Ø73,9, paleta plată la 15°, gaura rotundă; cu 4 palete, STL-ul
 *   închis, cu raza 36,95;
 * - fiecare „Ca LEGO” cu cotele și cu sensul piesei LEGO (6041 e pe stânga; 92842 și 15790, pe dreapta);
 * - un câmp în afara plajei e adus la margine, iar editorul o spune sub câmpuri, până la următoarea schimbare (ADR 0340,
 *   3.Cm-4); un câmp golit rămâne cu ce era, fără mesaj;
 * - fraza sensului (cum alegi „Dreapta” sau „Stânga” după motor) și „Repede”, diametrele pe grila de știfturi (3.Cm-4);
 * - editorul: fiecare alegere (forma, paleta, profilul, sensul, gaura, conul) și fiecare câmp (rotunjit la pasul lui, adus în
 *   plajă) ajung în piesă;
 * - „Fă perechea”: aceeași elice, pe dreapta și pe stânga, în listă, câte bucăți sunt cerute.
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { paginiPlanificator } from '../../scripts/construieste-trenulet.ts';
import { intraIn3D, THREE, threeDinPachet } from './ajutor-atelier.ts';

async function atelierElice(page: Page): Promise<void> {
  // three.js din pachet, apoi pornirea părții 3D încheiată, înainte ca proba să atingă editorul (`ajutor-atelier.ts`)
  await threeDinPachet(page);
  await page.setContent(paginiPlanificator().preview);
  await intraIn3D(page);
  await page.locator('#at-tipuri [data-fila="propulsie"]').click();
  await expect(page.locator('#at-galerie [data-piesa="elice"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Elice Ø72 cu 3 palete, pasul 0,7');
}
async function seteaza(page: Page, sel: string, v: string): Promise<void> {
  await page.locator(sel).fill(v);
  await page.locator(sel).blur();
}

/** Muchiile fără pereche ale unui STL binar și cea mai mare rază față de mijlocul cutiei (pe x, y). */
function citesteStl(stl: Buffer): { triunghiuri: number; rele: number; raza: number } {
  const n = stl.readUInt32LE(80), m = new Map<string, number>(), pts: number[][] = [];
  const v = (o: number) => [0, 1, 2].map((k) => stl.readFloatLE(o + 4 * k));
  for (let i = 0; i < n; i++) {
    const o = 84 + 50 * i + 12, p = [v(o), v(o + 12), v(o + 24)];
    pts.push(...p);
    const s = p.map((q) => q.map((x) => x.toFixed(3)).join(','));
    for (let k = 0; k < 3; k++) { const e = s[k] + '>' + s[(k + 1) % 3]; m.set(e, (m.get(e) ?? 0) + 1); }
  }
  let rele = 0;
  for (const [e, c] of m) { const [a, b] = e.split('>'); if (c !== 1 || m.get(b + '>' + a) !== 1) rele++; }
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p[0]!); x1 = Math.max(x1, p[0]!); y0 = Math.min(y0, p[1]!); y1 = Math.max(y1, p[1]!); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let raza = 0;
  for (const p of pts) raza = Math.max(raza, Math.hypot(p[0]! - cx, p[1]! - cy));
  return { triunghiuri: n, rele, raza };
}

test('elicea implicită, în fila Elice: 3 palete, Ø72, pasul 0,7, răsucită; textul cu pasul și unghiurile; tipărirea (treapta, brim)', async ({ page }) => {
  await atelierElice(page);
  await expect(page.locator('#at-tipuri [data-fila="propulsie"]')).toHaveText('Elice 4');
  // pe hârtie: P = 0,7 · 72 = 50,4; atan(50,4 / 8π) = 63,498° la butuc (63, la grad); atan(0,7 / π) = 12,56° la vârf;
  // 0,2 / tan 12,56° = 0,898 la vârf; dar treapta dintre straturi, pe paleta curbată, ajunge la 1,53 spre muchia de sus (ADR 0340):
  // fără suport, dar aspru pe alocuri; primul strat, 1,3 % din disc, deci margine (brim)
  await expect(page.locator('#at-editor > p.mic').first()).toHaveText('Elice pentru motoarele LEGO, pe un butuc ca la LEGO (Ø8, înalt cât un știft), cu gaura din calibrare. Se tipărește cu butucul și muchia de jos a fiecărei palete pe masă.');
  await expect(page.locator('#at-el-info')).toHaveText('Pasul 50 mm (0,7 × diametrul). Paleta răsucită: 63° lângă butuc, 13° la vârf.');
  await expect(page.locator('#at-tipar')).toHaveText('Se tipărește fără suport, dar dedesubtul paletelor iese aspru pe alocuri (ventilatorul de răcire, la maxim): un strat iese peste cel de dedesubt cu până la 1,53 mm. Primul strat atinge masa doar pe 1,3 % din discul paletelor: pune o margine de aderență (brim) în programul de feliere.');
  await expect(page.locator('#at-cote')).toContainText('× 8 mm');
  await expect(page.locator('#at-avert')).toBeHidden();
  // editorul, la început: câmpurile și alegerile implicite; niciun „Ca LEGO” apăsat
  for (const [camp, v] of [['palete', '3'], ['diam', '72'], ['pas', '0.7'], ['lat', '30']] as const) await expect(page.locator(`#at-el-${camp}`)).toHaveValue(v);
  for (const [grup, v] of [['forma', 'rot'], ['paleta', 'rasucita'], ['profil', 'placa'], ['sens', 'dreapta'], ['gaura', 'x'], ['con', 'nu']] as const)
    await expect(page.locator(`#at-el-${grup} [aria-pressed="true"]`)).toHaveAttribute('data-v', v);
  await expect(page.locator('#at-el-repede [aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator('#at-el-grila [aria-pressed="true"]')).toHaveAttribute('data-v', '72');
  // sensul, spus pentru omul care alege după motorul lui (constatarea 5 a auditului)
  await expect(page.locator('#at-el-sensul')).toHaveText('Pornește motorul și privește axul dinspre el: dacă se învârte în sensul acelor de ceasornic, alege „Dreapta”; invers, „Stânga”. Elicea stă pe ax cu partea de pe masă spre motor și suflă aerul spre el.');
  // un câmp în afara plajei e adus la margine, iar editorul o spune sub câmpuri (ADR 0340, 3.Cm-4)
  const nume = page.locator('#at-nume-piesa'), plaja = page.locator('#at-plaja');
  await expect(plaja).toHaveCount(0);
  await seteaza(page, '#at-el-palete', '12');
  await expect(nume).toHaveText('Elice Ø72 cu 8 palete, pasul 0,7');
  await expect(page.locator('#at-el-palete')).toHaveValue('8');
  await expect(plaja).toHaveText('O elice are între 2 și 8 palete: am făcut-o cu 8.');
  await seteaza(page, '#at-el-diam', '250');
  await expect(nume).toHaveText('Elice Ø200 cu 8 palete, pasul 0,7');
  await expect(page.locator('#at-el-diam')).toHaveValue('200');
  await expect(plaja).toHaveText('Diametrul unei elice e între 20 și 200 mm: am făcut-o de 200 mm.');
  // piesa e în plajă: sub ea, motorul n-are nimic de spus; mesajul rămâne după construire
  await expect(page.locator('#at-tipar')).toContainText('Se tipărește');
  await expect(page.locator('#at-avert')).toBeHidden();
  await expect(plaja).toBeVisible();
  // altă piesă (elicea de barcă) nu-l arată; înapoi la elice, nici ea
  await page.locator('#at-galerie [data-piesa="eliceBarca"]').click();
  await expect(nume).toHaveText('Elice de barcă Ø40 cu 3 palete, pasul 1');
  await expect(plaja).toHaveCount(0);
  await page.locator('#at-galerie [data-piesa="elice"]').click();
  await expect(nume).toHaveText('Elice Ø200 cu 8 palete, pasul 0,7');
  await expect(plaja).toHaveCount(0);
  // o valoare din plajă îl scoate; un câmp golit rămâne cu ce era, fără mesaj
  await seteaza(page, '#at-el-palete', '12');
  await expect(plaja).toHaveText('O elice are între 2 și 8 palete: am făcut-o cu 8.');
  await seteaza(page, '#at-el-diam', '72');
  await expect(nume).toHaveText('Elice Ø72 cu 8 palete, pasul 0,7');
  await expect(plaja).toHaveCount(0);
  await seteaza(page, '#at-el-palete', '');
  await expect(page.locator('#at-el-palete')).toHaveValue('8');
  await expect(plaja).toHaveCount(0);
  // pasul și lățimea, la fel; o alegere (aici sensul) scoate mesajul
  await seteaza(page, '#at-el-pas', '3');
  await expect(nume).toHaveText('Elice Ø72 cu 8 palete, pasul 1,5');
  await expect(plaja).toHaveText('Pasul unei elice e între 0,3 și 1,5 × diametrul: am făcut-o cu 1,5.');
  await seteaza(page, '#at-el-lat', '80');
  await expect(page.locator('#at-el-lat')).toHaveValue('60');
  await expect(plaja).toHaveText('Lățimea paletei unei elice e între 15 și 60 % din rază: am făcut-o de 60 %.');
  await page.locator('#at-el-sens [data-v="stanga"]').click();
  await expect(nume).toHaveText('Elice Ø72 cu 8 palete, pasul 1,5, stânga');
  await expect(plaja).toHaveCount(0);
});

test('„Repede”: diametrele pe grila de știfturi (Ø40, Ø56, Ø72, Ø96); „Piese LEGO” rămân alături', async ({ page }) => {
  await atelierElice(page);
  const nume = page.locator('#at-nume-piesa'), grila = page.locator('#at-el-grila');
  await expect(page.locator('#at-el-grila').locator('xpath=..')).toContainText('5, 7, 9 și 12 știfturi');
  await expect(page.locator('#at-el-repede').locator('xpath=..')).toContainText('Piese LEGO:');
  await expect(grila.locator('[data-v]')).toHaveText(['Ø40', 'Ø56', 'Ø72', 'Ø96']);
  await grila.locator('[data-v="96"]').click();
  await expect(nume).toHaveText('Elice Ø96 cu 3 palete, pasul 0,7');
  await expect(page.locator('#at-el-diam')).toHaveValue('96');
  await expect(grila.locator('[aria-pressed="true"]')).toHaveAttribute('data-v', '96');
  // doar diametrul se schimbă
  for (const [camp, v] of [['palete', '3'], ['pas', '0.7'], ['lat', '30']] as const) await expect(page.locator(`#at-el-${camp}`)).toHaveValue(v);
  // o piesă LEGO (Ø73,9) nu e pe grilă; iar un diametru de pe grilă nu mai e piesa LEGO
  await page.locator('#at-el-repede [data-v="15790"]').click();
  await expect(grila.locator('[aria-pressed="true"]')).toHaveCount(0);
  await grila.locator('[data-v="40"]').click();
  await expect(nume).toHaveText('Elice Ø40 cu 3 palete, pasul 0,59, plată, gaură rotundă');
  await expect(page.locator('#at-el-repede [aria-pressed="true"]')).toHaveCount(0);
});

test('tipărirea, pe praguri (ADR 0340): la pasul 0,3, cu suport sub vârfuri; o elice mică ține de masă cu butucul, fără margine', async ({ page }) => {
  await atelierElice(page);
  const tipar = page.locator('#at-tipar');
  // pasul 0,3: consola de la vârf 0,2 · π / 0,3 = 2,09, iar treapta pe secțiuni, 4,70; primul strat, 1,6 % din disc
  await seteaza(page, '#at-el-pas', '0.3');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Elice Ø72 cu 3 palete, pasul 0,3');
  await expect(tipar).toHaveText('Se tipărește cu suport sub vârfurile paletelor (sau alege un pas mai mare): spre vârf, un strat iese peste cel de dedesubt cu peste 1 mm, pe alocuri cu până la 4,7 mm. Primul strat atinge masa doar pe 1,6 % din discul paletelor: pune o margine de aderență (brim) în programul de feliere.');
  // Ø20: butucul acoperă 13,1 % din disc, deci fără margine
  await seteaza(page, '#at-el-diam', '20');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Elice Ø20 cu 3 palete, pasul 0,3');
  await expect(tipar).toHaveText('Se tipărește cu suport sub vârfurile paletelor (sau alege un pas mai mare): spre vârf, un strat iese peste cel de dedesubt cu peste 1 mm, pe alocuri cu până la 2,19 mm.');
  // pasul 0,7 la loc: consola de la vârf 0,90, treapta 1,15: aspru pe alocuri, nu suport
  await seteaza(page, '#at-el-pas', '0.7');
  await expect(tipar).toHaveText('Se tipărește fără suport, dar dedesubtul paletelor iese aspru pe alocuri (ventilatorul de răcire, la maxim): un strat iese peste cel de dedesubt cu până la 1,15 mm.');
  // în vederea „Modelul”, paragraful piesei nu se vede; înapoi la piesă, iar
  await page.locator('#at-vedere-mod [data-v="model"]').click();
  await expect(tipar).toBeHidden();
  await page.locator('#at-vedere-mod [data-v="piesa"]').click();
  await expect(tipar).toBeVisible();
});

test('„Ca LEGO 15790”: Ø73,9, paleta plată la 15°, gaura rotundă; cu 4 palete, STL-ul închis, cu raza 36,95', async ({ page }) => {
  await atelierElice(page);
  await page.locator('#at-el-repede [data-v="15790"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Elice Ø73,9 cu 3 palete, pasul 0,59, plată, gaură rotundă');
  await expect(page.locator('#at-el-repede [data-v="15790"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#at-el-info')).toContainText('Paleta plată, la 15° de la butuc la vârf, ca la LEGO.');
  // cu 4 palete, cutia e simetrică față de butuc: raza cea mai mare, 73,9 / 2
  await seteaza(page, '#at-el-palete', '4');
  await expect(page.locator('#at-nume-piesa')).toHaveText('Elice Ø73,9 cu 4 palete, pasul 0,59, plată, gaură rotundă');
  await expect(page.locator('#at-el-repede [data-v="15790"]')).toHaveAttribute('aria-pressed', 'false');
  const descarcare = page.waitForEvent('download');
  await page.locator('#at-stl').click();
  const { triunghiuri, rele, raza } = citesteStl(readFileSync(await (await descarcare).path()));
  expect(triunghiuri).toBeGreaterThan(3_000);
  expect(rele).toBe(0);
  expect(raza).toBeCloseTo(73.9 / 2, 1);
});

test('fiecare „Ca LEGO”, cu cotele piesei din LDraw, măsurate față de axa ei, și cu sensul ei: 6041 pe stânga, 92842 și 15790 pe dreapta', async ({ page }) => {
  await atelierElice(page);
  // pe hârtie, din LDraw (raza vârfurilor față de axa găurii; unghiul paletei și coarda la 70 % din rază; semnul pantei):
  // - 6041: R 13,69 → Ø27,4; 23° → pasul π · 0,7 · tan 23° = 0,93; coarda 8,8 din 13,7 → peste 60 %, deci 60; elicoid stâng;
  //   P = 0,93 · 27,4 = 25,5 mm; consola 0,2 / tan 22,9° = 0,47
  // - 92842: R 21,56 → Ø43,1; 15° → 0,59; coarda 6,3 din 21,56 → 29 %; elicoid drept; P = 25,4 mm; consola 0,2 / tan 15° = 0,75
  // - 15790: R 36,96 → Ø73,9; 15° → 0,59; coarda 9,2 (media) din 36,96 → 25 %; elicoid drept; P = 43,6 mm
  const LEGO = [
    ['6041', 'Elice Ø27,4 cu 3 palete, pasul 0,93, plată, stânga', '27.4', '0.93', '60', 'stanga', 'x', 'Pasul 25 mm (0,93 × diametrul). Paleta plată, la 23° de la butuc la vârf, ca la LEGO.'],
    ['92842', 'Elice Ø43,1 cu 3 palete, pasul 0,59, plată, gaură rotundă', '43.1', '0.59', '29', 'dreapta', 'r', 'Pasul 25 mm (0,59 × diametrul). Paleta plată, la 15° de la butuc la vârf, ca la LEGO.'],
    ['15790', 'Elice Ø73,9 cu 3 palete, pasul 0,59, plată, gaură rotundă', '73.9', '0.59', '25', 'dreapta', 'r', 'Pasul 44 mm (0,59 × diametrul). Paleta plată, la 15° de la butuc la vârf, ca la LEGO.'],
  ] as const;
  // de la 15790 înapoi la 6041: sensul trece pe stânga și la loc (fiecare „Ca LEGO” își pune sensul, nu-l lasă pe cel de dinainte)
  for (const [piesa, nume, diam, pas, lat, sens, gaura, info] of [LEGO[2], LEGO[0], LEGO[1], LEGO[0]]) {
    await page.locator(`#at-el-repede [data-v="${piesa}"]`).click();
    await expect(page.locator('#at-nume-piesa')).toHaveText(nume);
    await expect(page.locator('#at-el-info')).toHaveText(info);
    await expect(page.locator('#at-el-palete')).toHaveValue('3');
    await expect(page.locator('#at-el-diam')).toHaveValue(diam);
    await expect(page.locator('#at-el-pas')).toHaveValue(pas);
    await expect(page.locator('#at-el-lat')).toHaveValue(lat);
    await expect(page.locator('#at-el-sens [aria-pressed="true"]')).toHaveAttribute('data-v', sens);
    await expect(page.locator('#at-el-gaura [aria-pressed="true"]')).toHaveAttribute('data-v', gaura);
    await expect(page.locator('#at-el-forma [aria-pressed="true"]')).toHaveAttribute('data-v', 'drept');
    await expect(page.locator('#at-el-paleta [aria-pressed="true"]')).toHaveAttribute('data-v', 'plata');
    await expect(page.locator('#at-el-repede [aria-pressed="true"]')).toHaveAttribute('data-v', piesa);
  }
  // 6041 (cea din urmă): treapta 0,72, primul strat 6,8 % din disc
  await expect(page.locator('#at-tipar')).toHaveText('Se tipărește fără suport, dar dedesubtul paletelor iese aspru pe alocuri (ventilatorul de răcire, la maxim): un strat iese peste cel de dedesubt cu până la 0,72 mm. Primul strat atinge masa doar pe 6,8 % din discul paletelor: pune o margine de aderență (brim) în programul de feliere.');
  // sensul schimbat de om: nu mai e „Ca LEGO 6041” (piesa LEGO e pe stânga)
  await page.locator('#at-el-sens [data-v="dreapta"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Elice Ø27,4 cu 3 palete, pasul 0,93, plată');
  await expect(page.locator('#at-el-repede [aria-pressed="true"]')).toHaveCount(0);
});

test('editorul: fiecare alegere și fiecare câmp ajung în piesă; câmpurile, rotunjite la pasul lor și aduse în plajă', async ({ page }) => {
  await atelierElice(page);
  const nume = page.locator('#at-nume-piesa'), apasat = (grup: string) => page.locator(`#at-el-${grup} [aria-pressed="true"]`);
  // alegerile
  await page.locator('#at-el-forma [data-v="ingust"]').click();
  await expect(apasat('forma')).toHaveAttribute('data-v', 'ingust');
  await page.locator('#at-el-forma [data-v="drept"]').click();
  await expect(apasat('forma')).toHaveAttribute('data-v', 'drept');
  await page.locator('#at-el-profil [data-v="aripa"]').click();
  await expect(apasat('profil')).toHaveAttribute('data-v', 'aripa');
  await expect(nume).toHaveText('Elice Ø72 cu 3 palete, pasul 0,7');
  // paleta plată: același unghi peste tot, cât la 70 % din rază: atan(0,7 / (0,7 · π)) = 17,66°
  await page.locator('#at-el-paleta [data-v="plata"]').click();
  await expect(nume).toHaveText('Elice Ø72 cu 3 palete, pasul 0,7, plată');
  await expect(page.locator('#at-el-info')).toContainText('Paleta plată, la 18° de la butuc la vârf, ca la LEGO.');
  await page.locator('#at-el-paleta [data-v="rasucita"]').click();
  await expect(page.locator('#at-el-info')).toContainText('Paleta răsucită: 63° lângă butuc, 13° la vârf.');
  await page.locator('#at-el-sens [data-v="stanga"]').click();
  await expect(nume).toHaveText('Elice Ø72 cu 3 palete, pasul 0,7, stânga');
  await page.locator('#at-el-sens [data-v="dreapta"]').click();
  for (const [g, coada] of [['r', ', gaură rotundă'], ['b', ', pentru bară'], ['nu', ', fără gaură'], ['x', '']] as const) {
    await page.locator(`#at-el-gaura [data-v="${g}"]`).click();
    await expect(nume).toHaveText('Elice Ø72 cu 3 palete, pasul 0,7' + coada);
  }
  // conul: 1,3 · 4 = 5,2 mm peste butucul de 8
  await page.locator('#at-el-con [data-v="da"]').click();
  await expect(nume).toHaveText('Elice Ø72 cu 3 palete, pasul 0,7, cu con');
  await expect(page.locator('#at-cote')).toContainText('× 13,2 mm');
  await page.locator('#at-el-con [data-v="nu"]').click();
  await expect(page.locator('#at-cote')).toContainText('× 8 mm');
  // câmpurile: paletele la întreg, diametrul la zecime, pasul la sutime, lățimea la întreg
  // (câmpul arată, după redesenare, ce a intrat în piesă: valoarea rotunjită, nu ce a scris omul)
  await seteaza(page, '#at-el-palete', '4.4');
  await expect(nume).toHaveText('Elice Ø72 cu 4 palete, pasul 0,7');
  await expect(page.locator('#at-el-palete')).toHaveValue('4');
  await seteaza(page, '#at-el-diam', '72.26');
  await expect(nume).toHaveText('Elice Ø72,3 cu 4 palete, pasul 0,7');
  await expect(page.locator('#at-el-diam')).toHaveValue('72.3');
  await seteaza(page, '#at-el-pas', '1.204');
  await expect(nume).toHaveText('Elice Ø72,3 cu 4 palete, pasul 1,2');
  await expect(page.locator('#at-el-pas')).toHaveValue('1.2');
  // pasul 1,2 · 72,3 = 86,76 mm; răsucită: atan(86,76 / 8π) = 73,8° la butuc, atan(1,2 / π) = 20,9° la vârf; 0,2 / tan 20,9° = 0,52
  await expect(page.locator('#at-el-info')).toHaveText('Pasul 87 mm (1,2 × diametrul). Paleta răsucită: 74° lângă butuc, 21° la vârf.');
  await seteaza(page, '#at-el-lat', '44.6');
  await expect(page.locator('#at-el-lat')).toHaveValue('45');
  // marginile plajei: chiar pe margine intră, fără mesaj; dincolo de ea, câmpul e adus la margine (piesa rămâne cea de la
  // margine) și editorul o spune, până la următoarea alegere
  const plaja = page.locator('#at-plaja');
  for (const [camp, bun, rau, cum, mesaj] of [
    ['palete', '8', '9', 'Elice Ø72,3 cu 8 palete, pasul 1,2', 'O elice are între 2 și 8 palete: am făcut-o cu 8.'],
    ['palete', '2', '1', 'Elice Ø72,3 cu 2 palete, pasul 1,2', 'O elice are între 2 și 8 palete: am făcut-o cu 2.'],
    ['diam', '200', '200.1', 'Elice Ø200 cu 2 palete, pasul 1,2', 'Diametrul unei elice e între 20 și 200 mm: am făcut-o de 200 mm.'],
    ['diam', '20', '19.9', 'Elice Ø20 cu 2 palete, pasul 1,2', 'Diametrul unei elice e între 20 și 200 mm: am făcut-o de 20 mm.'],
    ['pas', '1.5', '1.51', 'Elice Ø20 cu 2 palete, pasul 1,5', 'Pasul unei elice e între 0,3 și 1,5 × diametrul: am făcut-o cu 1,5.'],
    ['pas', '0.3', '0.29', 'Elice Ø20 cu 2 palete, pasul 0,3', 'Pasul unei elice e între 0,3 și 1,5 × diametrul: am făcut-o cu 0,3.'],
    ['lat', '60', '61', 'Elice Ø20 cu 2 palete, pasul 0,3', 'Lățimea paletei unei elice e între 15 și 60 % din rază: am făcut-o de 60 %.'],
    ['lat', '15', '14', 'Elice Ø20 cu 2 palete, pasul 0,3', 'Lățimea paletei unei elice e între 15 și 60 % din rază: am făcut-o de 15 %.'],
  ] as const) {
    await seteaza(page, `#at-el-${camp}`, bun);
    await expect(nume).toHaveText(cum);
    await expect(plaja).toHaveCount(0);
    await seteaza(page, `#at-el-${camp}`, rau);
    await expect(nume).toHaveText(cum);
    await expect(page.locator(`#at-el-${camp}`)).toHaveValue(bun);
    await expect(plaja).toHaveText(mesaj);
    await page.locator('#at-el-forma [data-v="rot"]').click();
    await expect(page.locator(`#at-el-${camp}`)).toHaveValue(bun);
    await expect(plaja).toHaveCount(0);
  }
});

test('o redesenare a editorului sosită cât omul scrie într-un câmp (three.js venit târziu) ia întâi ce a scris: piesa și editorul spun același lucru', async ({ page }) => {
  // three.js, ținut până îi dăm drumul: partea 3D îl așteaptă, apoi alege din nou piesa de acum și redesenează editorul
  let daDrumul!: () => void;
  const tinut = new Promise<void>((ok) => { daDrumul = ok; });
  await page.route('https://cdnjs.cloudflare.com/**', async (r) => { await tinut; await r.fulfill({ body: THREE, contentType: 'application/javascript' }); });
  await page.setContent(paginiPlanificator().preview);
  await page.locator('[data-mod="3d"]').first().click();
  await page.locator('#at-tipuri [data-fila="propulsie"]').click();
  await page.locator('#at-el-repede [data-v="15790"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Elice Ø73,9 cu 3 palete, pasul 0,59, plată, gaură rotundă');
  // omul a scris 4 în câmpul paletelor și e încă în câmp (valoarea nu e luată) când sosește three.js
  await page.locator('#at-el-palete').fill('4');
  await expect(page.locator('#at-el-palete')).toBeFocused();
  daDrumul();
  await expect(page.locator('#at-vedere canvas')).toBeAttached();
  // redesenarea scoate câmpul din pagină, iar browserul îi dă `change` chiar atunci: valoarea intră în piesă. Editorul trebuie
  // să arate aceeași piesă (4 palete, deci nu mai e „Ca LEGO 15790”), nu ce era înaintea scrierii
  await expect(page.locator('#at-nume-piesa')).toHaveText('Elice Ø73,9 cu 4 palete, pasul 0,59, plată, gaură rotundă');
  await expect(page.locator('#at-el-palete')).toHaveValue('4');
  await expect(page.locator('#at-el-repede [aria-pressed="true"]')).toHaveCount(0);
});

test('„Fă perechea”: aceeași elice, pe dreapta și pe stânga, în listă; elicea din editor e același rând cu cea dreaptă', async ({ page }) => {
  await atelierElice(page);
  await page.locator('#at-el-con [data-v="da"]').click();
  await expect(page.locator('#at-nume-piesa')).toHaveText('Elice Ø72 cu 3 palete, pasul 0,7, cu con');
  await page.locator('#at-adauga').click();
  await page.locator('#at-el-pereche').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Elice Ø72 cu 3 palete, pasul 0,7, cu con', 'Elice Ø72 cu 3 palete, pasul 0,7, stânga, cu con']);
  await expect(page.locator('#at-lista tr[data-id] .pas-n')).toHaveText(['2', '1']);
  // câte bucăți sunt cerute: încă 3 perechi, din elicea pe stânga (perechea are tot ambele sensuri)
  await page.locator('#at-el-sens [data-v="stanga"]').click();
  await page.locator('#at-bucati').fill('3');
  await page.locator('#at-el-pereche').click();
  await expect(page.locator('#at-lista tr td:first-child')).toHaveText(['Elice Ø72 cu 3 palete, pasul 0,7, cu con', 'Elice Ø72 cu 3 palete, pasul 0,7, stânga, cu con']);
  await expect(page.locator('#at-lista tr[data-id] .pas-n')).toHaveText(['5', '4']);
});
