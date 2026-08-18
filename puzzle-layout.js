/**
 * Beach Puzzle — clamp, center, tidy positions.
 * Works in Node (tests) and the browser (window.PuzzleLayout).
 */
(function (root) {
  "use strict";

  function clonePos(pos) {
    var out = {};
    Object.keys(pos).forEach(function (key) {
      out[key] = { x: pos[key].x, y: pos[key].y };
    });
    return out;
  }

  function idsOf(ids) {
    return ids.map(function (id) {
      return id;
    });
  }

  function at(pos, id) {
    if (pos[id] !== undefined) return pos[id];
    return pos[String(id)];
  }

  function setAt(pos, id, x, y) {
    if (pos[id] !== undefined) {
      pos[id] = { x: x, y: y };
      return;
    }
    pos[String(id)] = { x: x, y: y };
  }

  function groupBox(pos, ids, box) {
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    idsOf(ids).forEach(function (id) {
      var p = at(pos, id);
      if (!p) return;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x + box > maxX) maxX = p.x + box;
      if (p.y + box > maxY) maxY = p.y + box;
    });
    if (minX === Infinity) return { x: 0, y: 0, w: 0, h: 0 };
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  function translate(pos, ids, dx, dy) {
    idsOf(ids).forEach(function (id) {
      var p = at(pos, id);
      if (!p) return;
      setAt(pos, id, p.x + dx, p.y + dy);
    });
  }

  function clampGroup(pos, ids, box, fieldW, fieldH) {
    var next = clonePos(pos);
    if (!ids || !ids.length) return next;
    var b = groupBox(next, ids, box);
    var dx = 0;
    var dy = 0;
    if (b.w >= fieldW) dx = -b.x;
    else if (b.x < 0) dx = -b.x;
    else if (b.x + b.w > fieldW) dx = fieldW - b.x - b.w;
    if (b.h >= fieldH) dy = -b.y;
    else if (b.y < 0) dy = -b.y;
    else if (b.y + b.h > fieldH) dy = fieldH - b.y - b.h;
    translate(next, ids, dx, dy);
    return next;
  }

  function centerGroup(pos, ids, box, fieldW, fieldH, bottomReserve) {
    var next = clonePos(pos);
    var b = groupBox(next, ids, box);
    var usableH = fieldH - (bottomReserve || 0);
    var tx = (fieldW - b.w) / 2;
    var ty = (usableH - b.h) / 2;
    translate(next, ids, tx - b.x, ty - b.y);
    return clampGroup(next, ids, box, fieldW, fieldH);
  }

  function overlaps(ax, ay, aw, ah, r) {
    if (!r || !r.w || !r.h) return false;
    return ax < r.x + r.w && ax + aw > r.x && ay < r.y + r.h && ay + ah > r.y;
  }

  function boxesOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function moveGroupTo(pos, ids, box, x, y) {
    var b = groupBox(pos, ids, box);
    translate(pos, ids, x - b.x, y - b.y);
  }

  function tidyPositions(opts) {
    var pos = clonePos(opts.pos);
    if (opts.complete) return pos;
    var box = opts.box;
    var fieldW = opts.fieldW;
    var fieldH = opts.fieldH;
    var gapWanted = opts.gap == null ? 8 : opts.gap;
    var preview = opts.preview || { x: 0, y: 0, w: 0, h: 0 };
    var reserve = opts.reserve || { x: fieldW, y: fieldH, w: 0, h: 0 };
    var source = clonePos(opts.pos);

    var clumps = [];
    var singles = [];
    (opts.groups || []).forEach(function (g) {
      var ids = g.slice();
      if (!ids.length) return;
      var item = { ids: ids, b: groupBox(source, ids, box) };
      if (ids.length > 1) clumps.push(item);
      else singles.push(item);
    });
    function byX(a, b) {
      if (a.b.x !== b.b.x) return a.b.x - b.b.x;
      return a.ids[0] - b.ids[0];
    }
    clumps.sort(byX);
    singles.sort(byX);

    var gaps = [gapWanted, Math.max(2, Math.floor(gapWanted / 2)), 2];
    var attempt;
    var best = null;
    for (attempt = 0; attempt < gaps.length; attempt++) {
      var trial = clonePos(source);
      var allowSingleOverlap = attempt === gaps.length - 1;
      placeClumps(trial, clumps, box, fieldW, fieldH, preview, gaps[attempt]);
      placeSingles(trial, singles, box, fieldW, fieldH, preview, reserve, gaps[attempt]);
      clumps.forEach(function (item) {
        var clamped = clampGroup(trial, item.ids, box, fieldW, fieldH);
        item.ids.forEach(function (id) {
          setAt(trial, id, at(clamped, id).x, at(clamped, id).y);
        });
      });
      singles.forEach(function (item) {
        var clamped = clampGroup(trial, item.ids, box, fieldW, fieldH);
        item.ids.forEach(function (id) {
          setAt(trial, id, at(clamped, id).x, at(clamped, id).y);
        });
      });
      if (validPack(trial, clumps, singles, box, preview, reserve, allowSingleOverlap)) {
        best = trial;
        break;
      }
      best = trial;
    }
    return best || pos;
  }

  function placeClumps(pos, clumps, box, fieldW, fieldH, preview, gap) {
    var x = gap;
    var y = gap;
    var rowH = 0;
    clumps.forEach(function (item) {
      var w = item.b.w;
      var h = item.b.h;
      function startXForRow(rowY) {
        if (rowY < preview.y + preview.h) return Math.max(gap, preview.x + preview.w + gap);
        return gap;
      }
      if (rowH === 0) x = startXForRow(y);
      if (x + w > fieldW - gap) {
        y += (rowH || h) + gap;
        rowH = 0;
        x = startXForRow(y);
        if (x + w > fieldW - gap) {
          y = Math.max(y, preview.y + preview.h + gap);
          x = gap;
        }
      }
      moveGroupTo(pos, item.ids, box, x, y);
      x += w + gap;
      rowH = Math.max(rowH, h);
    });
  }

  function placeSingles(pos, singles, box, fieldW, fieldH, preview, reserve, gap) {
    var x = gap;
    var y = fieldH - box - gap;
    singles.forEach(function (item) {
      function blocked(px, py) {
        return overlaps(px, py, box, box, preview) || overlaps(px, py, box, box, reserve);
      }
      if (x + box > fieldW - gap || blocked(x, y)) {
        if (blocked(x, y) && x + box <= fieldW - gap && !overlaps(x, y, box, box, reserve)) {
          x = preview.x + preview.w + gap;
        } else {
          y -= box + gap;
          x = gap;
        }
      }
      if (blocked(x, y)) {
        if (overlaps(x, y, box, box, preview)) x = preview.x + preview.w + gap;
        if (overlaps(x, y, box, box, reserve)) {
          y -= box + gap;
          x = gap;
        }
      }
      moveGroupTo(pos, item.ids, box, x, y);
      x += box + gap;
    });
  }

  function validPack(pos, clumps, singles, box, preview, reserve, allowSingleOverlap) {
    var placed = [];
    var ok = true;
    function consider(item, isSingle) {
      var b = groupBox(pos, item.ids, box);
      if (overlaps(b.x, b.y, b.w, b.h, preview)) ok = false;
      if (overlaps(b.x, b.y, b.w, b.h, reserve)) ok = false;
      placed.forEach(function (other) {
        if (!boxesOverlap(b, other.b)) return;
        if (allowSingleOverlap && isSingle && other.single) return;
        ok = false;
      });
      placed.push({ b: b, single: isSingle });
    }
    clumps.forEach(function (item) {
      consider(item, false);
    });
    singles.forEach(function (item) {
      consider(item, true);
    });
    return ok;
  }

  var PuzzleLayout = {
    groupBox: groupBox,
    clampGroup: clampGroup,
    centerGroup: centerGroup,
    tidyPositions: tidyPositions
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = PuzzleLayout;
  } else {
    root.PuzzleLayout = PuzzleLayout;
  }
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);
