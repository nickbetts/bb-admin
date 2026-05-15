import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

type Fixture = {
  id: string;
  shareToken: string;
  publicSlug: string;
};

async function seedTurnstileToken(page: Page) {
  await page.evaluate(() => {
    const form = document.querySelector('form[data-lp-form="true"], form');
    if (!form) return;

    let tokenInput = form.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement | null;
    if (!tokenInput) {
      tokenInput = document.createElement("input");
      tokenInput.type = "hidden";
      tokenInput.name = "cf-turnstile-response";
      form.appendChild(tokenInput);
    }
    tokenInput.value = "lp-e2e-token";
  });
}

async function setEmailMode(request: APIRequestContext, mode: "success" | "fail" | null) {
  const res = await request.post("/api/test/email-mode", {
    data: { mode },
  });
  expect(res.ok()).toBeTruthy();
}

async function setTurnstileMode(request: APIRequestContext, mode: "pass" | "fail" | null) {
  const res = await request.post("/api/test/turnstile-mode", {
    data: { mode },
  });
  expect(res.ok()).toBeTruthy();
}

async function createFixture(
  request: APIRequestContext,
  options: {
    webhookUrl?: string;
    notifyEmails?: string[];
    publicSlug?: string;
  } = {},
): Promise<Fixture> {
  const res = await request.post("/api/test/landing-pages/fixture", {
    data: {
      publicSlug: options.publicSlug,
      formConfig: {
        webhookUrl: options.webhookUrl,
        notifyEmails: options.notifyEmails,
      },
      status: "published",
    },
  });

  expect(res.ok()).toBeTruthy();
  const data = (await res.json()) as {
    fixture: Fixture;
  };

  return data.fixture;
}

async function cleanupFixture(request: APIRequestContext, fixtureId: string) {
  await request.delete(`/api/test/landing-pages/fixture?id=${fixtureId}`);
}

async function submitLead(
  request: APIRequestContext,
  shareToken: string,
  body: Record<string, unknown>,
) {
  return request.post(`/api/share/landing-page/${shareToken}/lead`, { data: body });
}

test.describe.configure({ mode: "serial" });

test.afterEach(async ({ request }) => {
  await setEmailMode(request, null);
  await setTurnstileMode(request, null);
});

test("returns success when email succeeds and webhook fails", async ({ request }) => {
  await setTurnstileMode(request, "pass");
  await setEmailMode(request, "success");

  const fixture = await createFixture(request, {
    notifyEmails: ["ops@example.com"],
    webhookUrl: "http://127.0.0.1:3000/api/test/webhook-sink?status=500",
  });

  try {
    const submission = await submitLead(request, fixture.shareToken, {
      name: "Alice Example",
      email: "alice@example.com",
      message: "Please call me",
    });

    expect(submission.status()).toBe(200);
    const body = (await submission.json()) as {
      success: boolean;
      delivery: {
        email: { status: string };
        webhook: { status: string };
      };
      leadId: string;
    };

    expect(body.success).toBeTruthy();
    expect(body.delivery.email.status).toBe("sent");
    expect(body.delivery.webhook.status).toBe("failed");

    const inspectRes = await request.get(`/api/test/landing-pages/fixture?id=${fixture.id}`);
    expect(inspectRes.ok()).toBeTruthy();
    const inspect = (await inspectRes.json()) as {
      landingPage: {
        leads: Array<{
          id: string;
          emailStatus: string | null;
          webhookStatus: string | null;
          webhookRetryCount: number | null;
          nextWebhookRetryAt: string | null;
          webhookAttempts: Array<{ attemptNumber: number; status: string }>;
        }>;
      };
    };

    const lead = inspect.landingPage.leads[0];
    expect(lead.emailStatus).toBe("sent");
    expect(lead.webhookStatus).toBe("failed");
    expect(lead.webhookRetryCount).toBe(1);
    expect(lead.nextWebhookRetryAt).toBeTruthy();
    expect(lead.webhookAttempts[0]?.attemptNumber).toBe(1);
    expect(lead.webhookAttempts[0]?.status).toBe("failed");
  } finally {
    await cleanupFixture(request, fixture.id);
  }
});

test("returns success when webhook succeeds and email fails", async ({ request }) => {
  await setTurnstileMode(request, "pass");
  await setEmailMode(request, "fail");

  const fixture = await createFixture(request, {
    notifyEmails: ["ops@example.com"],
    webhookUrl: "http://127.0.0.1:3000/api/test/webhook-sink?status=200",
  });

  try {
    const submission = await submitLead(request, fixture.shareToken, {
      name: "Bob Example",
      email: "bob@example.com",
      message: "Need a quote",
    });

    expect(submission.status()).toBe(200);
    const body = (await submission.json()) as {
      success: boolean;
      delivery: {
        email: { status: string };
        webhook: { status: string };
      };
    };

    expect(body.success).toBeTruthy();
    expect(body.delivery.email.status).toBe("failed");
    expect(body.delivery.webhook.status).toBe("sent");

    const inspectRes = await request.get(`/api/test/landing-pages/fixture?id=${fixture.id}`);
    const inspect = (await inspectRes.json()) as {
      landingPage: {
        leads: Array<{
          emailStatus: string | null;
          webhookStatus: string | null;
          nextWebhookRetryAt: string | null;
        }>;
      };
    };

    const lead = inspect.landingPage.leads[0];
    expect(lead.emailStatus).toBe("failed");
    expect(lead.webhookStatus).toBe("sent");
    expect(lead.nextWebhookRetryAt).toBeFalsy();
  } finally {
    await cleanupFixture(request, fixture.id);
  }
});

test("returns failure when both channels fail", async ({ request }) => {
  await setTurnstileMode(request, "pass");
  await setEmailMode(request, "fail");

  const fixture = await createFixture(request, {
    notifyEmails: ["ops@example.com"],
    webhookUrl: "http://127.0.0.1:3000/api/test/webhook-sink?status=500",
  });

  try {
    const submission = await submitLead(request, fixture.shareToken, {
      name: "Charlie Example",
      email: "charlie@example.com",
      message: "Need support",
    });

    expect(submission.status()).toBe(502);
    const body = (await submission.json()) as {
      captured: boolean;
      error: string;
      delivery: {
        email: { status: string };
        webhook: { status: string };
      };
    };

    expect(body.captured).toBeTruthy();
    expect(body.delivery.email.status).toBe("failed");
    expect(body.delivery.webhook.status).toBe("failed");

    const inspectRes = await request.get(`/api/test/landing-pages/fixture?id=${fixture.id}`);
    const inspect = (await inspectRes.json()) as {
      landingPage: {
        leads: Array<{
          webhookStatus: string | null;
          nextWebhookRetryAt: string | null;
        }>;
      };
    };

    const lead = inspect.landingPage.leads[0];
    expect(lead.webhookStatus).toBe("failed");
    expect(lead.nextWebhookRetryAt).toBeTruthy();
  } finally {
    await cleanupFixture(request, fixture.id);
  }
});

test("blocks submission when Turnstile fails", async ({ request }) => {
  await setTurnstileMode(request, "fail");
  await setEmailMode(request, "success");

  const fixture = await createFixture(request, {
    notifyEmails: ["ops@example.com"],
    webhookUrl: "http://127.0.0.1:3000/api/test/webhook-sink?status=200",
  });

  try {
    const submission = await submitLead(request, fixture.shareToken, {
      name: "Dana Example",
      email: "dana@example.com",
    });

    expect(submission.status()).toBe(400);
    const body = (await submission.json()) as { error: string };
    expect(body.error).toContain("Security check failed");

    const inspectRes = await request.get(`/api/test/landing-pages/fixture?id=${fixture.id}`);
    const inspect = (await inspectRes.json()) as {
      landingPage: {
        leads: Array<unknown>;
      };
    };

    expect(inspect.landingPage.leads.length).toBe(0);
  } finally {
    await cleanupFixture(request, fixture.id);
  }
});

test("submits successfully from both share-token URL and pretty public URL", async ({ page, request }) => {
  await setTurnstileMode(request, "pass");
  await setEmailMode(request, "success");

  const fixture = await createFixture(request, {
    notifyEmails: ["ops@example.com"],
    webhookUrl: "http://127.0.0.1:3000/api/test/webhook-sink?status=200",
  });

  try {
    await page.goto(`/api/share/landing-page/${fixture.shareToken}?test=1`);
    await page.locator('input[name="name"]').fill("Eve Share");
    await page.locator('input[name="email"]').fill("eve-share@example.com");
    await seedTurnstileToken(page);
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText("Thank you!", { exact: true })).toBeVisible();

    await page.goto(`/lp/${fixture.publicSlug}?test=1`);
    await page.locator('input[name="name"]').fill("Eve Public");
    await page.locator('input[name="email"]').fill("eve-public@example.com");
    await seedTurnstileToken(page);
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText("Thank you!", { exact: true })).toBeVisible();

    const inspectRes = await request.get(`/api/test/landing-pages/fixture?id=${fixture.id}`);
    const inspect = (await inspectRes.json()) as {
      landingPage: {
        leads: Array<unknown>;
      };
    };

    expect(inspect.landingPage.leads.length).toBeGreaterThanOrEqual(2);
  } finally {
    await cleanupFixture(request, fixture.id);
  }
});
