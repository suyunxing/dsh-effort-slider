"use strict";
/* Exercises composerBox() and createHalo() against a fake DOM.
 *
 * The halo is geometry + CSS custom properties: no canvas, no canvas stubs
 * needed. What we want to prove is that the card is found from the trigger,
 * that the ring is positioned on the card's rect, and that the effort level
 * drives alpha, glow radius and the "hot" breathing flag. */
const fs = require("node:fs");
const path = require("node:path");

const SOURCE = path.join(__dirname, "..", "client.js");

let failures = 0;
let checks = 0;
function eq(label, actual, expected) {
  checks += 1;
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    failures += 1;
    console.log("  FAIL   " + label + "\n         got " + a + "\n         want " + b);
  } else {
    console.log("  ok     " + label);
  }
}

/* ---------------- slice ---------------- */

const src = fs.readFileSync(SOURCE, "utf8");
const from = src.indexOf("    function composerBox(el) {");
if (from < 0) throw new Error("composerBox not found");
const tail = "      return { place, release };\n    }\n";
const to = src.indexOf(tail, from);
if (to < 0) throw new Error("end of createHalo not found");
const slice = src.slice(from, to + tail.length);

/* ---------------- fake dom ---------------- */

function makeStyle() {
  const vars = {};
  return {
    vars,
    opacity: "0",
    left: "",
    top: "",
    width: "",
    height: "",
    borderRadius: "",
    setProperty(name, value) {
      vars[name] = value;
    }
  };
}

const pending = [];
let rafId = 0;
function raf(cb) {
  rafId += 1;
  pending.push(cb);
  return rafId;
}
function flush() {
  const queue = pending.splice(0);
  queue.forEach((cb) => cb());
}

const document = {
  body: { appendChild(node) { document.body.children.push(node); }, children: [] },
  createElement(tag) {
    return {
      tagName: tag,
      className: "",
      style: makeStyle(),
      dataset: {},
      attributes: {},
      setAttribute(name, value) {
        this.attributes[name] = value;
      }
    };
  },
  addEventListener() {},
  querySelector() {
    return null;
  }
};

const window = {
  requestAnimationFrame: raf,
  addEventListener() {},
  getComputedStyle: () => ({ borderTopLeftRadius: "18px" })
};

const sandbox = new Function(
  "window",
  "document",
  slice + "\nreturn { composerBox, createHalo };"
);

const api = sandbox(window, document);

/* ---------------- fixtures ---------------- */

const textbox = { tagName: "TEXTAREA" };

function makeCard(rect) {
  const card = {
    tagName: "DIV",
    isConnected: true,
    rect,
    querySelector(sel) {
      return sel.indexOf("textarea") >= 0 ? textbox : null;
    },
    getBoundingClientRect() {
      return rect;
    },
    closest() {
      return null;
    },
    parentElement: null
  };
  return card;
}

/* ---------------- composer lookup ---------------- */

const card = makeCard({ left: 120, top: 480, width: 820, height: 132 });
const trigger = {
  tagName: "BUTTON",
  parentElement: { tagName: "SPAN", parentElement: null, querySelector: () => null },
  closest(sel) {
    return sel === '[class*="_card"]' ? card : null;
  }
};

eq("the card is found from the trigger", api.composerBox(trigger) === card, true);
eq("a detached trigger has no card", api.composerBox(null), null);
eq(
  "a card without a text field is skipped",
  api.composerBox({ closest: () => ({ querySelector: () => null }), parentElement: null }),
  null
);

/* ---------------- halo placement ---------------- */

const halo = api.createHalo();
halo.place(card, { hue: 280, heat: 1, open: false, hot: true });
flush();

const node = document.body.children[0];
eq("one node is appended to the body", document.body.children.length, 1);
eq("the node carries the halo class", node.className, "es-halo");
eq("it is hidden from assistive tech", node.attributes["aria-hidden"], "true");
eq("it sits two pixels outside the card", [node.style.left, node.style.top], ["118px", "478px"]);
eq("it is sized four pixels larger", [node.style.width, node.style.height], ["824px", "136px"]);
eq("the radius follows the card", node.style.borderRadius, "20px");
eq("the hue reaches the custom property", node.style.vars["--es-hue"], "280");
eq("max effort is fully lit", node.style.opacity, "1.000");
eq("max effort breathes", node.dataset.hot, "1");

halo.place(card, { hue: 200, heat: 0, open: false, hot: false });
flush();
eq("the lowest level is dim, not off", node.style.opacity, "0.200");
eq("the lowest level does not breathe", node.dataset.hot, "0");
eq("alpha grows with effort", Number(node.style.vars["--es-a0"]) < 0.11, true);

halo.place(card, { hue: 200, heat: 0.4, open: true, hot: false });
flush();
eq("an open panel lifts the ring above its resting value", node.style.opacity, "0.772");
eq("the glow radius is driven by heat", node.style.vars["--es-b2"], "65.2px");

halo.place(null, { hue: 200, heat: 1, open: true, hot: true });
flush();
eq("without a card the ring is hidden", node.dataset.on, "0");
eq("and fully transparent", node.style.opacity, "0.000");

halo.release();
eq("release clears the breathing flag", node.dataset.hot, "0");

console.log("\n" + (failures ? "FAILURES: " + failures : "ALL PASS (" + checks + ")"));
if (failures) process.exitCode = 1;
