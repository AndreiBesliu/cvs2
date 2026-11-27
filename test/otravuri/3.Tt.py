# Lista de otrăvuri a feliei 3.Tt (înclinarea spre pupa a elicei de barcă în atelierul Easy 3Draw, ADR 0282), 24.11.2026,
# alese de autor: cotele din parametri (`eliceBarcaCote`: implicitul, plaja, cât urcă fiecare secțiune, butucul cât cel mai
# înalt vârf, ce se întoarce prin API), atelierul (implicitul editorului, piesa din listă fără `pupa` la 0, numele și locul
# lui, textul cu suportul, câmpul cu plaja și rotunjirea lui). Textele în engleză se văd doar în cvs2: lista lor e
# `3.Tt-en.py`.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă, după commit; setul „e2e” e
# `test/e2e/trenulet.pupa.spec.ts` (pagina de sine stătătoare a planificatorului, din aceleași surse).
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
#
# Lăsate afară, ca echivalente (cu motivul): `u > 0 ? h - zmin + u : h - zmin` cu ramura `h - zmin + u` și la 0 (x + 0 dă
# același număr, deci aceeași plasă, la octet); `pupa > 0 ?` din `urca` scos (la 0, tan 0 = 0, deci tot 0); textul după
# `p.pupa` (editorul) în locul lui `c.pupa` (piesa adusă în plajă): câmpul primește doar valori din plajă, deci sunt egale.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


E = 'extensii/trenulet/sursa/lego/lego.ts'
A = 'extensii/trenulet/sursa/planificator/atelier.ts'

# Cotele din parametri: `eliceBarcaCote` (unitare).
K = 'perSuprafata: 12, capac: 1.2, inele: 6, pupaMax: 15 };'
o('M01', E, K, K.replace('pupaMax: 15', 'pupaMax: 20'), 'pupa', 'înclinarea spre pupa până la 20°')
P = 'const pupa = Math.min(BARCA.pupaMax, Math.max(0, nr(d.pupa, 0)));'
o('M02', E, P, P.replace('nr(d.pupa, 0)', 'nr(d.pupa, 5)'), 'pupa', 'implicit înclinată spre pupa cu 5°')
o('M03', E, P, P.replace('Math.max(0,', 'Math.max(-15,'), 'pupa', 'înclinarea spre prova (negativă) primită')
o('M04', E, P, P.replace('Math.min(BARCA.pupaMax,', 'Math.min(BARCA.pupaMax * 2,'), 'pupa', 'plaja dublă')
U = 'const urca = (r: number) => (pupa > 0 ? Math.max(0, r - rh) * Math.tan(pupa * Math.PI / 180) : 0);'
o('M05', E, U, U.replace('pupa > 0 ?', 'pupa > 1 ?'), 'pupa', 'sub 1° nu se ridică nimic')
o('M06', E, U, U.replace('Math.max(0, r - rh)', 'Math.max(0, r - r0)'), 'pupa', 'ridicată de la rădăcina din butuc, nu de la butuc')
o('M07', E, U, U.replace('Math.max(0, r - rh)', 'r'), 'pupa', 'ridicată față de ax: rădăcina pleacă de pe masă')
o('M08', E, U, U.replace('Math.tan(', 'Math.sin('), 'pupa', 'sinusul în locul tangentei')
o('M09', E, U, U.replace('pupa * Math.PI / 180', 'pupa * Math.PI / 200'), 'pupa', 'gradele greșit trecute în radiani')
o('M10', E, U, U.replace('Math.max(0, r - rh) *', 'Math.max(0, r - rh) ** 2 / (R - rh) *'), 'pupa', 'ridicarea pe parabolă, nu pe dreaptă')
S = 'sec: sec.map(([s, h]): P2 => [s, u > 0 ? h - zmin + u : h - zmin])'
o('M11', E, S, S.replace('u > 0 ? h - zmin + u : h - zmin', 'h - zmin'), 'pupa', 'secțiunile nu se ridică (doar butucul crește)')
o('M12', E, S, S.replace('h - zmin + u :', 'h - zmin - u :'), 'pupa', 'secțiunile coboară sub masă')
o('M13', E, S, S.replace('[s, u > 0', '[s + u, u > 0'), 'pupa', 'secțiunile se mută și pe cerc')
H = 'h: Math.max(...sec.map(p => p[1])) - zmin + u };'
o('M14', E, H, H.replace(' - zmin + u };', ' - zmin };'), 'pupa', 'butucul cât secțiunile neridicate (paletele ies peste el)')
o('M15', E, 'return { z, D, R, pd, P, lat, inc, pupa, urca: urca(R), rh,', 'return { z, D, R, pd, P, lat, inc, pupa, urca: urca(R - 0.4), rh,', 'pupa', 'cât urcă vârful, socotit dinaintea vârfului')
o('M16', E, 'inc: q.inc, pupa: q.pupa, urca: q.urca,', 'inc: q.inc, pupa: q.inc, urca: q.urca,', 'pupa', 'API-ul întoarce înclinarea înapoi drept pupa')
o('M17', E, 'inc: q.inc, pupa: q.pupa, urca: q.urca,', 'inc: q.inc, pupa: q.pupa, urca: q.Hh,', 'pupa', 'API-ul întoarce butucul drept cât urcă vârful')

# Atelierul (e2e, pe pagina de sine stătătoare).
o('E01', A, 'inclinare: 20, pupa: 0, sens: "dreapta", gaura: "x", capac: "nu" },', 'inclinare: 20, pupa: 5, sens: "dreapta", gaura: "x", capac: "nu" },', 'e2e', 'editorul pornește înclinat spre pupa')
o('E02', A, 'if (t === "eliceBarca" && !p.pupa) delete p.pupa;', 'if (t === "eliceBarca" && p.pupa === undefined) delete p.pupa;', 'e2e', 'piesa din listă ține `pupa: 0` (nu se mai adună cu una veche)')
o('E03', A, 'if (t === "eliceBarca" && !p.pupa) delete p.pupa;', 'if (t === "eliceBarca") delete p.pupa;', 'e2e', 'înclinarea spre pupa nu ajunge în piesă')
NU = 'const pu = (d.pupa ?? 0) > 0 ? tr`, spre pupa ${d.pupa}°` : "";'
o('E04', A, NU, NU.replace('> 0 ?', '> 5 ?'), 'e2e', 'înclinarea mică nu apare în nume')
o('E05', A, NU, NU.replace('tr`, spre pupa ${d.pupa}°`', 'tr`, spre pupa ${d.inclinare}°`'), 'e2e', 'numele spune înclinarea înapoi')
o('E06', A, '${fmt(d.pas ?? 1, 2)}${l}${i}${pu}${s}${g}${c}`;', '${fmt(d.pas ?? 1, 2)}${l}${pu}${i}${s}${g}${c}`;', 'e2e', 'în nume, spre pupa înaintea înclinării înapoi')
o('E07', A, '${fmt(d.pas ?? 1, 2)}${l}${i}${pu}${s}${g}${c}`;', '${fmt(d.pas ?? 1, 2)}${l}${i}${s}${g}${c}`;', 'e2e', 'numele fără înclinarea spre pupa (două piese diferite, același nume)')
o('E08', A, '    if (c.pupa > 0) return tr`Pasul', '    if (c.pupa > 10) return tr`Pasul', 'e2e', 'textul nu spune de suport la 10°')
o('E09', A, 'urcă de pe masă până la ${fmt(c.urca, 1)} mm la vârf', 'urcă de pe masă până la ${fmt(c.urca, 0)} mm la vârf', 'e2e', 'cât urcă vârful, la întreg')
o('E10', A, 'urcă de pe masă până la ${fmt(c.urca, 1)} mm la vârf', 'urcă de pe masă până la ${fmt(c.Hh - 8, 1)} mm la vârf', 'e2e', 'cât urcă vârful, din butuc')
o('E11', A, 'Înclinată spre pupa cu ${fmt(c.pupa, 0)}°', 'Înclinată spre pupa cu ${fmt(c.inc, 0)}°', 'e2e', 'textul spune înclinarea înapoi')
C = 'camp("#at-eb-pupa", 0, 0, 15, v => { p.pupa = v; });'
o('E12', A, C, C.replace('0, 0, 15', '0, 0, 16'), 'e2e', 'câmpul primește 16°')
o('E13', A, C, C.replace('0, 0, 15', '0, -1, 15'), 'e2e', 'câmpul primește −1°')
o('E14', A, C, C.replace('camp("#at-eb-pupa", 0,', 'camp("#at-eb-pupa", 1,'), 'e2e', 'câmpul cu zecimi')
o('E15', A, C, C.replace('p.pupa = v;', 'p.inclinare = v;'), 'e2e', 'câmpul schimbă înclinarea înapoi')
o('E16', A, C, C.replace('camp("#at-eb-pupa",', 'camp("#at-eb-inc",'), 'e2e', 'câmpul fără legătură (al înclinării înapoi, a doua oară)')
o('E17', A, 'max="15" step="1" value="${p.pupa}"></label>', 'max="15" step="1" value="${p.inclinare}"></label>', 'e2e', 'câmpul arată înclinarea înapoi')
o('E18', A, '<label for="at-eb-pupa">Înclinarea spre pupa (°)<input', '<label for="at-eb-pupa">Înclinarea spre prova (°)<input', 'e2e', 'eticheta câmpului greșită')

SETURI = {
    'pupa': ['test/unit/trenulet.pupa.test.ts'],
    'pupa2': ['test/unit/trenulet.pupa.test.ts', 'test/unit/trenulet.barca.test.ts'],
}
E2E = ['test/e2e/trenulet.pupa.spec.ts']
# pagina și pachetul se fac din surse în spec: build-ul aplicației nu le schimbă (docs/otravuri.md; felia 3.Cm-1)
E2E_BUILD = False

for x in O:
    assert x['vechi'] != x['nou'], x['id']
