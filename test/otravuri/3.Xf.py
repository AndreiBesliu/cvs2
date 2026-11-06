# Lista de otrăvuri a feliei 3.Xf („pornit” abia după pagina extensiei, ADR 0139), 06.11.2026, alese de autor: cele două
# cauze ale căderii din CI-ul complet, fiecare singură (intrarea planificatorului care nu-și întoarce pagina; starea ferestrei
# de dinainte, arătată la redeschidere) și versiunea pachetului.
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


o('X01', 'extensii/trenulet/intrare.ts', '      return (async () => {\n        const corp = host.fisier(\'body.html\');',
  '      void (async () => {\n        const corp = host.fisier(\'body.html\');', 'e2e',
  'intrarea planificatorului nu-și mai întoarce pagina: „pornit” pleacă înaintea ei')
o('X02', 'src/extensii/Extensii.tsx', '  if (stareaCui.deschisa !== deschisa || stareaCui.pornire !== pornire) {', '  if (false) {', 'e2e',
  'fereastra redeschisă arată, un cadru, „pornit” al celei de dinainte')
o('X03', 'extensii/trenulet/extensie.json', '"versiune": "18.7.1",', '"versiune": "18.7.0",', 'e2e',
  'pachetul schimbat păstrează versiunea veche')

SETURI = {}
E2E = ['test/e2e/trenulet.spec.ts']
