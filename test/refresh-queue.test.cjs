/* Regression harness for the two races that made a freshly created Session
   show the wrong level for a few seconds:

   1. `refresh()` used to drop a read requested while another was in flight.
      After sending in a new Session the corrective read is requested exactly
      during the first catalogue read, so it was thrown away and the pill kept
      the deployment default until some unrelated refresh happened.
   2. A Session that was just created has no binding yet, so the projection was
      never subscribed and no correction was ever delivered.

   Both are driven here through the REAL EffortController. */
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "client.js");
const source = fs.readFileSync(file, "utf8");

let captured = null;
global.window = { __ModuleLoader__: { load: (def) => { captured = def; } } };
new Function("window", source)(global.window);

const reactStub = {
  createElement: (...args) => ({ args }),
  useEffect: () => {},
  useLayoutEffect: () => {},
  useRef: () => ({ current: null }),
  useState: () => [null, () => {}],
  useMemo: (f) => f()
};
const mod = captured.factory((id) => (id === "react" ? reactStub : id === "react-dom" ? { createPortal: () => null } : {}));

const lv = (id) => ({ id, name: id.toUpperCase() });
const catalog = {
  default: { provider: "p", model: "wide", reasoningEffort: "max" },
  groups: [
    {
      id: "p",
      name: "P",
      models: [
        { id: "wide", name: "Wide", reasoning: { efforts: ["off", "minimal", "low", "medium", "high", "xhigh", "max"].map(lv), defaultEffort: "medium" } },
        { id: "narrow", name: "Narrow", reasoning: { efforts: ["off", "low", "high", "max"].map(lv), defaultEffort: "high" } }
      ]
    }
  ]
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeRig(opts) {
  opts = opts || {};
  const state = {
    sel: opts.sel || { provider: "p", model: "wide", reasoningEffort: "max" },
    catalogCalls: 0,
    subscribed: 0,
    bindingReady: opts.bindingReady !== false,
    gate: false,
    release: null
  };
  let subscriber = null;
  let api = null;
  let dict = {};

  const session = {
    modelCatalog: () => {
      state.catalogCalls += 1;
      if (state.gate) {
        state.gate = false;
        return new Promise((resolve) => {
          state.release = () => resolve({ ok: true, value: catalog });
        });
      }
      return Promise.resolve({ ok: true, value: catalog });
    },
    selectModel: async () => ({ ok: true, value: { selected: { ...state.sel } } })
  };

  const face = {
    getSnapshot: () => ({ next: state.sel && state.sel.model ? { ...state.sel } : void 0 }),
    subscribe: (fn) => {
      state.subscribed += 1;
      subscriber = fn;
      return () => {
        subscriber = null;
      };
    }
  };

  const ctx = {
    effect: (fn) => fn(),
    locale: {
      register: (ns, d) => {
        dict = (d && d.zh) || {};
        return () => {};
      },
      bind: () => (key, vars) => {
        let out = dict[key];
        if (typeof out !== "string") return key;
        if (vars) Object.keys(vars).forEach((k) => { out = out.split("{" + k + "}").join(String(vars[k])); });
        return out;
      }
    },
    slots: {
      inject: (key, fn) => fn(),
      register: (spec) => {
        api = spec.inject();
        return () => {};
      }
    },
    sessions: {
      binding: () => (state.bindingReady ? { session: { projections: { faceOf: () => face } } } : void 0),
      list: { getSnapshot: () => ({ byId: { s1: { id: "s1", retainedBy: { mainView: 1 } } } }) }
    },
    remote: { session }
  };

  mod.apply(ctx);
  if (!api) throw new Error("the controller face was never registered");
  return {
    state,
    api,
    notify: () => { if (subscriber) subscriber(); },
    releaseCatalog: () => { if (state.release) { const go = state.release; state.release = null; go(); } }
  };
}

let pass = 0;
let fail = 0;
function eq(label, got, want) {
  const a = JSON.stringify(got);
  const b = JSON.stringify(want);
  if (a === b) { pass++; console.log("  ok   " + label + " = " + a); }
  else { fail++; console.log("  FAIL " + label + "\n         got  " + a + "\n         want " + b); }
}

(async () => {
  console.log("\na read requested during an in-flight read is re-run, not dropped");
  const rig = makeRig();
  rig.api.setSession("s1");
  await sleep(20);
  eq("  first read settles on the projected level", rig.api.store.getSnapshot().levels[rig.api.store.getSnapshot().index].id, "max");

  rig.state.gate = true;
  rig.api.setSession("s2");
  await sleep(20);
  eq("  catalogue read is still in flight", rig.state.catalogCalls, 2);

  /* The Session's own selection arrives while that read is pending. */
  rig.state.sel = { provider: "p", model: "narrow", reasoningEffort: "off" };
  rig.notify();
  await sleep(30);
  eq("  no second read while the first is pending", rig.state.catalogCalls, 2);

  rig.releaseCatalog();
  await sleep(60);
  const snap = rig.api.store.getSnapshot();
  eq("  the dropped-looking request ran after the first one", rig.state.catalogCalls, 3);
  eq("  model follows the projection", snap.modelId, "narrow");
  eq("  level follows the projection", snap.levels.length ? snap.levels[snap.index].id : null, "off");
  eq("  slider position is falsy at the bottom", snap.t, 0);

  console.log("\na Session without a binding yet is retried until it subscribes");
  const late = makeRig({ bindingReady: false });
  late.api.setSession("s2");
  await sleep(30);
  eq("  falls back to the deployment default first", late.api.store.getSnapshot().modelId, "wide");
  eq("  nothing subscribed yet", late.state.subscribed, 0);

  late.state.bindingReady = true;
  late.state.sel = { provider: "p", model: "narrow", reasoningEffort: "off" };
  await sleep(400);
  eq("  the retry subscribed", late.state.subscribed, 1);
  eq("  and pulled the real selection", late.api.store.getSnapshot().modelId, "narrow");
  eq("  with its own levels", late.api.store.getSnapshot().levels.length, 4);

  console.log("\n" + (fail === 0 ? "ALL PASS (" + pass + ")" : fail + " FAILED of " + (pass + fail)));
  process.exit(fail === 0 ? 0 : 1);
})();
