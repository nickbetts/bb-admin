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
