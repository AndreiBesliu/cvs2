// masoara.mjs - reface cifrele-cheie ale sondei s11 in mai putin de 3 minute:
//  1) Edge cu fereastra, pagina izolata (COOP+COEP): blur + drop-cutter + jobul s4, SAB vs transfer vs banda proprie,
//     cu oracolele pe hartie si controalele negative (5 repetitii, mediana);
//  2) matricea de compatibilitate (5 seturi de antete) cu emulatorul Firebase Auth pe demo-s11izolare.
// La final tipareste rezumatul. Totul se inchide singur (browser, server pe 5187, emulator pe 19987).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const t0 = Date.now();
const run = (args) => { const r = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit' }); if (r.status !== 0) console.log('ESEC', args.join(' '), r.status); };
run(['run-bench.mjs', '--moduri=coep-rc', '--parts=coi,blur,dc,s4', '--q=rb=5&rd=5&rs=5']);
run(['run-compat.mjs']);
const B = JSON.parse(readFileSync(new URL('./rezultate/browser-bench-coep-rc.json', import.meta.url), 'utf8'));
const C = JSON.parse(readFileSync(new URL('./rezultate/compat.json', import.meta.url), 'utf8'));
const ok = (o) => (o && o.puncte_peste_toleranta === 0 ? 'OK' : 'PICA');
console.log('\n================ REZUMAT s11-izolare ================');
console.log(`WebGL: ${B.webgl_renderer} | software: ${B.software_renderer} | crossOriginIsolated: ${B.crossOriginIsolated}`);
console.log(`BLUR 4000^2, 16 workeri (ms, mediana): SAB ${B.blur.ms.a_sab} | transfer ${B.blur.ms.b_transfer} (x${B.blur.raport.b_pe_a}) | banda proprie ${B.blur.ms.c_banda_proprie} (x${B.blur.raport.c_pe_a})`);
console.log(`  bit cu bit fata de 1 fir: a ${B.blur.bit_a_vs_ref.diferite}, b ${B.blur.bit_b_vs_ref.diferite}, c ${B.blur.bit_c_vs_ref.diferite} celule diferite`);
console.log(`  oracol pe hartie: a ${ok(B.blur.oracol.a_sab)}, b ${ok(B.blur.oracol.b_transfer)}, c ${ok(B.blur.oracol.c_banda_proprie)} | CONTROL halo-1: b ${ok(B.blur.oracol.CONTROL_b_halo_minus_1)}, c ${ok(B.blur.oracol.CONTROL_c_halo_minus_1)} (trebuie PICA)`);
console.log(`FINISARE drop-cutter 2,67 M puncte (ms): SAB ${B.dc.ms.a_sab} | transfer ${B.dc.ms.b_transfer} (x${B.dc.raport.b_pe_a}) | banda proprie ${B.dc.ms.c_banda_proprie} (x${B.dc.raport.c_pe_a})`);
console.log(`  bit cu bit: a-b ${B.dc.bit_a_vs_b.diferite}, c-b ${B.dc.bit_c_vs_b.diferite}, ref 3 linii ${B.dc.bit_b_vs_ref_3linii} | oracol: a ${ok(B.dc.oracol.a_sab)}, b ${ok(B.dc.oracol.b_transfer)}, c ${ok(B.dc.oracol.c_banda_proprie)} | CONTROL: b ${ok(B.dc.oracol.CONTROL_b_halo_minus_1)} (scobitura ${B.dc.oracol.CONTROL_b_halo_minus_1.scobitura_max.toFixed(3)} mm), c ${ok(B.dc.oracol.CONTROL_c_halo_minus_1)}`);
console.log(`s4 JOB 2D 0,1 mm (ms): mutari in SAB ${B.s4.ms.a_mutari_in_sab} | copiate ${B.s4.ms.b_mutari_copiate} (x${B.s4.raport.b_pe_a}) | filtrate+transferate ${B.s4.ms.b2_filtrate_transferate} (x${B.s4.raport.b2_pe_a})`);
console.log(`  amprente (asteptat ${B.s4.amprenta_asteptata_s4}):`, JSON.stringify(B.s4.amprente));
const T = (m, k) => { const v = m.start && m.start[k]; return v ? (v.ok ? 'da' : 'NU') : '-'; };
console.log('\nCOMPATIBILITATE        ' + C.moduri.map((m) => m.mod.padEnd(9)).join(''));
const rows = [
  ['crossOriginIsolated', (m) => String(m.start && m.start.crossOriginIsolated)],
  ['SDK Firebase', (m) => T(m, 'fb_sdk_pachet_aceeasi_origine')],
  ['Auth e-mail', (m) => T(m, 'auth_email_parola_emulator')],
  ['signInWithPopup', (m) => (m.auth_signInWithPopup && m.auth_signInWithPopup.ok ? 'da' : 'NU')],
  ['signInWithRedirect', (m) => (m.auth_redirect && m.auth_redirect.rezultat && m.auth_redirect.rezultat.ok ? 'da' : 'NU')],
  ['reCAPTCHA Ent. script', (m) => T(m, 'recaptcha_enterprise_script')],
  ['Google Fonts', (m) => T(m, 'fonturi_google_fara_crossorigin')],
  ['Stripe.js fara CORS', (m) => T(m, 'stripe_js_script')],
  ['iframe strain', (m) => T(m, 'iframe_alta_origine_fara_antete')],
  ['Stripe dus-intors', (m) => (m.stripe_intoarcere && m.stripe_intoarcere.marker ? 'da' : 'NU')],
];
for (const [name, f] of rows) console.log(name.padEnd(23) + C.moduri.map((m) => f(m).padEnd(9)).join(''));
console.log(`\ndurata totala: ${Math.round((Date.now() - t0) / 1000)} s`);
