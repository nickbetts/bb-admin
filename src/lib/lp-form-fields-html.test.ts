import { describe, expect, it } from "vitest";
import { applyConfiguredFormFields, removeFieldsNotInConfig } from "./lp-form-fields-html";
import type { LpFormField } from "./lp-form-config";

describe("applyConfiguredFormFields", () => {
  const initialHtml = `
<form data-lp-form="true">
  <div class="form-group">
    <label>Details of Your Dream Dress</label>
    <textarea name="message" placeholder="Describe the style, venue, and any specific preferences..."></textarea>
  </div>
  <div class="form-group">
    <label>Contact Number</label>
    <input type="tel" name="phone" placeholder="Your contact number">
  </div>
  <div class="form-group">
    <label>Email Address</label>
    <input type="email" name="email" placeholder="Your email address">
  </div>
  <div class="form-group">
    <label>Dress Size</label>
    <input type="text" name="dress_size" placeholder="Your dress size">
  </div>
  <div class="form-group">
    <label>Tell Us About Your Dream Dress</label>
    <textarea name="dream_dress_details" placeholder="Share your vision for the dress..."></textarea>
  </div>
</form>
  `.trim();

  const configuredFields: LpFormField[] = [
    {
      id: "1",
      name: "message",
      label: "Details of your dream dress",
      placeholder: "Describe style...",
      type: "textarea",
      required: false,
    },
    {
      id: "2",
      name: "phone",
      label: "Contact number",
      placeholder: "Your mobile...",
      type: "tel",
      required: true,
    },
    {
      id: "3",
      name: "email",
      label: "Email Address",
      placeholder: "Your email...",
      type: "email",
      required: true,
    },
    {
      id: "4",
      name: "dress_size",
      label: "Dress Size",
      placeholder: "Size...",
      type: "text",
      required: true,
    },
    {
      id: "5",
      name: "dream_dress_details",
      label: "Tell us about your dream dress",
      placeholder: "Share vision...",
      type: "textarea",
      required: false,
    },
  ];

  it("should non-destructively map precise field labels, placeholders and required attributes", () => {
    // Test removeFieldsNotInConfig output separately or log its behavior
    const updatedHtml = applyConfiguredFormFields(initialHtml, configuredFields);

    // Let's verify that the names of inputs are still correct and in place
    expect(updatedHtml).toContain('name="message"');
    expect(updatedHtml).toContain('name="phone"');
    expect(updatedHtml).toContain('name="email"');
    expect(updatedHtml).toContain('name="dress_size"');
    expect(updatedHtml).toContain('name="dream_dress_details"');

    // Verify each input is mapped to its correct label
    expect(updatedHtml).toContain("Details of your dream dress</label>");
    expect(updatedHtml).toContain("Contact number *</label>");
    expect(updatedHtml).toContain("Email Address *</label>");
    expect(updatedHtml).toContain("Dress Size *</label>");
    expect(updatedHtml).toContain("Tell us about your dream dress</label>");

    // Verify placeholders
    expect(updatedHtml).toContain('placeholder="Describe style..."');
    expect(updatedHtml).toContain('placeholder="Your mobile..."');
    expect(updatedHtml).toContain('placeholder="Your email..."');
    expect(updatedHtml).toContain('placeholder="Size..."');
    expect(updatedHtml).toContain('placeholder="Share vision..."');
  });

  it("should not remove any configured fields during removeFieldsNotInConfig", () => {
    const cleanedHtml = removeFieldsNotInConfig(initialHtml, configuredFields);
    // Since all fields in initialHtml are in configuredFields, cleanedHtml should be identical to initialHtml
    expect(cleanedHtml).toBe(initialHtml);
  });
});

describe("applyConfiguredFormFields — real-world corruption recovery", () => {
  // Mirrors the actual broken "Love Bridal" page: a clobbered first field, a
  // duplicated control, and an orphaned field injected inside a grid row.
  const corruptedHtml = `
<form data-lp-form="true" action="#" method="post">
  <div class="form-row">
    <div class="form-group">
      <label for="name">Tell Us About Your Dream Dress</label>
      <textarea id="dream_dress_details" name="dream_dress_details" rows="3" placeholder="Describe your vision for the dress..."></textarea>
    </div>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label for="phone">Contact Number *</label>
      <input type="tel" id="phone" name="phone" placeholder="Enter your contact number" required />
    </div>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label for="email">Email Address *</label>
      <input type="email" id="email" name="email" placeholder="Enter your email address" required />
    </div>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label for="dress_size">Dress Size *</label>
      <input type="text" id="dress_size" name="dress_size" placeholder="Enter your dress size" required />
    </div>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label for="dream_dress_details">Tell Us About Your Dream Dress</label>
      <textarea id="dream_dress_details" name="dream_dress_details" rows="3" placeholder="Describe your vision for the dress..."></textarea>
    </div>
    <div class="form-group"><label>Full Name *</label><input type="text" name="name" placeholder="Enter your full name" required></div>
  </div>
  <button type="submit" class="form-submit">Request available date</button>
  <p class="form-tiny">We reply within 2 working days.</p>
</form>
  `.trim();

  const fields: LpFormField[] = [
    {
      id: "1",
      name: "name",
      label: "Full Name",
      placeholder: "Enter your full name",
      type: "text",
      required: true,
    },
    {
      id: "2",
      name: "phone",
      label: "Contact Number",
      placeholder: "Enter your contact number",
      type: "tel",
      required: true,
    },
    {
      id: "3",
      name: "email",
      label: "Email Address",
      placeholder: "Enter your email address",
      type: "email",
      required: true,
    },
    {
      id: "4",
      name: "dress_size",
      label: "Dress Size",
      placeholder: "Enter your dress size",
      type: "text",
      required: true,
    },
    {
      id: "5",
      name: "dream_dress_details",
      label: "Tell Us About Your Dream Dress",
      placeholder: "Describe your vision for the dress...",
      type: "textarea",
      required: false,
    },
  ];

  it("removes the duplicate control and keeps exactly one of each configured field", () => {
    const result = applyConfiguredFormFields(corruptedHtml, fields);
    const count = (name: string) => (result.match(new RegExp(`name="${name}"`, "g")) ?? []).length;
    expect(count("name")).toBe(1);
    expect(count("phone")).toBe(1);
    expect(count("email")).toBe(1);
    expect(count("dress_size")).toBe(1);
    expect(count("dream_dress_details")).toBe(1);
  });

  it("orders the fields to match the configured order", () => {
    const result = applyConfiguredFormFields(corruptedHtml, fields);
    const order = fields.map((f) => result.indexOf(`name="${f.name}"`));
    const sorted = [...order].sort((a, b) => a - b);
    expect(order).toEqual(sorted);
    expect(order.every((i) => i >= 0)).toBe(true);
  });

  it("repairs the clobbered first field (Full Name) and removes orphan grid rows", () => {
    const result = applyConfiguredFormFields(corruptedHtml, fields);
    expect(result).toContain("Full Name *</label>");
    // The name input must precede the textarea in the final markup.
    expect(result.indexOf('name="name"')).toBeLessThan(
      result.indexOf('name="dream_dress_details"'),
    );
    // No empty form-row should remain.
    expect(result).not.toMatch(/<div class="form-row">\s*<\/div>/);
  });

  it("is idempotent — applying twice yields the same result as once", () => {
    const once = applyConfiguredFormFields(corruptedHtml, fields);
    const twice = applyConfiguredFormFields(once, fields);
    expect(twice).toBe(once);
  });
});

describe("applyConfiguredFormFields — nested multi-field rows", () => {
  const html = `
<form data-lp-form="true">
  <div class="form-row">
    <div class="form-group">
      <label for="first_name">First name</label>
      <input type="text" id="first_name" name="first_name" />
    </div>
    <div class="form-group">
      <label for="last_name">Last name</label>
      <input type="text" id="last_name" name="last_name" />
    </div>
  </div>
  <div class="form-group">
    <label for="email">Email</label>
    <input type="email" id="email" name="email" />
  </div>
  <button type="submit">Send</button>
</form>
  `.trim();

  const fields: LpFormField[] = [
    { id: "1", name: "email", label: "Email", type: "email", required: true },
    { id: "2", name: "first_name", label: "First name", type: "text", required: true },
    { id: "3", name: "last_name", label: "Last name", type: "text", required: true },
  ];

  it("keeps the two-column row intact while reordering units", () => {
    const result = applyConfiguredFormFields(html, fields);
    // email comes first per config, then the shared first/last name row.
    expect(result.indexOf('name="email"')).toBeLessThan(result.indexOf('name="first_name"'));
    expect(result.indexOf('name="first_name"')).toBeLessThan(result.indexOf('name="last_name"'));
    // first_name and last_name remain siblings inside a single form-row.
    expect(result).toMatch(
      /<div class="form-row">[\s\S]*name="first_name"[\s\S]*name="last_name"[\s\S]*<\/div>/,
    );
  });

  it("is idempotent for nested rows", () => {
    const once = applyConfiguredFormFields(html, fields);
    expect(applyConfiguredFormFields(once, fields)).toBe(once);
  });
});

describe("applyConfiguredFormFields — injection and removal", () => {
  const html = `
<form data-lp-form="true">
  <div class="form-group">
    <label for="email">Email</label>
    <input type="email" id="email" name="email" />
  </div>
  <div class="form-group">
    <label for="spam">Spam</label>
    <input type="text" id="spam" name="spam" />
  </div>
  <button type="submit">Send</button>
</form>
  `.trim();

  const fields: LpFormField[] = [
    { id: "1", name: "email", label: "Email", type: "email", required: true },
    {
      id: "2",
      name: "full_name",
      label: "Full Name",
      placeholder: "Your name",
      type: "text",
      required: true,
    },
  ];

  it("removes fields not in config and injects missing fields exactly once", () => {
    const result = applyConfiguredFormFields(html, fields);
    expect(result).not.toContain('name="spam"');
    const count = (result.match(/name="full_name"/g) ?? []).length;
    expect(count).toBe(1);
    expect(result).toContain("Full Name *</label>");
    expect(result).toContain('placeholder="Your name"');
  });

  it("is idempotent after injection", () => {
    const once = applyConfiguredFormFields(html, fields);
    expect(applyConfiguredFormFields(once, fields)).toBe(once);
  });
});

describe("applyConfiguredFormFields — width-based inline layout", () => {
  const stackedHtml = `
<form data-lp-form="true">
  <div class="form-group">
    <label for="first_name">First name</label>
    <input type="text" id="first_name" name="first_name" />
  </div>
  <div class="form-group">
    <label for="last_name">Last name</label>
    <input type="text" id="last_name" name="last_name" />
  </div>
  <div class="form-group">
    <label for="email">Email</label>
    <input type="email" id="email" name="email" />
  </div>
  <button type="submit">Send</button>
</form>
  `.trim();

  const fields: LpFormField[] = [
    {
      id: "1",
      name: "first_name",
      label: "First name",
      type: "text",
      required: true,
      width: "half",
    },
    { id: "2", name: "last_name", label: "Last name", type: "text", required: true, width: "half" },
    { id: "3", name: "email", label: "Email", type: "email", required: true, width: "full" },
  ];

  it("packs two consecutive half-width fields into a single form-row", () => {
    const result = applyConfiguredFormFields(stackedHtml, fields);
    // first_name and last_name now share one form-row.
    expect(result).toMatch(
      /<div class="form-row">[\s\S]*name="first_name"[\s\S]*name="last_name"[\s\S]*<\/div>/,
    );
    // exactly one form-row was created for the pair.
    expect((result.match(/<div class="form-row">/g) ?? []).length).toBe(1);
  });

  it("leaves a full-width field outside any form-row", () => {
    const result = applyConfiguredFormFields(stackedHtml, fields);
    const emailIndex = result.indexOf('name="email"');
    const rowEnd = result.lastIndexOf("</div>", emailIndex);
    const beforeEmail = result.slice(0, emailIndex);
    // the email control is not nested inside the paired form-row.
    expect(beforeEmail).toContain('name="last_name"');
    expect(rowEnd).toBeGreaterThan(-1);
  });

  it("respects configured order when laying out by width", () => {
    const result = applyConfiguredFormFields(stackedHtml, fields);
    expect(result.indexOf('name="first_name"')).toBeLessThan(result.indexOf('name="last_name"'));
    expect(result.indexOf('name="last_name"')).toBeLessThan(result.indexOf('name="email"'));
  });

  it("is idempotent for width-based layout", () => {
    const once = applyConfiguredFormFields(stackedHtml, fields);
    expect(applyConfiguredFormFields(once, fields)).toBe(once);
  });

  it("does not pair an unpaired trailing half-width field", () => {
    const singleHalf: LpFormField[] = [
      { id: "1", name: "email", label: "Email", type: "email", required: true, width: "full" },
      {
        id: "2",
        name: "first_name",
        label: "First name",
        type: "text",
        required: true,
        width: "half",
      },
      {
        id: "3",
        name: "last_name",
        label: "Last name",
        type: "text",
        required: true,
        width: "full",
      },
    ];
    const result = applyConfiguredFormFields(stackedHtml, singleHalf);
    // no half pair exists, so no new form-row is created.
    expect((result.match(/<div class="form-row">/g) ?? []).length).toBe(0);
  });
});
