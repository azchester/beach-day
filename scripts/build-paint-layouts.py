#!/usr/bin/env python3
"""Build organic paint-by-number facets from coloring-book outlines.

Modeled on drakarah/paintbynumbersgenerator:
  flood-fill regions, merge/split to an exact cell count, trace borders,
  emit quadratic SVG paths, place labels at the pole of inaccessibility.
"""
from __future__ import print_function

import collections
import json
import math
import os
import struct
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAINT = os.path.join(ROOT, "assets", "paint")
OUT_JS = os.path.join(ROOT, "paint-layouts.js")
MENU_SVG = os.path.join(PAINT, "menu-preview.svg")

PICTURES = ["sun", "crab", "sandcastle", "fish", "starfish", "boat", "shell", "bucket"]
COUNTS = {
    "easy": [4, 3, 2, 1],
    "medium": [5, 4, 3, 3, 3, 2],
    "hard": [8, 7, 6, 5, 5, 4, 3, 2],
}
CELL_N = {"easy": 10, "medium": 20, "hard": 40}
TARGET = 260
WALL_LUMA = 118


def load_png_as_rgb(png_path):
    tmp = tempfile.NamedTemporaryFile(suffix=".bmp", delete=False)
    tmp.close()
    try:
        subprocess.check_call(
            ["sips", "-s", "format", "bmp", "--out", tmp.name, png_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        with open(tmp.name, "rb") as f:
            data = f.read()
    finally:
        os.unlink(tmp.name)
    off = struct.unpack_from("<I", data, 10)[0]
    w, h = struct.unpack_from("<ii", data, 18)
    bpp = struct.unpack_from("<H", data, 28)[0]
    top_down = h < 0
    h = abs(h)
    row_size = ((bpp * w + 31) // 32) * 4
    pixels = []
    for y in range(h):
        src_y = y if top_down else (h - 1 - y)
        row = data[off + src_y * row_size : off + (src_y + 1) * row_size]
        step = 4 if bpp == 32 else 3
        for x in range(w):
            i = x * step
            b, g, r = row[i], row[i + 1], row[i + 2]
            pixels.append((r, g, b))
    return w, h, pixels


def downsample(w, h, pixels, target):
    scale = max(w, h) / float(target)
    nw = max(8, int(round(w / scale)))
    nh = max(8, int(round(h / scale)))
    out = []
    for y in range(nh):
        y0 = int(y * h / nh)
        y1 = max(y0 + 1, int((y + 1) * h / nh))
        for x in range(nw):
            x0 = int(x * w / nw)
            x1 = max(x0 + 1, int((x + 1) * w / nw))
            rs = gs = bs = n = 0
            for yy in range(y0, y1):
                base = yy * w
                for xx in range(x0, x1):
                    r, g, b = pixels[base + xx]
                    rs += r
                    gs += g
                    bs += b
                    n += 1
            out.append((rs // n, gs // n, bs // n))
    return nw, nh, out


def is_wall(rgb):
    r, g, b = rgb
    return (0.299 * r + 0.587 * g + 0.114 * b) < WALL_LUMA


def touches_edge(region, w, h):
    for i in region:
        x = i % w
        y = i // w
        if x == 0 or y == 0 or x == w - 1 or y == h - 1:
            return True
    return False


def dilate_walls(wall, w, h, times):
    cur = list(wall)
    for _ in range(times):
        nxt = list(cur)
        for i, on in enumerate(cur):
            if not on:
                continue
            x = i % w
            y = i // w
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < w and 0 <= ny < h:
                    nxt[ny * w + nx] = True
        cur = nxt
    return cur


def flood_regions(w, h, pixels):
    wall = dilate_walls([is_wall(p) for p in pixels], w, h, 1)
    seen = [False] * (w * h)
    interior = []
    for i, blocked in enumerate(wall):
        if blocked or seen[i]:
            continue
        stack = [i]
        seen[i] = True
        cells = []
        while stack:
            cur = stack.pop()
            cells.append(cur)
            x = cur % w
            y = cur // w
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if nx < 0 or ny < 0 or nx >= w or ny >= h:
                    continue
                ni = ny * w + nx
                if seen[ni] or wall[ni]:
                    continue
                seen[ni] = True
                stack.append(ni)
        if len(cells) < 4:
            continue
        region = set(cells)
        if touches_edge(region, w, h):
            continue
        interior.append(region)
    if not interior:
        # Open line art: use the cream field inset from the page edge.
        all_cream = [i for i, blocked in enumerate(wall) if not blocked]
        inset = {
            i
            for i in all_cream
            if 4 <= (i % w) < w - 4 and 4 <= (i // w) < h - 4
        }
        if inset:
            interior.append(inset)
    return interior, wall


def shared_border(a, b, w):
    n = 0
    for i in a:
        x = i % w
        y = i // w
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if (ny * w + nx) in b:
                n += 1
    return n


def absorb_tiny(regions, w, min_size):
    regions = [set(r) for r in regions]
    changed = True
    while changed:
        changed = False
        regions.sort(key=len)
        i = 0
        while i < len(regions):
            if len(regions[i]) >= min_size:
                break
            best = -1
            best_n = 0
            for j in range(len(regions)):
                if j == i:
                    continue
                n = shared_border(regions[i], regions[j], w)
                if n > best_n:
                    best_n = n
                    best = j
            if best < 0:
                i += 1
                continue
            regions[best] |= regions[i]
            del regions[i]
            changed = True
    return regions


def split_region(region, w):
    xs = [i % w for i in region]
    ys = [i // w for i in region]
    if max(xs) - min(xs) >= max(ys) - min(ys):
        mid = sorted(xs)[len(xs) // 2]
        a = {i for i in region if (i % w) < mid}
    else:
        mid = sorted(ys)[len(ys) // 2]
        a = {i for i in region if (i // w) < mid}
    b = region - a
    if len(a) < 3 or len(b) < 3:
        items = list(region)
        mid = len(items) // 2
        a = set(items[:mid])
        b = set(items[mid:])
    return a, b


def fit_count(regions, w, n):
    regions = [set(r) for r in regions if r]
    if not regions:
        raise SystemExit("fit_count given no regions")
    guard = 0
    while len(regions) > n and guard < 800:
        regions.sort(key=len)
        small = regions.pop(0)
        if not regions:
            regions.append(small)
            break
        best = 0
        best_n = -1
        for j, other in enumerate(regions):
            edge = shared_border(small, other, w)
            if edge > best_n:
                best_n = edge
                best = j
        regions[best] |= small
        guard += 1
    while len(regions) < n and guard < 800:
        regions.sort(key=len)
        big = regions.pop()
        if len(big) < 6:
            regions.append(big)
            break
        a, b = split_region(big, w)
        if not a or not b:
            regions.append(big)
            break
        regions.append(a)
        regions.append(b)
        guard += 1
    regions = [r for r in regions if r]
    while len(regions) < n:
        regions.sort(key=len)
        big = regions[-1]
        if len(big) < 2:
            extra = set(list(big))
            regions.append(extra)
            continue
        pixel = next(iter(big))
        big.remove(pixel)
        regions.append({pixel})
    regions.sort(key=len, reverse=True)
    return regions[:n]


def assign_colors(regions, counts):
    order = []
    for color, k in enumerate(counts, start=1):
        order.extend([color] * k)
    out = []
    for region, color in zip(regions, order):
        out.append((region, color))
    return out


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


def contour(region, w, h):
    nxt = collections.defaultdict(list)
    for i in region:
        x = i % w
        y = i // w
        if y == 0 or ((y - 1) * w + x) not in region:
            nxt[(x, y)].append((x + 1, y))
        if x + 1 >= w or (y * w + x + 1) not in region:
            nxt[(x + 1, y)].append((x + 1, y + 1))
        if y + 1 >= h or ((y + 1) * w + x) not in region:
            nxt[(x + 1, y + 1)].append((x, y + 1))
        if x == 0 or (y * w + x - 1) not in region:
            nxt[(x, y + 1)].append((x, y))
    if not nxt:
        return []
    start = min(nxt.keys(), key=lambda p: (p[1], p[0]))
    path = [start]
    used = set()
    cur = start
    for _ in range(len(nxt) * 4 + 8):
        opts = [p for p in nxt[cur] if (cur, p) not in used]
        if not opts:
            break
        nxtp = opts[0]
        used.add((cur, nxtp))
        cur = nxtp
        if cur == start:
            break
        path.append(cur)
    if path[0] != path[-1]:
        path.append(path[0])
    return path


def rdp(points, eps):
    if len(points) < 3:
        return points

    def dist(a, b, p):
        ax, ay = a
        bx, by = b
        px, py = p
        dx, dy = bx - ax, by - ay
        if dx == 0 and dy == 0:
            return math.hypot(px - ax, py - ay)
        t = ((px - ax) * dx + (py - ay) * dy) / float(dx * dx + dy * dy)
        t = max(0.0, min(1.0, t))
        return math.hypot(px - (ax + t * dx), py - (ay + t * dy))

    dmax = 0.0
    idx = 0
    for i in range(1, len(points) - 1):
        d = dist(points[0], points[-1], points[i])
        if d > dmax:
            idx = i
            dmax = d
    if dmax > eps:
        left = rdp(points[: idx + 1], eps)
        right = rdp(points[idx:], eps)
        return left[:-1] + right
    return [points[0], points[-1]]


def path_to_d(points, w, h):
    if len(points) < 3:
        return ""
    pts = rdp(points, 1.35)
    if len(pts) < 3:
        pts = points
    sx = 100.0 / w
    sy = 100.0 / h

    def xy(p):
        return p[0] * sx, p[1] * sy

    x0, y0 = xy(pts[0])
    parts = ["M{:.2f} {:.2f}".format(x0, y0)]
    for i in range(1, len(pts)):
        x1, y1 = xy(pts[i])
        px, py = xy(pts[i - 1])
        mx, my = (px + x1) / 2.0, (py + y1) / 2.0
        parts.append("Q{:.2f} {:.2f} {:.2f} {:.2f}".format(mx, my, x1, y1))
    parts.append("Z")
    return "".join(parts)


def build_picture(name):
    png = os.path.join(PAINT, name + "-outline.png")
    w0, h0, pix0 = load_png_as_rgb(png)
    w, h, pix = downsample(w0, h0, pix0, TARGET)
    regions, _wall = flood_regions(w, h, pix)
    regions = absorb_tiny(regions, w, min_size=18)
    if not regions:
        raise SystemExit("no regions in " + name)
    layouts = {}
    for diff, n in CELL_N.items():
        fitted = fit_count(regions, w, n)
        colored = assign_colors(fitted, COUNTS[diff])
        cells = []
        for region, color in colored:
            loop = contour(region, w, h)
            d = path_to_d(loop, w, h)
            if not d:
                xs = [i % w for i in region]
                ys = [i // w for i in region]
                x0, y0, x1, y1 = min(xs), min(ys), max(xs) + 1, max(ys) + 1
                loop = [(x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)]
                d = path_to_d(loop, w, h)
            lx, ly = label_point(region, w, h)
            cells.append(
                {
                    "color": color,
                    "d": d,
                    "lx": round(lx * 100.0 / w, 2),
                    "ly": round(ly * 100.0 / h, 2),
                }
            )
        if len(cells) != n:
            raise SystemExit(
                "{} {} expected {} cells, got {}".format(name, diff, n, len(cells))
            )
        layouts[diff] = cells
    print("  {}  easy={} medium={} hard={}".format(
        name, len(layouts["easy"]), len(layouts["medium"]), len(layouts["hard"])
    ))
    return layouts


def js_escape(s):
    return s.replace("\\", "\\\\").replace('"', '\\"')


def write_js(all_layouts):
    lines = [
        "/**",
        " * Organic paint-by-number facets generated from coloring-book outlines.",
        " * Path style follows drakarah/paintbynumbersgenerator (quadratic borders).",
        " */",
        "(function (root) {",
        '  "use strict";',
        "  var PAINT_FACETS = {",
    ]
    for name in PICTURES:
        lines.append("    " + json.dumps(name) + ": {")
        for diff in ("easy", "medium", "hard"):
            lines.append("      " + json.dumps(diff) + ": [")
            for cell in all_layouts[name][diff]:
                lines.append(
                    "        { color: %d, d: \"%s\", lx: %s, ly: %s },"
                    % (cell["color"], js_escape(cell["d"]), cell["lx"], cell["ly"])
                )
            lines.append("      ],")
        lines.append("    },")
    lines.extend(
        [
            "  };",
            "  if (typeof module !== \"undefined\" && module.exports) {",
            "    module.exports = PAINT_FACETS;",
            "  } else {",
            "    root.PAINT_FACETS = PAINT_FACETS;",
            "  }",
            "})(typeof window !== \"undefined\" ? window : typeof global !== \"undefined\" ? global : this);",
            "",
        ]
    )
    with open(OUT_JS, "w") as f:
        f.write("\n".join(lines))
    print("wrote", OUT_JS)


def write_menu_preview(sun_easy):
    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
        '<rect width="100" height="100" fill="#fff8ee"/>',
    ]
    for cell in sun_easy:
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


def main():
    all_layouts = {}
    for name in PICTURES:
        print("facet", name)
        all_layouts[name] = build_picture(name)
    write_js(all_layouts)
    write_menu_preview(all_layouts["sun"]["easy"])


if __name__ == "__main__":
    sys.exit(main())
