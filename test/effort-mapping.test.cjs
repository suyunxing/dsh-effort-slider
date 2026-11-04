/* Harness: exercises the REAL resolveEffort source slice out of client.js and
   instantiates the module factory with stubs, so a typo cannot hide behind a
   syntax-only check. */
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "client.js");
const source = fs.readFileSync(file, "utf8");

const from = source.indexOf("const EFFORT_LADDER");
const to = source.indexOf("class EffortController");
if (from < 0 || to < 0 || to < from) throw new Error("could not slice helpers");
const helpers = source.slice(from, to);
const api = new Function(helpers + "\nreturn { resolveEffort, modelEfforts, effortName, EFFORT_LADDER };")();

const model = (id, ids, def) => ({
  id,
  name: id,
  reasoning: ids === null ? undefined : { efforts: ids.map((x) => ({ id: x, name: x.toUpperCase() })), ...(def ? { defaultEffort: def } : {}) }
});

const deepseek = model("deepseek", ["off", "low", "high", "max"]);
const piai = model("piai", ["off", "minimal", "low", "medium", "high", "xhigh", "max"]);
const plain = model("plain", null);
const shorty = model("shorty", ["off", "low"]);
const alien = model("alien", ["quiet", "normal", "loud"]);
const alienDefault = model("alien2", ["quiet", "normal", "loud"], "normal");

let pass = 0;
let fail = 0;
function eq(label, got, want) {
  if (got === want) {
    pass++;
    console.log("  ok   " + label + " -> " + JSON.stringify(got));
  } else {
    fail++;
    console.log("  FAIL " + label + " -> got " + JSON.stringify(got) + ", want " + JSON.stringify(want));
  }
}

console.log("supported levels pass through untouched:");
eq("piai.max -> deepseek", api.resolveEffort(deepseek, "max").id, "max");
eq("piai.high -> deepseek", api.resolveEffort(deepseek, "high").id, "high");
eq("deepseek.low -> piai", api.resolveEffort(piai, "low").id, "low");

console.log("\nunsupported levels land on the closest rung:");
eq("piai.medium -> deepseek (off/low/high/max)", api.resolveEffort(deepseek, "medium").id, "low");
eq("piai.minimal -> deepseek", api.resolveEffort(deepseek, "minimal").id, "low");
eq("deepseek.max -> shorty (off/low)", api.resolveEffort(shorty, "max").id, "low");
eq("piai.high -> shorty", api.resolveEffort(shorty, "high").id, "low");
eq("piai.xhigh -> deepseek (tie high/max -> stronger)", api.resolveEffort(deepseek, "xhigh").id, "max");
eq("piai.minimal -> shorty (tie off/low -> stronger)", api.resolveEffort(shorty, "minimal").id, "low");

console.log("\nno reasoning at all -> omit the field:");
eq("piai.high -> plain", api.resolveEffort(plain, "high").id, null);
eq("plain->plain carries nothing", api.resolveEffort(plain, "").id, null);
eq("empty carry on a capable model", api.resolveEffort(deepseek, "").id, null);

console.log("\noff-ladder provider names:");
eq("alien 'loud' -> deepseek, unknown distance, no default -> strongest", api.resolveEffort(deepseek, "loud").id, "max");
eq("alien 'loud' -> model with its own default", api.resolveEffort(model("ds2", ["off", "low", "high", "max"], "high"), "loud").id, "high");
eq("alien -> alien exact", api.resolveEffort(alien, "normal").id, "normal");
eq("deepseek.low -> alien (scaled interior)", api.resolveEffort(alien, "low").id, "normal");

console.log("\nfrom is reported so the notice can name the old level:");
eq("from carries the requested id", api.resolveEffort(deepseek, "medium").from, "medium");
eq("effortName resolves a display name", api.effortName(deepseek, "max"), "MAX");

console.log("\nfactory instantiates:");
let captured = null;
global.window = { __ModuleLoader__: { load: (def) => { captured = def; } } };
global.document = undefined;
new Function("window", "document", source)(global.window, undefined);
if (!captured) throw new Error("module loader was never called");
const reactStub = { createElement: (...args) => ({ args }), useEffect: () => {}, useRef: () => ({ current: null }), useState: () => [null, () => {}], useLayoutEffect: () => {}, useMemo: (f) => f(), createContext: () => ({ Provider: null, Consumer: null }) };
const mod = captured.factory((id) => (id === "react" ? reactStub : id === "react-dom" ? { createPortal: () => null } : {}));
eq("exports.name", mod.name, "dsh-effort-slider");
eq("exports.inject is an array", Array.isArray(mod.inject), true);
eq("exports.apply is a function", typeof mod.apply, "function");

console.log("\n" + (fail === 0 ? "ALL PASS (" + pass + ")" : fail + " FAILED of " + (pass + fail)));
process.exit(fail === 0 ? 0 : 1);
