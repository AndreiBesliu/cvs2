# Lista de otrăvuri a feliei 3.U (degajările aceleiași bucle, ADR 0134), 04.11.2026, alese de autor: condiția d (segmentele
# din V sărite, pragul trecerii, marja, mijlocul golului, K, conturul socotit K), condiția e (pragul, mijlocul perechii, K,
# conturul socotit în afara lui K, cutiile) și legarea lor în exportul lucrării (ordinea motivelor, candidații aceleiași
# bucle, pragul D + 1).
# Se rulează cu `scripts/otravuri.py` (docs/otravuri.md), dintr-o clonă în afara Drive-ului, după commit.
# o(id, fis, vechi, nou, set, ce): `vechi` apare EXACT o dată în fișier; altfel VOID.
O = []


def o(id, fis, vechi, nou, set, ce):
    O.append(dict(id=id, fis=fis, vechi=vechi, nou=nou, set=set, ce=ce))


DG = 'src/cam/degajari.ts'
JB = 'src/cam/job.ts'

# d: pereții piesei (ADR 0134 §2).
o('P01', DG, '    if (i >= 0 && (k === i || k === (i - 1 + n) % n)) continue;', '    if (i >= 0 && k === i) continue;', 'degajari',
  'segmentul care intră în V e judecat ca perete din față')
o('P02', DG, '    if (i >= 0 && (k === i || k === (i - 1 + n) % n)) continue;', '    if (i >= 0 && (k === (i + 1) % n || k === (i - 1 + n) % n)) continue;', 'degajari',
  'se sare segmentul de după, nu cel care pleacă din V')
o('P03', DG, '    if (a.distanta < R - EPS_PERETE) return false;', '    if (a.distanta < 0) return false;', 'degajari',
  'discul care trece de peretele din față nu oprește nimic (rămâne doar proba golului)')
o('P04', DG, '    if (a.distanta >= R + marja) continue;', '    if (a.distanta >= R) continue;', 'degajari', 'fără marja de 1 mm: golul subțire nu se mai probează')
o('P05', DG, '    const t = (R + a.distanta) / 2 / a.distanta;', '    const t = R / a.distanta;', 'degajari', 'proba la marginea discului, nu în mijlocul golului')
o('P06', DG, '    if (distantaLaContur(m, element) <= PE_CONTUR || inK(m, element, latura)) return false;',
  '    if (distantaLaContur(m, element) <= PE_CONTUR || !inK(m, element, latura)) return false;', 'degajari', 'K inversat la d: golul prin deșeu oprește')
o('P07', DG, '    if (distantaLaContur(m, element) <= PE_CONTUR || inK(m, element, latura)) return false;',
  '    if (inK(m, element, latura)) return false;', 'degajari', 'la d, mijlocul de pe contur nu mai e K (discul care atinge peretele trece)')
o('P08', DG, '    if (distantaCutii(cd, x.cutie) >= R + marja) continue;', '    if (distantaCutii(cd, x.cutie) >= R) continue;', 'degajari',
  'cutiile sar și pereții din banda R … R + 1')
# e: degajările aceleiași bucle (ADR 0134 §3).
o('E01', DG, '  if (!(a.distanta < prag)) return false;', '  if (!(a.distanta < prag - 1)) return false;', 'degajari', 'pragul e D, nu D + 1')
o('E02', DG, '  const m = { x: (a.p.x + a.q.x) / 2, y: (a.p.y + a.q.y) / 2 };', '  const m = a.p;', 'degajari', 'proba în capătul perechii, nu în mijloc')
o('E03', DG, '  return distantaLaContur(m, element) > PE_CONTUR && inK(m, element, latura);', '  return inK(m, element, latura);', 'degajari',
  'la e, mijlocul de pe contur e K (mortiza scurtă își pierde degajările)')
o('E04', DG, '  return distantaLaContur(m, element) > PE_CONTUR && inK(m, element, latura);', '  return distantaLaContur(m, element) > PE_CONTUR;', 'degajari',
  'la e, orice mijloc în afara conturului oprește (și cel din deșeu)')
o('E05', DG, '  if (distantaCutii(cutieDrum(x), cutieDrum(y)) >= prag) return false;', '  if (distantaCutii(cutieDrum(x), cutieDrum(y)) >= prag - 1) return false;',
  'degajari', 'cutiile sar perechile din banda D … D + 1')
o('E06', DG, "  return inRegiune(p, [element]) === (latura === 'exterior');", "  return inRegiune(p, [element]) === (latura === 'interior');", 'degajari',
  'K e partea deșeului (ambele condiții)')
# Legarea în export (ADR 0134 §1, §3).
o('J01', JB, "                : !x.pereti ? 'prea aproape de alt perete al piesei'\n", '', 'degajari', 'd nu mai oprește nimic')
o('J02', JB, "                  : !departeDeColturi(x, it) ? 'prea aproape de degajarea altui colț al buclei' : null;", '                  : null;', 'degajari',
  'e nu mai oprește nimic')
o('J03', JB, '    return (candidati[iu] ?? []).every((y) => y === x || y.j !== x.j || !y.departe || !materialIntre(x.d, y.d, element, latura, prag));',
  '    return (candidati[iu] ?? []).every((y) => y === x || y.j !== x.j || !materialIntre(x.d, y.d, element, latura, prag));', 'degajari',
  'la e, și colțurile care cad pe a îi opresc pe vecini')
o('J04', JB, '    return (candidati[iu] ?? []).every((y) => y === x || y.j !== x.j || !y.departe || !materialIntre(x.d, y.d, element, latura, prag));',
  '    return (candidati[iu] ?? []).every((y) => y.j !== x.j || !y.departe || !materialIntre(x.d, y.d, element, latura, prag));', 'degajari',
  'la e, colțul se judecă și cu el însuși')
o('J05', JB, '    const prag = pragDe(iu), latura = u.latura;', '    const prag = (u.scula.diametru ?? 0), latura = u.latura;', 'degajari',
  'la e, pragul e D, fără marja de 1 mm')
o('J06', JB, '      rez.push({ d, j, drum, cutie, departe, pereti: departeDePereti(element, u.latura, R, d, MARJA_SCHELET, segmente) });',
  '      rez.push({ d, j, drum, cutie, departe, pereti: departeDePereti(element, u.latura, R, d, 0, segmente) });', 'degajari', 'la d, fără marja de 1 mm')


SETURI = {
    'degajari': ['test/unit/cam.degajari.bucla.test.ts', 'test/unit/degajari.bucla.oracol.test.ts'],
    'degajari2': [
        'test/unit/cam.degajari.bucla.test.ts', 'test/unit/degajari.bucla.oracol.test.ts', 'test/unit/cam.degajari.test.ts',
        'test/unit/degajari.oracol.test.ts', 'test/unit/degajari.corpus.oracol.test.ts',
    ],
}
