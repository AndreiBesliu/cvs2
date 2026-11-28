# ADR 0341: Ventilatorul în „Modelul”: a cincea construcție gata, cu trusa prinsă

**Starea:** propus pe 28.11.2026 de linia atelierului, la cuvântul owner-ului transmis de sesiunea principală
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
