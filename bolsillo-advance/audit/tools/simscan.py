"""Cross-language similarity scan (our JS engine vs reference C/C++ cores).

Method: strip comments/strings/log calls, tokenize, map every identifier to "I" while keeping
numeric literals (normalised to decimal) and operators, then compare k-gram fingerprints.
A shared k-gram means the same sequence of operators + constants appears in both.
Hardware constants alone rarely produce long shared runs; shared control-flow shape does.

Usage: python3 simscan.py <our_dir> <ref_dir>... > report
"""
import os, re, sys, hashlib, collections

K = int(os.environ.get('K', '14'))
TOK = re.compile(r'0x[0-9a-fA-F]+|\d+\.\d*f?|\d+|[A-Za-z_]\w*|>>>=|>>>|<<=|>>=|===|!==|==|!=|<=|>=|&&|\|\||\+\+|--|[-+*/%&|^~!<>=?:;,.(){}\[\]]')
DROP_IDENT = {'const', 'let', 'var', 'auto', 'int', 'unsigned', 'uint8_t', 'uint16_t', 'uint32_t', 'int8_t', 'int16_t', 'int32_t',
              'float', 'double', 'f64', 'n32', 'n64', 'uint', 'uint64', 'uint32', 'static', 'struct', 'this', 'hw', 'cpu', 'gba', 'bus',
              'rtc', 'inline', 'void', 'bool', 'function', 'return', 'new', 'Math'}
KEEP_KW = {'if', 'else', 'for', 'while', 'switch', 'case', 'default', 'break', 'continue', 'do'}


def strip(src, lang):
    src = re.sub(r'/\*.*?\*/', ' ', src, flags=re.S)
    src = re.sub(r'//[^\n]*', ' ', src)
    src = re.sub(r'"(\\.|[^"\\])*"|\'(\\.|[^\'\\])*\'|`(\\.|[^`\\])*`', ' S ', src)
    src = re.sub(r'\bmLOG\s*\([^;]*\);', ' ', src)
    src = src.replace('->', '.')
    src = re.sub(r'\((?:const\s+)?(?:u?int(?:8|16|32|64)_t|unsigned|int|float|double|uint8_t)\s*\)', ' ', src)  # C casts
    return src


def tokens(src):
    out = []  # (token, line)
    for ln_no, line in enumerate(src.split('\n'), 1):
        for t in TOK.findall(line):
            if re.match(r'[A-Za-z_]', t):
                if t in DROP_IDENT:
                    continue
                t = t if t in KEEP_KW else 'I'
            elif re.match(r'0x', t):
                t = str(int(t, 16))
            elif t in ('===',):
                t = '=='
            elif t in ('!==',):
                t = '!='
            elif t in ('>>>',):
                t = '>>'
            elif re.match(r'\d', t):
                t = t.rstrip('f')
                if '.' in t:
                    t = str(float(t))
            out.append((t, ln_no))
    # collapse member-access chains (I . I . I -> I) so `hw->rtc.bits` and `rtc.bits` match
    col = []
    for t in out:
        if len(col) >= 2 and t[0] == 'I' and col[-1][0] == '.' and col[-2][0] == 'I':
            col.pop(); continue
        col.append(t)
    return col


def kgrams(toks):
    res = []
    for i in range(len(toks) - K + 1):
        seq = ' '.join(t for t, _ in toks[i:i + K])
        if len(set(t for t, _ in toks[i:i + K])) < 5:  # skip trivial runs like "I , I , I"
            continue
        res.append((hashlib.md5(seq.encode()).hexdigest()[:12], toks[i][1], toks[i + K - 1][1], seq))
    return res


def load(path):
    src = open(path, encoding='utf-8', errors='replace').read()
    return tokens(strip(src, os.path.splitext(path)[1]))


def main():
    ours = sys.argv[1]
    refs = sys.argv[2:]
    ref_index = collections.defaultdict(set)
    for r in refs:
        for root, _, files in os.walk(r):
            if 'third-party' in root or '/platform' in root or '/test' in root:
                continue
            for f in files:
                if f.endswith(('.c', '.h', '.cpp', '.hpp')):
                    p = os.path.join(root, f)
                    for h, a, b, seq in kgrams(load(p)):
                        ref_index[h].add('%s:%d' % (os.path.relpath(p, os.path.dirname(r.rstrip('/'))), a))
    for f in sorted(os.listdir(ours)):
        if not f.endswith('.js'):
            continue
        p = os.path.join(ours, f)
        grams = kgrams(load(p))
        hit_lines = collections.defaultdict(set)
        for h, a, b, seq in grams:
            if h in ref_index:
                for ln in range(a, b + 1):
                    hit_lines[ln] |= set(sorted(ref_index[h])[:3])
        total = len(set(l for _, a, b, _ in grams for l in range(a, b + 1)))
        print('== %s: %d of %d code lines covered by shared %d-grams' % (f, len(hit_lines), total, K))
        # group consecutive lines into ranges
        lines = sorted(hit_lines)
        ranges, start, prev = [], None, None
        for ln in lines:
            if start is None:
                start = prev = ln
            elif ln == prev + 1:
                prev = ln
            else:
                ranges.append((start, prev)); start = prev = ln
        if start is not None:
            ranges.append((start, prev))
        for a, b in ranges:
            refs_here = set()
            for ln in range(a, b + 1):
                refs_here |= hit_lines[ln]
            print('   lines %d-%d  ~ %s' % (a, b, ', '.join(sorted(refs_here)[:4])))


if __name__ == '__main__':
    main()
