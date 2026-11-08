import { describe, expect, it } from "vitest";
import { ConsentInput } from "@/lib/services/consent";

const base = { clientAlias: "JK", scope: ["before-after"], platforms: "all", allowFace: false, allowTagging: false, months: 12, agreed: true };

describe("consent input", () => {
  it("rebuilds signatures from path data only", () => {
    const r = ConsentInput.parse({ ...base, signatureSvg: '<svg onload="alert(1)"><script>x</script><path d="M10 10 L20 20" onclick="x"/><image href="https://evil"/></svg>' });
    expect(r.signatureSvg).not.toMatch(/script|onload|onclick|href|image/);
    expect(r.signatureSvg).toContain('d="M10 10 L20 20"');
  });
  it("rejects empty signatures and contact details as aliases", () => {
    expect(ConsentInput.safeParse({ ...base, signatureSvg: "<svg></svg>" }).success).toBe(false);
    expect(ConsentInput.safeParse({ ...base, clientAlias: "jane@x.com", signatureSvg: '<svg><path d="M1 1 L2 2"/></svg>' }).success).toBe(false);
  });
});
