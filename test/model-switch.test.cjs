/* Integration harness: drives the plugin's REAL EffortController.chooseModel
   against a fake Host that enforces the same rule the real one does
   (dsh-llm resolveCallWithInfo: an unsupported explicit effort is rejected,
   never clamped). Before the fix every one of these switches failed. */
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

const levels = (...ids) => ({ efforts: ids.map((id) => ({ id, name: id.toUpperCase() })) });

const catalog = {
  default: { provider: "p", model: "wide", reasoningEffort: "max" },
  groups: [
    {
      id: "p",
      name: "P",
      models: [
        { id: "wide", name: "Wide", reasoning: { ...levels("off", "minimal", "low", "medium", "high", "xhigh", "max"), defaultEffort: "medium" } },
        { id: "narrow", name: "Narrow", reasoning: { ...levels("off", "low", "high", "max"), defaultEffort: "high" } },
        { id: "plain", name: "Plain" }
      ]
    }
  ]
};

function effortsOf(provider, modelId) {
  const group = catalog.groups.filter((g) => g.id === provider)[0];
  const model = group.models.filter((m) => m.id === modelId)[0];
  return model && model.reasoning ? model.reasoning.efforts.map((e) => e.id) : void 0;
}

function makeHost(startSel) {
  const state = { sel: { ...startSel }, calls: [] };
  return {
    state,
    session: {
      modelCatalog: async () => ({ ok: true, value: catalog }),
      selectModel: async (req) => {
        state.calls.push({ ...req });
        const supported = effortsOf(req.provider, req.model);
        const asked = req.reasoningEffort;
        if (supported === void 0 && asked !== void 0) {
          return { ok: false, error: { message: `provider "${req.provider}" model "${req.model}" does not support reasoning effort "${asked}"` } };
        }
        if (supported !== void 0 && asked !== void 0 && supported.indexOf(asked) < 0) {
          return { ok: false, error: { message: `provider "${req.provider}" model "${req.model}" does not support reasoning effort "${asked}"` } };
        }
        const next = { provider: req.provider, model: req.model };
        if (asked !== void 0) next.reasoningEffort = asked;
        state.sel = next;
        return { ok: true, value: { selected: { ...next } } };
      }
    }
  };
}

function makeCtx(host) {
  let dict = {};
  let face = null;
  const ctx = {
    effect: (fn) => fn(),
    locale: {
      register: (ns, d) => {
        dict = d.zh || {};
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
        face = spec.inject();
        return () => {};
      }
    },
    sessions: {
      binding: () => ({
        session: {
          projections: {
            faceOf: () => ({
              getSnapshot: () => ({ next: host.state.sel }),
              subscribe: () => () => {}
            })
          }
        }
      }),
      list: { getSnapshot: () => ({ byId: { s1: { id: "s1", retainedBy: { mainView: 1 } } } }) }
    },
    remote: host
  };
  mod.apply(ctx);
  if (!face) throw new Error("the controller face was never registered");
  return face;
}

const tick = () => new Promise((r) => setTimeout(r, 12));

let pass = 0;
let fail = 0;
function eq(label, got, want) {
  const a = JSON.stringify(got);
  const b = JSON.stringify(want);
  if (a === b) { pass++; console.log("  ok   " + label + " = " + a); }
  else { fail++; console.log("  FAIL " + label + "\n         got  " + a + "\n         want " + b); }
}

async function scenario(name, startSel, target, expect) {
  console.log("\n" + name);
  const host = makeHost(startSel);
  const face = makeCtx(host);
  face.setSession("s1");
  await tick();
  eq("  starting level", face.store.getSnapshot().levels[face.store.getSnapshot().index].id, startSel.reasoningEffort || face.store.getSnapshot().levels[face.store.getSnapshot().index].id);
  await face.chooseModel("p", target);
  await tick();
  const snap = face.store.getSnapshot();
  const call = host.state.calls[0];
  eq("  request.reasoningEffort", call ? call.reasoningEffort : "(no call)", expect.sent);
  eq("  store.error", snap.error, null);
  eq("  store.notice", snap.notice, expect.notice);
  eq("  installed level", snap.levels.length ? snap.levels[snap.index].id : null, expect.installed);
  return { face, host };
}

(async () => {
  const a = await scenario(
    "wide(medium) -> narrow(off/low/high/max): clamp, no error",
    { provider: "p", model: "wide", reasoningEffort: "medium" },
    "narrow",
    { sent: "low", notice: "该模型没有「MEDIUM」档，已自动切到最接近的「LOW」", installed: "low" }
  );

  console.log("\nnarrow(low) -> plain(no reasoning): omit the field entirely");
  await a.face.chooseModel("p", "plain");
  await tick();
  let snap = a.face.store.getSnapshot();
  let call = a.host.state.calls[1];
  eq("  request has no reasoningEffort", Object.prototype.hasOwnProperty.call(call, "reasoningEffort"), false);
  eq("  store.error", snap.error, null);
  eq("  store.notice", snap.notice, "「Plain」没有思考强度档位，已按模型默认运行");
  eq("  slider reported as unsupported", snap.supported, false);

  console.log("\nplain -> wide: the carried level is restored, not a default");
  await a.face.chooseModel("p", "wide");
  await tick();
  snap = a.face.store.getSnapshot();
  call = a.host.state.calls[2];
  eq("  request.reasoningEffort", call.reasoningEffort, "low");
  eq("  store.error", snap.error, null);
  eq("  store.notice", snap.notice, null);
  eq("  installed level", snap.levels[snap.index].id, "low");

  console.log("\nunchanged model is a no-op:");
  const before = a.host.state.calls.length;
  await a.face.chooseModel("p", "wide");
  eq("  no extra request", a.host.state.calls.length, before);

  console.log("\n" + (fail === 0 ? "ALL PASS (" + pass + ")" : fail + " FAILED of " + (pass + fail)));
  process.exit(fail === 0 ? 0 : 1);
})();
