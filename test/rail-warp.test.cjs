/* Harness: runs the REAL canvas engine out of client.js against a recording
   fake canvas, so the warp gate is checked where it actually paints instead of
   only where the index is computed.

   It mounts the engine with a four-level ladder (off / low / high / max, gate at
   index 2), steps real animation frames, and looks for the galaxy swirl colour
   stops on the rail canvas. */
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "client.js"), "utf8");

const from = source.indexOf("    const EDGE = 31;");
const glyphs = source.indexOf("     * glyphs");
const to = glyphs < 0 ? -1 : source.lastIndexOf("/*", glyphs);
if (from < 0 || to < 0 || to < from) throw new Error("could not slice the engine");
const slice = source.slice(from, to) + "\n";

let pass = 0;
let fail = 0;
function ok(label, cond, extra) {
  if (cond) {
    pass++;
    console.log("  ok   " + label + (extra === undefined ? "" : " -> " + JSON.stringify(extra)));
  } else {
    fail++;
    console.log("  FAIL " + label + (extra === undefined ? "" : " -> " + JSON.stringify(extra)));
  }
}

/* ---- fake canvas that records colour stops ---- */

function makeCanvas(sink) {
  const grad = {
    addColorStop(offset, color) {
      sink.push(color);
    }
  };
  const ctx = new Proxy(
    {
      canvas: null,
      createLinearGradient: () => grad,
      createRadialGradient: () => grad,
      setTransform() {},
      save() {},
      restore() {},
      beginPath() {},
      closePath() {},
      moveTo() {},
      lineTo() {},
      arc() {},
      ellipse() {},
      rect() {},
      fill() {},
      stroke() {},
      clip() {},
      clearRect() {},
      fillRect() {},
      strokeRect() {},
      translate() {},
      rotate() {},
      scale() {},
      fillText() {},
      measureText: () => ({ width: 10 }),
      drawImage() {},
      putImageData() {},
      createImageData: () => ({ data: [] }),
      getImageData: () => ({ data: [] })
    },
    {
      get(target, key) {
        if (key in target) return target[key];
        /* every canvas call the engine may make, without listing them all */
        return function () {};
      },
      set(target, key, value) {
        target[key] = value;
        return true;
      }
    }
  );
  return {
    width: 420,
    height: 64,
    style: { setProperty() {} },
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 420, bottom: 64, width: 420, height: 64 })
  };
}

const railStops = [];
const els = {
  stage: makeCanvas([]),
  track: makeCanvas([]),
  bg: makeCanvas([]),
  rail: makeCanvas(railStops),
  fx: makeCanvas([]),
  flash: { classList: { add() {}, remove() {} }, offsetWidth: 1 },
  big: { classList: { add() {}, remove() {} }, offsetWidth: 1, textContent: "" }
};

/* ---- fake timing ---- */

let now = 1000;
const rafQueue = [];
const clock = { now: () => now };

function step(frames) {
  for (let i = 0; i < frames; i++) {
    const pending = rafQueue.splice(0, rafQueue.length);
    now += 16;
    for (const cb of pending) cb(now);
  }
}

const win = {
  devicePixelRatio: 1,
  addEventListener() {},
  removeEventListener() {},
  matchMedia: () => ({ matches: false })
};

const doc = {
  createElement: () => makeCanvas([])
};

const factory = new Function(
  "window",
  "document",
  "performance",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "ResizeObserver",
  slice + "\nreturn createEngine;"
)(win, doc, clock, (cb) => rafQueue.push(cb), () => {}, undefined);

const engine = factory();

const GALAXY = "hsla(258,100%,62%";
const hasGalaxy = () => railStops.some((c) => String(c).indexOf(GALAXY) === 0);

console.log("engine mounts with a four-level ladder, gate at high (index 2):");
engine.mount({
  els,
  count: 4,
  warpFrom: 2,
  texts: { boom: "BOOM", after: "AFTER" },
  reduce: false,
  onLevel() {},
  onRelease() {}
});
ok("engine is mounted", engine.isMounted() === true);

console.log("\noff / low stay below the gate:");
engine.setIndex(0, true);
railStops.length = 0;
step(4);
ok("no swirl at off", hasGalaxy() === false);
engine.setIndex(1, true);
railStops.length = 0;
step(4);
ok("no swirl at low", hasGalaxy() === false);

console.log("\nhigh is the gate:");
engine.setIndex(2, true);
railStops.length = 0;
step(4);
ok("swirl at high", hasGalaxy() === true);
railStops.length = 0;
step(30);
ok("swirl persists at high", hasGalaxy() === true);

console.log("\nmax keeps the same look:");
engine.setIndex(3, true);
railStops.length = 0;
step(4);
ok("swirl at max", hasGalaxy() === true);

console.log("\ndropping back below the gate switches it off:");
engine.setIndex(1, true);
step(60);                       /* let the eased heat decay */
railStops.length = 0;
step(4);
ok("swirl gone at low", hasGalaxy() === false);

console.log("\na three-level ladder without 'high' starts at the last rung at or below it:");
engine.unmount();
railStops.length = 0;
engine.mount({
  els,
  count: 3,
  warpFrom: 1,
  texts: { boom: "BOOM", after: "AFTER" },
  reduce: false,
  onLevel() {},
  onRelease() {}
});
engine.setIndex(1, true);
step(4);
ok("swirl from index 1 of 3", hasGalaxy() === true);
engine.setIndex(0, true);
step(60);
railStops.length = 0;
step(4);
ok("no swirl at the bottom of that ladder", hasGalaxy() === false);

console.log("\n" + (fail === 0 ? "ALL PASS (" + pass + ")" : fail + " FAILED, " + pass + " passed"));
process.exit(fail === 0 ? 0 : 1);
