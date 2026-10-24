"""Minimal writers for Android binary XML (AndroidManifest.xml) and resources.arsc."""
import struct

TYPE_REFERENCE, TYPE_STRING, TYPE_INT_DEC, TYPE_INT_HEX, TYPE_INT_BOOLEAN = 0x01, 0x03, 0x10, 0x11, 0x12
ANDROID_NS = 'http://schemas.android.com/apk/res/android'


def pad4(b):
    return b + b'\0' * ((4 - len(b) % 4) % 4)


def string_pool(strings, utf8):
    """ResStringPool chunk."""
    offsets, data = [], b''
    for s in strings:
        offsets.append(len(data))
        if utf8:
            enc = s.encode('utf-8')
            u16len = len(s)
            def ln(n):
                return bytes([n]) if n < 0x80 else bytes([0x80 | (n >> 8), n & 0xFF])
            data += ln(u16len) + ln(len(enc)) + enc + b'\0'
        else:
            enc = s.encode('utf-16-le')
            n = len(enc) // 2
            data += (struct.pack('<H', n) if n < 0x8000 else struct.pack('<HH', 0x8000 | (n >> 16), n & 0xFFFF)) + enc + b'\0\0'
    data = pad4(data)
    header_size = 28
    strings_start = header_size + 4 * len(strings)
    size = strings_start + len(data)
    flags = 0x100 if utf8 else 0
    head = struct.pack('<HHIIIIII', 0x0001, header_size, size, len(strings), 0, flags, strings_start, 0)
    return head + b''.join(struct.pack('<I', o) for o in offsets) + data


class Manifest:
    """Builds a binary AndroidManifest.xml from a tiny element tree.

    node = (tag, [(ns, name, resid_or_None, type, value)], [children])
    """

    def __init__(self, root):
        self.root = root
        attr_names = []  # names with resource ids must come first, in resource-map order
        others = []

        def walk(n):
            tag, attrs, kids = n
            for ns, name, resid, typ, val in attrs:
                if resid is not None and (name, resid) not in attr_names:
                    attr_names.append((name, resid))
            for k in kids:
                walk(k)
        walk(root)
        self.attr_names = attr_names
        self.strings = [a[0] for a in attr_names]
        self.resmap = [a[1] for a in attr_names]

        def add(s):
            if s not in self.strings:
                self.strings.append(s)
        add('android'); add(ANDROID_NS)

        def walk2(n):
            tag, attrs, kids = n
            add(tag)
            for ns, name, resid, typ, val in attrs:
                if resid is None:
                    add(name)
                if typ == TYPE_STRING:
                    add(val)
            for k in kids:
                walk2(k)
        walk2(root)

    def idx(self, s):
        return self.strings.index(s)

    def build(self):
        chunks = []
        NS = self.idx(ANDROID_NS)
        chunks.append(struct.pack('<HHIIIII', 0x0100, 16, 24, 1, 0xFFFFFFFF, self.idx('android'), NS))

        def elem(n, line=[2]):
            tag, attrs, kids = n
            # sort attributes by resource id (attrs without id last), as aapt does
            attrs = sorted(attrs, key=lambda a: (a[2] is None, a[2] or 0))
            body = b''
            for ns, name, resid, typ, val in attrs:
                ns_i = NS if ns == 'android' else 0xFFFFFFFF
                name_i = self.idx(name)
                if typ == TYPE_STRING:
                    raw = self.idx(val); data = raw
                else:
                    raw = 0xFFFFFFFF; data = val & 0xFFFFFFFF
                body += struct.pack('<IIIHBBI', ns_i, name_i, raw, 8, 0, typ, data)
            ext = struct.pack('<IIHHHHHH', 0xFFFFFFFF, self.idx(tag), 20, 20, len(attrs), 0, 0, 0)
            size = 16 + len(ext) + len(body)
            chunks.append(struct.pack('<HHIII', 0x0102, 16, size, line[0], 0xFFFFFFFF) + ext + body)
            line[0] += 1
            for k in kids:
                elem(k)
            chunks.append(struct.pack('<HHIIIII', 0x0103, 16, 24, line[0], 0xFFFFFFFF, 0xFFFFFFFF, self.idx(tag)))
            line[0] += 1
        elem(self.root)
        chunks.append(struct.pack('<HHIIIII', 0x0101, 16, 24, 99, 0xFFFFFFFF, self.idx('android'), NS))
        pool = string_pool(self.strings, utf8=False)
        resmap = struct.pack('<HHI', 0x0180, 8, 8 + 4 * len(self.resmap)) + b''.join(struct.pack('<I', r) for r in self.resmap)
        body = pool + resmap + b''.join(chunks)
        return struct.pack('<HHI', 0x0003, 8, 8 + len(body)) + body


def resources_arsc(package_name, type_name, entries):
    """resources.arsc with one package (0x7f), one type and file-path entries.

    entries = [(key_name, 'res/...path')]; resource ids are 0x7f010000 + index.
    """
    values = string_pool([p for _, p in entries], utf8=True)
    type_strings = string_pool([type_name], utf8=True)
    key_strings = string_pool([k for k, _ in entries], utf8=True)
    n = len(entries)
    spec = struct.pack('<HHIBBHI', 0x0202, 16, 16 + 4 * n, 1, 0, 0, n) + b'\0\0\0\0' * n
    config = struct.pack('<I', 64) + b'\0' * 60
    header_size = 8 + 4 + 4 + 4 + len(config)
    entries_start = header_size + 4 * n
    offs, ebytes = b'', b''
    for i in range(n):
        offs += struct.pack('<I', len(ebytes))
        ebytes += struct.pack('<HHI', 8, 0, i) + struct.pack('<HBBI', 8, 0, TYPE_STRING, i)
    typ = struct.pack('<HHIBBHII', 0x0201, header_size, entries_start + len(ebytes), 1, 0, 0, n, entries_start) + config + offs + ebytes
    name16 = package_name.encode('utf-16-le')[:254]
    name16 += b'\0' * (256 - len(name16))
    pkg_header_size = 288
    type_strings_off = pkg_header_size
    key_strings_off = type_strings_off + len(type_strings)
    pkg_body = type_strings + key_strings + spec + typ
    pkg = struct.pack('<HHII', 0x0200, pkg_header_size, pkg_header_size + len(pkg_body), 0x7f) + name16 + \
        struct.pack('<IIIII', type_strings_off, 1, key_strings_off, n, 0) + pkg_body
    body = values + pkg
    return struct.pack('<HHII', 0x0002, 12, 12 + len(body), 1) + body
