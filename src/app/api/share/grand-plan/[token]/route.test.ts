import crypto from "crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  grandPlan: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { POST } from "./route";

const SHARE_TOKEN = "token1234567";
const PASSWORD = "let-me-in";

function makeLegacyHash(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function makeS2Hash(password: string): string {
  const salt = "00112233445566778899aabbccddeeff";
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `s2:${salt}:${hash}`;
}

function makeRequest(password: unknown, view: "plan" | "presentation" = "plan"): NextRequest {
  const qs = view === "presentation" ? "?view=presentation" : "";
  return new NextRequest(`http://localhost/api/share/grand-plan/${SHARE_TOKEN}${qs}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

function makePlan(sharePassword: string) {
  return {
    id: "plan-1",
    title: "Q3 Strategy",
    sharePassword,
    shareExpiresAt: null,
    generatedHtml: "<html><body>hello</body></html>",
    planDataJson: null,
    presentationHtml: null,
    presentationDataJson: null,
    enquiryFormEnabled: true,
    prospectName: "Demo Prospect",
    client: null,
  };
}

describe("POST /api/share/grand-plan/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.grandPlan.update.mockResolvedValue({});
  });

  it("accepts a legacy SHA-256 password and upgrades it to s2", async () => {
    prismaMock.grandPlan.findUnique.mockResolvedValue(makePlan(makeLegacyHash(PASSWORD)));

    const response = await POST(makeRequest(PASSWORD), {
      params: Promise.resolve({ token: SHARE_TOKEN }),
    });

    expect(response.status).toBe(200);
    expect(prismaMock.grandPlan.update).toHaveBeenCalledTimes(2);

    const firstUpdate = prismaMock.grandPlan.update.mock.calls[0]?.[0] as {
      data: { sharePassword: string };
      where: { id: string };
    };
    expect(firstUpdate.where.id).toBe("plan-1");
    expect(firstUpdate.data.sharePassword).toMatch(/^s2:[0-9a-f]{32}:[0-9a-f]{128}$/);

    const secondUpdate = prismaMock.grandPlan.update.mock.calls[1]?.[0] as {
      data: { viewCount: { increment: number } };
    };
    expect(secondUpdate.data.viewCount.increment).toBe(1);

    const payload = await response.json();
    expect(payload.html).toContain("hello");
  });

  it("does not rewrite password hash when already stored as s2", async () => {
    prismaMock.grandPlan.findUnique.mockResolvedValue(makePlan(makeS2Hash(PASSWORD)));

    const response = await POST(makeRequest(PASSWORD), {
      params: Promise.resolve({ token: SHARE_TOKEN }),
    });

    expect(response.status).toBe(200);
    expect(prismaMock.grandPlan.update).toHaveBeenCalledTimes(1);

    const updatePayload = prismaMock.grandPlan.update.mock.calls[0]?.[0] as {
      data: { viewCount: { increment: number } };
    };
    expect(updatePayload.data.viewCount.increment).toBe(1);
  });

  it("rejects incorrect password", async () => {
    prismaMock.grandPlan.findUnique.mockResolvedValue(makePlan(makeLegacyHash(PASSWORD)));

    const response = await POST(makeRequest("wrong-password"), {
      params: Promise.resolve({ token: SHARE_TOKEN }),
    });

    expect(response.status).toBe(401);
    expect(prismaMock.grandPlan.update).not.toHaveBeenCalled();

    const payload = await response.json();
    expect(payload.error).toBe("Incorrect password");
  });

  it("strips inline edit controls from fallback plan HTML", async () => {
    prismaMock.grandPlan.findUnique.mockResolvedValue({
      ...makePlan(makeLegacyHash(PASSWORD)),
      generatedHtml: `<html><body>
        <div id="gp-edit-toolbar">undo</div>
        <p class="gp-edit editable-inline" contenteditable="true" spellcheck="false" data-edit-path="sections.executiveSummary">Editable</p>
        <button data-delete-path="sections.executiveSummary" data-delete-label="Executive">×</button>
      </body></html>`,
    });

    const response = await POST(makeRequest(PASSWORD), {
      params: Promise.resolve({ token: SHARE_TOKEN }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.html).not.toContain("gp-edit-toolbar");
    expect(payload.html).not.toContain('contenteditable="true"');
    expect(payload.html).not.toContain("data-edit-path=");
    expect(payload.html).not.toContain("data-delete-path=");
    expect(payload.html).not.toContain("gp-edit");
    expect(payload.html).not.toContain("editable-inline");
  });

  it("strips inline edit controls from fallback presentation HTML", async () => {
    prismaMock.grandPlan.findUnique.mockResolvedValue({
      ...makePlan(makeLegacyHash(PASSWORD)),
      presentationDataJson: null,
      presentationHtml: `<html><body>
        <p class="gp-edit" contenteditable="true" data-edit-path="slides.0.title">Editable slide</p>
      </body></html>`,
    });

    const response = await POST(makeRequest(PASSWORD, "presentation"), {
      params: Promise.resolve({ token: SHARE_TOKEN }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.view).toBe("presentation");
    expect(payload.html).not.toContain('contenteditable="true"');
    expect(payload.html).not.toContain("data-edit-path=");
    expect(payload.html).not.toContain("gp-edit");
  });
});
