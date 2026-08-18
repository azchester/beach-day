#!/usr/bin/env python3
"""Validate authored scene SVGs and emit paint-layouts.js."""
from __future__ import print_function

import collections
import json
import os
import re
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAINT = os.path.join(ROOT, "assets", "paint")
OUT_JS = os.path.join(ROOT, "paint-layouts.js")
MENU_SVG = os.path.join(PAINT, "menu-preview.svg")

PICTURES = ["sun", "crab", "sandcastle", "fish", "starfish", "boat", "shell", "bucket"]
RASTER_SIZE = 100
MIN_CELLS = 16
MAX_CELLS = 22
MIN_K = 7
MAX_K = 8
SLIVER_FRAC = 0.012
HOLE_FRAC = 0.02
CURVE_SAMPLES = 6
FOAM_NAMES = frozenset(["foam"])
FOAM_HEX = frozenset(["#fff", "#ffffff", "#fff8ee"])

# Same table as paint.js (Task 1). Do not import JS.
PALETTES = {
    "sun": ["sunflower", "orange", "sky", "sand", "water", "kelp", "coral", "peach"],
    "crab": ["coral", "sand", "sky", "water", "orange", "kelp", "peach", "sunflower"],
    "sandcastle": ["sand", "orange", "sky", "navy", "coral", "water", "sunflower", "kelp"],
    "fish": ["sunflower", "water", "sky", "navy", "coral", "kelp", "orange", "sand"],
    "starfish": ["orange", "sand", "water", "sky", "coral", "sunflower", "peach", "kelp"],
    "boat": ["coral", "peach", "sky", "water", "sunflower", "navy", "sand", "orange"],
    "shell": ["peach", "orange", "sand", "kelp", "sunflower", "water", "coral", "sky"],
    "bucket": ["coral", "sand", "peach", "navy", "sky", "orange", "sunflower", "water"],
}
COLOR_HEX = {
    "sunflower": "#ffe14a",
    "orange": "#f4a03c",
    "coral": "#e24b3c",
    "peach": "#f7c09a",
    "sand": "#f2d04a",
    "foam": "#fff8ee",
    "sky": "#4eb0ea",
    "water": "#2aa8a8",
    "kelp": "#2f7a52",
    "navy": "#2a3a6a",
}

_PATH_TAG = re.compile(r"<path\b([^>]*)/?>", re.I)
_ATTR = re.compile(r"""([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')""")
_CMD = frozenset("MLHVQCZmlhvqcz")
_NUM = re.compile(r"[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?")


def _svg_attrs(blob):
    out = {}
    for m in _ATTR.finditer(blob):
        key = m.group(1)
        val = m.group(3) if m.group(3) is not None else m.group(4)
        out[key] = val
    return out


def parse_scene(svg_text):
    cells = []
    ink = []
    for m in _PATH_TAG.finditer(svg_text):
        attrs = _svg_attrs(m.group(1))
        d = (attrs.get("d") or "").strip()
        if not d:
            continue
        color_raw = attrs.get("data-color")
        if color_raw is None or str(color_raw).strip() == "":
            ink.append(d)
            continue
        try:
            color = int(str(color_raw).strip())
        except ValueError:
            raise SystemExit("bad data-color {!r}".format(color_raw))
        cells.append(
            {
                "role": attrs.get("data-role") or "",
                "color": color,
                "d": d,
            }
        )
    return {"cells": cells, "ink": ink}


def tokenize_path(d):
    tokens = []
    i = 0
    n = len(d)
    while i < n:
        c = d[i]
        if c in " \t\n\r,":
            i += 1
            continue
        if c in _CMD:
            tokens.append(c)
            i += 1
            continue
        m = _NUM.match(d, i)
        if not m:
            raise SystemExit("bad path token at {}: {!r}".format(i, d[i : i + 12]))
        tokens.append(m.group(0))
        i = m.end()
    return tokens


def _is_cmd(tok):
    return isinstance(tok, str) and len(tok) == 1 and tok in _CMD


def _quad(p0, p1, p2, t):
    u = 1.0 - t
    return (
        u * u * p0[0] + 2.0 * u * t * p1[0] + t * t * p2[0],
        u * u * p0[1] + 2.0 * u * t * p1[1] + t * t * p2[1],
    )


def _cubic(p0, p1, p2, p3, t):
    u = 1.0 - t
    return (
        u * u * u * p0[0] + 3.0 * u * u * t * p1[0] + 3.0 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3.0 * u * u * t * p1[1] + 3.0 * u * t * t * p2[1] + t * t * t * p3[1],
    )


def path_rings(d, samples=CURVE_SAMPLES):
    tokens = tokenize_path(d)
    rings = []
    ring = []
    i = 0
    cx = cy = 0.0
    sx = sy = 0.0

    def flush():
        if len(ring) >= 2:
            rings.append(list(ring))
        del ring[:]

    def add(pt):
        ring.append(pt)

    def take_pair():
        nonlocal i
        if i + 1 >= len(tokens) or _is_cmd(tokens[i]) or _is_cmd(tokens[i + 1]):
            raise SystemExit("path command missing x y")
        x, y = float(tokens[i]), float(tokens[i + 1])
        i += 2
        return x, y

    while i < len(tokens):
        raw = tokens[i]
        if not _is_cmd(raw):
            raise SystemExit("expected path command, got {!r}".format(raw))
        i += 1
        if raw in "mlhvqc":
            raise SystemExit("relative path command {} not supported".format(raw))
        cmd = "Z" if raw in "Zz" else raw
        if cmd == "M":
            if ring:
                flush()
            cx, cy = take_pair()
            sx, sy = cx, cy
            add((cx, cy))
            while i + 1 < len(tokens) and not _is_cmd(tokens[i]):
                cx, cy = take_pair()
                add((cx, cy))
        elif cmd == "L":
            while i + 1 < len(tokens) and not _is_cmd(tokens[i]):
                cx, cy = take_pair()
                add((cx, cy))
        elif cmd == "H":
            while i < len(tokens) and not _is_cmd(tokens[i]):
                cx = float(tokens[i])
                i += 1
                add((cx, cy))
        elif cmd == "V":
            while i < len(tokens) and not _is_cmd(tokens[i]):
                cy = float(tokens[i])
                i += 1
                add((cx, cy))
        elif cmd == "Q":
            while i + 3 < len(tokens) and not _is_cmd(tokens[i]):
                x1, y1 = take_pair()
                x, y = take_pair()
                for s in range(1, samples + 1):
                    add(_quad((cx, cy), (x1, y1), (x, y), s / float(samples)))
                cx, cy = x, y
        elif cmd == "C":
            while i + 5 < len(tokens) and not _is_cmd(tokens[i]):
                x1, y1 = take_pair()
                x2, y2 = take_pair()
                x, y = take_pair()
                for s in range(1, samples + 1):
                    add(_cubic((cx, cy), (x1, y1), (x2, y2), (x, y), s / float(samples)))
                cx, cy = x, y
        elif cmd == "Z":
            if ring and ring[-1] != (sx, sy):
                add((sx, sy))
            cx, cy = sx, sy
            flush()
        else:
            raise SystemExit("unsupported path command {}".format(raw))
    flush()
    return rings


def flatten_path(d, samples=CURVE_SAMPLES):
    pts = []
    for ring in path_rings(d, samples):
        pts.extend(ring)
    return pts


def _even_odd(x, y, rings):
    inside = False
    for ring in rings:
        n = len(ring)
        if n < 2:
            continue
        j = n - 1
        for i in range(n):
            xi, yi = ring[i]
            xj, yj = ring[j]
            if (yi > y) != (yj > y):
                denom = yj - yi
                if denom != 0 and x < (xj - xi) * (y - yi) / float(denom) + xi:
                    inside = not inside
            j = i
    return inside


def raster_path(d, size=RASTER_SIZE):
    rings = path_rings(d)
    inside = set()
    for y in range(size):
        py = y + 0.5
        for x in range(size):
            if _even_odd(x + 0.5, py, rings):
                inside.add(y * size + x)
    return inside


def unique_ring(points):
    ring = list(points)
    if len(ring) >= 2 and ring[0] == ring[-1]:
        ring = ring[:-1]
    uniq = []
    for p in ring:
        if not uniq or (abs(uniq[-1][0] - p[0]) > 0.05 or abs(uniq[-1][1] - p[1]) > 0.05):
            uniq.append(p)
    return uniq


def is_axis_box(points):
    uniq = unique_ring(points)
    if len(uniq) != 4:
        return False
    xs = [p[0] for p in uniq]
    ys = [p[1] for p in uniq]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    if max_x - min_x < 1 or max_y - min_y < 1:
        return False
    for p in uniq:
        on_x = abs(p[0] - min_x) < 0.4 or abs(p[0] - max_x) < 0.4
        on_y = abs(p[1] - min_y) < 0.4 or abs(p[1] - max_y) < 0.4
        if not (on_x and on_y):
            return False
    return True


def label_point(region, w, h):
    inside = region
    dist = {}
    border = []
    for i in inside:
        x = i % w
        y = i // w
        edge = False
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= w or ny >= h or (ny * w + nx) not in inside:
                edge = True
                break
        if edge:
            dist[i] = 0
            border.append(i)
        else:
            dist[i] = 10**9
    q = collections.deque(border)
    while q:
        i = q.popleft()
        x = i % w
        y = i // w
        nd = dist[i] + 1
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= w or ny >= h:
                continue
            ni = ny * w + nx
            if ni not in inside:
                continue
            if nd < dist.get(ni, 10**9):
                dist[ni] = nd
                q.append(ni)
    best = max(inside, key=lambda i: (dist.get(i, 0), -(i // w), -(i % w)))
    return (best % w) + 0.5, (best // w) + 0.5


def _closed_d(d):
    return bool(re.search(r"[Zz]\s*$", d or ""))


def _color_is_foam(name):
    if name in FOAM_NAMES:
        return True
    hexv = (COLOR_HEX.get(name) or "").lower()
    return hexv in FOAM_HEX


def validate(name, cells, palette_names):
    size = RASTER_SIZE
    n = len(cells)
    if n < MIN_CELLS or n > MAX_CELLS:
        raise SystemExit("{} cell count {} not in {}..{}".format(name, n, MIN_CELLS, MAX_CELLS))
    used = sorted(set(c["color"] for c in cells))
    k = used[-1] if used else 0
    if k < MIN_K or k > MAX_K or used != list(range(1, k + 1)):
        raise SystemExit("{} colors {} not exactly 1..K with K in {}..{}".format(name, used, MIN_K, MAX_K))
    used_names = []
    for color in used:
        if color < 1 or color > len(palette_names):
            raise SystemExit("{} color {} is outside the palette".format(name, color))
        cname = palette_names[color - 1]
        if _color_is_foam(cname):
            raise SystemExit("{} color {} maps to foam/white ({})".format(name, color, cname))
        used_names.append(cname)
    for needed in ("sky", "water", "sand"):
        if needed not in used_names:
            raise SystemExit("{} missing {}".format(name, needed))
    area = float(size * size)
    min_cell = SLIVER_FRAC * area
    union = set()
    for i, cell in enumerate(cells):
        d = cell.get("d") or ""
        if not _closed_d(d):
            raise SystemExit("{} cell {} is an open path".format(name, i))
        pts = flatten_path(d)
        if is_axis_box(pts):
            raise SystemExit("{} cell {} is an axis-aligned rectangle".format(name, i))
        pix = raster_path(d, size)
        if len(pix) < min_cell:
            raise SystemExit(
                "{} cell {} raster {} < 1.2% of {}".format(name, i, len(pix), int(area))
            )
        union |= pix
    uncovered = size * size - len(union)
    if uncovered > HOLE_FRAC * area:
        raise SystemExit(
            "{} uncovered {} pixels > 2% of {}".format(name, uncovered, int(area))
        )


def js_escape(s):
    return s.replace("\\", "\\\\").replace('"', '\\"')


def write_js(all_layouts, all_ink):
    lines = [
        "/**",
        " * Paint-by-number facets from authored scene SVGs.",
        " * Generated by scripts/build-paint-layouts.py — do not edit by hand.",
        " */",
        "(function (root) {",
        '  "use strict";',
        "  var PAINT_FACETS = {",
    ]
    for name in PICTURES:
        lines.append("    " + json.dumps(name) + ": [")
        for cell in all_layouts.get(name, []):
            lines.append(
                "      { color: %d, d: \"%s\", lx: %s, ly: %s },"
                % (cell["color"], js_escape(cell["d"]), cell["lx"], cell["ly"])
            )
        lines.append("    ],")
    lines.append("  };")
    lines.append("  var PAINT_INK = {")
    for name in PICTURES:
        lines.append("    " + json.dumps(name) + ": [")
        for d in all_ink.get(name, []):
            lines.append('      "%s",' % js_escape(d))
        lines.append("    ],")
    lines.extend(
        [
            "  };",
            '  if (typeof module !== "undefined" && module.exports) {',
            "    module.exports = PAINT_FACETS;",
            "    module.exports.INK = PAINT_INK;",
            "  } else {",
            "    root.PAINT_FACETS = PAINT_FACETS;",
            "    root.PAINT_INK = PAINT_INK;",
            "  }",
            "})(typeof window !== \"undefined\" ? window : typeof global !== \"undefined\" ? global : this);",
            "",
        ]
    )
    with open(OUT_JS, "w") as f:
        f.write("\n".join(lines))
    print("wrote", OUT_JS)


def write_menu_preview(sun_cells):
    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
        '<rect width="100" height="100" fill="#fff8ee"/>',
    ]
    for cell in sun_cells:
        parts.append(
            '<path d="%s" fill="#fff" stroke="#111" stroke-width="0.7" stroke-linejoin="round"/>'
            % cell["d"]
        )
        parts.append(
            '<text x="%s" y="%s" text-anchor="middle" dominant-baseline="middle" '
            'font-family="Tahoma, sans-serif" font-size="5.2" fill="#333">%d</text>'
            % (cell["lx"], cell["ly"] + 0.4, cell["color"])
        )
    parts.append("</svg>")
    with open(MENU_SVG, "w") as f:
        f.write("".join(parts))
    print("wrote", MENU_SVG)


def _pt(x, y):
    return "{:.2f} {:.2f}".format(x, y)


def _h_bulge(c, y_index, xs, ys, bump=3.2):
    mx = (xs[c] + xs[c + 1]) / 2.0
    my = ys[y_index]
    # Keep the outer frame on the viewBox so the blobs still tile the square.
    if abs(my) < 1e-9 or abs(my - 100) < 1e-9:
        return mx, my
    dy = bump if (c + y_index) % 2 == 0 else -bump
    return mx, my + dy


def _v_bulge(x_index, r, xs, ys, bump=3.2):
    mx = xs[x_index]
    my = (ys[r] + ys[r + 1]) / 2.0
    if abs(mx) < 1e-9 or abs(mx - 100) < 1e-9:
        return mx, my
    dx = bump if (x_index + r) % 2 == 0 else -bump
    return mx + dx, my


def _grid(cols, rows):
    xs = [100.0 * i / float(cols) for i in range(cols + 1)]
    ys = [100.0 * i / float(rows) for i in range(rows + 1)]
    return xs, ys


def _blob_d(c, r, xs, ys):
    tl = (xs[c], ys[r])
    tr = (xs[c + 1], ys[r])
    br = (xs[c + 1], ys[r + 1])
    bl = (xs[c], ys[r + 1])
    top = _h_bulge(c, r, xs, ys)
    right = _v_bulge(c + 1, r, xs, ys)
    bot = _h_bulge(c, r + 1, xs, ys)
    left = _v_bulge(c, r, xs, ys)
    return "M{}L{}L{}L{}L{}L{}L{}L{}Z".format(
        _pt(*tl), _pt(*top), _pt(*tr), _pt(*right), _pt(*br), _pt(*bot), _pt(*bl), _pt(*left)
    )


def _rect_d(c, r, xs, ys):
    x0, x1 = xs[c], xs[c + 1]
    y0, y1 = ys[r], ys[r + 1]
    return "M{:.2f} {:.2f}H{:.2f}V{:.2f}H{:.2f}Z".format(x0, y0, x1, y1, x0)


def _selftest_colors(n):
    colors = [((i % 8) + 1) for i in range(n)]
    for required in (3, 4, 5):
        if required not in colors:
            colors[required - 1] = required
    return colors


def _write_grid_svg(path, maker):
    cols, rows = 6, 3
    xs, ys = _grid(cols, rows)
    colors = _selftest_colors(cols * rows)
    parts = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">']
    i = 0
    for r in range(rows):
        for c in range(cols):
            color = colors[i]
            role = "sky" if color == 3 else "sand" if color == 4 else "water" if color == 5 else "cell"
            parts.append(
                '<path data-role="{}" data-color="{}" d="{}"/>'.format(role, color, maker(c, r, xs, ys))
            )
            i += 1
    parts.append('<path d="M42 48Q50 56 58 48" fill="none"/>')
    parts.append("</svg>")
    with open(path, "w") as f:
        f.write("".join(parts))


def _tmp_svg(maker):
    fd, path = tempfile.mkstemp(prefix="paint-selftest-", suffix=".svg")
    os.close(fd)
    try:
        _write_grid_svg(path, maker)
        with open(path) as f:
            return parse_scene(f.read())
    finally:
        if os.path.isfile(path):
            os.unlink(path)


def run_selftest():
    before = os.path.getmtime(OUT_JS) if os.path.isfile(OUT_JS) else None
    q_pts = flatten_path("M0 0Q0 10 10 10Z")
    c_pts = flatten_path("M0 0C0 5 5 10 10 10Z")
    if len(q_pts) < 7 or len(c_pts) < 7:
        raise SystemExit("Q/C flatten should sample 6 curve points")
    if not is_axis_box(flatten_path("M0 0H10V10H0Z")):
        raise SystemExit("H/V rectangle should be an axis box")

    good = _tmp_svg(_blob_d)
    if len(good["cells"]) != 18:
        raise SystemExit("selftest good svg should have 18 cells")
    if not good["ink"]:
        raise SystemExit("selftest good svg should keep ink-only paths")
    validate("selftest", good["cells"], PALETTES["sun"])
    for cell in good["cells"]:
        pix = raster_path(cell["d"])
        lx, ly = label_point(pix, RASTER_SIZE, RASTER_SIZE)
        if not (0 <= lx <= 100 and 0 <= ly <= 100):
            raise SystemExit("selftest label out of range")

    rect = _tmp_svg(_rect_d)
    if len(rect["cells"]) != 18:
        raise SystemExit("selftest rect svg should have 18 cells")
    raised = False
    try:
        validate("selftest-rect", rect["cells"], PALETTES["sun"])
    except SystemExit:
        raised = True
    if not raised:
        raise SystemExit("expected rectangle cell to fail validate")

    after = os.path.getmtime(OUT_JS) if os.path.isfile(OUT_JS) else None
    if after != before:
        raise SystemExit("selftest must not write paint-layouts.js")
    print("selftest ok")
    return 0


def load_picture(name):
    path = os.path.join(PAINT, "{}-scene.svg".format(name))
    if not os.path.isfile(path):
        raise SystemExit("missing {}".format(path))
    with open(path) as f:
        scene = parse_scene(f.read())
    validate(name, scene["cells"], PALETTES[name])
    layout = []
    for cell in scene["cells"]:
        pix = raster_path(cell["d"], RASTER_SIZE)
        lx, ly = label_point(pix, RASTER_SIZE, RASTER_SIZE)
        layout.append(
            {
                "color": cell["color"],
                "d": cell["d"],
                "lx": round(lx, 2),
                "ly": round(ly, 2),
            }
        )
    print("  {}  cells={}".format(name, len(layout)))
    return layout, scene["ink"]


def main():
    if "--selftest" in sys.argv:
        return run_selftest()
    all_layouts = {}
    all_ink = {}
    for name in PICTURES:
        print("facet", name)
        layout, ink = load_picture(name)
        all_layouts[name] = layout
        all_ink[name] = ink
    write_js(all_layouts, all_ink)
    write_menu_preview(all_layouts["sun"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
