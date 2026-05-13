import type { LpFormField } from "@/lib/lp-form-config";

export function applyConfiguredFormFields(html: string, fields: LpFormField[]): string {
  let nextHtml = html;
  for (const field of fields) {
    if (!field.name) continue;
    const name = escapeRegex(field.name);
    const re = new RegExp(`<(input|textarea)([^>]*\\bname=("|')${name}\\3[^>]*)>`, "gi");
    nextHtml = nextHtml.replace(re, (_, tagName: string, attrs: string) => {
      let nextAttrs = attrs;
      nextAttrs = setAttribute(nextAttrs, "placeholder", field.placeholder?.trim() || null);
      nextAttrs = setBooleanAttribute(nextAttrs, "required", field.required);
      if (tagName.toLowerCase() === "input") {
        nextAttrs = setAttribute(nextAttrs, "type", field.type || null);
      }
      return `<${tagName}${nextAttrs}>`;
    });
  }
  return nextHtml;
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
