import { describe, expect, it } from "vitest";
import { auditLandingPageForm } from "@/lib/landing-page-form-audit";

describe("auditLandingPageForm", () => {
  it("returns pass for a healthy configured form", () => {
    const html = `
      <form data-lp-form="true">
        <label>Email</label>
        <input type="email" name="email" required />
        <label>Name</label>
        <input type="text" name="name" required />
      </form>
    `;

    const formConfigRaw = JSON.stringify({
      notifyEmails: ["team@example.com"],
      fields: [
        { id: "1", name: "email", label: "Email", type: "email", required: true },
        { id: "2", name: "name", label: "Name", type: "text", required: true },
      ],
    });

    const result = auditLandingPageForm({ currentHtml: html, formConfigRaw });
    expect(result.status).toBe("pass");
    expect(result.issueCount).toBe(0);
    expect(result.warningCount).toBe(0);
  });

  it("returns fail when form is missing", () => {
    const result = auditLandingPageForm({
      currentHtml: "<div>No form here</div>",
      formConfigRaw: JSON.stringify({ notifyEmails: ["team@example.com"] }),
    });

    expect(result.status).toBe("fail");
    expect(result.issues.some((issue) => issue.code === "html-no-form")).toBe(true);
  });

  it("flags duplicate field names and invalid emails", () => {
    const html = `
      <form>
        <input type="email" name="email" />
        <input type="email" name="email" />
      </form>
    `;

    const formConfigRaw = JSON.stringify({
      notifyEmails: ["bad-email"],
      fields: [{ id: "1", name: "email", label: "Email", type: "email", required: true }],
    });

    const result = auditLandingPageForm({ currentHtml: html, formConfigRaw });
    expect(result.status).toBe("fail");
    expect(result.issues.some((issue) => issue.code === "html-duplicate-field-names")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "config-invalid-email")).toBe(true);
  });

  it("flags invalid select options", () => {
    const html = `
      <form>
        <select name="camp">
          <option value="">Choose</option>
          <option value="a">Camp A</option>
        </select>
      </form>
    `;

    const formConfigRaw = JSON.stringify({
      notifyEmails: ["team@example.com"],
      fields: [
        {
          id: "1",
          name: "camp",
          label: "Camp",
          type: "select",
          required: true,
          options: [{ label: "", value: "camp-a" }],
        },
      ],
    });

    const result = auditLandingPageForm({ currentHtml: html, formConfigRaw });
    expect(result.status).toBe("fail");
    expect(result.issues.some((issue) => issue.code === "config-invalid-select-option")).toBe(true);
  });

  it("warns when configured required field is not required in html", () => {
    const html = `
      <form>
        <input type="email" name="email" />
      </form>
    `;

    const formConfigRaw = JSON.stringify({
      notifyEmails: ["team@example.com"],
      fields: [{ id: "1", name: "email", label: "Email", type: "email", required: true }],
    });

    const result = auditLandingPageForm({ currentHtml: html, formConfigRaw });
    expect(result.status).toBe("warn");
    expect(result.warnings.some((warning) => warning.code === "required-mismatch")).toBe(true);
  });
});
