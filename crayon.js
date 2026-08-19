/**
 * Crayon — deal, pot, done.
 * Works in Node (tests) and the browser (window.Crayon).
 */
(function (root) {
  "use strict";

  var PaintApi =
    typeof Paint !== "undefined"
      ? Paint
      : typeof require === "function"
        ? require("./paint.js")
        : {};

  function cloneSession(s) {
    return {
      pictureIndex: s.pictureIndex,
      selectedColor: s.selectedColor,
      complete: s.complete
    };
  }

  function usedColors(pictureIndex) {
    var used = {};
    var rows = PaintApi.layout(pictureIndex) || [];
    rows.forEach(function (c) {
      used[c.color] = true;
    });
    return used;
  }

  function createSession(opts) {
    opts = opts || {};
    var paint = PaintApi.createSession({ random: opts.random });
    return {
      pictureIndex: paint.pictureIndex,
      selectedColor: 1,
      complete: false
    };
  }

  function pictureId(session) {
    return PaintApi.pictureId({ pictureIndex: session.pictureIndex });
  }

  function selectColor(session, n) {
    var next = cloneSession(session);
    var used = usedColors(next.pictureIndex);
    if (typeof n !== "number" || n !== Math.floor(n) || n < 1 || !used[n]) {
      return { ok: false, session: next };
    }
    next.selectedColor = n;
    return { ok: true, session: next };
  }

  function done(session) {
    var next = cloneSession(session);
    next.complete = true;
    return { ok: true, session: next };
  }

  function playAgain(session, random) {
    return createSession({ random: random });
  }

  var Crayon = {
    createSession: createSession,
    selectColor: selectColor,
    done: done,
    playAgain: playAgain,
    pictureId: pictureId
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Crayon;
  } else {
    root.Crayon = Crayon;
  }
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);
