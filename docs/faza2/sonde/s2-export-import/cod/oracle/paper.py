# paper.py - valori "pe hartie" pentru desenul de referinta si corpus, scrise DE MANA din formule.
# Nu importa nimic din scriitorul JS. Unitati: mm, Y in sus.
from math import pi, sqrt, cos, sin, radians

S3 = sqrt(3.0)
c30, s30 = cos(radians(30)), sin(radians(30))

REF = {
    "page": (400.0, 300.0),
    "layers": {"DECUPARE", "GRAVARE"},
    "circle": {"c": (70.0, 227.0), "r": 50.0, "area": pi * 2500.0, "len": 100.0 * pi},
    "rrect": {
        "area": 20000.0 - (4.0 - pi) * 100.0,
        "len": 2.0 * (180.0 + 80.0) + 2.0 * pi * 10.0,
        # semi-extinderi: dreptunghiul interior 180x80 rotit 30, plus R
        "bbox": (270.0 - (90 * c30 + 40 * s30 + 10), 200.0 - (90 * s30 + 40 * c30 + 10),
                 270.0 + (90 * c30 + 40 * s30 + 10), 200.0 + (90 * s30 + 40 * c30 + 10)),
        "arc_centers": [(270.0 + 90 * c30 - 40 * s30, 200.0 + 90 * s30 + 40 * c30),
                        (270.0 - 90 * c30 - 40 * s30, 200.0 - 90 * s30 + 40 * c30),
                        (270.0 - 90 * c30 + 40 * s30, 200.0 - 90 * s30 - 40 * c30),
                        (270.0 + 90 * c30 + 40 * s30, 200.0 + 90 * s30 - 40 * c30)],
        "r": 10.0, "bulge": 0.41421356237309503,  # tan(22.5 grade)
    },
    "ellipse": {"c": (75.0, 95.0), "a": 60.0, "b": 30.0, "rot_deg": 20.0, "area": pi * 1800.0},
    "scurve": {"P": [(160.0, 60.0), (210.0, 120.0), (260.0, 0.0), (310.0, 60.0)],
               "at03": (205.0, 75.12),             # x = 160 + 150 t ; y = 60 + 180 t(1-t)(1-2t)
               "bbox": (160.0, 60.0 - 10 * S3, 310.0, 60.0 + 10 * S3)},
    "text": {"string": "CNC 20 mm", "x0": 20.0, "baseline": 15.0, "cap_mm": 20.0},
}

def ellipse_perimeter(a, b):  # Ramanujan II; eroare relativa < 1e-10 pentru b/a = 0,5
    h = ((a - b) / (a + b)) ** 2
    return pi * (a + b) * (1 + 3 * h / (10 + sqrt(4 - 3 * h)))

REF["ellipse"]["len"] = ellipse_perimeter(60.0, 30.0)
_ea, _eb, _er = 60.0, 30.0, radians(20)
_hx = sqrt((_ea * cos(_er)) ** 2 + (_eb * sin(_er)) ** 2)
_hy = sqrt((_ea * sin(_er)) ** 2 + (_eb * cos(_er)) ** 2)
REF["ellipse"]["bbox"] = (75.0 - _hx, 95.0 - _hy, 75.0 + _hx, 95.0 + _hy)

# Corpus de stres
CORPUS = {
    "circles": [((1220.0, 610.0), 600.0), ((2000.005, 1000.003), 0.01), ((900.0, 300.0), 20.0), ((940.0, 300.0), 20.0),
                ((1200.0, 300.0), 20.0), ((600.0, 300.0), 30.0)],
    # arce: centru, raza, start, final (grade, sens CCW cum le cere DXF ARC)
    "arcs": [((300.0, 300.0), 40.0, 10.0, 40.0), ((300.0, 300.0), 50.0, 50.0, 95.0), ((300.0, 300.0), 60.0, 100.0, 160.0),
             ((300.0, 300.0), 70.0, 170.0, 260.0), ((300.0, 300.0), 80.0, 180.0, 300.0), ((300.0, 500.0), 30.0, 0.0, 359.0),
             ((1500.0, 300.0), 40.0, 90.0, 180.0)],  # ultimul = arcul oglindit (era 0..90, oglindit fata de x=1500)
    "lines": [((100, 100), (100.01, 100)), ((1000, 100), (1100, 100)), ((1000, 100), (1100, 100)),
              ((1150, 320.001), (1250, 320.001))],
    "square_hole_area": 10000.0 - pi * 900.0,
    "ellipse": {"c": (1800.0, 300.0), "a": 75.0, "b": 50.0, "rot_deg": 30.0},
}
