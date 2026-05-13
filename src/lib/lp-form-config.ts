/**
 * Type definitions and helpers for LandingPage.formConfig JSON column.
 *
 * formConfig is stored as a JSON string on LandingPage.  It controls:
 *   - where lead notification emails go
 *   - an optional outbound webhook that receives every lead as a JSON POST
 *   - an optional embed code (iframe / script tag) that replaces the
 *     AI-generated built-in form entirely (e.g. a JotForm or Typeform embed)
 *   - the ordered list of form fields for email formatting
 */

export type LpFormFieldType = "text" | "email" | "tel" | "textarea" | "select" | "date" | "number" | "url";

/**
 * A single field definition for the landing page form.
 * Used to control how lead notification emails are formatted —
 * labels, ordering, and which fields to include.
 */
export interface LpFormField {
  /** Unique client-generated ID (crypto.randomUUID) */
  id: string;
  /** Matches the HTML field's name attribute (e.g. "player_dob") */
  name: string;
  /** Human-readable label shown in notification emails (e.g. "Player date of birth") */
  label: string;
  /** Optional placeholder text for input/textarea form controls */
  placeholder?: string;
  /** HTML input type */
  type: LpFormFieldType;
  /** Whether the field is required in the form */
  required: boolean;
}

export interface LpFormConfig {
  /** One or more email addresses to notify when a lead is captured */
  notifyEmails?: string[];
  /**
   * HTTPS URL that receives a POST request for every new lead.
   * Payload: { name, email, phone?, message?, formData?, landingPageId, capturedAt }
   * Must be https:// and must not resolve to a private/loopback address.
   */
  webhookUrl?: string;
  /**
   * Raw HTML (e.g. a JotForm <iframe> or a Typeform script/div block).
   * When set, the AI-generated <form data-lp-form="true"> element is replaced
   * with this code in the served HTML, and the built-in form-capture script
   * is NOT injected.  Leads will NOT be stored in Stratos — the third-party
   * form provider handles capture entirely.
   */
  embedCode?: string;
  /**
   * Ordered list of form field definitions.
   * When set, lead notification emails use these labels and ordering instead
   * of AI-resolved labels.  Only fields listed here appear in the email.
   * Populated by the form field editor in the landing page editor sidebar.
   */
  fields?: LpFormField[];
}

export function parseLpFormConfig(raw: string | null | undefined): LpFormConfig {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as LpFormConfig;
  } catch {
    return {};
  }
}

export function serialiseLpFormConfig(cfg: LpFormConfig): string {
  return JSON.stringify(cfg);
}

/**
 * Validate a webhook URL before firing it.
 * Rejects non-HTTPS URLs and known RFC-1918 / loopback hostnames to
 * prevent server-side request forgery (SSRF).
 */
export function isWebhookUrlSafe(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;

  const host = parsed.hostname.toLowerCase();

  // Block loopback
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;

  // Block RFC-1918 private ranges via simple prefix checks
  if (host.startsWith("10.")) return false;
  if (host.startsWith("192.168.")) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;

  // Block link-local
  if (host.startsWith("169.254.")) return false;

  return true;
}

/**
 * Extract form field definitions from HTML.
 * Mirrors the logic in /api/tools/landing-pages/[id]/form-fields/route.ts
 */
export function extractFormFieldsFromHtml(html: string): LpFormField[] {
  const fields: LpFormField[] = [];
  const seen = new Set<string>();

  // Match all input/select/textarea elements, capturing name and type attributes
  const elementRe = /<(input|select|textarea)([^>]*)>/gi;
  let m: RegExpExecArray | null;
  while ((m = elementRe.exec(html)) !== null) {
    const tagName = m[1].toLowerCase();
    const attrs = m[2];

    const nameMatch = attrs.match(/\bname="([^"]+)"/i);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    if (seen.has(name)) continue;
    seen.add(name);

    // Determine type
    let type: LpFormFieldType = "text";
    if (tagName === "textarea") {
      type = "textarea";
    } else if (tagName === "select") {
      type = "select";
    } else {
      const typeMatch = attrs.match(/\btype="([^"]+)"/i);
      const rawType = typeMatch ? typeMatch[1].toLowerCase() : "text";
      if (rawType === "email") type = "email";
      else if (rawType === "tel") type = "tel";
      else if (rawType === "date") type = "date";
      else if (rawType === "number") type = "number";
      else if (rawType === "url") type = "url";
      else if (rawType === "hidden") continue; // skip hidden fields
    }

    // Auto-detect required
    const required = /\brequired\b/i.test(attrs);
    const placeholderMatch = attrs.match(/\bplaceholder=("([^"]*)"|'([^']*)')/i);
    const placeholder = (placeholderMatch?.[2] ?? placeholderMatch?.[3] ?? "").trim() || undefined;

    fields.push({
      id: crypto.randomUUID(),
      name,
      label: formatFieldLabel(name),
      placeholder,
      type,
      required,
    });
  }

  return fields;
}

/**
 * Reconcile form field configuration against live form HTML.
 * - Detects new fields in the HTML and adds them
 * - Preserves custom labels and placeholders for existing fields (by name)
 * - Removes fields that are no longer in the HTML
 * - Preserves the order of existing matched fields
 *
 * This enables automatic bidirectional sync:
 * when form HTML changes, custom field metadata is preserved.
 */
export function reconcileFormFields(
  html: string,
  currentFields: LpFormField[] | undefined
): LpFormField[] {
  if (!html || !currentFields || currentFields.length === 0) {
    return extractFormFieldsFromHtml(html);
  }

  const fieldsInHtml = extractFormFieldsFromHtml(html);
  const currentByName = new Map(currentFields.map((f) => [f.name, f]));
  const htmlFieldNames = new Set(fieldsInHtml.map((f) => f.name));

  // Reconcile: preserve order of existing fields, add new ones
  const reconciled: LpFormField[] = [];

  // First pass: keep existing fields that are still in HTML, preserving custom metadata
  for (const currentField of currentFields) {
    if (!htmlFieldNames.has(currentField.name)) {
      // Field no longer exists in HTML, skip it
      continue;
    }

    // Find the corresponding field in HTML
    const htmlField = fieldsInHtml.find((f) => f.name === currentField.name);
    if (htmlField) {
      // Preserve custom label and placeholder, update type/required from HTML
      reconciled.push({
        id: currentField.id,
        name: currentField.name,
        label: currentField.label,
        placeholder: currentField.placeholder,
        type: htmlField.type,
        required: htmlField.required,
      });
    }
  }

  // Second pass: add new fields detected in HTML
  for (const htmlField of fieldsInHtml) {
    if (!currentByName.has(htmlField.name)) {
      reconciled.push(htmlField);
    }
  }

  return reconciled;
}

function formatFieldLabel(key: string): string {
  return key
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
