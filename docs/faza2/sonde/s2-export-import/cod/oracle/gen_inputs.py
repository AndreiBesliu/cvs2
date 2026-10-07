# gen_inputs.py - genereaza fisiere de INTRARE independente (ezdxf, reportlab; SVG scris de mana) si valorile
# lor pe hartie (expected-import.json). Cititorul JS nu vede nimic din acest cod; compara doar cu JSON-ul.
import json, os
from math import sqrt, pi, cos, sin, radians
import ezdxf
from ezdxf.math import Vec3

HERE = os.path.dirname(os.path.abspath(__file__))
INP = os.path.join(HERE, "..", "inputs")
os.makedirs(INP, exist_ok=True)
EXP = {}

def common_blocks(doc):
    blk = doc.blocks.new("BLK")                       # cerc R10 + linie, pe stratul 0 (mosteneste stratul INSERT-ului)
    blk.add_circle((0, 0), 10, dxfattribs={"layer": "0"})
    blk.add_line((0, 0), (10, 0), dxfattribs={"layer": "0"})
    outer = doc.blocks.new("OUTER")                   # bloc imbricat
    outer.add_blockref("BLK", (10, 0), dxfattribs={"xscale": 0.5, "yscale": 0.5})
    base = doc.blocks.new("BASE", base_point=(5, 5))  # punct de baza diferit de origine
    base.add_circle((5, 5), 3)

def add_inserts(msp):
    msp.add_blockref("BLK", (100, 300), dxfattribs={"xscale": 2, "yscale": 2, "rotation": 30, "layer": "BLOCURI"})
    msp.add_blockref("BLK", (200, 300), dxfattribs={"xscale": 2, "yscale": 1, "rotation": 30, "layer": "BLOCURI"})
    msp.add_blockref("BLK", (300, 300), dxfattribs={"xscale": -1, "yscale": 1, "layer": "BLOCURI"})
    msp.add_blockref("OUTER", (400, 300), dxfattribs={"rotation": 90, "layer": "BLOCURI"})
    msp.add_blockref("BASE", (500, 300), dxfattribs={"layer": "BLOCURI"})

INSERT_EXPECT = {
    # cerc R10 scalat 2 -> R20 la (100,300); linia (0,0)-(10,0) -> (100,300)-(100+20cos30, 300+20sin30)
    "circles": [[[100, 300], 20], [[300, 300], 10], [[400, 310], 5], [[500, 300], 3]],
    "ellipses": [{"c": [200, 300], "a": 20, "b": 10, "rot_deg": 30}],          # scalare neuniforma -> ELIPSA
    "lines": [[[100, 300], [100 + 20 * cos(radians(30)), 300 + 20 * sin(radians(30))]],
              [[300, 300], [290, 300]],                                       # oglindit
              [[400, 310], [400, 315]]],                                      # imbricat: (10,0)+0.5*(0..10,0) rotit 90
}

def gen_r2018():
    doc = ezdxf.new("R2018", setup=False)
    doc.header["$INSUNITS"] = 4
    for name in ("TAIERE", "GRAVARE", "GRAVURĂ", "BLOCURI"):
        doc.layers.add(name)
    common_blocks(doc)
    msp = doc.modelspace()
    msp.add_line((0, 0), (100, 0), dxfattribs={"layer": "GRAVURĂ"})
    msp.add_arc((50, 50), 20, 30, 120, dxfattribs={"layer": "TAIERE"})
    msp.add_circle((200, 50), 25, dxfattribs={"layer": "TAIERE"})
    msp.add_ellipse((300, 50), major_axis=(40 * cos(radians(30)), 40 * sin(radians(30)), 0), ratio=0.5, dxfattribs={"layer": "TAIERE"})
    msp.add_ellipse((400, 50), major_axis=(30, 0, 0), ratio=0.5, start_param=0, end_param=pi / 2, dxfattribs={"layer": "TAIERE"})
    # dreptunghi rotunjit 100x50 R5 ca LWPOLYLINE cu bulge
    b = 0.41421356237309503
    pts = [(505, 0, 0, 0, 0), (595, 0, 0, 0, b), (600, 5, 0, 0, 0), (600, 45, 0, 0, b), (595, 50, 0, 0, 0), (505, 50, 0, 0, b),
           (500, 45, 0, 0, 0), (500, 5, 0, 0, b)]
    msp.add_lwpolyline(pts, format="xyseb", close=True, dxfattribs={"layer": "GRAVARE"})
    # POLYLINE 2D (vechi) cu bulge: jumatate de disc R20, centru (620,0)
    pl = msp.add_polyline2d([(600, 0), (640, 0)], close=True, dxfattribs={"layer": "GRAVARE"})
    pl.vertices[0].dxf.bulge = 0.0
    pl.vertices[1].dxf.bulge = 1.0
    # SPLINE cubica = un Bezier (curba S mutata la (0,200))
    msp.add_open_spline([(0, 200), (50, 260), (100, 140), (150, 200)], degree=3, knots=[0, 0, 0, 0, 1, 1, 1, 1], dxfattribs={"layer": "GRAVARE"})
    # SPLINE B-spline adevarat (noduri simple interioare): 6 puncte de control, noduri uniforme prinse
    msp.add_open_spline([(200, 150), (230, 220), (270, 130), (310, 230), (350, 140), (380, 200)], degree=3,
                        knots=[0, 0, 0, 0, 1, 2, 3, 3, 3, 3], dxfattribs={"layer": "GRAVARE"})
    # SPLINE RATIONALA (NURBS): cerc complet R25 la (500,200), grad 2, 9 puncte de control, ponderi sqrt(2)/2
    w = sqrt(2) / 2
    cx, cy, r = 500, 200, 25
    cps = [(cx + r, cy), (cx + r, cy + r), (cx, cy + r), (cx - r, cy + r), (cx - r, cy), (cx - r, cy - r), (cx, cy - r), (cx + r, cy - r), (cx + r, cy)]
    msp.add_rational_spline(cps, [1, w, 1, w, 1, w, 1, w, 1], degree=2, knots=[0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4], dxfattribs={"layer": "GRAVARE"})
    # ARC cu extrudare (0,0,-1): in OCS centru (50,100), R10, 0->90 => in WCS centru (-50,100), de la 90 la 180 grade
    msp.add_arc((50, 100), 10, 0, 90, dxfattribs={"layer": "TAIERE", "extrusion": (0, 0, -1)})
    add_inserts(msp)
    msp.add_text("ABC", dxfattribs={"layer": "GRAVARE", "insert": (0, -50), "height": 5})
    doc.saveas(os.path.join(INP, "in-R2018-mm.dxf"))
    EXP["in-R2018-mm.dxf"] = {
        "units_to_mm": 1.0,
        "layers": ["TAIERE", "GRAVARE", "GRAVURĂ", "BLOCURI"],
        "lines": [[[0, 0], [100, 0]]] + INSERT_EXPECT["lines"],
        "arcs": [{"c": [50, 50], "r": 20, "p0": [50 + 20 * cos(radians(30)), 50 + 20 * sin(radians(30))], "p1": [50 + 20 * cos(radians(120)), 50 + 20 * sin(radians(120))]},
                 {"c": [-50, 100], "r": 10, "p0": [-60, 100], "p1": [-50, 110], "nota": "OCS (0,0,-1): oglindit"}],
        "circles": [[[200, 50], 25], [[500, 200], 25, "NURBS rational"]] + INSERT_EXPECT["circles"],
        "ellipses": [{"c": [300, 50], "a": 40, "b": 20, "rot_deg": 30}] + INSERT_EXPECT["ellipses"],
        "ellipse_arcs": [{"c": [400, 50], "a": 30, "b": 15, "p0": [430, 50], "p1": [400, 65]}],
        "closed_areas": [{"what": "dreptunghi rotunjit 100x50 R5", "area": 5000 - (4 - pi) * 25, "bbox": [500, 0, 600, 50]},
                         {"what": "semidisc R20 (POLYLINE vechi)", "area": pi * 400 / 2, "bbox": [600, 0, 640, 20]}],
        "bezier": {"P": [[0, 200], [50, 260], [100, 140], [150, 200]], "at03": [45, 215.12]},
        "bspline": {"cp": [[200, 150], [230, 220], [270, 130], [310, 230], [350, 140], [380, 200]], "knots": [0, 0, 0, 0, 1, 2, 3, 3, 3, 3], "degree": 3},
        "skipped": ["TEXT"],
    }

def gen_r2000_inch():
    doc = ezdxf.new("R2000", setup=False)
    doc.header["$INSUNITS"] = 1   # toli
    doc.header["$MEASUREMENT"] = 0
    msp = doc.modelspace()
    msp.add_line((0, 0), (1, 0))
    msp.add_circle((2, 0), 0.5)
    msp.add_arc((4, 0), 1, 0, 90)
    doc.saveas(os.path.join(INP, "in-R2000-inch.dxf"))
    EXP["in-R2000-inch.dxf"] = {"units_to_mm": 25.4, "lines": [[[0, 0], [25.4, 0]]], "circles": [[[50.8, 0], 12.7]],
                                "arcs": [{"c": [101.6, 0], "r": 25.4, "p0": [127.0, 0], "p1": [101.6, 25.4]}]}

def gen_r12():
    doc = ezdxf.new("R12", setup=False)
    for name in ("TAIERE", "BLOCURI"):
        doc.layers.add(name)
    blk = doc.blocks.new("BLK")
    blk.add_circle((0, 0), 10, dxfattribs={"layer": "0"})
    blk.add_line((0, 0), (10, 0), dxfattribs={"layer": "0"})
    msp = doc.modelspace()
    msp.add_line((0, 0), (100, 0), dxfattribs={"layer": "TAIERE"})
    msp.add_arc((50, 50), 20, 30, 120, dxfattribs={"layer": "TAIERE"})
    msp.add_circle((200, 50), 25, dxfattribs={"layer": "TAIERE"})
    pl = msp.add_polyline2d([(600, 0), (640, 0)], close=True, dxfattribs={"layer": "TAIERE"})
    pl.vertices[1].dxf.bulge = 1.0
    msp.add_blockref("BLK", (100, 300), dxfattribs={"xscale": 2, "yscale": 2, "rotation": 30, "layer": "BLOCURI"})
    msp.add_blockref("BLK", (200, 300), dxfattribs={"xscale": 2, "yscale": 1, "rotation": 30, "layer": "BLOCURI"})
    doc.saveas(os.path.join(INP, "in-R12.dxf"))
    EXP["in-R12.dxf"] = {"units_to_mm": 1.0, "layers": ["TAIERE", "BLOCURI"],
                         "lines": [[[0, 0], [100, 0]], INSERT_EXPECT["lines"][0]],
                         "arcs": [{"c": [50, 50], "r": 20, "p0": [50 + 20 * cos(radians(30)), 50 + 20 * sin(radians(30))], "p1": [50 + 20 * cos(radians(120)), 50 + 20 * sin(radians(120))]}],
                         "circles": [[[200, 50], 25], [[100, 300], 20]],
                         "ellipses": [INSERT_EXPECT["ellipses"][0]],
                         "closed_areas": [{"what": "semidisc R20 (POLYLINE R12)", "area": pi * 400 / 2, "bbox": [600, 0, 640, 20]}]}

def gen_pdf():
    # reportlab (BSD): 3 pagini, coordonate in pt; valorile pe hartie in mm
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import mm
    p = os.path.join(INP, "in-3pagini.pdf")
    c = canvas.Canvas(p, pagesize=(200 * mm, 100 * mm))
    c.setLineWidth(0.5)
    c.circle(50 * mm, 50 * mm, 25 * mm)                       # p1: cerc R25 la (50,50) mm (reportlab: 4 Bezier)
    c.line(100 * mm, 10 * mm, 190 * mm, 10 * mm)              # p1: linie 90 mm
    c.showPage()
    c.saveState(); c.translate(100 * mm, 50 * mm); c.rotate(30)  # p2: dreptunghi 40x20 mm rotit 30 in jurul (100,50)
    c.rect(-20 * mm, -10 * mm, 40 * mm, 20 * mm); c.restoreState()
    c.showPage()
    path = c.beginPath(); path.moveTo(10 * mm, 50 * mm)           # p3: Bezier cu puncte de control cunoscute
    path.curveTo(60 * mm, 110 * mm, 110 * mm, -10 * mm, 160 * mm, 50 * mm); c.drawPath(path, stroke=1, fill=0)
    c.line(0.01 * mm, 0.01 * mm, 2439.99 * mm / 20, 0.01 * mm)  # linie lunga-ish si coordonate mici
    c.showPage(); c.save()
    EXP["in-3pagini.pdf"] = {
        "pages": 3,
        "p1": {"circle": {"c": [50, 50], "r": 25}, "line": [[100, 10], [190, 10]]},
        "p2": {"rect_corners": [[100 + x * cos(radians(30)) - y * sin(radians(30)), 50 + x * sin(radians(30)) + y * cos(radians(30))]
                                 for x, y in ((-20, -10), (20, -10), (20, 10), (-20, 10))]},
        "p3": {"bezier": [[10, 50], [60, 110], [110, -10], [160, 50]], "line": [[0.01, 0.01], [121.9995, 0.01]]},
    }

def gen_svg():
    # SVG scrise de mana; valorile pe hartie in mm, Y IN SUS (y_mm = inaltime - y_svg_mm)
    s1 = '''<svg xmlns="http://www.w3.org/2000/svg" width="200mm" height="100mm" viewBox="0 0 2000 1000">
  <circle cx="1000" cy="500" r="250"/>
  <rect x="100" y="100" width="400" height="200" rx="50"/>
  <path d="M 1500 900 a 200 200 0 0 0 400 0"/>
</svg>'''
    open(os.path.join(INP, "in-unitati.svg"), "w").write(s1)
    s2 = '''<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="100mm" viewBox="0 0 100 100">
  <g transform="translate(50,50) rotate(30)"><circle r="10"/></g>
  <g transform="translate(20,80)"><g transform="scale(2,1)"><circle r="5"/></g></g>
  <ellipse cx="70" cy="30" rx="20" ry="10" transform="rotate(45 70 30)"/>
  <path d="M10,10 A20,20 0 0,1 30,30" transform="matrix(-1 0 0 1 100 0)"/>
  <path d="M10,60 c10,-20 30,-20 40,0 s30,20 40,0"/>
  <g transform="skewX(30)"><circle cx="10" cy="95" r="2"/></g>
</svg>'''
    open(os.path.join(INP, "in-transformari.svg"), "w").write(s2)
    s3 = '''<svg xmlns="http://www.w3.org/2000/svg" width="2in" height="1in" viewBox="0 0 200 100">
  <line x1="0" y1="50" x2="100" y2="50"/>
</svg>'''
    open(os.path.join(INP, "in-toli.svg"), "w").write(s3)
    s4 = '''<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
  <line x1="0" y1="48" x2="96" y2="48"/>
</svg>'''
    open(os.path.join(INP, "in-px.svg"), "w").write(s4)
    c30, s30 = cos(radians(30)), sin(radians(30))
    EXP["in-unitati.svg"] = {"circles": [[[100, 50], 25]],
                             "closed_areas": [{"what": "rect 40x20 R5", "area": 800 - (4 - pi) * 25, "bbox": [10, 70, 50, 90]}],
                             "arcs": [{"c": [170, 10], "r": 20, "p0": [150, 10], "p1": [190, 10], "mid": [170, -10]}]}
    EXP["in-transformari.svg"] = {
        "circles": [[[50, 50], 10]],
        "ellipses": [{"c": [20, 20], "a": 10, "b": 5, "rot_deg": 0}, {"c": [70, 70], "a": 20, "b": 10, "rot_deg": -45}],
        # arcul oglindit: original din (10,10) in (30,30) R20; matrix(-1 0 0 1 100 0) -> din (90,10) in (70,30) (Y in jos)
        "arcs": [{"r": 20, "p0": [90, 90], "p1": [70, 70]}],
        # c relativ + s reflectat: puncte absolute (Y in jos): (10,60) (20,40) (40,40) (50,60) ; (60,80) (80,80) (90,60)
        "beziers": [[[10, 40], [20, 60], [40, 60], [50, 40]], [[50, 40], [60, 20], [80, 20], [90, 40]]],
        "skew_circle": {"nota": "skewX(30) pe cerc => elipsa; verificata cu svgelements"},
    }
    EXP["in-toli.svg"] = {"lines": [[[0, 12.7], [25.4, 12.7]]]}
    EXP["in-px.svg"] = {"lines": [[[0, 12.7], [25.4, 12.7]]]}

if __name__ == "__main__":
    gen_r2018(); gen_r2000_inch(); gen_r12(); gen_pdf(); gen_svg()
    # audit pe intrarile generate (sunt valide?)
    for f in ("in-R2018-mm.dxf", "in-R2000-inch.dxf", "in-R12.dxf"):
        d = ezdxf.readfile(os.path.join(INP, f)); a = d.audit()
        print(f, d.dxfversion, "audit erori:", len(a.errors))
    json.dump(EXP, open(os.path.join(INP, "expected-import.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print("scris", len(EXP), "seturi de valori pe hartie")
