import type { LpFormField } from "@/lib/lp-form-config";

export function applyConfiguredFormFields(html: string, fields: LpFormField[]): string {
  let nextHtml = html;
  const matchedNames = new Set<string>();

  for (const field of fields) {
    if (!field.name) continue;
    const name = escapeRegex(field.name);
    const groupRe = new RegExp(
      `(<div[^>]*class=("|')[^"']*form-group[^"']*\\2[^>]*>[\\s\\S]*?<label[^>]*>)([\\s\\S]*?)(</label>[\\s\\S]*?<(input|textarea|select)([^>]*\\bname=("|')${name}\\7[^>]*)(?:>[\\s\\S]*?</\\5>|\\s*/?>)[\\s\\S]*?</div>)`,
      "gi",
    );

    nextHtml = nextHtml.replace(groupRe, (_, beforeLabel: string, __quote: string, _labelText: string, afterLabel: string, tagName: string, attrs: string) => {
      matchedNames.add(field.name);
      let nextAttrs = attrs;
      nextAttrs = setBooleanAttribute(nextAttrs, "required", field.required);

      if (tagName.toLowerCase() !== "select") {
        nextAttrs = setAttribute(nextAttrs, "placeholder", field.placeholder?.trim() || null);
      }

      if (tagName.toLowerCase() === "input") {
        nextAttrs = setAttribute(nextAttrs, "type", field.type || null);
      }

      const labelText = `${escapeHtmlText(field.label)}${field.required ? " *" : ""}`;
      const rebuiltControl = rebuildControl(tagName, nextAttrs, field);
      return `${beforeLabel}${labelText}${replaceFirstControl(afterLabel, rebuiltControl)}`;
    });

    if (matchedNames.has(field.name)) continue;

    const controlRe = new RegExp(`<(input|textarea|select)([^>]*\\bname=("|')${name}\\3[^>]*)(?:>[\\s\\S]*?</\\1>|\\s*/?>)`, "gi");
    nextHtml = nextHtml.replace(controlRe, (_, tagName: string, attrs: string) => {
      matchedNames.add(field.name);
      let nextAttrs = attrs;
      nextAttrs = setBooleanAttribute(nextAttrs, "required", field.required);
      if (tagName.toLowerCase() !== "select") {
        nextAttrs = setAttribute(nextAttrs, "placeholder", field.placeholder?.trim() || null);
      }
      if (tagName.toLowerCase() === "input") {
        nextAttrs = setAttribute(nextAttrs, "type", field.type || null);
      }
      return rebuildControl(tagName, nextAttrs, field);
    });
  }

  const missingFields = fields.filter((field) => field.name && !matchedNames.has(field.name));
  if (missingFields.length > 0) {
    nextHtml = injectMissingFields(nextHtml, missingFields);
  }

  return nextHtml;
}

function injectMissingFields(html: string, fields: LpFormField[]): string {
  const formRe = /<form[^>]*data-lp-form=("|')true\1[^>]*>[\s\S]*?<button[^>]*type=("|')submit\2[^>]*>[\s\S]*?<\/button>/i;
  const missingMarkup = fields.map(renderMissingField).join("\n");

  if (formRe.test(html)) {
    return html.replace(/(<button[^>]*type=("|')submit\2[^>]*>[\s\S]*?<\/button>)/i, `${missingMarkup}\n$1`);
  }

  return html.replace(/(<\/form>)/i, `${missingMarkup}\n$1`);
}

function renderMissingField(field: LpFormField): string {
  const requiredAttr = field.required ? " required" : "";
  const label = `${escapeHtmlText(field.label)}${field.required ? " *" : ""}`;
  const placeholder = field.placeholder?.trim() || defaultPlaceholder(field);

  if (field.type === "textarea") {
    return `<div class="form-group"><label>${label}</label><textarea name="${escapeHtmlAttr(field.name)}" placeholder="${escapeHtmlAttr(placeholder)}"${requiredAttr}></textarea></div>`;
  }

  if (field.type === "select") {
    return `<div class="form-group"><label>${label}</label><select name="${escapeHtmlAttr(field.name)}"${requiredAttr}>${buildSelectOptions(field, placeholder)}</select></div>`;
  }

  return `<div class="form-group"><label>${label}</label><input type="${escapeHtmlAttr(field.type)}" name="${escapeHtmlAttr(field.name)}" placeholder="${escapeHtmlAttr(placeholder)}"${requiredAttr}></div>`;
}

function rebuildControl(tagName: string, attrs: string, field: LpFormField): string {
  const lower = tagName.toLowerCase();
  if (lower === "textarea") return `<textarea${attrs}></textarea>`;
  if (lower === "select") {
    const placeholder = field.placeholder?.trim() || defaultPlaceholder(field);
    return `<select${attrs}>${buildSelectOptions(field, placeholder)}</select>`;
  }
  return `<input${attrs}>`;
}

function buildSelectOptions(field: LpFormField, placeholder: string): string {
  const options = field.options ?? [];
  const placeholderOption = `<option value="">${escapeHtmlText(placeholder)}</option>`;
  if (options.length === 0) return placeholderOption;

  return [
    placeholderOption,
    ...options.map((option) => `<option value="${escapeHtmlAttr(option.value)}">${escapeHtmlText(option.label)}</option>`),
  ].join("");
}

function replaceFirstControl(fragment: string, rebuiltControl: string): string {
  return fragment.replace(/<(input|textarea|select)([^>]*)(?:>[\s\S]*?<\/\1>|\s*\/?>)/i, rebuiltControl);
}

function defaultPlaceholder(field: LpFormField): string {
  if (field.type === "select") return `Select ${field.label.toLowerCase()}`;
  if (field.type === "date") return "Select a date";
  if (field.type === "email") return "you@example.com";
  if (field.type === "tel") return "+44...";
  if (field.type === "textarea") return `Enter ${field.label.toLowerCase()}`;
  return `Enter ${field.label.toLowerCase()}`;
}

function setAttribute(attrs: string, attr: string, value: string | null): string {
  const attrRe = new RegExp(`\\s${attr}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, "i");
  if (!value) return attrs.replace(attrRe, "");

  const escaped = escapeHtmlAttr(value);
  if (attrRe.test(attrs)) {
    return attrs.replace(attrRe, ` ${attr}="${escaped}"`);
  }

  return `${attrs} ${attr}="${escaped}"`;
}

function setBooleanAttribute(attrs: string, attr: string, enabled: boolean): string {
  const attrRe = new RegExp(`\\s${attr}(\\s*=\\s*("${attr}"|'${attr}'|${attr}))?`, "i");
  if (!enabled) return attrs.replace(attrRe, "");
  if (attrRe.test(attrs)) return attrs;
  return `${attrs} ${attr}`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
