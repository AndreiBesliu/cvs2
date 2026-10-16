"""Unealta de otrăvuri (mutații țintite), comisă (felia 2.9, `PLAN.md` §4.5 / I18; `docs/otravuri.md`).

O listă de otrăvuri e un fișier Python (de exemplu `test/otravuri/2.3c-b.py`) care definește:
  O        lista otrăvurilor: dict(id, fis, vechi, nou, set, ce); `vechi` apare EXACT o dată în `fis` (\\n se potrivește și
           pe CRLF), altfel otrava e VOID; `set` e numele setului de teste care trebuie s-o prindă;
  SETURI   dict nume -> fișiere de test (`node --test`); „NUME2” e a doua șansă, mai largă, a setului NUME;
  E2E      (opțional) spec-urile Playwright pentru setul „e2e” (build înainte de fiecare otravă).

Folosire, din rădăcina unei CLONE în afara Drive-ului (Drive-ul a înviat mutații restaurate; `docs/otravuri.md`),
cu PYTHONIOENCODING=utf-8:
  python scripts/otravuri.py LISTA verifica               # VOID-urile, fără să ruleze nimic
  python scripts/otravuri.py LISTA baza SET [SET ...]     # seturile fără otravă: trebuie să fie verzi întâi
  python scripts/otravuri.py LISTA lot START END          # otrăvurile [START, END), fiecare pe setul ei
  python scripts/otravuri.py LISTA doua ID [ID ...]       # a doua șansă: setul ei „2”
  python scripts/otravuri.py LISTA plin ID [ID ...]       # toată suita unitară (lent: ~11 min pe otravă)
  python scripts/otravuri.py LISTA tinte FISIER ID [...]  # un singur fișier de test (testele noi pentru cele scăpate)
  python scripts/otravuri.py LISTA e2e ID [ID ...]        # build + spec-urile E2E ale listei

Reguli (învățate în 2.3c): SERIAL mereu (copiile paralele pică din lipsă de memorie și pe testele de timp, chiar fără
otravă); fiecare otravă se aplică, se rulează, se restaurează și se verifică cu sha256; la capătul comenzii, fiecare fișier
atins trebuie să fie identic cu HEAD (`git hash-object` față de `HEAD:fis`), altfel ARBORE MURDAR și codul 2.
Jurnalul: `.tmp/otravuri.log` (adăugare).
"""
import glob, hashlib, importlib.util, os, re, subprocess, sys, time

RAD = os.getcwd()
JURNAL = os.path.join(RAD, '.tmp', 'otravuri.log')
ATINSE = set()


def sha(b):
    return hashlib.sha256(b).hexdigest()


def jurnal(linie):
    os.makedirs(os.path.dirname(JURNAL), exist_ok=True)
    with open(JURNAL, 'a', encoding='utf-8') as f:
        f.write(linie + '\n')
    print(linie, flush=True)


def incarca_lista(cale):
    spec = importlib.util.spec_from_file_location('lista_otravuri', cale)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    ids = [x['id'] for x in m.O]
    if len(ids) != len(set(ids)):
        raise SystemExit('lista are id-uri repetate')
    for x in m.O:
        assert x['vechi'] != x['nou'], 'otrava %s nu schimbă nimic' % x['id']
    return m


def pregateste(x):
    """(octeți originali, octeți otrăviți) sau (octeți, motivul VOID)."""
    with open(x['fis'], 'rb') as f:
        orig = f.read()
    text = orig.decode('utf-8')
    vechi, nou = x['vechi'], x['nou']
    if '\r\n' in text:
        vechi, nou = vechi.replace('\n', '\r\n'), nou.replace('\n', '\r\n')
    n = text.count(vechi)
    if n != 1:
        return orig, 'VOID: vechi apare de %d ori' % n
    otravit = text.replace(vechi, nou).encode('utf-8')
    return (orig, otravit) if otravit != orig else (orig, 'VOID: fișierul nu s-a schimbat')


def sh(cmd, termen):
    t0 = time.time()
    try:
        p = subprocess.run(cmd, shell=isinstance(cmd, str), capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=termen)
        return p.returncode, p.stdout + p.stderr, time.time() - t0, False
    except subprocess.TimeoutExpired as e:
        out = e.stdout if isinstance(e.stdout, str) else (e.stdout or b'').decode('utf-8', 'replace')
        return -1, out, time.time() - t0, True


def ruleaza_unitare(fisiere, termen):
    rc, out, dt, expirat = sh(['node', '--test', *fisiere], termen)
    m_f, m_p = re.search(r'ℹ fail (\d+)', out), re.search(r'ℹ pass (\d+)', out)
    rosii = []
    for linie in out.splitlines():
        s = linie.strip()
        if s.startswith('✖') and 'failing tests' not in s and s not in rosii:
            rosii.append(s[:160])
    return dict(rc=rc, rez='fail=%s pass=%s' % (m_f.group(1) if m_f else None, m_p.group(1) if m_p else None), dt=dt, expirat=expirat, rosii=rosii)


def ruleaza_e2e(specuri, termen):
    rcb, outb, dtb, _ = sh('npm run build', 600)
    if rcb != 0:
        return dict(rc=rcb, rez='build eșuat', dt=dtb, expirat=False, rosii=[outb[-300:].replace('\n', ' ')])
    rc, out, dt, expirat = sh('npx playwright test --workers=1 ' + ' '.join(specuri), termen)
    m_p, m_f = re.search(r'(\d+) passed', out), re.search(r'(\d+) failed', out)
    # Playwright pe Windows marchează eșecul cu „x”, nu cu „✘”.
    rosii = [s.strip()[:200] for s in out.splitlines() if re.match(r'^\s*(x|✘)\s+\d+', s)]
    return dict(rc=rc, rez='passed=%s failed=%s' % (m_p.group(1) if m_p else None, m_f.group(1) if m_f else None), dt=dtb + dt, expirat=expirat, rosii=rosii)


def cu_otrava(x, ruleaza, eticheta):
    orig, otravit = pregateste(x)
    if isinstance(otravit, str):
        jurnal('%s\t%s\t%s\t%s' % (eticheta, x['id'], x['fis'], otravit))
        return
    h0 = sha(orig)
    ATINSE.add(x['fis'])
    try:
        with open(x['fis'], 'wb') as f:
            f.write(otravit)
        r = ruleaza()
    finally:
        for _ in range(5):
            with open(x['fis'], 'wb') as f:
                f.write(orig)
            with open(x['fis'], 'rb') as f:
                if sha(f.read()) == h0:
                    break
        else:
            jurnal('!!! RESTAURAREA A EȘUAT: %s (%s)' % (x['id'], x['fis']))
            sys.exit(2)
    verdict = 'PRINSĂ(termen)' if r['expirat'] else ('PRINSĂ' if r['rc'] != 0 else 'SCĂPATĂ')
    jurnal('%s\t%s\t%s\t%s\t%s %.0fs\trestaurat sha ok\t%s\t%s' % (
        eticheta, x['id'], x['fis'], verdict, r['rez'], r['dt'], x['ce'], ' | '.join(r['rosii'][:3])))


def verifica_final():
    """Fiecare fișier atins, identic cu HEAD (prin filtrele git: autocrlf nu e o diferență)."""
    murdare = []
    for f in sorted(ATINSE):
        acum = subprocess.run(['git', 'hash-object', f], capture_output=True, text=True).stdout.strip()
        head = subprocess.run(['git', 'rev-parse', 'HEAD:%s' % f], capture_output=True, text=True).stdout.strip()
        if acum != head:
            murdare.append(f)
    if murdare:
        jurnal('!!! ARBORE MURDAR LA FINAL: ' + ', '.join(murdare))
        sys.exit(2)


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    # Dosarul sincronizat de Drive: `Desktop\MyWork\` pe calculatorul owner-ului, sau unitățile Drive (G:, X:).
    if re.search(r'[\\/]Desktop[\\/]MyWork[\\/]|^[GXgx]:', os.path.realpath(RAD)) and os.environ.get('OTRAVURI_IN_DRIVE') != '1':
        raise SystemExit('rulezi în dosarul din Drive: fă o clonă în afara lui (docs/otravuri.md)')
    lista = incarca_lista(sys.argv[1])
    cmd, arg = sys.argv[2], sys.argv[3:]
    O, SETURI = lista.O, getattr(lista, 'SETURI', {})
    gaseste = lambda id: next(y for y in O if y['id'] == id)  # noqa: E731
    unitare = lambda fisiere, termen: (lambda: ruleaza_unitare(fisiere, termen))  # noqa: E731
    e2e = lambda: ruleaza_e2e(getattr(lista, 'E2E', []), 1800)  # noqa: E731
    if cmd == 'verifica':
        for i, x in enumerate(O):
            _, ot = pregateste(x)
            print(i, x['id'], 'ok' if not isinstance(ot, str) else ot)
        print('seturi:', {k: len(v) for k, v in SETURI.items()})
    elif cmd == 'baza':
        for nume in arg:
            r = e2e() if nume == 'e2e' else ruleaza_unitare(SETURI[nume], 1500)
            jurnal('baza\t%s\tfără otravă\t%s rc=%s %.0fs\t%s' % (nume, r['rez'], r['rc'], r['dt'], ' | '.join(r['rosii'][:6])))
    elif cmd == 'lot':
        for i in range(int(arg[0]), min(int(arg[1]), len(O))):
            x = O[i]
            cu_otrava(x, e2e if x['set'] == 'e2e' else unitare(SETURI[x['set']], 300), 'lot[%d]' % i)
    elif cmd == 'doua':
        for id in arg:
            x = gaseste(id)
            cu_otrava(x, unitare(SETURI[x['set'] + '2'], 1500), 'doua')
    elif cmd == 'plin':
        toate = sorted(glob.glob('test/unit/**/*.test.ts', recursive=True))
        for id in arg:
            cu_otrava(gaseste(id), unitare(toate, 1500), 'plin')
    elif cmd == 'tinte':
        for id in arg[1:]:
            cu_otrava(gaseste(id), unitare([arg[0]], 300), 'tinte')
    elif cmd == 'e2e':
        for id in arg:
            cu_otrava(gaseste(id), e2e, 'e2e')
    else:
        raise SystemExit('comanda necunoscută: %s' % cmd)
    verifica_final()


if __name__ == '__main__':
    main()
