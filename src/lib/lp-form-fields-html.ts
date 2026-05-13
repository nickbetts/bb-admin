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
  const template = extractFieldStyleTemplate(html);
  const missingMarkup = fields.map((field) => renderMissingField(field, template)).join("\n");

  // Prefer inserting directly after the last existing form-group so new
  // fields inherit the same grid/container styling as neighbouring fields.
  const lastFormGroupRe = /(<div[^>]*class=("|')[^"']*form-group[^"']*\2[^>]*>[\s\S]*?<\/div>)(?![\s\S]*<div[^>]*class=("|')[^"']*form-group[^"']*\3[^>]*>)/i;
  if (lastFormGroupRe.test(html)) {
    return html.replace(lastFormGroupRe, `$1\n${missingMarkup}`);
  }

  const formRe = /<form[^>]*data-lp-form=("|')true\1[^>]*>[\s\S]*?<button[^>]*type=("|')submit\2[^>]*>[\s\S]*?<\/button>/i;

  if (formRe.test(html)) {
    return html.replace(/(<button[^>]*type=("|')submit\2[^>]*>[\s\S]*?<\/button>)/i, `${missingMarkup}\n$1`);
  }

  return html.replace(/(<\/form>)/i, `${missingMarkup}\n$1`);
}

interface FieldStyleTemplate {
  wrapperClass?: string;
  labelClass?: string;
  inputClass?: string;
  textareaClass?: string;
  selectClass?: string;
}

function renderMissingField(field: LpFormField, template: FieldStyleTemplate): string {
  const requiredAttr = field.required ? " required" : "";
  const label = `${escapeHtmlText(field.label)}${field.required ? " *" : ""}`;
  const placeholder = field.placeholder?.trim() || defaultPlaceholder(field);
  const wrapperClass = template.wrapperClass || "form-group";
  const labelClassAttr = template.labelClass ? ` class="${escapeHtmlAttr(template.labelClass)}"` : "";

  if (field.type === "textarea") {
    const classAttr = template.textareaClass ? ` class="${escapeHtmlAttr(template.textareaClass)}"` : "";
    return `<div class="${escapeHtmlAttr(wrapperClass)}"><label${labelClassAttr}>${label}</label><textarea${classAttr} name="${escapeHtmlAttr(field.name)}" placeholder="${escapeHtmlAttr(placeholder)}"${requiredAttr}></textarea></div>`;
  }

  if (field.type === "select") {
    const classAttr = template.selectClass ? ` class="${escapeHtmlAttr(template.selectClass)}"` : "";
    return `<div class="${escapeHtmlAttr(wrapperClass)}"><label${labelClassAttr}>${label}</label><select${classAttr} name="${escapeHtmlAttr(field.name)}"${requiredAttr}>${buildSelectOptions(field, placeholder)}</select></div>`;
  }

  const classAttr = template.inputClass ? ` class="${escapeHtmlAttr(template.inputClass)}"` : "";
  return `<div class="${escapeHtmlAttr(wrapperClass)}"><label${labelClassAttr}>${label}</label><input${classAttr} type="${escapeHtmlAttr(field.type)}" name="${escapeHtmlAttr(field.name)}" placeholder="${escapeHtmlAttr(placeholder)}"${requiredAttr}></div>`;
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

function extractFieldStyleTemplate(html: string): FieldStyleTemplate {
  const template: FieldStyleTemplate = {};

  const groupMatch = html.match(/<div[^>]*class=("|')([^"']*form-group[^"']*)\1[^>]*>[\s\S]*?<label([^>]*)>[\s\S]*?<\/(?:label)>[\s\S]*?<(input|textarea|select)([^>]*)/i);
  if (groupMatch) {
    template.wrapperClass = groupMatch[2]?.trim() || undefined;

    const labelClass = extractClassAttribute(groupMatch[3] || "");
    if (labelClass) template.labelClass = labelClass;

    const controlTag = (groupMatch[4] || "").toLowerCase();
    const controlClass = extractClassAttribute(groupMatch[5] || "");
    if (controlClass) {
      if (controlTag === "textarea") template.textareaClass = controlClass;
      else if (controlTag === "select") template.selectClass = controlClass;
      else template.inputClass = controlClass;
    }
  }

  if (!template.inputClass) {
    const inputMatch = html.match(/<input([^>]*)>/i);
    template.inputClass = inputMatch ? extractClassAttribute(inputMatch[1]) : undefined;
  }
  if (!template.textareaClass) {
    const textareaMatch = html.match(/<textarea([^>]*)>/i);
    template.textareaClass = textareaMatch ? extractClassAttribute(textareaMatch[1]) : undefined;
  }
  if (!template.selectClass) {
    const selectMatch = html.match(/<select([^>]*)>/i);
    template.selectClass = selectMatch ? extractClassAttribute(selectMatch[1]) : undefined;
  }

  return template;
}

function extractClassAttribute(attrs: string): string | undefined {
  const classMatch = attrs.match(/\bclass=("([^"]*)"|'([^']*)')/i);
  const value = (classMatch?.[2] ?? classMatch?.[3] ?? "").trim();
  return value || undefined;
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
