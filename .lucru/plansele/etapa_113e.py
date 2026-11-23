# Rândul feliei 11.3↑e în fișa etapei 3 și traducerea lui. Folosire: python -B -X utf8 etapa_113e.py "<ora>" "<otrăvurile>"
import json, pathlib, subprocess, sys
ora, otr = sys.argv[1], sys.argv[2]
R = pathlib.Path(r'C:\Users\besli\cncvs2-lucru\plansele')
p = R / 'docs/etape/etapa-03.md'
t = p.read_bytes().decode('utf-8')
linii = t.split('\n')
ix = [i for i, l in enumerate(linii) if l.startswith('| 11.3↑d |')]
assert len(ix) == 1 and not any(l.startswith('| 11.3↑e |') for l in linii)
RO = ('| 11.3↑e | 22.11 21:34 | 22.11 ' + ora + ' | 1 | **Urechile „unde ține”** (ADR 0211, varianta b; documentul tot v26). '
      'În fereastra exportului, „Locurile” au și „unde ține”: la fiecare export, pe fiecare copie, aplicația taie întâi programul '
      'cu aceste operații fără urechi, se uită la fundul foii (lemnul legat de margine, ca proba de la 11.3↑c) și pune urechile '
      'unde palierul, dus cât freza dincolo de tăietură, cade pe lemn legat (pe dinăuntru, pe piesă): câte cere numărul, cât mai '
      'departe una de alta; cu lemn de jur împrejur, chiar cele egale, octet cu octet. Mai puține: un avertisment. Lângă '
      'avertismentul pieselor desprinse, „Pune urechile unde țin” trece rândurile lor; cu „Arată traseul”, urechile puse se văd '
      'pe drum. Pe placa 11 la 5 mm cad doar plăcuțele înconjurate de vecine (3 + 1, față de 9 + 4), iar la 10 mm programele '
      'plăcii rămân. Otrăvurile: ' + otr + '. |')
linii.insert(ix[0] + 1, RO)
p.write_bytes('\n'.join(linii).encode('utf-8'))
print('ok etapa')
