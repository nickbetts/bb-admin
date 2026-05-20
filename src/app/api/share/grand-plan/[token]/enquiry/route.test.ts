import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  grandPlan: {
    findUnique: vi.fn(),
  },
  grandPlanEnquiry: {
    count: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { POST } from "./route";

const SHARE_TOKEN = "token1234567";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost/api/share/grand-plan/${SHARE_TOKEN}/enquiry`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/share/grand-plan/[token]/enquiry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.grandPlan.findUnique.mockResolvedValue({
      id: "plan-1",
      enquiryFormEnabled: true,
      shareExpiresAt: null,
    });
  });

  it("returns 429 when the short-window submission limit is reached", async () => {
    prismaMock.grandPlanEnquiry.count.mockResolvedValue(6);

    const response = await POST(
      makeRequest({ name: "Alex", email: "alex@example.com", message: "Hello" }),
      { params: Promise.resolve({ token: SHARE_TOKEN }) },
    );

    expect(response.status).toBe(429);
    expect(prismaMock.grandPlanEnquiry.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.grandPlanEnquiry.create).not.toHaveBeenCalled();

    const payload = await response.json();
    expect(payload.error).toContain("Too many enquiries");
  });

  it("returns 429 when the same email has recently submitted", async () => {
    prismaMock.grandPlanEnquiry.count.mockResolvedValue(0);
    prismaMock.grandPlanEnquiry.findFirst.mockResolvedValue({ id: "enq-existing" });

    const response = await POST(
      makeRequest({ name: "Alex", email: "alex@example.com", message: "Hello" }),
      { params: Promise.resolve({ token: SHARE_TOKEN }) },
    );

    expect(response.status).toBe(429);
    expect(prismaMock.grandPlanEnquiry.create).not.toHaveBeenCalled();

    const payload = await response.json();
    expect(payload.error).toContain("already submitted recently");
  });

  it("creates enquiry when limits are not hit", async () => {
    prismaMock.grandPlanEnquiry.count.mockResolvedValue(0);
    prismaMock.grandPlanEnquiry.findFirst.mockResolvedValue(null);
    prismaMock.grandPlanEnquiry.create.mockResolvedValue({ id: "enq-1" });

    const response = await POST(
      makeRequest({
        name: "  Alex  ",
        email: "alex@example.com",
        phone: " 01234 ",
        message: " Need details ",
      }),
      { params: Promise.resolve({ token: SHARE_TOKEN }) },
    );

    expect(response.status).toBe(200);
    expect(prismaMock.grandPlanEnquiry.create).toHaveBeenCalledWith({
      data: {
        grandPlanId: "plan-1",
        name: "Alex",
        email: "alex@example.com",
        phone: "01234",
        message: "Need details",
      },
    });

    const payload = await response.json();
    expect(payload).toEqual({ ok: true, enquiryId: "enq-1" });
  });
});
