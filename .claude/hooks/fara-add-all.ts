/**
 * Cârligul PreToolUse care refuză comenzile git ce adaugă sau comit tot arborele dintr-o dată: `git add -A`, `--all`,
 * `-u`, `.`, `:/`, `*` și `git commit -a`. Regula owner-ului: stage explicit, fișier cu fișier, apoi `git status` și
 * `git show --stat` (`CLAUDE.md`). În ediția întâi, un `git add -A` dintr-o sesiune paralelă a măturat fișiere străine
 * într-un commit.
 *
 * Citește TOATĂ comanda, nu prefixul: comenzile reale sunt compuse (`cd x && … && git add -A`). Corpul unui heredoc și
 * al unui here-string PowerShell e text, nu comandă, deci un mesaj de commit care pomenește `git add -A` trece.
 *
 * Rulat de Claude Code cu `node .claude/hooks/fara-add-all.ts` (Node rulează TypeScript-ul direct).
 */

const PATHSPEC_LARGI = new Set(['.', './', ':/', ':(top)', '*', '-A', '--all', '--no-ignore-removal', '-u', '--update']);
/** Opțiunile scurte ale lui `git commit` care iau o valoare: după ele, restul grupului e valoarea, nu alte opțiuni. */
const COMMIT_CU_VALOARE = new Set(['m', 'F', 'c', 'C', 't']);

/** Liniile comenzii, fără corpul heredoc-urilor (`<<EOF … EOF`) și al here-string-urilor PowerShell (`@' … '@`). */
function liniiDeComanda(comanda: string): string[] {
  const linii = comanda.split(/\r?\n/);
  const pastrate: string[] = [];
  for (let i = 0; i < linii.length; i++) {
    const linie = linii[i] ?? '';
    pastrate.push(linie);
    const heredoc = /<<-?\s*(['"]?)([A-Za-z_][\w]*)\1/.exec(linie);
    if (heredoc) {
      const sfarsit = heredoc[2];
      while (i + 1 < linii.length && (linii[i + 1] ?? '').trim() !== sfarsit) i++;
      i++;
      continue;
    }
    if (/@['"]\s*$/.test(linie)) {
      while (i + 1 < linii.length && !/^['"]@/.test(linii[i + 1] ?? '')) i++;
      i++;
    }
  }
  return pastrate;
}

/** Desparte o linie în segmente (`&&`, `||`, `;`, `|`) și fiecare segment în cuvinte, cu ghilimelele respectate. */
function segmente(linie: string): string[][] {
  const rezultat: string[][] = [];
  let cuvinte: string[] = [];
  let cuvant = '';
  let areCuvant = false;
  let ghilimea: '"' | "'" | null = null;
  const inchideCuvant = (): void => {
    if (areCuvant) cuvinte.push(cuvant);
    cuvant = '';
    areCuvant = false;
  };
  const inchideSegment = (): void => {
    inchideCuvant();
    if (cuvinte.length) rezultat.push(cuvinte);
    cuvinte = [];
  };
  for (let i = 0; i < linie.length; i++) {
    const c = linie[i] ?? '';
    if (ghilimea) {
      if (c === ghilimea) ghilimea = null;
      else if (c === '\\' && ghilimea === '"' && i + 1 < linie.length) cuvant += linie[++i] ?? '';
      else cuvant += c;
      continue;
    }
    if (c === '"' || c === "'") { ghilimea = c; areCuvant = true; continue; }
    if (c === ';' || c === '|' || c === '&') { inchideSegment(); continue; }
    if (/\s/.test(c)) { inchideCuvant(); continue; }
    cuvant += c;
    areCuvant = true;
  }
  inchideSegment();
  return rezultat;
}

function esteGit(cuvant: string): boolean {
  return cuvant === 'git' || cuvant === 'git.exe' || /[\\/]git(\.exe)?$/.test(cuvant);
}

/** Motivul refuzului, sau null dacă comanda nu adaugă și nu comite tot arborele. */
export function motivRefuz(comanda: string): string | null {
  for (const linie of liniiDeComanda(comanda)) {
    for (const cuvinte of segmente(linie)) {
      let i = 0;
      while (i < cuvinte.length && (/^\w+=/.test(cuvinte[i] ?? '') || ['command', 'exec', 'time', 'sudo'].includes(cuvinte[i] ?? ''))) i++;
      if (!esteGit(cuvinte[i] ?? '')) continue;
      i++;
      while (i < cuvinte.length && (cuvinte[i] ?? '').startsWith('-')) i += ['-C', '-c'].includes(cuvinte[i] ?? '') ? 2 : 1;
      const sub = cuvinte[i];
      const argumente = cuvinte.slice(i + 1);
      if (sub === 'add' || sub === 'stage') {
        for (const a of argumente) {
          if (a === '--') continue;
          if (PATHSPEC_LARGI.has(a) || (/^-[A-Za-z]+$/.test(a) && /[Au]/.test(a))) {
            return `„git ${sub} ${a}” adaugă tot arborele. Adaugă fișierele explicit, unul câte unul, apoi verifică cu git status și git show --stat.`;
          }
        }
      }
      if (sub === 'commit') {
        for (const a of argumente) {
          if (a === '--all') return '„git commit --all” comite tot ce s-a modificat. Adaugă explicit fișierele, apoi comite.';
          if (/^-[A-Za-z]+$/.test(a)) {
            for (const litera of a.slice(1)) {
              if (litera === 'a') return `„git commit ${a}” comite tot ce s-a modificat. Adaugă explicit fișierele, apoi comite.`;
              if (COMMIT_CU_VALOARE.has(litera)) break;
            }
          }
        }
      }
    }
  }
  return null;
}

async function main(): Promise<void> {
  let text = '';
  for await (const bucata of process.stdin) text += String(bucata);
  let comanda = '';
  try {
    const intrare = JSON.parse(text) as { tool_input?: { command?: unknown } };
    comanda = typeof intrare.tool_input?.command === 'string' ? intrare.tool_input.command : '';
  } catch {
    return; // O intrare pe care n-o înțelege nu e treaba gărzii; regulile obișnuite decid.
  }
  const motiv = motivRefuz(comanda);
  if (motiv) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: motiv },
    }));
  }
}

if (import.meta.main) await main();
