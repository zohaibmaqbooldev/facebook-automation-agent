import { existsSync } from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const projectRoot = process.cwd();
let mappedDrive;
let cleaned = false;

function cleanup() {
  if (!mappedDrive || cleaned) return;
  cleaned = true;
  spawnSync("subst", [mappedDrive, "/D"], { stdio: "inherit", windowsHide: true });
}

if (process.platform === "win32") {
  const available = ["X:", "Y:", "Z:", "V:", "W:", "U:", "T:"];
  mappedDrive = available.find((drive) => !existsSync(`${drive}\\`));
  if (!mappedDrive) throw new Error("No free temporary drive letter is available for the short-path build.");
  const mapping = spawnSync("subst", [mappedDrive, projectRoot], { stdio: "inherit", windowsHide: true });
  if (mapping.error || mapping.status !== 0) throw mapping.error ?? new Error("Windows could not create the temporary short-path drive.");
  process.on("exit", cleanup);
  process.chdir(`${mappedDrive}\\`);
}

const nextCli = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const build = await new Promise((resolve) => {
  const child = spawn(process.execPath, [nextCli, "build"], { cwd: process.cwd(), stdio: "inherit", windowsHide: true });
  child.once("error", (error) => resolve({ error }));
  child.once("exit", (code, signal) => resolve({ code, signal }));
});
cleanup();
if (build.error) throw build.error;
process.exitCode = build.code ?? 1;
