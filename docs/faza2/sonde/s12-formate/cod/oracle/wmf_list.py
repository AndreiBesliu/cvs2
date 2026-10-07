# wmf_list.py - lister minimal de inregistrari WMF/EMF, scris direct din specificatiile publice [MS-WMF] si [MS-EMF].
# Doar test (sonda s12). Fara cod comun cu bibliotecile JS. python oracle/wmf_list.py fisier.wmf|fisier.emf
import struct, sys, collections

WMF = {0x0000: 'EOF', 0x020B: 'SETWINDOWORG', 0x020C: 'SETWINDOWEXT', 0x0103: 'SETMAPMODE', 0x0324: 'POLYGON', 0x0325: 'POLYLINE',
       0x0538: 'POLYPOLYGON', 0x0418: 'ELLIPSE', 0x041B: 'RECTANGLE', 0x061C: 'ROUNDRECT', 0x0817: 'ARC', 0x081A: 'PIE', 0x0830: 'CHORD',
       0x0213: 'LINETO', 0x0214: 'MOVETO', 0x02FA: 'CREATEPENINDIRECT', 0x02FC: 'CREATEBRUSHINDIRECT', 0x012D: 'SELECTOBJECT',
       0x01F0: 'DELETEOBJECT', 0x0102: 'SETBKMODE', 0x0106: 'SETPOLYFILLMODE', 0x0626: 'ESCAPE', 0x0521: 'TEXTOUT', 0x0A32: 'EXTTEXTOUT',
       0x0F43: 'STRETCHDIB', 0x0B41: 'DIBSTRETCHBLT', 0x001E: 'SAVEDC', 0x0127: 'RESTOREDC', 0x0209: 'SETTEXTCOLOR', 0x0201: 'SETBKCOLOR',
       0x0104: 'SETROP2', 0x02FB: 'CREATEFONTINDIRECT', 0x012E: 'SETTEXTALIGN', 0x020D: 'SETVIEWPORTORG', 0x020E: 'SETVIEWPORTEXT'}
EMF = {1: 'HEADER', 2: 'POLYBEZIER', 3: 'POLYGON', 4: 'POLYLINE', 5: 'POLYBEZIERTO', 6: 'POLYLINETO', 7: 'POLYPOLYLINE', 8: 'POLYPOLYGON',
       9: 'SETWINDOWEXTEX', 10: 'SETWINDOWORGEX', 11: 'SETVIEWPORTEXTEX', 12: 'SETVIEWPORTORGEX', 14: 'EOF', 17: 'SETMAPMODE', 27: 'MOVETOEX',
       33: 'SAVEDC', 34: 'RESTOREDC', 35: 'SETWORLDTRANSFORM', 36: 'MODIFYWORLDTRANSFORM', 37: 'SELECTOBJECT', 38: 'CREATEPEN',
       39: 'CREATEBRUSHINDIRECT', 40: 'DELETEOBJECT', 42: 'ELLIPSE', 43: 'RECTANGLE', 44: 'ROUNDRECT', 45: 'ARC', 46: 'CHORD', 47: 'PIE',
       54: 'LINETO', 55: 'ARCTO', 59: 'BEGINPATH', 60: 'ENDPATH', 61: 'CLOSEFIGURE', 62: 'FILLPATH', 63: 'STROKEANDFILLPATH', 64: 'STROKEPATH',
       70: 'GDICOMMENT', 84: 'EXTTEXTOUTW', 85: 'POLYBEZIER16', 86: 'POLYGON16', 87: 'POLYLINE16', 88: 'POLYBEZIERTO16', 89: 'POLYLINETO16',
       90: 'POLYPOLYLINE16', 91: 'POLYPOLYGON16', 95: 'EXTCREATEPEN', 18: 'SETBKMODE', 19: 'SETPOLYFILLMODE', 20: 'SETROP2', 22: 'SETTEXTALIGN',
       24: 'SETTEXTCOLOR', 25: 'SETBKCOLOR', 75: 'SETICMMODE', 98: 'SETICMMODE?', 115: 'SETLAYOUT'}

def wmf(b):
    out = {'format': 'WMF'}; p = 0
    if struct.unpack_from('<I', b, 0)[0] == 0x9AC6CDD7:  # antet "placeable" (Aldus): caseta in unitati logice + unitati pe tol
        _, _, l, t, r, bt, inch = struct.unpack_from('<IHhhhhH', b, 0)
        out['placeable'] = {'bbox': (l, t, r, bt), 'units_per_inch': inch, 'mm_per_unit': round(25.4 / inch, 6)}; p = 22
    typ, hsize, ver = struct.unpack_from('<HHH', b, p); out['header'] = {'type': typ, 'version': hex(ver)}; p += hsize * 2
    hist = collections.Counter(); first_pts = None
    while p + 6 <= len(b):
        size, fn = struct.unpack_from('<IH', b, p)
        name = WMF.get(fn, hex(fn)); hist[name] += 1
        if name in ('POLYGON', 'POLYLINE') and first_pts is None:
            n = struct.unpack_from('<h', b, p + 6)[0]
            first_pts = [struct.unpack_from('<hh', b, p + 8 + 4 * i) for i in range(n)]
        if fn == 0 or size < 3: break
        p += size * 2
    out['records'] = dict(hist); out['first_poly_int16'] = first_pts
    return out

def emf(b):
    out = {'format': 'EMF'}; p = 0; hist = collections.Counter()
    while p + 8 <= len(b):
        typ, size = struct.unpack_from('<II', b, p)
        hist[EMF.get(typ, str(typ))] += 1
        if typ == 1:
            bl, bt, br, bb, fl, ft, fr, fb = struct.unpack_from('<8i', b, p + 8)
            out['frame_0.01mm'] = (fl, ft, fr, fb)
        if typ == 14 or size < 8: break
        p += size
    out['records'] = dict(hist)
    return out

if __name__ == '__main__':
    b = open(sys.argv[1], 'rb').read()
    print(emf(b) if struct.unpack_from('<I', b, 0)[0] == 1 and b[40:44] == b' EMF' else wmf(b))
