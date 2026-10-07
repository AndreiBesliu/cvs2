# check_import.py - ORACOLUL de import: compara modelul produs de cititorii JS (out/import-model.json) cu valorile
import sys
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass
# pe hartie (inputs/expected-import.json, scrise de mana in gen_inputs.py), cu ezdxf (B-spline) si cu
# svgelements / PyMuPDF (citiri independente ale acelorasi fisiere).
import json, os
from math import pi, hypot, cos, sin, radians, degrees, atan2
import numpy as np
import ezdxf
from paper import REF
from geo import line_curve, arc_curve, ellipse_curve, bezier_curve, bbox_of, max_dist_points_to_curves

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "out"); INP = os.path.join(HERE, "..", "inputs")
M = json.load(open(os.path.join(OUT, "import-model.json"), encoding="utf-8"))
E = json.load(open(os.path.join(INP, "expected-import.json"), encoding="utf-8"))
results = []
def check(name, ok, detail=""):
    results.append({"check": name, "ok": bool(ok), "detail": detail})
def d2(a, b): return hypot(a[0] - b[0], a[1] - b[1])

def curve(s):
    k = s["k"]
    if k == "line": return line_curve(s["a"], s["b"])
    if k == "arc": return arc_curve(s["c"], s["r"], s["a0"], s["da"])
    if k == "earc":
        return ellipse_curve(s["c"], (s["rx"] * cos(s["rot"]), s["rx"] * sin(s["rot"])), s["ry"] / s["rx"], s["t0"], s["t0"] + s["dt"])
    return bezier_curve(s["p"])
def ends(s):
    c = curve(s); P = c.f(np.array([0.0, 1.0])); return tuple(P[0]), tuple(P[1])

GL = np.polynomial.legendre.leggauss(12)
def seg_area(s):  # 1/2 * integrala (x dy - y dx), cuadratura Gauss pe 12 puncte x 64 de panouri (independenta de JS)
    c = curve(s); acc = 0.0
    for i in range(64):
        a, b = i / 64, (i + 1) / 64
        t = (GL[0] + 1) / 2 * (b - a) + a; w = GL[1] * (b - a) / 2
        h = 1e-6
        P = c.f(t); dP = (c.f(np.clip(t + h, 0, 1)) - c.f(np.clip(t - h, 0, 1))) / (np.clip(t + h, 0, 1) - np.clip(t - h, 0, 1))[:, None]
        acc += float((w * 0.5 * (P[:, 0] * dP[:, 1] - P[:, 1] * dP[:, 0])).sum())
    return acc

def all_segs(shapes):
    for sh in shapes:
        for sp in sh["subpaths"]:
            for s in sp["segs"]:
                yield sh, sp, s

def check_dxf_or_svg(fname, exp, shapes, layers=None, warnings=None, tol=1e-9):
    tag = fname
    if "layers" in exp and layers is not None:
        check(f"{tag}: straturi {exp['layers']} (diacriticele pastrate)", set(exp["layers"]) <= set(layers), str(layers))
    full = [(sh, sp["segs"][0]) for sh in shapes for sp in sh["subpaths"] if len(sp["segs"]) == 1 and sp["segs"][0]["k"] == "arc" and abs(abs(sp["segs"][0]["da"]) - 2 * pi) < 1e-9]
    for c in exp.get("circles", []):
        (cx, cy), r = c[0], c[1]
        m = [s for _, s in full if d2(s["c"], (cx, cy)) <= tol * max(1, r) * 10 and abs(s["r"] - r) <= tol * max(1, r) * 10]
        check(f"{tag}: cerc R{r} la ({cx:g},{cy:g}) {c[2] if len(c) > 2 else ''} -> UN arc complet exact", len(m) == 1,
              f"{len(m)}; cercuri: {[(np.round(s['c'], 6).tolist(), round(s['r'], 9)) for _, s in full][:8]}")
    for el in exp.get("ellipses", []):
        es = [dict(s, rx=max(s["rx"], s["ry"]), ry=min(s["rx"], s["ry"]), rot=s["rot"] + (pi / 2 if s["ry"] > s["rx"] else 0))
              for _, _, s in all_segs(shapes) if s["k"] == "earc" and abs(abs(s["dt"]) - 2 * pi) < 1e-9]
        m = [s for s in es if d2(s["c"], el["c"]) < 1e-9 and abs(s["rx"] - el["a"]) < 1e-9 and abs(s["ry"] - el["b"]) < 1e-9
             and abs(((degrees(s["rot"]) - el["rot_deg"]) + 90) % 180 - 90) < 1e-7]
        check(f"{tag}: ELIPSA {el['a']}x{el['b']} la {el['rot_deg']} grade, centru {el['c']} (nu cerc, nu poligon)", len(m) == 1,
              f"elipse: {[(np.round(s['c'], 6).tolist(), round(s['rx'], 9), round(s['ry'], 9), round(degrees(s['rot']), 6)) for s in es]}")
    for ea in exp.get("ellipse_arcs", []):
        es = [s for _, _, s in all_segs(shapes) if s["k"] == "earc" and abs(abs(s["dt"]) - 2 * pi) > 1e-9]
        m = [s for s in es if {tuple(np.round(p, 7)) for p in ends(s)} == {tuple(np.round(ea["p0"], 7)), tuple(np.round(ea["p1"], 7))}]
        check(f"{tag}: arc de elipsa {ea['a']}x{ea['b']} cu capetele {ea['p0']} -> {ea['p1']}", len(m) == 1, str([ends(s) for s in es]))
    for a in exp.get("arcs", []):
        arcs = [s for _, _, s in all_segs(shapes) if s["k"] == "arc" and abs(abs(s["da"]) - 2 * pi) > 1e-9]
        def ok(s):
            e0, e1 = ends(s)
            same = (d2(e0, a["p0"]) < 1e-7 and d2(e1, a["p1"]) < 1e-7) or (d2(e0, a["p1"]) < 1e-7 and d2(e1, a["p0"]) < 1e-7)
            if "c" in a: same = same and d2(s["c"], a["c"]) < 1e-7
            if "mid" in a: same = same and d2(tuple(curve(s).f(np.array([0.5]))[0]), a["mid"]) < 1e-7
            return same and abs(s["r"] - a["r"]) < 1e-7
        m = [s for s in arcs if ok(s)]
        check(f"{tag}: ARC R{a['r']} {a['p0']} -> {a['p1']} {a.get('nota', '')}".rstrip(), len(m) == 1,
              str([(np.round(s["c"], 6).tolist(), round(s["r"], 6), [np.round(p, 6).tolist() for p in ends(s)]) for s in arcs][:6]))
    for ln in exp.get("lines", []):
        lines = [s for _, _, s in all_segs(shapes) if s["k"] == "line"]
        m = [s for s in lines if (d2(s["a"], ln[0]) < 1e-7 and d2(s["b"], ln[1]) < 1e-7) or (d2(s["a"], ln[1]) < 1e-7 and d2(s["b"], ln[0]) < 1e-7)]
        check(f"{tag}: LINIE {np.round(ln[0], 4).tolist()} -> {np.round(ln[1], 4).tolist()}", len(m) >= 1, str([(np.round(s['a'], 6).tolist(), np.round(s['b'], 6).tolist()) for s in lines][:6]))
    for ca in exp.get("closed_areas", []):
        found = []
        for sh in shapes:
            for sp in sh["subpaths"]:
                if not sp["closed"]: continue
                A = abs(sum(seg_area(s) for s in sp["segs"]))
                if abs(A - ca["area"]) < 1e-6 * max(1, ca["area"]):
                    bb = bbox_of([curve(s) for s in sp["segs"]], 801)
                    # aria singura poate coincide (elipsa 20x10 din bloc are tot 200*pi): filtram si dupa caseta
                    if all(abs(x - y) < 1e-3 for x, y in zip(bb, ca["bbox"])):
                        found.append((A, bb, [s["k"] for s in sp["segs"]]))
        ok = len(found) == 1 and all(abs(x - y) < 1e-6 for x, y in zip(found[0][1], ca["bbox"]))
        check(f"{tag}: {ca['what']}: arie {ca['area']:.6f}, caseta {ca['bbox']}", ok,
              f"{[(round(f[0], 9), np.round(f[1], 6).tolist(), {k: f[2].count(k) for k in set(f[2])}) for f in found]}")
    if "bezier" in exp:
        P = exp["bezier"]["P"]
        cs = [s for _, _, s in all_segs(shapes) if s["k"] == "cubic" and all(d2(p, q) < 1e-9 for p, q in zip(s["p"], P))]
        at = tuple(bezier_curve(cs[0]["p"]).f(np.array([0.3]))[0]) if cs else None
        check(f"{tag}: SPLINE-Bezier -> o cubica cu punctele de control exacte, B(0,3) = {exp['bezier']['at03']}", len(cs) == 1 and d2(at, exp["bezier"]["at03"]) < 1e-9, str(at))
    if warnings is not None and exp.get("skipped"):
        check(f"{tag}: entitatile nesuportate sunt raportate, nu sarite tacut ({exp['skipped']})", all(any(k in w for w in warnings) for k in exp["skipped"]), json.dumps(warnings, ensure_ascii=False))

def check_bspline(fname, exp, shapes):
    doc = ezdxf.readfile(os.path.join(INP, fname))
    sp = [e for e in doc.modelspace() if e.dxftype() == "SPLINE" and len(e.control_points) == 6][0]
    bs = sp.construction_tool()  # evaluarea NURBS a lui ezdxf = adevarul independent
    truth_pts = np.array([list(bs.point(t))[:2] for t in np.linspace(0, 3, 3001)])
    ours = [sh for sh in shapes if sh["name"] == "SPLINE" and d2(sh["subpaths"][0]["segs"][0]["p"][0] if sh["subpaths"][0]["segs"][0]["k"] == "cubic" else (0, 0), (200, 150)) < 1e-9]
    if not ours:
        check(f"{fname}: B-spline cu noduri simple gasit", False, ""); return
    segs = ours[0]["subpaths"][0]["segs"]
    cv = [curve(s) for s in segs]
    d1, _ = max_dist_points_to_curves(truth_pts, cv)
    d2_, _ = max_dist_points_to_curves(np.vstack([c.pts(301) for c in cv]), [type(cv[0])(lambda t: np.array([list(bs.point(3 * float(x)))[:2] for x in np.atleast_1d(t)]), "bs")], dense=1500)
    check(f"{fname}: B-spline grad 3 cu 6 puncte (noduri simple) -> {len(segs)} Bezier EXACTE (fata de ezdxf)", max(d1, d2_) < 1e-9 and all(s["k"] == "cubic" for s in segs),
          f"abatere max {max(d1, d2_):.2e} mm, segmente {[s['k'] for s in segs]}")

def pdf_check(fname, exp, r):
    import pymupdf
    check(f"{fname}: toate cele {exp['pages']} pagini citite", r["numPages"] == exp["pages"] and len(r["pages"]) == exp["pages"], str(r["numPages"]))
    # citirea independenta cu PyMuPDF: aceleasi puncte de control?
    doc = pymupdf.open(os.path.join(INP, fname)); K = 72 / 25.4
    maxdev = 0.0; n = 0
    for pg, page in zip(r["pages"], doc):
        H = page.rect.height
        theirs = []
        for dr in page.get_drawings():
            for it in dr["items"]:
                if it[0] == "c": theirs.append([(p.x / K, (H - p.y) / K) for p in it[1:5]])
                elif it[0] == "l": theirs.append([(it[1].x / K, (H - it[1].y) / K), (it[2].x / K, (H - it[2].y) / K)])
                elif it[0] == "re":
                    R = it[1]; theirs.append([(R.x0 / K, (H - R.y0) / K)])
        ours = [s for sh in pg["shapes"] for sp in sh["subpaths"] for s in sp["segs"]]
        for s in ours:
            pts = s["p"] if s["k"] == "cubic" else [s["a"], s["b"]]
            best = min((max(d2(p, q) for p, q in zip(pts, t)) for t in theirs if len(t) == len(pts)), default=None)
            if best is not None: maxdev = max(maxdev, best); n += 1
    check(f"{fname}: punctele noastre = cele citite independent de PyMuPDF (abatere < 1e-4 mm)", maxdev < 1e-4, f"max {maxdev:.2e} mm pe {n} segmente (pdf.js da Float32Array)")
    p1 = [s for sh in r["pages"][0]["shapes"] for sp in sh["subpaths"] for s in sp["segs"]]
    cc = [s for s in p1 if s["k"] == "cubic"]
    pts = np.vstack([bezier_curve(s["p"]).pts(101) for s in cc]) if cc else np.zeros((0, 2))
    err = float(np.abs(np.hypot(pts[:, 0] - 50, pts[:, 1] - 50) - 25).max()) if len(pts) else 1e9
    check(f"{fname}: pagina 1: cercul R25 (scris de reportlab ca {len(cc)} Bezier) la (50,50), abatere radiala < 0,01 mm", len(cc) >= 4 and err < 0.01, f"{err:.5f} mm (aproximarea reportlab)")
    ln = [s for s in p1 if s["k"] == "line" and d2(s["a"], exp["p1"]["line"][0]) < 1e-4 and d2(s["b"], exp["p1"]["line"][1]) < 1e-4]
    check(f"{fname}: pagina 1: linia (100,10)-(190,10) mm", len(ln) == 1, "")
    p2 = [s for sh in r["pages"][1]["shapes"] for sp in sh["subpaths"] for s in sp["segs"]]
    corners = [s["a"] for s in p2 if s["k"] == "line"]
    ok = len(corners) == 4 and all(min(d2(c, e) for c in corners) < 1e-4 for e in exp["p2"]["rect_corners"])
    check(f"{fname}: pagina 2: dreptunghiul rotit 30 grade prin cm (CTM urmarit)", ok, str(np.round(corners, 5).tolist()))
    p3 = [s for sh in r["pages"][2]["shapes"] for sp in sh["subpaths"] for s in sp["segs"]]
    bz = [s for s in p3 if s["k"] == "cubic"]
    dev = max(d2(p, q) for p, q in zip(bz[0]["p"], exp["p3"]["bezier"])) if bz else 1e9
    check(f"{fname}: pagina 3: Bezier cu punctele de control corecte (< 1e-4 mm)", len(bz) == 1 and dev < 1e-4, f"{dev:.2e} mm")

def roundtrip(fname, r, approx):
    tag = f"dus-intors {fname}"
    shapes = r["shapes"] if "shapes" in r else [s for p in r["pages"] for s in p["shapes"]]
    tol = 1e-6 if not approx else 1e-3
    segs = [s for _, _, s in all_segs(shapes)]
    full = [s for s in segs if s["k"] == "arc" and abs(abs(s["da"]) - 2 * pi) < 1e-9]
    if fname.endswith(".pdf"):
        cc = [s for s in segs if s["k"] == "cubic" and all(abs(hypot(p[0] - 70, p[1] - 227) - 50) < 0.6 for p in (s["p"][0], s["p"][3]))]
        pts = np.vstack([bezier_curve(s["p"]).pts(101) for s in cc])
        err = float(np.abs(np.hypot(pts[:, 0] - 70, pts[:, 1] - 227) - 50).max())
        check(f"{tag}: cercul revine ca {len(cc)} Bezier, abatere <= 0,001 mm (+float32)", err <= 0.00101, f"{err:.6f} mm")
    else:
        m = [s for s in full if d2(s["c"], (70, 227)) < tol and abs(s["r"] - 50) < tol]
        check(f"{tag}: cercul revine ca UN cerc R50 la (70,227)", len(m) == 1, str([(s['c'], s['r']) for s in full]))
        rr = [sp for sh in shapes for sp in sh["subpaths"] if sp["closed"] and [s["k"] for s in sp["segs"]].count("arc") == 4 and [s["k"] for s in sp["segs"]].count("line") == 4]
        A = abs(sum(seg_area(s) for s in rr[0]["segs"])) if rr else 0
        # SVG si R12 au coordonate rotunjite la 1e-6 / 1e-9 mm: aria poate varia cu ~1e-4 mm2 (perimetru 583 mm x 2e-7 mm)
        check(f"{tag}: dreptunghiul revine ca 4 linii + 4 arce, aria {REF['rrect']['area']:.6f} (+/- 1e-3 mm2)", len(rr) == 1 and abs(A - REF["rrect"]["area"]) < 1e-3, f"{A:.9f}")
        if not approx:
            el = [s for s in segs if s["k"] == "earc"]
            ok = any(d2(s["c"], (75, 95)) < tol and abs(s["rx"] - 60) < tol and abs(s["ry"] - 30) < tol for s in el)
            check(f"{tag}: elipsa revine ca ELIPSA 60x30 (nu arce, nu poligon)", ok, str([(np.round(s['c'], 7).tolist(), s['rx'], s['ry']) for s in el][:3]))
            cs = [s for s in segs if s["k"] == "cubic" and all(d2(p, q) < tol for p, q in zip(s["p"], REF["scurve"]["P"]))]
            check(f"{tag}: curba S revine ca UN Bezier cu punctele exacte", len(cs) == 1, "")
    # N: inaltimea 20 mm (glifa intre x 43,37 si 59,62)
    nsegs = [s for _, _, s in all_segs(shapes) if all(43.3 < x < 59.7 and 14 < y < 36 for x, y in (ends(s)))]
    bb = bbox_of([curve(s) for s in nsegs], 201) if nsegs else None
    check(f"{tag}: glifa N revine cu inaltimea 20,000 mm", bb is not None and abs((bb[3] - bb[1]) - 20) < (1e-5 if not fname.endswith('.pdf') else 2e-4), str(np.round(bb, 6).tolist() if bb else None))

if __name__ == "__main__":
    for f in ("in-R2018-mm.dxf", "in-R2000-inch.dxf", "in-R12.dxf", "in-unitati.svg", "in-transformari.svg", "in-toli.svg", "in-px.svg"):
        r = M[f]
        check_dxf_or_svg(f, E[f], r["shapes"], r.get("layers"), r.get("warnings"))
    check_bspline("in-R2018-mm.dxf", E["in-R2018-mm.dxf"], M["in-R2018-mm.dxf"]["shapes"])
    # unitatile DXF in toli: aceeasi linie de 1 tol iese 25,4 mm
    check("in-R2000-inch.dxf: $INSUNITS=1 (toli) aplicat: factor 25,4", abs(M["in-R2000-inch.dxf"]["units"]["toMm"] - 25.4) < 1e-12, json.dumps(M["in-R2000-inch.dxf"]["units"]))
    check("in-R12.dxf: R12 n-are unitati -> presupus mm SI avertizat", "fara $INSUNITS: presupus mm" in M["in-R12.dxf"]["warnings"], json.dumps(M["in-R12.dxf"]["warnings"], ensure_ascii=False))
    # SVG skewX(30) pe cercul (10,95) R2. svgelements 1.9.6 GRESESTE aici (transforma arcul ca si cum forfecarea ar
    # fi pe Y; masurat), deci arbitrul e formula pe hartie: x = 10 + tan30*95 +/- 2*sqrt(1+tan30^2), y (Y in sus) = 5 +/- 2
    from math import tan, sqrt as msqrt
    t30 = tan(radians(30))
    ours = [s for _, _, s in all_segs(M["in-transformari.svg"]["shapes"]) if s["k"] == "earc" and s["c"][1] < 10]
    if ours:
        bb = bbox_of([curve(s) for s in ours], 2001)
        exp_bb = (10 + t30 * 95 - 2 * msqrt(1 + t30 ** 2), 3, 10 + t30 * 95 + 2 * msqrt(1 + t30 ** 2), 7)
        q = (10 + t30 * 97, 100 - 97)   # punctul (10,97) al cercului, forfecat
        dq, _ = max_dist_points_to_curves(np.array([q]), [curve(s) for s in ours])
        check("in-transformari.svg: cerc cu skewX(30) -> O elipsa; caseta si un punct = formula pe hartie (svgelements greseste aici)",
              len(ours) == 1 and all(abs(a - b) < 1e-6 for a, b in zip(bb, exp_bb)) and dq < 1e-9, f"caseta {np.round(bb, 6).tolist()} vs {np.round(exp_bb, 6).tolist()}; punct {dq:.1e}")
    pdf_check("in-3pagini.pdf", E["in-3pagini.pdf"], M["in-3pagini.pdf"])
    roundtrip("referinta-R2007.dxf", M["referinta-R2007.dxf"], approx=False)
    roundtrip("referinta-R12.dxf", M["referinta-R12.dxf"], approx=True)
    roundtrip("referinta.svg", M["referinta.svg"], approx=False)
    roundtrip("referinta.pdf", M["referinta.pdf"], approx=True)
    ok = sum(r["ok"] for r in results)
    for r in results:
        print(("OK  " if r["ok"] else "PICA") + " | " + r["check"] + (" | " + r["detail"] if r["detail"] else ""))
    print(f"\nIMPORT: {ok}/{len(results)} verificari trecute")
    json.dump({"results": results}, open(os.path.join(OUT, "oracol-import.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    sys.exit(0 if ok == len(results) else 1)
