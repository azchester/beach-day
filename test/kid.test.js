/**
 * Girl idle / react helpers.
 * Run: node test/kid.test.js
 */
"use strict";

var path = require("path");
var assert = require("assert");
var BeachKid = require(path.join(__dirname, "..", "kid.js"));

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log("PASS  " + name);
  } catch (e) {
    failed++;
    console.error("FAIL  " + name);
    console.error("      " + (e && e.message ? e.message : e));
  }
}

function always(v) {
  return function () {
    return v;
  };
}

test("idleDelay stays inside 8000–14000", function () {
  assert.strictEqual(BeachKid.idleDelay(always(0)), 8000);
  assert.strictEqual(BeachKid.idleDelay(always(0.999999)), 14000);
  var n = BeachKid.idleDelay(always(0.5));
  assert.ok(n >= 8000 && n <= 14000, "got " + n);
  assert.strictEqual(n, Math.floor(n));
});

test("first idle in a stretch is think", function () {
  assert.strictEqual(BeachKid.nextIdle(null, false, always(0.9)), "think");
  assert.strictEqual(BeachKid.nextIdle("look", false, always(0.9)), "think");
  assert.strictEqual(BeachKid.nextIdle("fidget", false, always(0.1)), "think");
});

test("later idles are look or fidget and do not immediately repeat", function () {
  assert.strictEqual(BeachKid.nextIdle("look", true, always(0.1)), "fidget");
  assert.strictEqual(BeachKid.nextIdle("fidget", true, always(0.9)), "look");
  assert.strictEqual(BeachKid.nextIdle("think", true, always(0.1)), "look");
  assert.strictEqual(BeachKid.nextIdle("think", true, always(0.6)), "fidget");
  assert.strictEqual(BeachKid.nextIdle(null, true, always(0.1)), "look");
});

test("glanceSide left vs right, equal x is right", function () {
  assert.strictEqual(BeachKid.glanceSide(100, 50), "left");
  assert.strictEqual(BeachKid.glanceSide(100, 150), "right");
  assert.strictEqual(BeachKid.glanceSide(100, 100), "right");
});

test("canStart is true only while still", function () {
  assert.strictEqual(BeachKid.canStart("still"), true);
  assert.strictEqual(BeachKid.canStart("posing"), false);
  assert.strictEqual(BeachKid.canStart(undefined), false);
});

test("shouldReact skips win", function () {
  assert.strictEqual(BeachKid.shouldReact("nod", { won: true }), false);
  assert.strictEqual(BeachKid.shouldReact("hmm", { won: true, didMiss: true }), false);
  assert.strictEqual(BeachKid.shouldReact("glance", { won: true }), false);
});

test("shouldReact skips hmm when didMiss is false", function () {
  assert.strictEqual(BeachKid.shouldReact("hmm", {}), false);
  assert.strictEqual(BeachKid.shouldReact("hmm", { didMiss: false }), false);
  assert.strictEqual(BeachKid.shouldReact("hmm", { didMiss: true }), true);
});

test("shouldReact skips glance when isDeselect is true", function () {
  assert.strictEqual(BeachKid.shouldReact("glance", { isDeselect: true }), false);
  assert.strictEqual(BeachKid.shouldReact("glance", { isDeselect: false }), true);
  assert.strictEqual(BeachKid.shouldReact("glance", {}), true);
});

test("shouldReact allows nod on splash/snap/hop", function () {
  assert.strictEqual(BeachKid.shouldReact("nod", {}), true);
  assert.strictEqual(BeachKid.shouldReact("nod", { won: false }), true);
});

test("POSE_MS matches the spec table", function () {
  assert.deepStrictEqual(BeachKid.POSE_MS, {
    think: 1000,
    glance: 600,
    look: 1000,
    nod: 550,
    hmm: 550,
    fidget: 700
  });
});

console.log(passed + " passed, " + failed + " failed");
if (failed) process.exit(1);
