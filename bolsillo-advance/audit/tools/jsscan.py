import sys, os, collections, importlib.util
spec = importlib.util.spec_from_file_location('s', os.path.join(os.path.dirname(__file__), 'simscan.py')); s = importlib.util.module_from_spec(spec); spec.loader.exec_module(s)
import re
# JS vs JS: also keep identifier names (lowercased) — shared names are meaningful between same-language codebases
def toks(path):
    src = s.strip(open(path, encoding='utf-8', errors='replace').read(), '')
    out=[]
    for n, line in enumerate(src.split('\n'),1):
        for t in s.TOK.findall(line):
            if t in ('this','var','let','const','function','return','new'): continue
            out.append((t.lower(), n))
    return out
K=int(os.environ.get('K','12'))
def grams(tk):
    for i in range(len(tk)-K+1):
        seq=' '.join(t for t,_ in tk[i:i+K])
        if len(set(t for t,_ in tk[i:i+K]))<6: continue
        yield seq, tk[i][1], tk[i+K-1][1]
ours, refs = sys.argv[1], sys.argv[2:]
idx=collections.defaultdict(set)
for r in refs:
    for root,_,fs in os.walk(r):
        for f in fs:
            if f.endswith('.js'):
                p=os.path.join(root,f)
                for seq,a,b in grams(toks(p)): idx[seq].add('%s:%d'%(os.path.relpath(p,os.path.dirname(r.rstrip('/'))),a))
for f in sorted(os.listdir(ours)):
    if not f.endswith('.js'): continue
    hits=collections.defaultdict(set); total=set()
    for seq,a,b in grams(toks(os.path.join(ours,f))):
        total.update(range(a,b+1))
        if seq in idx:
            for l in range(a,b+1): hits[l]|=set(sorted(idx[seq])[:2])
    print('== %s: %d/%d lines in shared %d-grams (identifiers kept)'%(f,len(hits),len(total),K))
    ls=sorted(hits); rng=[]
    for l in ls:
        if rng and l==rng[-1][1]+1: rng[-1][1]=l
        else: rng.append([l,l])
    for a,b in rng: print('   %d-%d ~ %s'%(a,b,', '.join(sorted(set().union(*[hits[x] for x in range(a,b+1)]))[:3])))
