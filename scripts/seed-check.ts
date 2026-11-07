import { buildDemoSeed } from "../lib/seed/demo";
const d = buildDemoSeed(crypto.randomUUID());
console.log("posts", d.posts.length, "variants", d.variants.length, "schedule", d.schedule.length);
const issues = d.variants.flatMap((v) => v.compliance.map((c) => `${v.platform}:${c.ruleId}:${c.severity}`));
console.log(issues.reduce((m, k) => (m[k] = (m[k] ?? 0) + 1, m), {} as Record<string, number>));
console.log(d.variants[0].caption); console.log("---"); console.log(d.variants[2].caption);
console.log(d.posts.map((p) => `${p.pillar}/${p.templateType}/${p.status}`).join("\n"));
