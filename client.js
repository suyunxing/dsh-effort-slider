/**
 * dsh-effort-slider — browser half.
 *
 * Two registrations:
 *   conversation.input.right : a compact pill that shows the session's current
 *                              reasoning effort and opens the panel.
 *   shell.overlay            : the frame-wide panel, with a starfield, a live
 *                              rail whose particles/ribbons/stars/galaxy scale
 *                              with the chosen level, and light-blade bursts.
 *
 * The levels are read at runtime from the session model catalogue, so the
 * slider always matches the efforts the current model actually declares.
 */
window.__ModuleLoader__.load({
  id: "@lolannn/dsh-effort-slider",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const react = require("react");
    const reactDom = require("react-dom");
    const h = react.createElement;

    const NS = "effort-slider";
    const CSS_TAG = "dsh-effort-slider/client";
    const EDGE = 31;
    const SELECT_TIMEOUT_MS = 15000;
    const COMMIT_DEBOUNCE_MS = 260;

    /* ------------------------------------------------------------------ *
     * dictionaries
     * ------------------------------------------------------------------ */

    const zh = {
      pill: "思考强度",
      pillHint: "模型与思考强度",
      panelTitle: "思考强度",
      modelLabel: "模型",
      effortLabel: "思考强度",
      noModels: "没有可用的模型",
      triggerHint: "选择模型与思考强度",
      hint: "拖动滑块，或用 ← / → / Home / End 切换档位",
      reset: "回到默认档位",
      close: "关闭",
      switching: "正在切换…",
      failed: "切换失败：{message}",
      noSession: "当前没有活动会话",
      noReasoning: "当前模型没有可调的思考强度档位",
      clamped: "该模型没有「{from}」档，已自动切到最接近的「{to}」",
      noEffortModel: "「{model}」没有思考强度档位，已按模型默认运行",
      noLevelsTag: "无档位",
      boom: "宇宙毁灭",
      afterBoom: "星际探索"
    };

    const en = {
      pill: "Effort",
      pillHint: "Model and reasoning effort",
      panelTitle: "Reasoning effort",
      modelLabel: "Model",
      effortLabel: "Reasoning effort",
      noModels: "No model is available",
      triggerHint: "Choose model and reasoning effort",
      hint: "Drag the rail, or press ← / → / Home / End",
      reset: "Back to the default level",
      close: "Close",
      switching: "Switching…",
      failed: "Switch failed: {message}",
      noSession: "No active session",
      noReasoning: "This model exposes no reasoning-effort levels",
      clamped: "This model has no \"{from}\" level — switched to the nearest one, \"{to}\"",
      noEffortModel: "\"{model}\" exposes no effort levels — running at its default",
      noLevelsTag: "no levels",
      boom: "SINGULARITY",
      afterBoom: "DEEP SPACE"
    };

    /* ------------------------------------------------------------------ *
     * stylesheet
     * ------------------------------------------------------------------ */

    const CSS = [
      ".es-anchor{display:inline-flex;align-items:center;min-width:0;max-width:100%}",
      ".es-trigger{--es-hue:214;--es-e:0;position:relative;display:inline-flex;align-items:center;gap:6px;height:28px;max-width:min(340px,44vw);padding:0 9px;margin:0;border-radius:999px;border:1px solid transparent;background:transparent;color:#c3cbdb;font:inherit;font-size:12.5px;font-weight:500;line-height:1;cursor:pointer;white-space:nowrap;transition:background .2s ease,border-color .25s ease,color .2s ease,box-shadow .35s ease}",
      ".es-trigger:hover{background:rgba(255,255,255,.055);border-color:rgba(255,255,255,.1);color:#eef2fb}",
      '.es-trigger[data-open="1"]{background:rgba(255,255,255,.09);border-color:hsl(var(--es-hue) 100% 76% / .34);color:#fff}',
      '.es-trigger[data-locked="1"]{opacity:.5;cursor:default}',
      ".es-halo{position:fixed;z-index:2147482600;pointer-events:none;opacity:0;border-radius:20px;border:1px solid hsl(var(--es-hue) 100% 74% / var(--es-a0,.12));box-shadow:0 0 0 1px hsl(var(--es-hue) 100% 74% / var(--es-a1,.05)),0 0 var(--es-b1,10px) hsl(var(--es-hue) 100% 64% / var(--es-a2,.1)),0 0 var(--es-b2,34px) hsl(var(--es-hue) 100% 58% / var(--es-a3,.05));transition:opacity .5s ease,box-shadow .45s ease,border-color .45s ease;will-change:opacity,box-shadow}",
      '.es-halo[data-on="1"]{opacity:1}',
      '.es-halo[data-hot="1"]{animation:es-halo-breathe 3.6s ease-in-out infinite}',
      "@keyframes es-halo-breathe{0%,100%{opacity:.62}50%{opacity:1}}",
      ".es-trigger-bolt{display:var(--dsh-composer-model-icon-display,none);width:14px;height:14px;flex:none;align-items:center;justify-content:center;color:hsl(var(--es-hue) 100% 78%)}",
      ".es-trigger-text{display:var(--dsh-composer-model-text-display,inline);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px}",
      ".es-trigger-effort{display:var(--dsh-composer-model-text-display,inline);font-weight:600;color:hsl(var(--es-hue) 100% 84%);text-shadow:0 0 10px hsl(var(--es-hue) 100% 70% / .45)}",
      ".es-trigger-sep{display:var(--dsh-composer-model-text-display,inline);opacity:.38;margin:0 1px}",
      ".es-trigger-chev{display:inline-flex;width:10px;height:10px;flex:none;opacity:.55;margin-left:1px}",

      ".es-menu{--es-hue:214;--es-t:0;--es-e:0;position:fixed;z-index:2147483000;display:flex;flex-direction:column;width:min(400px,calc(100vw - 24px));max-height:calc(100vh - 24px);border-radius:20px;background:rgba(11,14,21,.93);border:1px solid rgba(255,255,255,.1);backdrop-filter:blur(24px) saturate(150%);-webkit-backdrop-filter:blur(24px) saturate(150%);box-shadow:0 26px 70px rgba(0,0,0,.62),inset 0 1px 0 rgba(255,255,255,.06);overflow:hidden;color:#e8ecf7;isolation:isolate;animation:es-pop-menu .2s cubic-bezier(.2,1.1,.3,1) both}",
      ".es-menu.es-quake{animation:es-quake-menu .52s cubic-bezier(.36,.07,.19,.97) both}",
      ".es-menu-bg{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;opacity:.9}",
      ".es-menu-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 100% at 50% 40%,transparent 42%,rgba(0,0,0,.55) 100%)}",
      ".es-menu-body{position:relative;display:flex;flex-direction:column;flex:1 1 auto;min-height:0;overflow:hidden;padding:9px 11px 11px}",
      ".es-menu-row{display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border:0;border-radius:12px;background:transparent;color:#e8ecf7;font:inherit;font-size:13px;cursor:pointer;text-align:left;transition:background .18s ease}",
      ".es-menu-row:hover{background:rgba(255,255,255,.06)}",
      ".es-menu-row-label{flex:none;color:#8b93a6;font-size:12px}",
      ".es-menu-row-value{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;color:#dfe6f5}",
      ".es-menu-chev{display:inline-flex;width:11px;height:11px;flex:none;opacity:.55;transition:transform .22s ease}",
      '.es-menu-row[data-open="1"] .es-menu-chev{transform:rotate(180deg)}',
      ".es-models{display:flex;flex-direction:column;gap:1px;flex:0 1 auto;min-height:0;max-height:216px;overflow:auto;margin:2px 0 2px;padding:4px 5px 5px;border-radius:12px;background:rgba(6,8,13,.66);box-shadow:inset 0 1px 0 rgba(255,255,255,.05);scrollbar-width:thin;overscroll-behavior:contain}",
      ".es-models-group{padding:7px 6px 3px;font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8d96aa}",
      ".es-model-item{display:flex;align-items:center;gap:8px;padding:7px 10px;border:0;border-radius:9px;background:transparent;color:#ccd5e6;font:inherit;font-size:12.5px;cursor:pointer;text-align:left;transition:background .16s ease,color .16s ease}",
      ".es-model-item:hover{background:rgba(255,255,255,.07);color:#fff}",
      '.es-model-item[data-on="1"]{color:#fff;background:hsl(var(--es-hue) 100% 62% / .2);box-shadow:inset 2px 0 0 hsl(var(--es-hue) 100% 72%)}',
      ".es-model-item-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".es-model-item-tag{flex:none;font-size:10px;color:#7f8798}",
      ".es-menu-sep{height:1px;margin:6px 2px 0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent)}",
      ".es-effort-head{display:flex;align-items:center;gap:7px;padding:9px 10px 7px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8b93a6}",
      ".es-effort-head .es-head-glyph{display:inline-flex;width:13px;height:13px;flex:none}",
      ".es-effort-head .es-tag{margin-left:auto;text-transform:none}",
      ".es-tag{font-size:11px;font-weight:700;letter-spacing:.06em;padding:2px 7px;border-radius:999px;border:1px solid hsl(var(--es-hue) 100% 72% / .38);color:hsl(var(--es-hue) 100% 84%);background:hsl(var(--es-hue) 100% 62% / .12);white-space:nowrap}",
      ".es-menu .es-track{height:52px;margin:0 2px}",
      ".es-menu .es-scale{margin:7px 2px 0}",
      ".es-menu .es-foot{padding:8px 2px 0}",
      ".es-menu .es-big{top:44%;font-size:clamp(19px,6vw,30px);letter-spacing:.12em}",
      ".es-track{position:relative;height:62px;border-radius:999px;touch-action:none;cursor:pointer;user-select:none;-webkit-user-select:none;background:radial-gradient(120% 180% at 50% 50%,rgba(255,255,255,.045),rgba(255,255,255,.012) 60%,rgba(0,0,0,.25));border:1px solid rgba(255,255,255,.07);box-shadow:inset 0 2px 14px rgba(0,0,0,.7),0 0 0 1px rgba(0,0,0,.35)}",
      ".es-rail{position:absolute;inset:0;width:100%;height:100%;border-radius:999px;display:block;pointer-events:none}",
      ".es-thumb{position:absolute;top:50%;left:calc(31px + (100% - 62px) * var(--es-t,0));width:40px;height:40px;border-radius:50%;transform:translate(-50%,-50%);background:radial-gradient(circle at 38% 34%,#fff 0%,#fff 42%,#dbe6ff 62%,#9fb6ff 100%);box-shadow:0 0 18px rgba(255,255,255,.95),0 0 46px hsl(var(--es-hue) 100% 72% / .85),0 0 90px hsl(var(--es-hue) 100% 62% / .55),inset 0 -3px 10px rgba(120,150,255,.5);pointer-events:none;transition:box-shadow .35s ease}",
      ".es-thumb::after{content:'';position:absolute;inset:-6px;border-radius:50%;background:radial-gradient(circle,hsl(var(--es-hue) 100% 75% / .35),transparent 68%);filter:blur(3px)}",
      ".es-ticks{position:absolute;inset:0;pointer-events:none}",
      ".es-tick{position:absolute;top:50%;width:3px;height:3px;border-radius:50%;transform:translate(-50%,-50%);background:rgba(255,255,255,.22);left:calc(31px + (100% - 62px) * var(--i,0))}",
      '.es-tick[data-on="1"]{background:#fff;box-shadow:0 0 8px #fff,0 0 18px hsl(var(--es-hue) 100% 70% / .9)}',
      ".es-scale{position:relative;height:15px;margin:9px 0 0;padding:0;font-size:11px;color:#6d7588}",
      ".es-scale-item{position:absolute;top:0;transform:translateX(-50%);padding:0 5px;border:0;background:none;font:inherit;color:inherit;cursor:pointer;white-space:nowrap;transition:color .2s ease,text-shadow .3s ease}",
      ".es-scale-item:hover{color:#cfd8ea}",
      '.es-scale-item[data-on="1"]{color:#fff;text-shadow:0 0 12px hsl(var(--es-hue) 100% 72% / .9)}',
      ".es-foot{display:flex;align-items:center;gap:8px;padding:10px 2px 0;font-size:11.5px;color:#7f8798;min-height:18px;line-height:1.4}",
      '.es-foot[data-err="1"]{color:#ff9a9a}',
      '.es-foot[data-note="1"]{color:hsl(var(--es-hue) 100% 84%)}',
      ".es-fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;mix-blend-mode:screen;display:block}",
      ".es-flash{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(60% 60% at 50% 50%,#fff,rgba(190,215,255,.6) 45%,transparent 72%)}",
      ".es-flash.go{animation:es-flash 1.1s ease-out both}",
      ".es-big{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);pointer-events:none;opacity:0;font-size:clamp(34px,11vw,86px);font-weight:900;letter-spacing:.16em;color:#fff;white-space:nowrap;text-shadow:0 0 22px rgba(255,255,255,.85),0 0 70px hsl(var(--es-hue) 100% 65% / .9),0 0 140px hsl(var(--es-hue) 100% 60% / .6)}",
      ".es-big.go{animation:es-big 3.2s cubic-bezier(.2,.7,.3,1) both}",
      "@keyframes es-pop-menu{0%{opacity:0;transform:translateY(7px) scale(.97)}100%{opacity:1;transform:translateY(0) scale(1)}}",
      "@keyframes es-flash{0%{opacity:0}6%{opacity:.95}22%{opacity:.55}100%{opacity:0}}",
      "@keyframes es-big{0%{opacity:0;transform:translate(-50%,-50%) scale(.7);filter:blur(10px)}18%{opacity:1;transform:translate(-50%,-50%) scale(1.04);filter:blur(0)}62%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.1);filter:blur(6px)}}",
      "@keyframes es-quake-menu{0%{transform:translate(0,0) rotate(0)}12%{transform:translate(-6px,3px) rotate(-.4deg)}24%{transform:translate(5px,-4px) rotate(.36deg)}38%{transform:translate(-4px,-2px) rotate(-.24deg)}52%{transform:translate(3px,3px) rotate(.24deg)}68%{transform:translate(-2px,1px) rotate(-.14deg)}84%{transform:translate(1px,-1px) rotate(.08deg)}100%{transform:translate(0,0) rotate(0)}}",
      "@media (prefers-reduced-motion:reduce){.es-menu{animation:none!important}.es-menu.es-quake{animation:none!important}.es-flash.go,.es-big.go{animation-duration:.4s}.es-thumb{transition:none}}",
      "@media (max-height:660px){.es-menu .es-track{height:46px}.es-models{max-height:150px}}"
    ].join("\n");

    function injectCss() {
      if (typeof document === "undefined") return;
      const existing = document.querySelector("style[data-plugin-css=" + JSON.stringify(CSS_TAG) + "]");
      if (existing !== null) return;
      const tag = document.createElement("style");
      tag.dataset.plugin = "@lolannn/dsh-effort-slider";
      tag.dataset.pluginCss = CSS_TAG;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    /* ------------------------------------------------------------------ *
     * small helpers
     * ------------------------------------------------------------------ */

    function readService(read) {
      try {
        return read();
      } catch (err) {
        return void 0;
      }
    }

    /*
     * Never let a label rendered inside a <button> look like a filesystem path.
     *
     * The pocket client installs a document-level click guard that inspects
     * event.target.closest("button, a").textContent; when it matches
     * /[\w.\-]+\/[\w.\-]+\.\w{1,12}/ (or a leading "/", "~/", "C:\") it calls
     * preventDefault() + stopImmediatePropagation() and shows a "cannot open
     * computer files on your phone" toast. A model identifier such as
     * "workbuddy-ai/deepseek-v4.1-flash" matches that pattern, so on a phone the
     * trigger silently became unclickable. The slash is display-only: the real
     * identifier stays in aria-label/title and in the request we send.
     */
    function safeLabel(text) {
      if (text === void 0 || text === null) return "";
      return String(text).replace(/[\\/]+/g, " · ");
    }

    function clamp01(v) {
      return v < 0 ? 0 : v > 1 ? 1 : v;
    }

    function clamp(v, lo, hi) {
      return v < lo ? lo : v > hi ? hi : v;
    }

    function easeOutBack(p) {
      const c1 = 1.15;
      const c3 = c1 + 1;
      const q = p - 1;
      return 1 + c3 * q * q * q + c1 * q * q;
    }

    function messageOf(err) {
      if (!err) return "";
      if (typeof err === "string") return err;
      if (typeof err.message === "string") return err.message;
      try {
        return JSON.stringify(err);
      } catch (e) {
        return String(err);
      }
    }

    function withTimeout(work, ms) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("timed out after " + ms + "ms")), ms);
        Promise.resolve(work).then(
          (value) => {
            clearTimeout(timer);
            resolve(value);
          },
          (err) => {
            clearTimeout(timer);
            reject(err);
          }
        );
      });
    }

    function mainViewSessionId(byId) {
      if (byId === void 0 || byId === null) return void 0;
      const rows = Object.values(byId);
      for (const row of rows) {
        if (row !== void 0 && (row.retainedBy && row.retainedBy.mainView ? row.retainedBy.mainView : 0) > 0) return row.id;
      }
      return void 0;
    }

    function createStore(initial) {
      let state = initial;
      const listeners = new Set();
      return {
        getSnapshot() {
          return state;
        },
        set(patch) {
          const next = Object.assign({}, state, typeof patch === "function" ? patch(state) : patch);
          state = next;
          listeners.forEach((fn) => {
            try {
              fn();
            } catch (err) {
              /* a broken subscriber must not break the store */
            }
          });
        },
        subscribe(fn) {
          listeners.add(fn);
          return () => {
            listeners.delete(fn);
          };
        }
      };
    }

    /* ------------------------------------------------------------------ *
     * level -> visual spec
     * ------------------------------------------------------------------ */

    function topIndexOf(count) {
      return Math.max(0, count - 1);
    }

    function levelT(index, count) {
      const top = topIndexOf(count);
      return top > 0 ? clamp(index, 0, top) / top : 0;
    }

    function hueAtT(t) {
      return t >= 0.92 ? 188 : 200 + 106 * t;
    }

    function kindAtT(t) {
      if (t <= 0.001) return "none";
      if (t < 0.3) return "dot";
      if (t < 0.5) return "trail";
      if (t < 0.75) return "star";
      if (t < 0.92) return "starHeavy";
      return "galaxy";
    }

    function countAtT(kind, t) {
      if (kind === "dot") return 10 + Math.round(8 * t);
      if (kind === "trail") return 18 + Math.round(10 * t);
      if (kind === "star") return 28;
      if (kind === "starHeavy") return 40;
      if (kind === "galaxy") return 38;
      return 0;
    }

    function specAt(t) {
      const kind = kindAtT(t);
      return {
        t,
        hue: hueAtT(t),
        kind,
        ribbon: kind !== "none" && kind !== "galaxy" && t >= 0.55,
        n: countAtT(kind, t)
      };
    }

    /* ------------------------------------------------------------------ *
     * deterministic randomness for rail particles
     * ------------------------------------------------------------------ */

    function hashStr(s) {
      let h1 = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h1 ^= s.charCodeAt(i);
        h1 = Math.imul(h1, 16777619);
      }
      return h1 >>> 0;
    }

    function mulberry32(a) {
      let seed = a >>> 0;
      return function () {
        seed = (seed + 0x6d2b79f5) >>> 0;
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), 1 | t);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    /* ------------------------------------------------------------------ *
     * canvas primitives
     * ------------------------------------------------------------------ */

    function roundRect(c, x, y, w, hh, r) {
      const rr = Math.min(r, w / 2, hh / 2);
      c.beginPath();
      c.moveTo(x + rr, y);
      c.arcTo(x + w, y, x + w, y + hh, rr);
      c.arcTo(x + w, y + hh, x, y + hh, rr);
      c.arcTo(x, y + hh, x, y, rr);
      c.arcTo(x, y, x + w, y, rr);
      c.closePath();
    }

    function starPath(c, x, y, r) {
      const k = r * 0.07;
      c.beginPath();
      c.moveTo(x, y - r);
      c.quadraticCurveTo(x + k, y - k, x + r, y);
      c.quadraticCurveTo(x + k, y + k, x, y + r);
      c.quadraticCurveTo(x - k, y + k, x - r, y);
      c.quadraticCurveTo(x - k, y - k, x, y - r);
      c.closePath();
    }

    function star4(c, x, y, r, alpha, hue, irid) {
      if (r <= 0.06 || alpha <= 0.004) return;
      c.fillStyle = "hsla(" + hue + ",100%,92%," + alpha + ")";
      starPath(c, x, y, r);
      c.fill();
      if (!irid) return;
      c.fillStyle = "hsla(" + (hue + 155) + ",100%,70%," + alpha * 0.55 + ")";
      starPath(c, x, y, r * 0.78);
      c.fill();
      c.fillStyle = "hsla(" + (hue + 285) + ",100%,74%," + alpha * 0.42 + ")";
      starPath(c, x, y, r * 0.5);
      c.fill();
    }

    function starBeam(c, cx, cy, rx, ry) {
      const bow = 0.07;
      c.beginPath();
      c.moveTo(cx - rx, cy);
      c.quadraticCurveTo(cx, cy - ry * bow, cx + rx, cy);
      c.quadraticCurveTo(cx, cy + ry * bow, cx - rx, cy);
      c.closePath();
      c.fill();
    }

    function nebulaSprite(h1, h2) {
      const size = 256;
      const cv = document.createElement("canvas");
      cv.width = size;
      cv.height = size;
      const c = cv.getContext("2d");
      if (!c) return cv;
      const rnd = mulberry32(hashStr("neb:" + h1 + ":" + h2));
      for (let i = 0; i < 26; i++) {
        const x = size * (0.15 + rnd() * 0.7);
        const y = size * (0.15 + rnd() * 0.7);
        const r = size * (0.08 + rnd() * 0.26);
        const hue = i % 2 === 0 ? h1 : h2;
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "hsla(" + hue + ",95%,62%,.20)");
        g.addColorStop(0.45, "hsla(" + (hue + 26) + ",95%,52%,.07)");
        g.addColorStop(1, "hsla(" + hue + ",95%,50%,0)");
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      }
      return cv;
    }

    /* ------------------------------------------------------------------ *
     * engine
     * ------------------------------------------------------------------ */

    function createEngine() {
      const S = {
        mounted: false,
        raf: 0,
        last: 0,
        time: 0,
        frameNo: 0,
        t: 0,
        e: 0,
        idx: 0,
        count: 1,
        anim: null,
        dragging: false,
        warp: 0,
        topFired: false,
        reduce: false,
        els: null,
        bgc: null,
        rxc: null,
        fxc: null,
        W: 0,
        H: 0,
        dpr: 1,
        rw: 0,
        rh: 0,
        rdpr: 1,
        stars: [],
        waves: [],
        debris: [],
        streaks: [],
        astra: [],
        neb: null,
        parts: [],
        partKey: "",
        partKind: "",
        partFade: 1,
        prevParts: [],
        prevKind: "",
        prevFade: 0,
        texts: { boom: "宇宙毁灭", after: "星际探索" },
        onLevel: null,
        onRelease: null,
        bigTimer: 0,
        warpTimer: 0
      };

      function topIndex() {
        return topIndexOf(S.count);
      }

      /* ---------------- sizing ---------------- */

      function fit() {
        const els = S.els;
        if (!els || !els.bg || !els.track) return;
        S.dpr = Math.min(window.devicePixelRatio || 1, 2);
        /* Both canvases live inside the popup, so they must match the popup's
           own box — sizing them to the viewport would put the starfield centre
           far outside the card (and draw a full screen of pixels per frame). */
        let box = null;
        if (els.stage && typeof els.stage.getBoundingClientRect === "function") {
          const r = els.stage.getBoundingClientRect();
          if (r.width > 0.5 && r.height > 0.5) box = r;
        }
        S.W = Math.max(1, box ? box.width : window.innerWidth);
        S.H = Math.max(1, box ? box.height : window.innerHeight);
        const prep = (cv) => {
          if (!cv) return null;
          cv.width = Math.max(1, Math.round(S.W * S.dpr));
          cv.height = Math.max(1, Math.round(S.H * S.dpr));
          cv.style.width = S.W + "px";
          cv.style.height = S.H + "px";
          const c = cv.getContext("2d");
          if (c) c.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
          return c;
        };
        S.bgc = prep(els.bg);
        S.fxc = prep(els.fx);
        const r = els.track.getBoundingClientRect();
        S.rw = Math.max(1, r.width);
        S.rh = Math.max(1, r.height);
        S.rdpr = Math.min(window.devicePixelRatio || 1, 2);
        if (els.rail) {
          els.rail.width = Math.max(1, Math.round(S.rw * S.rdpr));
          els.rail.height = Math.max(1, Math.round(S.rh * S.rdpr));
          const rc = els.rail.getContext("2d");
          if (rc) rc.setTransform(S.rdpr, 0, 0, S.rdpr, 0, 0);
          S.rxc = rc;
        }
      }

      /* ---------------- starfield state ---------------- */

      function respawnStar(s) {
        s.x = Math.random() * 2 - 1;
        s.y = Math.random() * 2 - 1;
        s.z = 0.98;
        s.born = S.time;
        s.life = S.idx === topIndex() ? 6 + Math.random() * 5.5 : 4.2 + Math.random() * 4.2;
      }

      function initStars() {
        S.stars = [];
        for (let i = 0; i < 260; i++) {
          const s = {
            x: Math.random() * 2 - 1,
            y: Math.random() * 2 - 1,
            z: 0.08 + Math.random() * 0.92,
            c: Math.random() < 0.22 ? 1 : 0,
            born: 0,
            life: 4.2 + Math.random() * 4.2
          };
          S.stars.push(s);
        }
      }

      /* ---------------- rail particles ---------------- */

      function buildParticles(n, kind) {
        const key = kind + ":" + n;
        if (key === S.partKey) return;
        S.prevParts = S.parts;
        S.prevKind = S.partKind;
        S.prevFade = S.partFade;
        S.partKey = key;
        S.partKind = kind;
        S.partFade = 0;
        S.parts = [];
        if (n <= 0) return;
        const rnd = mulberry32(hashStr(key));
        for (let i = 0; i < n; i++) {
          S.parts.push({
            p0: rnd(),
            y: 0.1 + rnd() * 0.8,
            sp: 0.016 + rnd() * 0.058,
            size: 0.55 + rnd() * 1.5,
            hueOff: rnd() * 44 - 22,
            tw: rnd() * Math.PI * 2
          });
        }
      }

      function ensureParticles() {
        const spec = specAt(S.t);
        buildParticles(spec.n, spec.kind);
      }

      function drawParticleSet(c, list, kind, mul, hue, e, pad, reach, ih) {
        if (!list || !list.length || mul <= 0.002) return;
        const starMode = kind === "star" || kind === "starHeavy" || kind === "galaxy";
        const trailMode = starMode || kind === "trail";
        const speedK = 0.55 + e * 1.7;
        const base = kind === "dot" ? 0.9 : kind === "trail" ? 1.6 : 2.3;
        const copies = starMode ? (kind === "star" ? 2 : 4) : 4;
        const len = starMode ? (kind === "star" ? 15 : 10) : 10;
        for (let i = 0; i < list.length; i++) {
          const q = list[i];
          let p = (q.p0 - S.time * q.sp * speedK) % 1;
          if (p < 0) p += 1;
          const x = pad + reach * p;
          let y = pad + ih * q.y;
          if (kind === "dot") y += Math.sin(q.tw + S.time * 1.3) * 1.2;
          const flick = 0.62 + 0.38 * Math.sin(q.tw + S.time * 2.6);
          const a = (0.2 + e * 0.62) * flick * mul;
          if (a <= 0.004) continue;
          const sz = base * (0.7 + q.size * 0.55);
          if (trailMode) {
            for (let k = 1; k <= copies; k++) {
              const tx = x + len * k;
              if (tx > pad + reach) break;
              const ak = a * (1 - k / (copies + 1)) * 0.55;
              if (starMode) star4(c, tx, y, sz * (1 - k * 0.08), ak * 0.75, hue + q.hueOff + 20, false);
              else {
                c.fillStyle = "hsla(" + (hue + q.hueOff) + ",100%,78%," + ak + ")";
                c.beginPath();
                c.arc(tx, y, Math.max(0.3, sz * 0.8), 0, Math.PI * 2);
                c.fill();
              }
            }
          }
          if (starMode) star4(c, x, y, sz * (kind === "starHeavy" ? 1.4 : 1), a, hue + q.hueOff + 30, true);
          else {
            c.fillStyle = "hsla(" + (hue + q.hueOff) + ",100%,80%," + a + ")";
            c.beginPath();
            c.arc(x, y, Math.max(0.3, sz * (0.7 + e * 0.8)), 0, Math.PI * 2);
            c.fill();
          }
        }
      }

      /* ---------------- background ---------------- */

      function drawBG(dt) {
        const c = S.bgc;
        if (!c) return;
        const W = S.W;
        const H = S.H;
        const e = S.e;
        const hue = hueAtT(S.t);
        c.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
        c.globalCompositeOperation = "source-over";
        c.clearRect(0, 0, W, H);
        const g = c.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, Math.max(W, H) * 0.85);
        g.addColorStop(0, "hsla(" + (222 + e * 60) + "," + (46 + e * 26) + "%," + (5 + e * 4) + "%,.94)");
        g.addColorStop(1, "rgba(3,4,10,.97)");
        c.fillStyle = g;
        c.fillRect(0, 0, W, H);

        c.globalCompositeOperation = "lighter";

        if (S.neb) {
          const sway = Math.sin(S.time * 0.09) * 40;
          const layers = [
            [S.neb.a, 0.12 + e * 0.3, 0.3, sway],
            [S.neb.b, 0.1 + e * 0.26, 0.72, -sway * 0.7],
            [S.neb.c, 0.08 + e * 0.22, 0.5, sway * 0.45]
          ];
          for (let i = 0; i < layers.length; i++) {
            const spr = layers[i][0];
            if (!spr) continue;
            const w = W * 1.5;
            const hh = H * 1.5;
            c.globalAlpha = Math.min(1, layers[i][1]);
            c.drawImage(spr, W * layers[i][2] - w / 2 + layers[i][3], H * 0.5 - hh / 2 + layers[i][3] * 0.4, w, hh);
          }
          c.globalAlpha = 1;
        }

        const speed = 0.045 + e * 0.55 + S.warp * 2.4;
        const fov = Math.min(W, H) * 0.62;
        const cx = W * 0.5;
        const cy = H * 0.46;
        for (let i = 0; i < S.stars.length; i++) {
          const s = S.stars[i];
          s.z -= dt * speed * (0.35 + (1 - s.z) * 1.6);
          const age = S.time - s.born;
          if (s.z <= 0.012 || age > s.life) {
            respawnStar(s);
            continue;
          }
          const k = fov / s.z;
          const near = 1 - s.z;
          const x = cx + s.x * k;
          const y = cy + s.y * k;
          if (x < -80 || x > W + 80 || y < -80 || y > H + 80) {
            respawnStar(s);
            continue;
          }
          const lifeA = Math.min(1, age / 0.7) * Math.max(0, 1 - age / s.life);
          const a = Math.min(1, near * 1.5) * (0.35 + e * 0.6) * lifeA;
          if (a <= 0.004) continue;
          const tint = s.c ? 268 : 196;
          if (S.warp > 0.04 && near > 0.22) {
            const pz = Math.max(0.02, s.z + dt * speed * 1.6);
            const pk = fov / pz;
            c.strokeStyle = "hsla(" + tint + ",100%,82%," + a * 0.85 + ")";
            c.lineWidth = Math.min(3.2, 0.5 + near * 2.4);
            c.beginPath();
            c.moveTo(x, y);
            c.lineTo(cx + s.x * pk, cy + s.y * pk);
            c.stroke();
          } else {
            c.fillStyle = "hsla(" + tint + ",100%,88%," + a + ")";
            c.beginPath();
            c.arc(x, y, Math.min(2.4, 0.35 + near * 1.9), 0, Math.PI * 2);
            c.fill();
          }
        }

        for (let i = S.waves.length - 1; i >= 0; i--) {
          const w = S.waves[i];
          w.r += dt * (900 + 900 * w.a);
          w.a *= Math.pow(0.18, dt);
          if (w.a < 0.012) {
            S.waves.splice(i, 1);
            continue;
          }
          c.strokeStyle = "hsla(" + w.hue + ",100%,76%," + w.a + ")";
          c.lineWidth = w.w * Math.max(0.2, w.a);
          c.beginPath();
          c.arc(cx, cy, w.r, 0, Math.PI * 2);
          c.stroke();
        }

        for (let i = S.debris.length - 1; i >= 0; i--) {
          const d = S.debris[i];
          d.life -= dt * 0.42;
          if (d.life <= 0) {
            S.debris.splice(i, 1);
            continue;
          }
          d.vy += 120 * dt;
          d.vx *= Math.pow(0.55, dt);
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          const a = Math.min(1, d.life) * 0.9;
          c.fillStyle = "hsla(" + d.hue + ",100%,82%," + a + ")";
          c.beginPath();
          c.arc(d.x, d.y, d.size * Math.max(0.3, d.life), 0, Math.PI * 2);
          c.fill();
        }

        for (let i = S.streaks.length - 1; i >= 0; i--) {
          const s = S.streaks[i];
          s.life -= dt * 1.9;
          if (s.life <= 0) {
            S.streaks.splice(i, 1);
            continue;
          }
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          const a = Math.min(1, s.life) * 0.75;
          c.strokeStyle = "hsla(" + s.hue + ",100%,86%," + a + ")";
          c.lineWidth = 1.4;
          c.beginPath();
          c.moveTo(s.x, s.y);
          c.lineTo(s.x - s.vx * 0.055, s.y - s.vy * 0.055);
          c.stroke();
        }

        c.globalCompositeOperation = "source-over";
      }

      /* ---------------- the rail ---------------- */

      function drawRail() {
        const c = S.rxc;
        if (!c) return;
        const w = S.rw;
        const hh = S.rh;
        c.setTransform(S.rdpr, 0, 0, S.rdpr, 0, 0);
        c.clearRect(0, 0, w, hh);
        const spec = specAt(S.t);
        const e = S.e;
        const hue = hueAtT(S.t);
        const pad = 11;
        const iw = Math.max(1, w - pad * 2);
        const ih = Math.max(1, hh - pad * 2);
        const tx = EDGE + (w - EDGE * 2) * S.t;
        const reach = Math.max(1, tx - pad);
        const cyy = hh * 0.5;

        c.save();
        roundRect(c, pad, pad, iw, ih, ih / 2);
        c.clip();

        const bgGrad = c.createLinearGradient(pad, 0, pad + iw, 0);
        bgGrad.addColorStop(0, "hsla(" + (hue - 42) + ",72%," + (8 + e * 4) + "%,.96)");
        bgGrad.addColorStop(0.5, "hsla(" + hue + ",72%," + (10 + e * 6) + "%,.96)");
        bgGrad.addColorStop(1, "hsla(" + (hue + 46) + ",72%," + (9 + e * 5) + "%,.96)");
        c.fillStyle = bgGrad;
        c.fillRect(pad, pad, iw, ih);

        const fillGrad = c.createLinearGradient(pad, 0, pad + Math.max(1, reach), 0);
        fillGrad.addColorStop(0, "hsla(" + (hue - 34) + ",100%,62%,.55)");
        fillGrad.addColorStop(0.45, "hsla(" + hue + ",100%,66%,.72)");
        fillGrad.addColorStop(0.8, "hsla(" + (hue + 40) + ",100%,68%,.82)");
        fillGrad.addColorStop(1, "hsla(" + (hue + 64) + ",100%,74%,.92)");
        c.fillStyle = fillGrad;
        c.fillRect(pad, pad, reach, ih);

        c.globalCompositeOperation = "lighter";

        if (spec.ribbon) {
          const slow = S.time * (0.28 + e * 0.5);
          for (let k = 0; k < 3; k++) {
            const amp = (3 + k * 3.4) * (0.35 + e);
            c.beginPath();
            for (let i = 0; i <= 60; i++) {
              const p = i / 60;
              const x = pad + iw * p;
              const y =
                cyy +
                Math.sin(p * (5.2 + k * 1.7) + slow * (1 + k * 0.35) + k) * amp +
                Math.sin(p * 12 + slow * 1.7) * amp * 0.28;
              if (i === 0) c.moveTo(x, y);
              else c.lineTo(x, y);
            }
            c.strokeStyle = "hsla(" + (hue + 30 + k * 18) + ",100%,78%," + (0.1 + e * 0.26) + ")";
            c.lineWidth = 1.1 + e * 1.5;
            c.stroke();
          }
        }

        c.save();
        c.beginPath();
        c.rect(pad, pad, reach, ih);
        c.clip();
        if (S.prevParts.length && S.prevFade > 0.01) drawParticleSet(c, S.prevParts, S.prevKind, S.prevFade, hue, e, pad, reach, ih);
        drawParticleSet(c, S.parts, S.partKind, S.partFade, hue, e, pad, reach, ih);

        if (spec.kind === "starHeavy") {
          const sc = 0.6 + e * 0.7;
          const br = 0.5 + 0.5 * Math.sin(S.time * 2.4);
          const cxx = pad + iw * 0.5;
          const halo = c.createRadialGradient(cxx, cyy, 0, cxx, cyy, 26 * sc);
          halo.addColorStop(0, "hsla(" + hue + ",100%,90%," + (0.22 + br * 0.3) + ")");
          halo.addColorStop(1, "hsla(" + hue + ",100%,70%,0)");
          c.fillStyle = halo;
          c.beginPath();
          c.arc(cxx, cyy, 26 * sc, 0, Math.PI * 2);
          c.fill();
          star4(c, cxx, cyy, (13 + br * 3) * sc, 0.75 + br * 0.2, hue, true);
          star4(c, cxx - iw * 0.17, cyy, 7 * sc, 0.42, hue + 40, false);
          star4(c, cxx + iw * 0.17, cyy, 7 * sc, 0.42, hue - 30, false);
        }

        if (spec.kind === "galaxy") {
          const ga = clamp01((e - 0.9) / 0.1);
          const cxx = pad + iw * 0.5;
          const core = c.createRadialGradient(cxx, cyy, 0, cxx, cyy, iw * 0.24);
          core.addColorStop(0, "rgba(255,255,255,.95)");
          core.addColorStop(0.35, "hsla(196,100%,82%,.75)");
          core.addColorStop(0.72, "hsla(258,100%,62%,.34)");
          core.addColorStop(1, "hsla(258,100%,60%,0)");
          c.fillStyle = core;
          c.beginPath();
          c.arc(cxx, cyy, iw * 0.24, 0, Math.PI * 2);
          c.fill();
          for (let a = 0; a < 3; a++) {
            for (let i = 0; i < 130; i++) {
              const f = i / 130;
              const ang = a * ((Math.PI * 2) / 3) + f * 5.4 + S.time * 0.55;
              const rad = f * iw * 0.46;
              const x = cxx + Math.cos(ang) * rad;
              const y = cyy + Math.sin(ang) * rad * 0.42;
              const alpha = (1 - f) * 0.5 * (0.4 + ga * 0.6);
              c.fillStyle = "hsla(" + (196 + a * 32) + ",100%," + (86 - f * 18) + "%," + alpha + ")";
              c.beginPath();
              c.arc(x, y, 0.5 + (1 - f) * 1.5, 0, Math.PI * 2);
              c.fill();
            }
          }
        }
        c.restore();

        const gloss = c.createLinearGradient(0, pad, 0, pad + ih);
        gloss.addColorStop(0, "rgba(255,255,255,.16)");
        gloss.addColorStop(0.35, "rgba(255,255,255,.05)");
        gloss.addColorStop(0.55, "rgba(255,255,255,0)");
        gloss.addColorStop(1, "rgba(0,0,0,.18)");
        c.fillStyle = gloss;
        c.fillRect(pad, pad, iw, ih);

        c.globalCompositeOperation = "source-over";
        c.restore();

        c.strokeStyle = "hsla(" + hue + ",100%,72%," + (0.18 + e * 0.5) + ")";
        c.lineWidth = 1.2;
        c.shadowColor = "hsla(" + hue + ",100%,68%,.9)";
        c.shadowBlur = 10 + e * 26;
        roundRect(c, pad + 0.5, pad + 0.5, iw - 1, ih - 1, ih / 2);
        c.stroke();
        c.shadowBlur = 0;
      }

      /* ---------------- light blades ---------------- */

      function drawFx(dt) {
        const c = S.fxc;
        if (!c) return;
        c.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
        c.clearRect(0, 0, S.W, S.H);
        if (!S.astra.length || !S.els || !S.els.track) return;
        const r = S.els.track.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const k = Math.min(1.25, 0.35 + (r.width / 900) * 0.9);
        for (let i = S.astra.length - 1; i >= 0; i--) {
          const f = S.astra[i];
          f.age += dt;
          const p = f.age / f.life;
          if (p >= 1) {
            S.astra.splice(i, 1);
            continue;
          }
          const p2 = p * p;
          const th = 13 * (1 - p2) * (1 - p2 * 0.35);
          const baseRy = r.height * 0.55;
          const halfL = r.width * 0.62;
          for (let L = 0; L < 14; L++) {
            const lt = L / 13;
            const a = (0.022 + 0.95 * Math.pow(lt, 2.3)) * (1 - p2) * 0.8;
            if (a <= 0.004) continue;
            const col = Math.round(90 + 165 * Math.pow(lt, 0.7)) + "," + Math.round(150 + 105 * Math.pow(lt, 0.5)) + ",255";
            c.fillStyle = "rgba(" + col + "," + a + ")";
            const ry = Math.max(0.5, th * (0.4 + L * 0.06));
            starBeam(c, cx, cy, halfL * (0.55 + L * 0.03), ry);
            c.save();
            c.translate(cx, cy);
            c.rotate(Math.PI / 2);
            c.translate(-cx, -cy);
            starBeam(c, cx, cy, baseRy * (0.35 + L * 0.05), Math.max(0.4, ry * 0.45));
            c.restore();
          }
          const cr = Math.max(1, (8 + 34 * (1 - p2)) * k);
          const g = c.createRadialGradient(cx, cy, 0, cx, cy, cr);
          g.addColorStop(0, "rgba(255,255,255," + 0.85 * (1 - p2) + ")");
          g.addColorStop(0.5, "rgba(190,215,255," + 0.35 * (1 - p2) + ")");
          g.addColorStop(1, "rgba(120,160,255,0)");
          c.fillStyle = g;
          c.beginPath();
          c.arc(cx, cy, cr, 0, Math.PI * 2);
          c.fill();
        }
      }

      /* ---------------- celebration ---------------- */

      function spawnStreaks() {
        for (let i = 0; i < 24; i++) {
          const ang = Math.random() * Math.PI * 2;
          const sp = 380 + Math.random() * 980;
          S.streaks.push({
            x: S.W * 0.5,
            y: S.H * 0.5,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp,
            life: 1,
            hue: 180 + Math.random() * 150
          });
        }
      }

      function boom() {
        const els = S.els;
        if (!els) return;
        S.astra.push({ age: 0, life: 0.9 });
        if (S.reduce) return;
        if (els.stage && els.stage.classList) {
          els.stage.classList.remove("es-quake");
          void els.stage.offsetWidth;
          els.stage.classList.add("es-quake");
        }
        if (els.flash && els.flash.classList) {
          els.flash.classList.remove("go");
          void els.flash.offsetWidth;
          els.flash.classList.add("go");
        }
        if (els.big && els.big.classList) {
          els.big.textContent = S.texts.boom;
          els.big.classList.remove("go");
          void els.big.offsetWidth;
          els.big.classList.add("go");
          clearTimeout(S.bigTimer);
          S.bigTimer = setTimeout(() => {
            if (els.big) els.big.textContent = S.texts.after;
          }, 2900);
        }
        const alphas = [0.95, 0.7, 0.5, 0.35];
        const widths = [6, 14, 26, 40];
        const hues = [190, 300, 46, 210];
        for (let i = 0; i < 4; i++) S.waves.push({ r: 0, a: alphas[i], w: widths[i], hue: hues[i] });
        for (let i = 0; i < 220; i++) {
          const ang = Math.random() * Math.PI * 2;
          const sp = 60 + Math.random() * 620;
          S.debris.push({
            x: S.W * 0.5,
            y: S.H * 0.5,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp,
            life: 1,
            hue: [190, 300, 45][i % 3],
            size: 0.6 + Math.random() * 2.2
          });
        }
        clearTimeout(S.warpTimer);
        S.warpTimer = setTimeout(() => {
          S.warp = 1;
        }, 220);
      }

      /* ---------------- loop ---------------- */

      function syncLevel() {
        const top = topIndex();
        const i = top > 0 ? Math.round(S.t * top) : 0;
        if (i !== S.idx) {
          S.idx = i;
          if (S.onLevel) {
            try {
              S.onLevel(i);
            } catch (err) {
              /* a listener error must not stop the animation */
            }
          }
        }
        const isTop = top > 0 && i === top;
        if (isTop && !S.topFired) {
          S.topFired = true;
          boom();
        } else if (!isTop) {
          S.topFired = false;
          if (S.warp > 0.01) S.warp = 0;
        }
      }

      function paintDom() {
        const el = S.els && S.els.stage;
        if (!el || !el.style) return;
        el.style.setProperty("--es-t", S.t.toFixed(4));
        el.style.setProperty("--es-hue", String(Math.round(hueAtT(S.t))));
        el.style.setProperty("--es-e", S.e.toFixed(3));
      }

      function loop(now) {
        if (!S.mounted) return;
        S.raf = requestAnimationFrame(loop);
        const dt = Math.min(0.05, S.last ? (now - S.last) / 1000 : 0.016);
        S.last = now;
        S.time += dt;
        S.frameNo++;

        if (S.anim) {
          const p = clamp01((now - S.anim.start) / S.anim.dur);
          S.t = clamp01(S.anim.from + (S.anim.to - S.anim.from) * easeOutBack(p));
          if (p >= 1) {
            S.t = S.anim.to;
            S.anim = null;
          }
        }

        S.e += (S.t - S.e) * Math.min(1, dt * (S.dragging ? 14 : 6));
        S.partFade = Math.min(1, S.partFade + dt / 0.28);
        if (S.prevFade > 0) S.prevFade = Math.max(0, S.prevFade - dt / 0.24);

        syncLevel();
        ensureParticles();

        const top = topIndex();
        if (!S.reduce && top > 0 && S.idx === top && S.frameNo % 10 === 0) spawnStreaks();

        drawBG(dt);
        drawRail();
        drawFx(dt);
        paintDom();
      }

      /* ---------------- pointer / keyboard ---------------- */

      function tFromEvent(ev) {
        const el = S.els && S.els.track;
        if (!el) return S.t;
        const r = el.getBoundingClientRect();
        const span = r.width - EDGE * 2;
        if (span <= 1) return 0;
        const x = clamp(ev.clientX - r.left, EDGE, r.width - EDGE);
        return clamp01((x - EDGE) / span);
      }

      function beginDrag(ev) {
        if (!S.mounted) return;
        S.dragging = true;
        S.anim = null;
        S.t = tFromEvent(ev);
        try {
          if (ev.currentTarget && ev.currentTarget.setPointerCapture) ev.currentTarget.setPointerCapture(ev.pointerId);
        } catch (err) {
          /* capture is a nicety */
        }
        ev.preventDefault();
      }

      function onDocMove(ev) {
        if (!S.dragging) return;
        S.t = tFromEvent(ev);
      }

      function onDocUp() {
        if (!S.dragging) return;
        S.dragging = false;
        snapTo(levelT(S.idx, S.count), 300);
        if (S.onRelease) {
          try {
            S.onRelease(S.idx);
          } catch (err) {
            /* ignore */
          }
        }
      }

      function onKey(ev) {
        if (!S.mounted) return;
        /* The rail is now inline in the composer, so the caret may be in the
           prompt box while this listener is live. Never steal arrow keys from
           an editable target. */
        const target = ev.target;
        if (target && typeof target === "object") {
          const tag = String(target.tagName || "").toUpperCase();
          if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable === true) return;
        }
        const top = topIndex();
        let next = null;
        if (ev.key === "ArrowRight" || ev.key === "ArrowUp") next = Math.min(top, S.idx + 1);
        else if (ev.key === "ArrowLeft" || ev.key === "ArrowDown") next = Math.max(0, S.idx - 1);
        else if (ev.key === "Home") next = 0;
        else if (ev.key === "End") next = top;
        if (next === null) return;
        ev.preventDefault();
        snapTo(levelT(next, S.count), ev.key === "Home" || ev.key === "End" ? 420 : 300);
        if (S.onRelease) {
          try {
            S.onRelease(next);
          } catch (err) {
            /* ignore */
          }
        }
      }

      function snapTo(to, dur) {
        S.anim = { from: S.t, to: clamp01(to), start: performance.now(), dur: dur || 300 };
      }

      /* ---------------- lifecycle ---------------- */

      function mount(opts) {
        S.els = opts.els;
        S.onLevel = opts.onLevel;
        S.onRelease = opts.onRelease;
        S.texts = opts.texts || S.texts;
        S.reduce = !!opts.reduce;
        S.count = Math.max(1, (opts.count || 1) | 0);
        S.mounted = true;
        S.time = 0;
        S.frameNo = 0;
        S.last = 0;
        S.e = S.t;
        S.topFired = false;
        S.warp = 0;
        S.waves.length = 0;
        S.debris.length = 0;
        S.streaks.length = 0;
        S.astra.length = 0;
        S.parts = [];
        S.prevParts = [];
        S.partKey = "";
        S.partKind = "";
        S.partFade = 1;
        S.prevFade = 0;
        initStars();
        if (!S.neb) S.neb = { a: nebulaSprite(216, 262), b: nebulaSprite(286, 196), c: nebulaSprite(190, 320) };
        fit();
        requestAnimationFrame(() => {
          if (S.mounted) fit();
        });
        window.addEventListener("resize", fit);
        window.addEventListener("orientationchange", fit);
        /* The popup grows and shrinks as the model list opens and closes. */
        if (typeof ResizeObserver === "function" && S.els && S.els.stage) {
          S.ro = new ResizeObserver(() => {
            if (S.mounted) fit();
          });
          try {
            S.ro.observe(S.els.stage);
          } catch (err) {
            S.ro = null;
          }
        }
        window.addEventListener("pointermove", onDocMove);
        window.addEventListener("pointerup", onDocUp);
        window.addEventListener("pointercancel", onDocUp);
        window.addEventListener("keydown", onKey);
        S.raf = requestAnimationFrame(loop);
      }

      function unmount() {
        S.mounted = false;
        if (S.raf) cancelAnimationFrame(S.raf);
        S.raf = 0;
        clearTimeout(S.bigTimer);
        clearTimeout(S.warpTimer);
        window.removeEventListener("resize", fit);
        window.removeEventListener("orientationchange", fit);
        if (S.ro) {
          try {
            S.ro.disconnect();
          } catch (err) {}
          S.ro = null;
        }
        window.removeEventListener("pointermove", onDocMove);
        window.removeEventListener("pointerup", onDocUp);
        window.removeEventListener("pointercancel", onDocUp);
        window.removeEventListener("keydown", onKey);
        S.els = null;
        S.bgc = null;
        S.rxc = null;
        S.fxc = null;
      }

      function setCount(n) {
        const next = Math.max(1, n | 0);
        if (next === S.count) return;
        S.count = next;
        S.idx = Math.min(S.idx, topIndexOf(S.count));
      }

      function setIndex(index, immediate) {
        const top = topIndex();
        const to = levelT(clamp(index, 0, top), S.count);
        if (immediate) {
          S.anim = null;
          S.t = to;
          S.e = to;
          S.idx = Math.round(to * top);
          /*
           * Opening the panel must not replay the top-level celebration. Only a
           * real move into the top level (drag, click, keyboard) fires boom();
           * mounting while already at the top just arms the guard.
           */
          S.topFired = S.count > 1 && S.idx === top;
        } else {
          snapTo(to, 320);
        }
      }

      return {
        mount,
        unmount,
        setCount,
        setIndex,
        beginDrag,
        isDragging() {
          return S.dragging;
        },
        isMounted() {
          return S.mounted;
        },
        index() {
          return S.idx;
        }
      };
    }

    /* ------------------------------------------------------------------ *
     * glyphs
     * ------------------------------------------------------------------ */

    function boltGlyph(size, hue) {
      return h(
        "svg",
        { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": "true", style: { display: "block" } },
        h("path", {
          d: "M13.6 2 5.2 13.1h5.3L9.9 22l8.9-11.6h-5.6L13.6 2Z",
          fill: "currentColor",
          opacity: 0.92
        }),
        h("path", {
          d: "M13.6 2 5.2 13.1h5.3L9.9 22l8.9-11.6h-5.6L13.6 2Z",
          fill: "none",
          stroke: "hsl(" + hue + " 100% 78%)",
          strokeWidth: 0.7,
          opacity: 0.8
        })
      );
    }

    function resetGlyph() {
      return h(
        "svg",
        { width: 13, height: 13, viewBox: "0 0 24 24", "aria-hidden": "true" },
        h("path", {
          d: "M4 12a8 8 0 1 0 2.5-5.8",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 2,
          strokeLinecap: "round"
        }),
        h("path", { d: "M4 4v5h5", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" })
      );
    }

    function closeGlyph() {
      return h(
        "svg",
        { width: 13, height: 13, viewBox: "0 0 24 24", "aria-hidden": "true" },
        h("path", { d: "M6 6l12 12M18 6L6 18", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" })
      );
    }

    /* ------------------------------------------------------------------ *
     * controller
     * ------------------------------------------------------------------ */

    function findModel(catalog, sel) {
      if (!catalog || !sel) return void 0;
      const groups = Array.isArray(catalog.groups) ? catalog.groups : [];
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        const models = g && Array.isArray(g.models) ? g.models : [];
        for (let j = 0; j < models.length; j++) {
          const m = models[j];
          if (m && m.id === sel.model && (!sel.provider || g.id === sel.provider)) return m;
        }
      }
      for (let i = 0; i < groups.length; i++) {
        const models = groups[i] && Array.isArray(groups[i].models) ? groups[i].models : [];
        for (let j = 0; j < models.length; j++) if (models[j] && models[j].id === sel.model) return models[j];
      }
      return void 0;
    }

    /*
     * Reasoning-effort ids form one shared scale even though providers declare
     * different subsets of it (off/low/high/max here, off/minimal/low/medium/
     * high/xhigh/max there). Ranking on that shared scale is what lets a level
     * the user already picked be mapped onto a model that lacks it.
     */
    const EFFORT_LADDER = ["off", "none", "minimal", "low", "medium", "med", "high", "xhigh", "max", "ultra"];

    /** The effort levels one catalogue model declares, as plain objects. */
    function modelEfforts(model) {
      const reasoning = model && model.reasoning ? model.reasoning : void 0;
      const efforts = reasoning && Array.isArray(reasoning.efforts) ? reasoning.efforts : [];
      return efforts
        .filter((ef) => ef && ef.id !== void 0 && ef.id !== null)
        .map((ef) => ({
          id: String(ef.id),
          name: String(ef.name || ef.id),
          description: ef.description ? String(ef.description) : ""
        }));
    }

    /**
     * Map the effort being carried onto the effort list of the model being
     * switched to.
     *
     * `{ id }`             the carried level is supported as-is
     * `{ id, from }`       the model lacks it and the closest rung was swapped in
     * `{ id: null, from }` the model declares no reasoning at all, so the
     *                      request must omit `reasoningEffort` entirely (the
     *                      Host rejects any explicit effort for such a model)
     */
    function resolveEffort(model, wantedId) {
      const levels = modelEfforts(model);
      const wanted = wantedId === void 0 || wantedId === null ? "" : String(wantedId);
      if (levels.length === 0) return { id: null, from: wanted };
      if (!wanted) return { id: null, from: "" };
      if (levels.some((lv) => lv.id === wanted)) return { id: wanted, from: wanted };
      const wantRank = EFFORT_LADDER.indexOf(wanted.toLowerCase());
      if (wantRank < 0) {
        /* A provider-specific name that is not on the shared scale: its
           distance is unknowable, so prefer this model's own default and only
           then its strongest rung. */
        const fallback = model.reasoning && model.reasoning.defaultEffort ? String(model.reasoning.defaultEffort) : "";
        if (fallback && levels.some((lv) => lv.id === fallback)) return { id: fallback, from: wanted };
        return { id: levels[levels.length - 1].id, from: wanted };
      }
      let best = 0;
      let bestGap = Infinity;
      let bestScaled = -Infinity;
      for (let i = 0; i < levels.length; i++) {
        const rank = EFFORT_LADDER.indexOf(levels[i].id.toLowerCase());
        /* An off-ladder rung still has to sit somewhere: spread the unknown
           ones evenly across the interior of the scale, in declared order. */
        const scaled = rank >= 0 ? rank : 1 + (levels.length > 1 ? (i / (levels.length - 1)) * (EFFORT_LADDER.length - 2) : 0);
        const gap = Math.abs(scaled - wantRank);
        /* Equal distance keeps the stronger rung — silently dropping reasoning
           power is the worse of the two surprises — and it is decided on the
           scale, not on declaration order, so a provider that lists its levels
           the other way round still gets the strong pick. */
        if (gap < bestGap - 1e-9 || (gap < bestGap + 1e-9 && scaled > bestScaled)) {
          bestGap = Math.min(gap, bestGap);
          bestScaled = scaled;
          best = i;
        }
      }
      return { id: levels[best].id, from: wanted };
    }

    /** Display name of one effort id on a model, falling back to the id. */
    function effortName(model, id) {
      const hit = modelEfforts(model).filter((lv) => lv.id === id)[0];
      return hit ? hit.name : String(id);
    }

    /**
     * The composer card that owns the trigger. The shipped DOM uses hashed
     * CSS-module names (`<hash>_card`), so match that suffix first and fall
     * back to "the nearest rounded box that owns a text field".
     */
    function composerBox(el) {
      if (!el || typeof el.closest !== "function") return null;
      const card = el.closest('[class*="_card"]');
      if (card && card.querySelector && card.querySelector('textarea,[contenteditable="true"],[role="textbox"]')) return card;
      let node = el.parentElement;
      while (node && node !== document.body) {
        if (node.querySelector && node.querySelector('textarea,[contenteditable="true"],[role="textbox"]')) {
          const cs = window.getComputedStyle(node);
          if ((parseFloat(cs.borderTopLeftRadius) || 0) >= 10) return node;
        }
        node = node.parentElement;
      }
      return null;
    }

    /**
     * One fixed ring that hugs the composer. It is created once and reused, so
     * re-renders never stack copies; the geometry follows the card through a
     * ResizeObserver plus the window events that can move it.
     */
    function createHalo() {
      let node = null;
      let target = null;
      let observer = null;
      let frame = 0;

      function paint() {
        frame = 0;
        if (!node) return;
        if (!target || !target.isConnected) {
          node.dataset.on = "0";
          return;
        }
        const rect = target.getBoundingClientRect();
        if (!rect.width || !rect.height) {
          node.dataset.on = "0";
          return;
        }
        const radius = parseFloat(window.getComputedStyle(target).borderTopLeftRadius) || 16;
        node.style.left = rect.left - 2 + "px";
        node.style.top = rect.top - 2 + "px";
        node.style.width = rect.width + 4 + "px";
        node.style.height = rect.height + 4 + "px";
        node.style.borderRadius = radius + 2 + "px";
      }

      function schedule() {
        if (frame) return;
        frame = window.requestAnimationFrame(paint);
      }

      function ensure() {
        if (node) return node;
        node = document.createElement("div");
        node.className = "es-halo";
        node.setAttribute("aria-hidden", "true");
        document.body.appendChild(node);
        window.addEventListener("resize", schedule, { passive: true });
        document.addEventListener("scroll", schedule, { capture: true, passive: true });
        return node;
      }

      function place(box, opts) {
        const el = ensure();
        if (box !== target) {
          target = box;
          if (observer && typeof observer.disconnect === "function") observer.disconnect();
          observer = null;
          if (target && typeof window.ResizeObserver === "function") {
            observer = new window.ResizeObserver(schedule);
            observer.observe(target);
          }
          schedule();
        }
        const heat = Math.max(0, Math.min(1, Number(opts.heat) || 0));
        el.style.setProperty("--es-hue", String(opts.hue | 0));
        el.style.setProperty("--es-a0", (0.1 + heat * 0.34).toFixed(3));
        el.style.setProperty("--es-a1", (0.04 + heat * 0.14).toFixed(3));
        el.style.setProperty("--es-a2", (0.1 + heat * 0.44).toFixed(3));
        el.style.setProperty("--es-a3", (0.05 + heat * 0.3).toFixed(3));
        el.style.setProperty("--es-b1", (10 + heat * 26).toFixed(1) + "px");
        el.style.setProperty("--es-b2", (34 + heat * 78).toFixed(1) + "px");
        el.style.opacity = String((!target ? 0 : opts.open ? 0.62 + heat * 0.38 : 0.2 + heat * 0.8).toFixed(3));
        el.dataset.on = target ? "1" : "0";
        el.dataset.hot = target && opts.hot ? "1" : "0";
        schedule();
      }

      function release() {
        if (observer && typeof observer.disconnect === "function") observer.disconnect();
        observer = null;
        target = null;
        if (node) {
          node.dataset.on = "0";
          node.dataset.hot = "0";
        }
      }

      return { place, release };
    }

    class EffortController {
      constructor(ctx) {
        this.ctx = ctx;
        this.catalog = null;
        this.selection = null;
        this.levels = [];
        this.defaultIndex = 0;
        this.sessionId = void 0;
        this.loading = false;
        this.commitTimer = 0;
        this.pendingIndex = -1;
        this.noticeTimer = 0;
        /* The last effort the user actually chose, kept so a round-trip through
           a model that cannot express it returns to that level, not a default. */
        this.lastEffort = "";
        this.token = 0;
        this.bindT = null;
        this.selFace = void 0;
        this.selUnsub = void 0;
        this.store = createStore({
          open: false,
          listOpen: false,
          levels: [],
          models: [],
          index: 0,
          t: 0,
          busy: false,
          error: null,
          notice: null,
          supported: true,
          ready: false,
          modelName: "",
          modelId: "",
          provider: ""
        });
      }

      bindLocale() {
        const bind = readService(() => this.ctx.locale.bind(NS));
        if (typeof bind === "function") this.bindT = bind;
      }

      t(key, vars) {
        let out = void 0;
        if (this.bindT) {
          try {
            const v = this.bindT(key, vars);
            if (typeof v === "string" && v.length && v !== key) out = v;
          } catch (err) {
            /* fall through to the bundled dictionary */
          }
        }
        if (out === void 0) {
          out = typeof zh[key] === "string" ? zh[key] : key;
          if (vars) {
            Object.keys(vars).forEach((k) => {
              out = out.split("{" + k + "}").join(String(vars[k]));
            });
          }
        }
        return out;
      }

      face() {
        return {
          store: this.store,
          t: (k, v) => this.t(k, v),
          open: () => this.open(),
          close: () => this.close(),
          toggle: () => this.toggle(),
          toggleModels: () => this.toggleModels(),
          chooseModel: (provider, modelId) => this.chooseModel(provider, modelId),
          reset: () => this.reset(),
          commit: (i) => this.commit(i),
          setIndex: (i) => this.setIndex(i),
          setSession: (id) => this.setSession(id)
        };
      }

      dispose() {
        clearTimeout(this.commitTimer);
        this.dropSelectionSubscription();
      }

      /* ---------------- state ---------------- */

      setIndex(index) {
        const snap = this.store.getSnapshot();
        const top = topIndexOf(snap.levels.length);
        const i = clamp(index | 0, 0, top);
        if (i === snap.index && Math.abs(snap.t - levelT(i, snap.levels.length)) < 0.001) return;
        this.store.set({ index: i, t: levelT(i, snap.levels.length) });
      }

      setSession(id) {
        if (!id || id === this.sessionId) return;
        this.sessionId = id;
        /* Load the level names for the pill itself, so it shows the real effort
           instead of the generic label before the panel is ever opened. */
        this.refresh();
      }

      /**
       * The Session's durable model-selection projection — the same source the
       * shipped selector reads. `projections.faceOf("modelSelection")` yields
       * `{ lastUsed, next }` where `next = pending ?? lastUsed`: a
       * `model/selection` event carries the user's intent immediately, and a
       * `request/header` records what a request actually used. `catalog.default`
       * is only the deployment default and can differ from what this Session
       * runs, so it is a fallback only.
       */
      selectionFace() {
        const sessionId = this.resolveSessionId();
        if (!sessionId) return void 0;
        const sessions = readService(() => this.ctx.sessions);
        if (!sessions || typeof sessions.binding !== "function") return void 0;
        let binding;
        try {
          binding = sessions.binding(sessionId);
        } catch (err) {
          return void 0;
        }
        const session = binding && binding.session;
        const projections = session && session.projections;
        if (!projections || typeof projections.faceOf !== "function") return void 0;
        try {
          return projections.faceOf("modelSelection");
        } catch (err) {
          return void 0;
        }
      }

      /** Current projected selection, or undefined when the projection has no value yet. */
      projectedSelection() {
        const face = this.selectionFace();
        if (!face || typeof face.getSnapshot !== "function") return void 0;
        let view;
        try {
          view = face.getSnapshot();
        } catch (err) {
          return void 0;
        }
        const next = view && view.next;
        if (!next || typeof next.provider !== "string" || typeof next.model !== "string") return void 0;
        return next;
      }

      dropSelectionSubscription() {
        if (this.selUnsub) {
          try {
            this.selUnsub();
          } catch (err) {
            /* an already-disposed face throws on unsubscribe */
          }
        }
        this.selUnsub = void 0;
        this.selFace = void 0;
      }

      /**
       * Follow the Session's projection so a selection made anywhere else (the
       * `/model` command, a restored Session) updates this control instead of
       * leaving a stale label in the composer.
       */
      bindSelection() {
        const face = this.selectionFace();
        if (face === this.selFace) return;
        this.dropSelectionSubscription();
        if (!face || typeof face.subscribe !== "function") return;
        this.selFace = face;
        this.selUnsub = face.subscribe(() => {
          /* Opening the face and later commits both notify; defer so the
             in-flight refresh guard has cleared before this one starts. */
          setTimeout(() => {
            this.refresh();
          }, 0);
        });
      }

      resolveSessionId() {
        if (this.sessionId) return this.sessionId;
        const sessions = readService(() => this.ctx.sessions);
        if (!sessions || !sessions.list || typeof sessions.list.getSnapshot !== "function") return void 0;
        let snap = void 0;
        try {
          snap = sessions.list.getSnapshot();
        } catch (err) {
          return void 0;
        }
        return mainViewSessionId(snap && snap.byId);
      }

      open() {
        this.store.set({ open: true });
        this.refresh();
      }

      close() {
        this.store.set({ open: false, listOpen: false });
      }

      toggle() {
        if (this.store.getSnapshot().open) this.close();
        else this.open();
      }

      toggleModels() {
        const snap = this.store.getSnapshot();
        this.store.set({ listOpen: !snap.listOpen });
      }

      reset() {
        const target = this.defaultIndex;
        this.setIndex(target);
        this.commit(target);
      }

      /**
       * Switch the Session-local model while keeping the reasoning effort the
       * user already picked, then reload the catalogue because the new model
       * exposes its own effort list.
       */
      async chooseModel(provider, modelId) {
        const snap = this.store.getSnapshot();
        if (snap.provider === provider && snap.modelId === modelId) {
          this.store.set({ listOpen: false });
          return;
        }
        const remote = readService(() => this.ctx.remote.session);
        if (!remote || typeof remote.selectModel !== "function") {
          this.store.set({ error: "selectModel is unavailable in this build" });
          return;
        }
        const sessionId = this.resolveSessionId();
        if (!sessionId) {
          this.store.set({ error: this.t("noSession") });
          return;
        }
        const level = this.levels[snap.index];
        if (level) this.lastEffort = level.id;
        const target = findModel(this.catalog, { provider: String(provider), model: String(modelId) });
        /* The Host rejects an explicit effort the target model does not declare
           (UNSUPPORTED_REASONING_EFFORT) and performs no clamping of its own, so
           the carried level is mapped onto the target's rungs before asking.
           An unknown target keeps the old shape and lets the Host be the
           authority. */
        const mapped = target ? resolveEffort(target, level ? level.id : this.lastEffort) : { id: level ? level.id : null, from: "" };
        const request = { sessionId, provider: String(provider), model: String(modelId) };
        if (mapped.id) request.reasoningEffort = mapped.id;
        const token = ++this.token;
        this.store.set({ busy: true, error: null, notice: null, listOpen: false });
        try {
          const res = await withTimeout(remote.selectModel(request), SELECT_TIMEOUT_MS);
          if (token !== this.token) return;
          if (res && res.ok) {
            const selected = res.value && res.value.selected;
            const next = Object.assign({}, this.selection || {}, selected || {}, {
              provider: request.provider,
              model: request.model
            });
            if (mapped.id) next.reasoningEffort = mapped.id;
            else delete next.reasoningEffort;
            this.selection = next;
            this.store.set({ busy: false, error: null, notice: this.note(this.switchNotice(target, level, mapped)) });
            this.loading = false;
            this.refresh();
          } else {
            this.store.set({ busy: false, error: messageOf(res && res.error) || "refused" });
          }
        } catch (err) {
          if (token !== this.token) return;
          this.store.set({ busy: false, error: messageOf(err) });
        }
      }

      /**
       * One short line saying what the switch had to change, or null when the
       * carried effort was accepted verbatim.
       */
      switchNotice(target, level, mapped) {
        if (!target || !level) return null;
        if (mapped.id === null) return this.t("noEffortModel", { model: target.name || target.id || "" });
        if (mapped.id !== level.id) return this.t("clamped", { from: level.name || level.id, to: effortName(target, mapped.id) });
        return null;
      }

      /** Show a transient footer line; it expires on its own and never sticks. */
      note(text) {
        if (!text) return null;
        clearTimeout(this.noticeTimer);
        const shown = text;
        this.noticeTimer = setTimeout(() => {
          if (this.store.getSnapshot().notice === shown) this.store.set({ notice: null });
        }, 9000);
        return shown;
      }

      /* ---------------- catalogue ---------------- */

      async refresh() {
        if (this.loading) return;
        this.loading = true;
        /* Reading a projection before subscribing to it can return no value at
           all, so the follow-up starts the subscription first. */
        this.bindSelection();
        let remote;
        try {
          remote = this.ctx.remote.session;
        } catch (err) {
          this.loading = false;
          this.store.set({ supported: false, ready: true, levels: [], modelName: "", error: null, debug: "inject:" + messageOf(err) });
          return;
        }
        if (!remote || typeof remote.modelCatalog !== "function") {
          this.loading = false;
          this.store.set({
            supported: false,
            ready: true,
            levels: [],
            modelName: "",
            error: null,
            debug: "shape:" + (remote ? Object.keys(remote).slice(0, 8).join("+") : "undef")
          });
          return;
        }
        try {
          const res = await withTimeout(remote.modelCatalog(), SELECT_TIMEOUT_MS);
          if (!res || !res.ok) {
            this.store.set({ ready: true, error: messageOf(res && res.error) || "modelCatalog failed", debug: "res:" + (res ? String(res.ok) : "null") });
            return;
          }
          const catalog = res.value || {};
          this.catalog = catalog;
          const fallback = catalog.default || {};
          /* The durable projection is authoritative: it carries the user's
             pending intent immediately after a `model/selection` event and the
             last actually-used configuration after a `request/header`. */
          const projected = this.projectedSelection();
          const sel = Object.assign({}, fallback, projected || {});
          this.selection = Object.assign({}, sel);
          const model = findModel(catalog, sel) || findModel(catalog, fallback);
          const reasoning = model && model.reasoning ? model.reasoning : void 0;
          const efforts = reasoning && Array.isArray(reasoning.efforts) ? reasoning.efforts : [];
          const levels = efforts
            .filter((ef) => ef && ef.id !== void 0 && ef.id !== null)
            .map((ef) => ({
              id: String(ef.id),
              name: String(ef.name || ef.id),
              description: ef.description ? String(ef.description) : ""
            }));
          const fallbackId = reasoning && reasoning.defaultEffort ? String(reasoning.defaultEffort) : "";
          let index = levels.findIndex((l) => l.id === String(sel.reasoningEffort || ""));
          if (index < 0 && fallbackId) index = levels.findIndex((l) => l.id === fallbackId);
          if (index < 0) index = Math.max(0, levels.length - 1);
          this.levels = levels;
          this.defaultIndex = index;
          const groups = Array.isArray(catalog.groups) ? catalog.groups : [];
          const models = groups.map((group) => ({
            id: String(group && group.id != null ? group.id : ""),
            name: String((group && (group.name || group.id)) || ""),
            models: (Array.isArray(group && group.models) ? group.models : [])
              .filter((m) => m && m.id != null)
              .map((m) => ({
                id: String(m.id),
                name: String(m.name || m.id),
                description: m.description ? String(m.description) : "",
                efforts: m.reasoning && Array.isArray(m.reasoning.efforts) ? m.reasoning.efforts.length : 0
              }))
          }));
          this.store.set({
            levels,
            models,
            modelId: String(sel.model || ""),
            provider: String(sel.provider || ""),
            index,
            t: levelT(index, levels.length),
            supported: levels.length > 0,
            ready: true,
            error: null,
            debug: "ok:" + levels.length,
            modelName: model ? String(model.name || model.id || "") : String(sel.model || "")
          });
        } catch (err) {
          this.store.set({ ready: true, error: messageOf(err), debug: "throw:" + messageOf(err) });
        } finally {
          this.loading = false;
        }
      }

      /* ---------------- commit ---------------- */

      commit(index) {
        this.setIndex(index);
        this.pendingIndex = index;
        clearTimeout(this.commitTimer);
        this.commitTimer = setTimeout(() => {
          this.flush();
        }, COMMIT_DEBOUNCE_MS);
      }

      async flush() {
        const index = this.pendingIndex;
        this.pendingIndex = -1;
        if (index < 0) return;
        const level = this.levels[index];
        if (!level) return;
        const remote = readService(() => this.ctx.remote.session);
        if (!remote || typeof remote.selectModel !== "function") {
          this.store.set({ error: "selectModel is unavailable in this build" });
          return;
        }
        const sessionId = this.resolveSessionId();
        if (!sessionId) {
          this.store.set({ error: this.t("noSession") });
          return;
        }
        const base = this.selection || {};
        const currentModel = this.catalog ? findModel(this.catalog, base) : void 0;
        /* A drag is normally inside the current model's own rungs; resolving
           anyway keeps a stale level (switch still in flight) from being sent
           as an explicit unsupported effort. */
        const mapped = currentModel ? resolveEffort(currentModel, level.id) : { id: level.id, from: level.id };
        /* Send the explicit triple the shipped selector sends, so the Host never
           has to infer provider/model from a partial request. */
        const request = {
          sessionId,
          provider: String(base.provider || ""),
          model: String(base.model || ""),
          ...(mapped.id ? { reasoningEffort: mapped.id } : {})
        };
        const token = ++this.token;
        this.store.set({ busy: true, error: null, notice: null });
        try {
          const res = await withTimeout(remote.selectModel(request), SELECT_TIMEOUT_MS);
          if (token !== this.token) return;
          if (res && res.ok) {
            const selected = res.value && res.value.selected;
            const applied = Object.assign({}, base, selected || {});
            if (mapped.id) applied.reasoningEffort = mapped.id;
            else delete applied.reasoningEffort;
            if (mapped.id) this.lastEffort = mapped.id;
            this.selection = Object.assign({}, applied);
            /* The Host appends a `model/selection` event, so the projection now
               reports this choice; re-read it to confirm and pick up names. */
            this.store.set({
              busy: false,
              error: null,
              modelId: String(applied.model || ""),
              provider: String(applied.provider || "")
            });
            this.refresh();
          } else {
            this.store.set({ busy: false, error: messageOf(res && res.error) || "refused" });
          }
        } catch (err) {
          if (token !== this.token) return;
          this.store.set({ busy: false, error: messageOf(err) });
        }
      }
    }

    /* ------------------------------------------------------------------ *
     * components
     * ------------------------------------------------------------------ */

    function chevronGlyph() {
      return h(
        "svg",
        { width: 11, height: 11, viewBox: "0 0 24 24", "aria-hidden": "true", style: { display: "block" } },
        h("path", {
          d: "M6 9l6 6 6-6",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 2.2,
          strokeLinecap: "round",
          strokeLinejoin: "round"
        })
      );
    }

    /**
     * The whole control lives in the composer's model cell: a trigger that
     * reads "model · effort" plus a popup that carries the model list and the
     * glowing effort rail.
     */
    function ModelEffortControl(props) {
      const snap = react.useSyncExternalStore(props.store.subscribe, props.store.getSnapshot);
      const sid = props.sessionId;
      react.useEffect(() => {
        if (sid && typeof props.setSession === "function") props.setSession(sid);
      }, [sid]);

      const triggerRef = react.useRef(null);
      const menuRef = react.useRef(null);
      const trackRef = react.useRef(null);
      const bgRef = react.useRef(null);
      const railRef = react.useRef(null);
      const fxRef = react.useRef(null);
      const flashRef = react.useRef(null);
      const bigRef = react.useRef(null);
      const engineRef = react.useRef(null);
      const levelsRef = react.useRef(snap.levels);
      levelsRef.current = snap.levels;

      const posState = react.useState(null);
      const pos = posState[0];
      const setPos = posState[1];

      if (engineRef.current === null) engineRef.current = createEngine();

      /* The glow that used to sit on the pill now wraps the composer card. */
      const haloRef = react.useRef(null);
      if (haloRef.current === null) haloRef.current = createHalo();
      react.useEffect(() => {
        const halo = haloRef.current;
        const count = snap.levels.length;
        if (!snap.ready || !count) {
          halo.release();
          return;
        }
        const heat = count > 1 ? snap.index / (count - 1) : 0;
        halo.place(composerBox(triggerRef.current), {
          hue: Math.round(hueAtT(snap.t)),
          heat: heat,
          open: snap.open,
          hot: heat >= 0.85
        });
      }, [snap.ready, snap.index, snap.levels.length, snap.open, snap.t]);
      react.useEffect(() => () => haloRef.current.release(), []);

      /* Anchor the popup above the trigger, clamped into the viewport. */
      react.useEffect(() => {
        if (!snap.open) {
          setPos(null);
          return;
        }
        const place = () => {
          const el = triggerRef.current;
          if (!el || typeof el.getBoundingClientRect !== "function") return;
          const rect = el.getBoundingClientRect();
          /* A detached or hidden trigger reports an all-zero box; keep the last good spot. */
          if (rect.width < 1 && rect.height < 1) return;
          const vw = window.innerWidth || 1024;
          const vh = window.innerHeight || 768;
          const width = Math.min(400, Math.max(240, vw - 24));
          /* Right-align the popup to the trigger, the way a composer menu reads. */
          const left = Math.max(8, Math.min(rect.right - width, vw - width - 8));
          /*
           * Open upward by default (the trigger sits in the composer, near the
           * bottom). On a short viewport — a landscape phone, a small window —
           * there may be almost no room above, so fall back to opening downward
           * and cap the height to the space that is actually available. Without
           * this the popup ran off the top of the screen.
           */
          const gap = 8;
          const spaceAbove = rect.top - gap - 8;
          const spaceBelow = vh - rect.bottom - gap - 8;
          const up = spaceAbove >= 220 || spaceAbove >= spaceBelow;
          const room = Math.max(140, up ? spaceAbove : spaceBelow);
          setPos(
            up
              ? { left, width, bottom: vh - rect.top + gap, maxHeight: room, top: null }
              : { left, width, top: rect.bottom + gap, maxHeight: room, bottom: null }
          );
        };
        place();
        window.addEventListener("resize", place);
        window.addEventListener("scroll", place, true);
        return () => {
          window.removeEventListener("resize", place);
          window.removeEventListener("scroll", place, true);
        };
      }, [snap.open]);

      const ready = snap.open && pos !== null;

      react.useEffect(() => {
        if (!ready) return;
        const engine = engineRef.current;
        if (!engine) return;
        const reduce =
          typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        engine.mount({
          els: {
            stage: menuRef.current,
            track: trackRef.current,
            bg: bgRef.current,
            rail: railRef.current,
            fx: fxRef.current,
            flash: flashRef.current,
            big: bigRef.current
          },
          count: levelsRef.current.length,
          texts: { boom: props.t("boom"), after: props.t("afterBoom") },
          reduce,
          onLevel: (i) => props.setIndex(i),
          onRelease: (i) => props.commit(i)
        });
        engine.setIndex(snap.index, true);
        return () => engine.unmount();
      }, [ready]);

      react.useEffect(() => {
        const engine = engineRef.current;
        if (!engine || !ready || !engine.isMounted()) return;
        engine.setCount(snap.levels.length);
        if (!engine.isDragging()) engine.setIndex(snap.index, true);
      }, [snap.levels.length]);

      /* Dismiss on an outside press or Escape. */
      react.useEffect(() => {
        if (!snap.open) return;
        const onDown = (ev) => {
          const target = ev.target;
          const menu = menuRef.current;
          const trigger = triggerRef.current;
          if (menu && typeof menu.contains === "function" && menu.contains(target)) return;
          if (trigger && typeof trigger.contains === "function" && trigger.contains(target)) return;
          props.close();
        };
        const onEsc = (ev) => {
          if (ev.key === "Escape") props.close();
        };
        document.addEventListener("pointerdown", onDown, true);
        document.addEventListener("keydown", onEsc, true);
        return () => {
          document.removeEventListener("pointerdown", onDown, true);
          document.removeEventListener("keydown", onEsc, true);
        };
      }, [snap.open]);

      const hue = Math.round(hueAtT(snap.t));
      const current = snap.levels[snap.index];
      const n = snap.levels.length;
      const modelText = snap.modelId || snap.modelName || "";
      const effortText = current ? current.name : "";
      const locked = props.locked === true;
      const summary = props.t("triggerHint") + (modelText ? " — " + modelText : "") + (effortText ? " · " + effortText : "") + (snap.error ? " · " + snap.error : "");

      const trigger = h(
        "button",
        {
          ref: triggerRef,
          key: "trigger",
          type: "button",
          className: "es-trigger",
          title: summary,
          "aria-label": summary,
          "aria-haspopup": "dialog",
          "aria-expanded": snap.open ? "true" : "false",
          "data-open": snap.open ? "1" : "0",
          "data-locked": locked ? "1" : "0",
          disabled: locked,
          style: { "--es-hue": String(hue), "--es-e": snap.t.toFixed(3) },
          onClick: () => props.toggle()
        },
        h("span", { className: "es-trigger-bolt", key: "b" }, boltGlyph(14, hue)),
        h("span", { className: "es-trigger-text", key: "m" }, safeLabel(modelText) || props.t("modelLabel")),
        effortText ? h("span", { className: "es-trigger-sep", key: "s" }, "·") : null,
        effortText ? h("span", { className: "es-trigger-effort", key: "e" }, safeLabel(effortText)) : null,
        h("span", { className: "es-trigger-chev", key: "c" }, chevronGlyph())
      );

      if (!ready) return trigger;

      const footText = snap.error
        ? props.t("failed", { message: snap.error })
        : snap.busy
          ? props.t("switching")
          : snap.notice
            ? snap.notice
            : !snap.supported && snap.ready
              ? props.t("noReasoning")
              : current && current.description
                ? current.description
                : props.t("hint");
      const footNote = !snap.error && !snap.busy && !!snap.notice;

      const modelNodes = [];
      snap.models.forEach((group) => {
        if (group.name) modelNodes.push(h("div", { key: "gh-" + group.id, className: "es-models-group" }, safeLabel(group.name)));
        group.models.forEach((entry) => {
          const on = entry.id === snap.modelId && group.id === snap.provider;
          modelNodes.push(
            h(
              "button",
              {
                key: "mi-" + group.id + "-" + entry.id,
                type: "button",
                className: "es-model-item",
                "data-on": on ? "1" : "0",
                title: entry.description || entry.name,
                onClick: () => props.chooseModel(group.id, entry.id)
              },
              h("span", { className: "es-model-item-name", key: "n" }, safeLabel(entry.name)),
              entry.efforts === 0 ? h("span", { className: "es-model-item-tag", key: "tag" }, props.t("noLevelsTag")) : null
            )
          );
        });
      });

      const menu = h(
        "div",
        {
          ref: menuRef,
          key: "menu",
          className: "es-menu",
          role: "dialog",
          "aria-label": props.t("panelTitle"),
          style: {
            left: pos.left + "px",
            ...(pos.top === null || pos.top === void 0 ? {} : { top: pos.top + "px" }),
            ...(pos.bottom === null || pos.bottom === void 0 ? {} : { bottom: pos.bottom + "px" }),
            maxHeight: pos.maxHeight + "px",
            width: pos.width + "px",
            "--es-hue": String(hue),
            "--es-t": snap.t.toFixed(4),
            "--es-e": snap.t.toFixed(3)
          }
        },
        h("canvas", { className: "es-menu-bg", key: "bg", ref: bgRef }),
        h("div", { className: "es-menu-vig", key: "vig" }),
        h(
          "div",
          { className: "es-menu-body", key: "body" },
          h(
            "button",
            {
              className: "es-menu-row",
              key: "row",
              type: "button",
              "data-open": snap.listOpen ? "1" : "0",
              "aria-expanded": snap.listOpen ? "true" : "false",
              onClick: () => props.toggleModels()
            },
            h("span", { className: "es-menu-row-label", key: "l" }, props.t("modelLabel")),
            h("span", { className: "es-menu-row-value", key: "v", title: modelText }, safeLabel(modelText) || props.t("noModels")),
            h("span", { className: "es-menu-chev", key: "c" }, chevronGlyph())
          ),
          snap.listOpen
            ? h(
                "div",
                { className: "es-models", key: "models" },
                modelNodes.length
                  ? modelNodes
                  : h("div", { className: "es-models-group", key: "none" }, props.t("noModels"))
              )
            : null,
          h("div", { className: "es-menu-sep", key: "sep" }),
          h(
            "div",
            { className: "es-effort-head", key: "eh" },
            h("span", { className: "es-head-glyph", key: "g" }, boltGlyph(13, hue)),
            h("span", { key: "t" }, props.t("effortLabel")),
            current ? h("span", { className: "es-tag", key: "tag" }, current.name) : null
          ),
          h(
            "div",
            { className: "es-track", key: "track", ref: trackRef, onPointerDown: (ev) => engineRef.current.beginDrag(ev) },
            h("canvas", { className: "es-rail", key: "rail", ref: railRef }),
            h(
              "div",
              { className: "es-ticks", key: "ticks" },
              snap.levels.map((lv, i) =>
                h("span", {
                  key: "tick-" + lv.id,
                  className: "es-tick",
                  "data-on": i <= snap.index ? "1" : "0",
                  style: { "--i": n > 1 ? (i / (n - 1)).toFixed(4) : "0" }
                })
              )
            ),
            h("div", { className: "es-thumb", key: "thumb" })
          ),
          h(
            "div",
            { className: "es-scale", key: "scale" },
            snap.levels.map((lv, i) =>
              h(
                "button",
                {
                  key: "sc-" + lv.id,
                  type: "button",
                  className: "es-scale-item",
                  "data-on": i === snap.index ? "1" : "0",
                  style: { left: "calc(31px + (100% - 62px) * " + (n > 1 ? (i / (n - 1)).toFixed(4) : "0") + ")" },
                  title: lv.description || lv.name,
                  onClick: () => props.commit(i)
                },
                lv.name
              )
            )
          ),
          h("div", { className: "es-foot", key: "foot", "data-err": snap.error ? "1" : "0", "data-note": footNote ? "1" : "0" }, footText)
        ),
        h("canvas", { className: "es-fx", key: "fx", ref: fxRef }),
        h("div", { className: "es-flash", key: "flash", ref: flashRef }),
        h("div", { className: "es-big", key: "big", ref: bigRef })
      );

      /* The popup is portalled to <body>: the composer row can sit inside a
         transformed or overflow-clipped ancestor, which would otherwise move
         or cut a position:fixed child. */
      const portal =
        reactDom && typeof reactDom.createPortal === "function" && typeof document !== "undefined"
          ? reactDom.createPortal(menu, document.body)
          : menu;

      return h("span", { className: "es-anchor", key: "anchor" }, trigger, portal);
    }

    /* ------------------------------------------------------------------ *
     * module surface
     * ------------------------------------------------------------------ */

    /**
     * BOTH `remote` and `remote.session` are required: Cordis validates the
     * nested property access (`ctx.get("remote").session`) against this list, and
     * a missing entry throws `cannot get property "remote.session" without
     * inject` — which, from a render path, blanks the panel.
     */
    const inject = ["slots", "locale", "sessions", "remote", "remote.session"];

    function apply(ctx) {
      injectCss();

      ctx.effect(
        () => {
          try {
            return ctx.locale.register(NS, { zh, en });
          } catch (err) {
            return () => {};
          }
        },
        "effort-slider: dictionaries"
      );

      const controller = new EffortController(ctx);
      controller.bindLocale();

      ctx.effect(() => () => controller.dispose(), "effort-slider: controller");

      /* Take over the shipped model cell so model + reasoning effort are one
         control. A single slot renders the LOWEST priority first
         (`entries` is sorted ascending by priority, and the renderer takes
         `entriesOfSlot(key)[0]`), so the shipped occupant (priority 0) is
         shadowed only by a negative priority. */
      ctx.slots.inject("conversation.input.model", () => {
        try {
          const unregister = ctx.slots.register(
            {
              name: "conversation.input.model",
              priority: -1,
              label: () => "Model and reasoning effort",
              inject: () => controller.face()
            },
            ModelEffortControl
          );
          return () => {
            unregister();
          };
        } catch (err) {
          return () => {};
        }
      });
    }

    exports.name = "@lolannn/dsh-effort-slider";
    exports.inject = inject;
    exports.apply = apply;

    return module.exports;
  }
});
