import sys, difflib, importlib.util
spec = importlib.util.spec_from_file_location('s', sys.argv[1]); s = importlib.util.module_from_spec(spec); spec.loader.exec_module(s)
def seg(path, a, b):
    lines = open(path, encoding='utf-8').read().split('\n')[a-1:b]
    return [t for t, _ in s.tokens(s.strip('\n'.join(lines), ''))]
pairs = [l.split('|') for l in sys.stdin.read().strip().split('\n')]
for name, ours, oa, ob, ref, ra, rb in pairs:
    x = seg(ours, int(oa), int(ob)); y = seg(ref, int(ra), int(rb))
    sm = difflib.SequenceMatcher(None, x, y, autojunk=False)
    longest = max((m.size for m in sm.get_matching_blocks()), default=0)
    print(f'{name:38s} ratio={sm.ratio():.2f}  longest_run={longest:3d} tokens  ours={len(x)} ref={len(y)}')
