"""Construieste planificatorul dintr-o singura pagina (ca pe claude.ai si in Apps\\Trenulet\\planificator):
   iesire/planificator.html  continutul paginii (asa se publica pe claude.ai; acolo pagina primeste scheletul html)
   iesire/preview.html       documentul intreg (merge deschis direct din fisier; asta e copia de pe PC)
   python3 build.py"""
import json, os
R = os.path.dirname(os.path.abspath(__file__))
c = lambda *p: open(os.path.join(R, *p), encoding='utf-8').read()
d = 'planificator'
cat = json.loads(c(d, 'catalog.json'))
js = c(d, 'app.js').replace('/*CATALOG*/null', json.dumps(cat, separators=(',', ':'), ensure_ascii=False))
cav = c('vendor', 'cavalier.min.js').strip()
ear = c('vendor', 'earcut.min.js').strip()
cnc, gc, lego, prof, at = c(d, 'cnc.js'), c(d, 'gcode.js'), c('lego', 'lego.js'), c(d, 'profiluri.js'), c(d, 'atelier.js')
LIC = ("/*! cavalier-contours-js 0.1.1 (portul TypeScript al bibliotecii cavalier_contours, adus in cvs2: src/geom/cavalier).\n"
       " * Licenta: MIT OR Apache-2.0. Copyright (c) 2021 Jedidiah Buck McCready (cavalier_contours) si msurguy (portul JS).\n"
       " * Textul licentei MIT: https://opensource.org/license/mit ; Apache 2.0: https://www.apache.org/licenses/LICENSE-2.0 */\n")
EAR = ("/*! earcut 2.2.4 (Mapbox): triangularea poligoanelor cu gauri, pentru fetele pieselor cu gauri din atelierul 3D.\n"
       " * Licenta ISC. Copyright (c) 2016, Mapbox. Permission to use, copy, modify, and/or distribute this software for any purpose\n"
       " * with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all\n"
       " * copies. THE SOFTWARE IS PROVIDED \"AS IS\" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE. */\n")
for x in (cav, ear, cnc, gc, lego, prof, at, js): assert '</script' not in x.lower()
s = lambda t: "<script>\n" + t + "\n</script>\n"
page = (c(d, 'head.html') + "\n" + c(d, 'body.html') + "\n" + s(LIC + cav + ";window.Cavalier=Cavalier;") + s(cnc) + s(gc) + s(EAR + ear) + s(lego) + s(prof) + s(at) + s(js))
os.makedirs(os.path.join(R, 'iesire'), exist_ok=True)
open(os.path.join(R, 'iesire', 'planificator.html'), 'w', encoding='utf-8').write(page)
doc = ('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
       '<style>*,*::before,*::after{box-sizing:border-box}body{margin:0}</style></head><body>' + page + '</body></html>')
open(os.path.join(R, 'iesire', 'preview.html'), 'w', encoding='utf-8').write(doc)
print('iesire/planificator.html', len(page), 'caractere')
