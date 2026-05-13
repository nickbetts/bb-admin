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

export interface LpFormFieldOption {
  /** Display text shown to the visitor */
  label: string;
  /** Submitted form value */
  value: string;
}

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
  /** Select dropdown options, when this field is a <select> */
  options?: LpFormFieldOption[];
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
  const labelByName = extractFormLabels(html);

  // Match all input/select/textarea elements, capturing name and type attributes
  const elementRe = /<(input|select|textarea)([^>]*)>/gi;
  let m: RegExpExecArray | null;
  while ((m = elementRe.exec(html)) !== null) {
    const tagName = m[1].toLowerCase();
    const attrs = m[2];
    const attrMap = parseAttributes(attrs);

    const name = attrMap.get("name")?.trim() ?? "";
    if (!name) continue;
    if (seen.has(name)) continue;
    seen.add(name);

    // Determine type
    let type: LpFormFieldType = "text";
    if (tagName === "textarea") {
      type = "textarea";
    } else if (tagName === "select") {
      type = "select";
    } else {
      const rawType = (attrMap.get("type") ?? "text").toLowerCase();
      if (rawType === "email") type = "email";
      else if (rawType === "tel") type = "tel";
      else if (rawType === "date") type = "date";
      else if (rawType === "number") type = "number";
      else if (rawType === "url") type = "url";
      else if (rawType === "hidden") continue; // skip hidden fields
    }

    // Auto-detect required
    const required = /\brequired\b/i.test(attrs) || attrMap.has("required");
    const placeholderAttr = attrMap.get("placeholder")?.trim();
    const selectDetails = tagName === "select" ? extractSelectDetails(html, name) : null;
    const placeholder = (
      (placeholderAttr ?? "")
      || selectDetails?.placeholder
    ) || undefined;

    fields.push({
      id: crypto.randomUUID(),
      name,
      label: labelByName.get(name) ?? formatFieldLabel(name),
      placeholder,
      type,
      options: selectDetails?.options?.length ? selectDetails.options : undefined,
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
      // Keep manual IDs/order but let the live HTML remain the source of truth
      // for visible field copy and constraints.
      reconciled.push({
        id: currentField.id,
        name: currentField.name,
        label: htmlField.label,
        placeholder: htmlField.placeholder,
        type: htmlField.type,
        options: htmlField.options,
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

function extractFormLabels(html: string): Map<string, string> {
  const labels = new Map<string, string>();

  const groupedLabelRe = /<div[^>]*class=("|')[^"']*form-group[^"']*\1[^>]*>[\s\S]*?<label[^>]*>([\s\S]*?)<\/label>[\s\S]*?<(input|textarea|select)([^>]*\bname=("|')([^"']+)\5[^>]*)/gi;
  let groupedMatch: RegExpExecArray | null;
  while ((groupedMatch = groupedLabelRe.exec(html)) !== null) {
    const name = groupedMatch[6];
    const label = cleanLabelText(groupedMatch[2]);
    if (name && label && !labels.has(name)) labels.set(name, label);
  }

  const controlIdToName = new Map<string, string>();
  const controlWithIdRe = /<(input|textarea|select)([^>]*\bname=("|')([^"']+)\3[^>]*\bid=("|')([^"']+)\5[^>]*)>/gi;
  let controlMatch: RegExpExecArray | null;
  while ((controlMatch = controlWithIdRe.exec(html)) !== null) {
    controlIdToName.set(controlMatch[6], controlMatch[4]);
  }

  const labelForRe = /<label[^>]*\bfor=("|')([^"']+)\1[^>]*>([\s\S]*?)<\/label>/gi;
  let labelMatch: RegExpExecArray | null;
  while ((labelMatch = labelForRe.exec(html)) !== null) {
    const name = controlIdToName.get(labelMatch[2]);
    const label = cleanLabelText(labelMatch[3]);
    if (name && label && !labels.has(name)) labels.set(name, label);
  }

  return labels;
}

function extractSelectDetails(html: string, fieldName: string): { placeholder?: string; options: LpFormFieldOption[] } | null {
  const selectRe = /<select\b([^>]*)>([\s\S]*?)<\/select>/gi;
  let selectMatch: RegExpExecArray | null;
  while ((selectMatch = selectRe.exec(html)) !== null) {
    const selectAttrs = selectMatch[1] ?? "";
    const selectAttrMap = parseAttributes(selectAttrs);
    const selectName = selectAttrMap.get("name")?.trim();
    if (!selectName || selectName !== fieldName) continue;

    const placeholderAttr = selectAttrMap.get("placeholder")?.trim()
      || selectAttrMap.get("data-placeholder")?.trim();

    const optionRe = /<option\b([^>]*)>([\s\S]*?)<\/option>/gi;
    let optionMatch: RegExpExecArray | null;
    let placeholder: string | undefined = placeholderAttr || undefined;
    const options: LpFormFieldOption[] = [];
    let optionIndex = 0;

    while ((optionMatch = optionRe.exec(selectMatch[2])) !== null) {
      const optionAttrs = optionMatch[1] ?? "";
      const optionAttrMap = parseAttributes(optionAttrs);
      const text = cleanLabelText(optionMatch[2]);
      const explicitValue = optionAttrMap.get("value");
      const disabled = optionAttrMap.has("disabled");
      const selected = optionAttrMap.has("selected");

      // HTML default when value is omitted is text content; mirror browser behaviour.
      const value = (explicitValue ?? text).trim();
      const isLikelyPlaceholder =
        (optionIndex === 0 && (explicitValue === "" || disabled || selected))
        || (explicitValue === "" && !!text);

      if (isLikelyPlaceholder) {
        if (!placeholder && text) placeholder = text;
        optionIndex += 1;
        continue;
      }

      if (!text && !value) {
        optionIndex += 1;
        continue;
      }

      options.push({ label: text || value, value: value || text });
      optionIndex += 1;
    }

    return { placeholder, options };
  }

  return null;
}

function cleanLabelText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*\*\s*$/, "")
    .trim();
}

function parseAttributes(raw: string): Map<string, string> {
  const attrs = new Map<string, string>();
  const attrRe = /([:\w-]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = attrRe.exec(raw)) !== null) {
    const name = match[1]?.toLowerCase();
    if (!name) continue;
    const value = match[3] ?? match[4] ?? match[5] ?? "";
    attrs.set(name, decodeHtmlEntities(value));
  }

  return attrs;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}
