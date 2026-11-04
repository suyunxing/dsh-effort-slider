/* Runs every harness. `npm test` is what `prepublishOnly` calls, so a release
   cannot ship a mapping rule that the real controller code does not follow. */
const { spawnSync } = require("child_process");
const path = require("path");

const files = ["effort-mapping.test.cjs", "model-switch.test.cjs", "rail-warp.test.cjs"];
let failed = 0;

for (const file of files) {
  console.log("\n=== " + file + " ===");
  const run = spawnSync(process.execPath, [path.join(__dirname, file)], { stdio: "inherit" });
  if (run.status !== 0) failed += 1;
}

console.log(failed === 0 ? "\nall harnesses passed" : "\n" + failed + " harness(es) failed");
process.exit(failed === 0 ? 0 : 1);
