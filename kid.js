/**
 * Girl idle / react helpers.
 * Works in Node (tests) and the browser (window.BeachKid).
 */
(function (root) {
  "use strict";

  var POSE_MS = {
    think: 1000,
    glance: 600,
    look: 1000,
    nod: 550,
    hmm: 550,
    fidget: 700
  };

  function rand(random) {
    return typeof random === "function" ? random() : Math.random();
  }

  function idleDelay(random) {
    return 8000 + Math.floor(rand(random) * 6001);
  }

  function nextIdle(lastIdle, thoughtThisStretch, random) {
    if (!thoughtThisStretch) return "think";
    if (lastIdle === "look") return "fidget";
    if (lastIdle === "fidget") return "look";
    return rand(random) < 0.5 ? "look" : "fidget";
  }

  function glanceSide(kidCenterX, targetX) {
    return targetX < kidCenterX ? "left" : "right";
  }

  function canStart(state) {
    return state === "still";
  }

  function shouldReact(kind, info) {
    info = info || {};
    if (info.won) return false;
    if (kind === "hmm" && !info.didMiss) return false;
    if (kind === "glance" && info.isDeselect) return false;
    return true;
  }

  var BeachKid = {
    POSE_MS: POSE_MS,
    idleDelay: idleDelay,
    nextIdle: nextIdle,
    glanceSide: glanceSide,
    canStart: canStart,
    shouldReact: shouldReact
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = BeachKid;
  } else {
    root.BeachKid = BeachKid;
  }
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this);
