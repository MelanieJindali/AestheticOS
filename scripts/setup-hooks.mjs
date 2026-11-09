// Runs on `npm install` (prepare): points git at the repo's shared hooks so the
// secret-blocking pre-commit hook is active in every clone. Silently does
// nothing outside a git checkout (e.g. CI or Vercel builds from a tarball).
import { execFileSync } from "node:child_process";

try {
  execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { stdio: "ignore" });
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], { stdio: "ignore" });
} catch {
  // Not a git checkout, or git is unavailable: nothing to set up.
}
