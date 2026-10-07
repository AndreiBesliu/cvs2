# Comprimă capturile PNG (paletă de 96 de culori, fără dithering), ca să rămână mici în repo.
# Unealtă doar de lucru (Pillow, licență HPND), nu intră în aplicație.
import sys, os
from PIL import Image
d = sys.argv[1]
tot0 = tot1 = 0
for f in sorted(os.listdir(d)):
    if not f.endswith('.png'): continue
    p = os.path.join(d, f); s0 = os.path.getsize(p)
    im = Image.open(p).convert('RGB').quantize(colors=96, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    im.save(p, optimize=True)
    s1 = os.path.getsize(p); tot0 += s0; tot1 += s1
    print(f'{f:24s} {s0/1024:6.1f} KB -> {s1/1024:6.1f} KB')
print(f'total {tot0/1024:.0f} KB -> {tot1/1024:.0f} KB')
