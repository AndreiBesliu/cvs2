import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { motivRefuz } from '../../.claude/hooks/fara-add-all.ts';

const REFUZATE = [
  'git add -A',
  'git add --all',
  'git add .',
  'git add -u',
  'git add -Av',
  'git add :/',
  'git stage .',
  'git -C repo add -A',
  'cd "C:/x y" && npm test && git add -A && git commit -m x',
  'FOO=1 git add --all',
  'git commit -a -m "x"',
  'git commit -am "x"',
  'git commit -qam x',
  'git commit --all -m x',
  'git status; git add .',
];

const PERMISE = [
  'git add src/a.ts test/b.ts',
  'git add -- src/a.ts',
  'git add docs/PORTARE.md DEVLOG.md',
  'git commit -m "adaugă tot: git add -A e interzis"',
  'git commit -madd',
  'git commit -q -F - <<\'EOF\'\nPasul 1\ngit add -A nu se folosește\nEOF',
  "git commit -F - @'\ngit add -A\n'@",
  'echo "git add -A"',
  'git log --all --oneline',
  'git status --short',
  'npm run build',
];

test('comenzile care adaugă sau comit tot arborele sunt refuzate', () => {
  for (const c of REFUZATE) assert.ok(motivRefuz(c), `trebuia refuzată: ${c}`);
});

test('adăugarea explicită, mesajele care pomenesc regula și restul comenzilor trec', () => {
  for (const c of PERMISE) assert.equal(motivRefuz(c), null, `trebuia să treacă: ${c}`);
});

test('scriptul, rulat cum îl rulează Claude Code: refuz pe stdout pentru git add -A, tăcere pentru o comandă bună', () => {
  const ruleaza = (command: string): string => execFileSync(process.execPath, ['.claude/hooks/fara-add-all.ts'], {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: 'utf8',
  });
  const refuz = JSON.parse(ruleaza('git add -A')) as { hookSpecificOutput: { permissionDecision: string } };
  assert.equal(refuz.hookSpecificOutput.permissionDecision, 'deny');
  assert.equal(ruleaza('git add src/a.ts'), '');
});
