"""Re-runs the similarity part of the audit: k-gram scans and function-by-function ratios.

Usage (from this folder, after ./fetch.sh refs.lock refs):
  python3 -I run-audit.py [engine src dir] [out dir]
Defaults: ../app/gba/src (current version) and ./out. To reproduce the 2026-10-24 numbers exactly, point it at a
copy of the audited version (hashes in snapshot-SHA256SUMS.txt). Line ranges in pairs.txt are those of that version;
cart.js and bios.js are unchanged since, ppu.js is not (the COLOR row is skipped when the old function is gone).
"""
import os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'app', 'gba', 'src'))
OUT = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'out'))
os.makedirs(OUT, exist_ok=True)
os.chdir(HERE)
tool = lambda n: os.path.join(HERE, 'tools', n)

def py(script, *a, stdin=None, env=None):
    return subprocess.run([sys.executable, '-I', script, *a], input=stdin, capture_output=True, text=True, check=True,
                          env=dict(os.environ, **(env or {}))).stdout

# 1. k-gram scans
cores = ['refs/mgba-0.10.5/src/gba', 'refs/mgba-0.10.5/src/arm', 'refs/mgba-master/src/gba', 'refs/mgba-master/src/arm',
         'refs/higan/higan/gba', 'refs/higan/higan/component/processor/arm7tdmi',
         'refs/ares/ares/gba', 'refs/ares/ares/component/processor/arm7tdmi']
open(os.path.join(OUT, 'scan-k12-cores.txt'), 'w').write(py(tool('simscan.py'), SRC, *cores, env={'K': '12'}))
open(os.path.join(OUT, 'scan-js-k10.txt'), 'w').write(py(tool('jsscan.py'), SRC, 'refs/gbajs/js', 'refs/iodinegba/IodineGBA', env={'K': '10'}))

# 2. pairs: resolve "@start..end" / "@Cfunction" markers in pairs.txt to line ranges
def find(path, pat):
    for i, l in enumerate(open(path, encoding='utf-8'), 1):
        if l.startswith(pat) or re.match(r'^\w[\w\s\*]*\b' + re.escape(pat) + r'\(', l):
            return i
    raise SystemExit(f'{pat} not found in {path}')

def c_end(path, start):
    for i, l in enumerate(open(path, encoding='utf-8'), 1):
        if i > start and l.startswith('}'):
            return i

rows = []
color_gone = 'LCD_DESAT' in open(os.path.join(SRC, 'ppu.js'), encoding='utf-8').read()
for line in open('pairs.txt', encoding='utf-8'):
    if line.startswith('#') or not line.strip():
        continue
    f = line.rstrip('\n').replace('$O', SRC).split('|')
    if f[0].startswith('COLOR') and color_gone:
        print('skip (old colour function removed):', f[0]); continue
    if f[5].startswith('@'):
        spec = f[5][1:]
        if '..' in spec:
            a, b = spec.split('..'); f[5:] = [str(find(f[4], a)), str(find(f[4], b) - 1)]
        else:
            s = find(f[4], spec); f[5:] = [str(s), str(c_end(f[4], s))]
    rows.append('|'.join(f))
res = py(tool('pairsim.py'), tool('simscan.py'), stdin='\n'.join(rows))
open(os.path.join(OUT, 'pairsim-results.txt'), 'w').write(res)
print(res)
