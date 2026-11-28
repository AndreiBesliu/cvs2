# ADR 0341: Ventilatorul în „Modelul”: a cincea construcție gata, cu trusa prinsă

**Starea:** propus pe 28.11.2026 de linia atelierului și implementat în aceeași zi (felia 3.Cn, mai jos), la cuvântul owner-ului transmis de sesiunea principală
(„Porneste sesiunile, pune-le sa continue cu ce aveau la rand”), cu felia aleasă de linie din ce rămăsese deschis.
Merge înainte cu recomandările de mai jos (regula din 27.11: o alegere a owner-ului se pune grupat, cu recomandarea în
față, iar linia merge înainte cu recomandarea), până la cuvântul lui. Felia 3.Cn a liniei atelierului (ramura
`wip/3.Xh-biblioteca-ui`).
**Continuă:** ADR 0284, partea E (construcțiile gata, 3.Ci), ADR 0283 (piesele rotunde pe același ax în „Modelul”,
3.Tu) și ADR 0340 (ventilatorul ca trusă, 3.Cm-3). **Pleacă de la:** auditul elicelor (`docs/linii/audit-elice.md`,
constatarea 4: „Odată cu 3.Tu, «Fă ventilatorul» ar putea pune perechea și în model, coaxial”) și de la ADR 0283, care
lăsa asta deschis („«Fă ventilatorul» pune perechea în lista de printat, nu și în model”).

## Contextul

Azi, „Fă ventilatorul” pune rotorul și carcasa (și, cu bifa „Și trusa”, grinda, axul, jumătatea de bucșă și cele două
știfturi) doar în lista de printat. În „Modelul”, omul trebuie să le pună una câte una: „Pune în model” cu carcasa aleasă
pune rotorul pe același ax (3.Tu), dar grinda, știfturile, axul și bucșa trebuie așezate de mână, cu alipirea (3.Cf-1).
Construcțiile gata (3.Ci) fac exact asta pentru șasiu, cutia de angrenaje, macara și barcă: piesele din parametri, prinse
prindere în prindere, verificate (3.Cg).

## Decizia (cu recomandările aplicate)

1. **Unde:** a cincea construcție gata, **„Ventilatorul”**, în panoul „Construcții gata” din „Modelul”, cu câmpurile lui
   (diametrul, paletele, urechile). În editorul ventilatorului, lângă „Fă ventilatorul”, butonul **„Fă-l în model”**
   deschide aceeași construcție, cu toate valorile din editor (diametrul, paletele, jocul, pasul, lățimea, sensul, gaura,
   inelul, urechile).
   *Alternative:* doar în panou; doar butonul din editor.
2. **Ce piese:** **trusa întreagă, prinsă**: grinda cu 2k + 1 găuri pe grilă; câte un știft Technic în prima și în ultima
   gaură; carcasa pe știfturi, cu urechile în găurile lor, deci cu axul peste gaura din mijloc; axul prin gaura din mijloc a
   grinzii (rotundă: axul se rotește în ea), cu capătul de jos la fața de jos a grinzii; jumătatea de bucșă pe ax, pe fața
   de sus a grinzii; rotorul pe ax, deasupra bucșei, cu paletele în tub. Cotele sunt cele ale trusei din 3.Cm-3
   (`ventilatorTrusa`).
   *Alternativa:* doar carcasa și rotorul, coaxiale (rotorul ar pluti: verificarea l-ar spune).
3. **Ca o construcție nouă**, ca celelalte șabloane (numele „Ventilator”, apoi „Ventilator 2”…), nu adăugat în construcția
   deschisă.
   *Alternativa:* pus în construcția deschisă, lângă ce e acolo.

## Ce se probează (pe plase, întâi)

- verificarea din 3.Cg: fiecare piesă prinsă, niciuna nu intră în alta, niciuna nu plutește, un singur grup, cea mai de
  jos piesă atinge masa;
- pe hârtie: axul rotorului, al axului și al carcasei sunt pe aceeași dreaptă, deasupra găurii din mijloc a grinzii (la
  8 · k mm de prima gaură); rotorul stă la grosimea grinzii plus bucșa (3,8 mm) peste fața ei de sus; urechile carcasei,
  peste găurile 0 și 2k; paletele rotorului rămân în tub (raza lor, sub raza dinăuntru a carcasei);
- cu 2 și cu 4 urechi, pe diametrele trusei, și cu valorile din editor.

## Ce nu face

Nu schimbă nicio piesă (amprentele plaselor rămân), nici lista de printat a lui „Fă ventilatorul” (bifa „Și trusa”
rămâne cum e). Nimic în aplicație, nimic pe server: doar pachetul extensiei (Easy 3Draw 18.51.0).

## Implementarea (3.Cn, 28.11)

- **Motorul** (`extensii/trenulet/sursa/lego/lego.ts`): al cincilea șablon din `SABLOANE`, `constructieGata("ventilator")`. Grinda
  groasă de 2k + 1 găuri pe grilă; câte un știft Technic (cu fantă, lung de 2) în gaura 0 și în gaura 2k, prins de sus; carcasa
  pe știftul din stânga, prinsă cu urechea ei de pe −x (căutată după axa plasei, `corp.ax`, nu după originea locală), deci cu
  cealaltă ureche pe al doilea știft; axul cel mai scurt al trusei, prins de jos în gaura din mijloc; jumătatea de bucșă și
  rotorul alunecate pe ax (`alunec`) până la cotele trusei (`ventilatorTrusa`: fața de sus a grinzii, apoi bucșa, apoi `jos`
  și butucul). Știftul Technic iese 0,1 mm sub grindă, deci baza se ridică singură cu o placă (3,2 mm).
- **Valorile duse în margini se spun:** diametrul și paletele prin `ventilatorCote` (cu mesajele lui); gaura rotorului trebuie să
  meargă pe ax (de ax sau rotundă), iar alta devine de ax, cu mesaj.
- **Atelierul** (`planificator/atelier.ts`): „Ventilator” în „Construcții gata”, cu diametrul (24–120), paletele (3–12) și
  urechile (2 sau 4), și textul „Grinda are … găuri, axul … știfturi”; în editorul ventilatorului, sub „Fă ventilatorul”, rândul
  „Fă-l în model”: duce în șablon toate valorile editorului (diametrul, paletele, jocul, pasul, lățimea, sensul, gaura, inelul,
  urechile), face construcția nouă și trece în „Modelul”.
- **Probele**, scrise întâi: `test/unit/trenulet.sabloane.ventilator.test.ts` (5 teste: implicitul, Ø48 cu 4 urechi, valorile
  editorului pe piese, marginile și mesajele, controlul negativ cu o carcasă prea îngustă), `test/e2e/trenulet.sabloane.spec.ts`
  (panoul și butonul din editor), engleza în `test/e2e/trenulet.spec.ts`. Otrăvurile: `test/otravuri/3.Cn.py`, 24 / 24 (23 / 24 la prima rulare: A08, prinsă după ce proba e2e pornește cu panoul pe șasiu).
- Nicio piesă schimbată; lista de printat a lui „Fă ventilatorul”, neschimbată. Easy 3Draw 18.51.0.
