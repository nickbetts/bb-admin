import {
  extractFormFieldsFromHtml,
  isWebhookUrlSafe,
  parseLpFormConfig,
  type LpFormField,
} from "@/lib/lp-form-config";

export type LandingPageFormAuditStatus = "pass" | "warn" | "fail";

export interface LandingPageFormAuditIssue {
  code: string;
  message: string;
}

export interface LandingPageFormAuditMetrics {
  formCount: number;
  detectedFieldCount: number;
  configuredFieldCount: number;
  duplicateFieldCount: number;
}

export interface LandingPageFormAuditResult {
  status: LandingPageFormAuditStatus;
  issueCount: number;
  warningCount: number;
  issues: LandingPageFormAuditIssue[];
  warnings: LandingPageFormAuditIssue[];
  metrics: LandingPageFormAuditMetrics;
}

export interface LandingPageFormAuditInput {
  currentHtml: string;
  formConfigRaw: string | null | undefined;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_RE = /<(input|select|textarea)\b([^>]*)>/gi;
const FORM_RE = /<form\b/gi;
const NAME_RE = /\bname\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+))/i;
const TYPE_RE = /\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+))/i;

function pushUnique(target: LandingPageFormAuditIssue[], code: string, message: string) {
  if (target.some((item) => item.code === code && item.message === message)) return;
  target.push({ code, message });
}

function getControlName(attrs: string): string {
  const match = attrs.match(NAME_RE);
  if (!match) return "";
  return (match[1] ?? match[2] ?? match[3] ?? "").trim();
}

function getInputType(attrs: string): string {
  const match = attrs.match(TYPE_RE);
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? "text").toLowerCase().trim();
}

function countDuplicateFieldNames(html: string): number {
  const counts = new Map<string, number>();
  let match: RegExpExecArray | null;

  while ((match = CONTROL_RE.exec(html)) !== null) {
    const name = getControlName(match[2]);
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  let duplicates = 0;
  for (const count of counts.values()) {
    if (count > 1) duplicates += 1;
  }

  CONTROL_RE.lastIndex = 0;
  return duplicates;
}

function isHiddenOnlyForm(html: string): boolean {
  let visibleCount = 0;
  let totalControls = 0;
  let match: RegExpExecArray | null;

  while ((match = CONTROL_RE.exec(html)) !== null) {
    totalControls += 1;
    const tag = match[1].toLowerCase();
    if (tag !== "input") {
      visibleCount += 1;
      continue;
    }

    const inputType = getInputType(match[2]);
    if (inputType !== "hidden") visibleCount += 1;
  }

  CONTROL_RE.lastIndex = 0;
  return totalControls > 0 && visibleCount === 0;
}

function collectRequiredFieldNames(html: string): Set<string> {
  const names = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = CONTROL_RE.exec(html)) !== null) {
    const attrs = match[2];
    const name = getControlName(attrs);
    if (!name) continue;
    if (/\brequired\b/i.test(attrs)) names.add(name);
  }

  CONTROL_RE.lastIndex = 0;
  return names;
}

function validateConfiguredFields(
  fields: LpFormField[],
  issues: LandingPageFormAuditIssue[],
  warnings: LandingPageFormAuditIssue[],
) {
  if (fields.length === 0) {
    pushUnique(warnings, "config-empty-fields", "Form configuration has no fields defined.");
    return;
  }

  const hasEmail = fields.some((field) => field.type === "email");
  if (!hasEmail) {
    pushUnique(
      warnings,
      "config-no-email-field",
      "Configured form fields do not include an email field.",
    );
  }

  const hasRequired = fields.some((field) => field.required);
  if (!hasRequired) {
    pushUnique(
      warnings,
      "config-no-required-fields",
      "Configured form fields have no required fields.",
    );
  }

  for (const field of fields) {
    if (!field.name?.trim()) {
      pushUnique(issues, "config-invalid-field-name", "A configured form field is missing a name.");
      continue;
    }

    if (field.type !== "select") continue;
    if (!field.options || field.options.length === 0) {
      pushUnique(
        warnings,
        "config-empty-select-options",
        `Select field "${field.name}" has no options configured.`,
      );
      continue;
    }

    for (const option of field.options) {
      const label = option.label?.trim() ?? "";
      const value = option.value?.trim() ?? "";
      if (!label || !value) {
        pushUnique(
          issues,
          "config-invalid-select-option",
          `Select field "${field.name}" has an option with an empty label or value.`,
        );
        break;
      }
    }
  }
}

export function auditLandingPageForm(input: LandingPageFormAuditInput): LandingPageFormAuditResult {
  const html = input.currentHtml ?? "";
  const issues: LandingPageFormAuditIssue[] = [];
  const warnings: LandingPageFormAuditIssue[] = [];

  const formCount = (html.match(FORM_RE) ?? []).length;
  const extractedFields = extractFormFieldsFromHtml(html);
  const duplicateFieldCount = countDuplicateFieldNames(html);
  const requiredInHtml = collectRequiredFieldNames(html);
  const hiddenOnly = isHiddenOnlyForm(html);

  const formConfig = parseLpFormConfig(input.formConfigRaw);
  const configuredFields = Array.isArray(formConfig.fields) ? formConfig.fields : [];

  if (formCount === 0) {
    pushUnique(issues, "html-no-form", "No form element detected in landing page HTML.");
  }

  if (extractedFields.length === 0) {
    pushUnique(
      issues,
      "html-no-fields",
      "No usable form fields were detected in landing page HTML.",
    );
  }

  if (hiddenOnly) {
    pushUnique(issues, "html-hidden-only", "Form appears to contain hidden fields only.");
  }

  if (duplicateFieldCount > 0) {
    pushUnique(
      issues,
      "html-duplicate-field-names",
      `${duplicateFieldCount} duplicate form field name${duplicateFieldCount === 1 ? "" : "s"} detected.`,
    );
  }

  const notifyEmails = formConfig.notifyEmails ?? [];
  if (notifyEmails.length === 0 && !formConfig.webhookUrl && !formConfig.embedCode) {
    pushUnique(
      warnings,
      "config-no-delivery-target",
      "No notify emails or webhook URL configured for lead delivery.",
    );
  }

  for (const email of notifyEmails) {
    if (!EMAIL_RE.test(email.trim())) {
      pushUnique(issues, "config-invalid-email", `Invalid notification email: ${email}`);
    }
  }

  if (formConfig.webhookUrl) {
    if (!isWebhookUrlSafe(formConfig.webhookUrl)) {
      pushUnique(
        issues,
        "config-invalid-webhook",
        "Webhook URL is invalid, insecure, or points to a blocked/private address.",
      );
    }
  }

  validateConfiguredFields(configuredFields, issues, warnings);

  if (configuredFields.length > 0 && extractedFields.length > 0) {
    const extractedByName = new Map(extractedFields.map((field) => [field.name, field]));

    for (const field of configuredFields) {
      const extracted = extractedByName.get(field.name);
      if (!extracted) {
        pushUnique(
          issues,
          "config-field-missing-in-html",
          `Configured field "${field.name}" is missing from HTML form fields.`,
        );
        continue;
      }

      if (field.required && !requiredInHtml.has(field.name)) {
        pushUnique(
          warnings,
          "required-mismatch",
          `Configured required field "${field.name}" is not marked required in HTML.`,
        );
      }
    }
  }

  const status: LandingPageFormAuditStatus =
    issues.length > 0 ? "fail" : warnings.length > 0 ? "warn" : "pass";

  return {
    status,
    issueCount: issues.length,
    warningCount: warnings.length,
    issues,
    warnings,
    metrics: {
      formCount,
      detectedFieldCount: extractedFields.length,
      configuredFieldCount: configuredFields.length,
      duplicateFieldCount,
    },
  };
}
