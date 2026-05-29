import { load, type Cheerio, type CheerioAPI } from "cheerio";
import type { Element } from "domhandler";
import type { LpFormField } from "@/lib/lp-form-config";

export interface LpFieldStyleTemplate {
  wrapperClass?: string;
  labelClass?: string;
  inputClass?: string;
  textareaClass?: string;
  selectClass?: string;
}

const FORM_BLOCK_RE = /<form\b[^>]*\bdata-lp-form\b[^>]*>[\s\S]*?<\/form>/i;
const ANY_FORM_BLOCK_RE = /<form\b[^>]*>[\s\S]*?<\/form>/i;
const CONTROL_SELECTOR = "input, textarea, select";

/**
 * Synchronise the rendered form HTML with the authoritative formConfig.fields.
 *
 * This is the single source of truth for compiling configured fields into the
 * built-in form. It is intentionally DOM-based (cheerio) rather than regex-based
 * so it copes with nested `.form-row` grids and is fully idempotent — applying it
 * twice yields the same output as applying it once. That idempotency matters
 * because the function runs both at save time and at render time.
 *
 * Behaviour:
 *  - removes controls whose `name` is not in the config (and any orphaned grid rows)
 *  - de-duplicates repeated controls, keeping the first occurrence
 *  - updates each kept control's type / placeholder / required + label text in place
 *  - injects any configured field that is missing, once
 *  - reorders the field blocks to match the configured order, preserving multi-field rows
 */
export function applyConfiguredFormFields(
  html: string,
  fields: LpFormField[],
  styleTemplateOverride?: Partial<LpFieldStyleTemplate>,
): string {
  const validFields = fields.filter((field) => field?.name);
  if (validFields.length === 0) return html;

  const formMatch = html.match(FORM_BLOCK_RE) ?? html.match(ANY_FORM_BLOCK_RE);
  if (!formMatch) return html;

  const originalFormBlock = formMatch[0];
  const rewrittenFormBlock = rewriteFormBlock(
    originalFormBlock,
    validFields,
    styleTemplateOverride,
  );

  if (rewrittenFormBlock === originalFormBlock) return html;
  return spliceOnce(html, originalFormBlock, rewrittenFormBlock);
}

function rewriteFormBlock(
  formBlock: string,
  fields: LpFormField[],
  styleTemplateOverride?: Partial<LpFieldStyleTemplate>,
): string {
  const $ = load(formBlock, undefined, false);
  const form = $("form").first();
  if (!form.length) return formBlock;

  const configNames = new Set(fields.map((field) => field.name));
  const indexByName = new Map(fields.map((field, index) => [field.name, index]));

  // --- 1. De-duplicate + remove controls not in the config -------------------
  const seen = new Set<string>();
  const keptControlByName = new Map<string, Element>();

  $(CONTROL_SELECTOR).each((_, el) => {
    const $el = $(el);
    const name = $el.attr("name")?.trim();
    if (!name) return;
    if (
      el.tagName?.toLowerCase() === "input" &&
      ($el.attr("type") ?? "").toLowerCase() === "hidden"
    ) {
      return;
    }

    const keep = configNames.has(name) && !seen.has(name);
    if (keep) {
      seen.add(name);
      keptControlByName.set(name, el);
    } else {
      removeControl($, $el);
    }
  });

  // --- 2. Update kept controls + labels in place -----------------------------
  for (const field of fields) {
    const control = keptControlByName.get(field.name);
    if (!control) continue;
    updateControl($, $(control), field);
  }

  // --- 3. Inject configured fields that are missing from the markup ----------
  const template: LpFieldStyleTemplate = {
    ...extractFieldStyleTemplate($),
    ...(styleTemplateOverride ?? {}),
  };
  const usesFormRow = $(".form-row").length > 0;

  for (const field of fields) {
    if (keptControlByName.has(field.name)) continue;
    const groupMarkup = renderMissingField(field, template);
    const blockMarkup = usesFormRow ? `<div class="form-row">${groupMarkup}</div>` : groupMarkup;
    const anchor = findSubmitAnchor($, form);
    if (anchor.length) anchor.before(blockMarkup);
    else form.append(blockMarkup);
  }

  // --- 4. Reorder field blocks to match the configured order -----------------
  // When any field carries an explicit width hint, lay the fields out by width
  // (packing consecutive half-width fields two per row); otherwise fall back to
  // the structure-preserving reorder that keeps hand-authored rows intact.
  const laidOut = applyFieldLayout($, form, fields);
  if (!laidOut) reorderFieldBlocks($, form, indexByName);

  return $.html();
}

/** Remove a control along with its `.form-group`, cleaning up any empty `.form-row`. */
function removeControl($: CheerioAPI, $el: Cheerio<Element>): void {
  const group = $el.closest(".form-group");
  if (group.length) {
    const row = group.closest(".form-row");
    group.remove();
    if (row.length && row.find(".form-group").length === 0) row.remove();
    return;
  }

  const id = $el.attr("id");
  if (id) $(`label[for="${cssAttrEscape(id)}"]`).remove();
  $el.remove();
}

function updateControl($: CheerioAPI, $el: Cheerio<Element>, field: LpFormField): void {
  const tag = ($el.prop("tagName") ?? "").toLowerCase();

  // required
  if (field.required) $el.attr("required", "");
  else $el.removeAttr("required");

  // placeholder (not applicable to <select>)
  if (tag !== "select") {
    const placeholder = field.placeholder?.trim();
    if (placeholder) $el.attr("placeholder", placeholder);
    else $el.removeAttr("placeholder");
  }

  // type (input only, and only for genuine input types)
  if (tag === "input" && field.type !== "textarea" && field.type !== "select") {
    $el.attr("type", field.type);
  }

  // select options
  if (tag === "select") {
    const placeholder = field.placeholder?.trim() || defaultPlaceholder(field);
    $el.html(buildSelectOptions(field, placeholder));
  }

  // label text + for/id sync
  const group = $el.closest(".form-group");
  let label = group.length ? group.find("label").first() : $();
  const id = $el.attr("id");
  if (!label.length && id) label = $(`label[for="${cssAttrEscape(id)}"]`).first();
  if (label.length) {
    label.text(`${field.label}${field.required ? " *" : ""}`);
    if (id && label.attr("for") !== undefined) label.attr("for", id);
  }
}

/**
 * Lay out the configured field groups by their `width` hint, packing
 * consecutive half-width fields two per row inside a `.form-row` and leaving
 * full-width (or unpaired half-width) fields as standalone `.form-group`s.
 *
 * Only runs when at least one field carries an explicit `width` hint, so pages
 * that don't use width hints keep their existing structure-preserving reorder.
 * The output is derived purely from the configured order + width, so it is
 * fully idempotent. Returns true when it took ownership of the layout.
 */
function applyFieldLayout($: CheerioAPI, form: Cheerio<Element>, fields: LpFormField[]): boolean {
  const widthByName = new Map<string, "half" | "full">();
  let hasWidthHint = false;
  for (const field of fields) {
    if (field.width === "half" || field.width === "full") hasWidthHint = true;
    widthByName.set(field.name, field.width === "half" ? "half" : "full");
  }
  if (!hasWidthHint) return false;

  // Locate the `.form-group` wrapper for each configured field's control.
  const groupByName = new Map<string, Element>();
  $(CONTROL_SELECTOR).each((_, el) => {
    const name = $(el).attr("name")?.trim();
    if (!name || !widthByName.has(name) || groupByName.has(name)) return;
    const group = $(el).closest(".form-group");
    if (group.length) groupByName.set(name, group[0] as Element);
  });

  const orderedNames = fields.map((field) => field.name).filter((name) => groupByName.has(name));
  if (orderedNames.length === 0) return true;

  // Remember the rows that currently wrap these groups so we can clean up any
  // that become empty after re-grouping.
  const oldRows = new Set<Element>();
  for (const name of orderedNames) {
    const row = $(groupByName.get(name)!).closest(".form-row");
    if (row.length) oldRows.add(row[0] as Element);
  }

  // Build the new ordered block sequence.
  const blocks: Cheerio<Element>[] = [];
  let i = 0;
  while (i < orderedNames.length) {
    const name = orderedNames[i];
    const group = $(groupByName.get(name)!);
    const nextName = orderedNames[i + 1];
    if (
      widthByName.get(name) === "half" &&
      nextName !== undefined &&
      widthByName.get(nextName) === "half"
    ) {
      const row = $('<div class="form-row"></div>') as Cheerio<Element>;
      row.append(group);
      row.append($(groupByName.get(nextName)!));
      blocks.push(row);
      i += 2;
    } else {
      group.remove();
      blocks.push(group);
      i += 1;
    }
  }

  // Re-attach the blocks in order, just before the submit anchor.
  const anchor = findSubmitAnchor($, form);
  for (const block of blocks) {
    if (anchor.length) anchor.before(block);
    else form.append(block);
  }

  // Drop any old rows that no longer contain a field group.
  for (const row of oldRows) {
    const $row = $(row);
    if ($row.find(".form-group").length === 0) $row.remove();
  }

  return true;
}

/**
 * Reorder the top-level field blocks (`.form-row` units and standalone
 * `.form-group`s) to match the configured field order. Multi-field rows are
 * kept intact, with their inner `.form-group`s sorted by configured order.
 */
function reorderFieldBlocks(
  $: CheerioAPI,
  form: Cheerio<Element>,
  indexByName: Map<string, number>,
): void {
  const units: Element[] = [];

  $(".form-row").each((_, el) => {
    if ($(el).parents(".form-row").length === 0 && $(el).find(CONTROL_SELECTOR).length > 0) {
      units.push(el);
    }
  });
  $(".form-group").each((_, el) => {
    if ($(el).closest(".form-row").length === 0 && $(el).find(CONTROL_SELECTOR).length > 0) {
      units.push(el);
    }
  });

  if (units.length < 2) return;

  // Sort inner form-groups within multi-field rows.
  for (const unit of units) {
    const $unit = $(unit);
    if (!$unit.is(".form-row")) continue;
    const groups = $unit.children(".form-group").toArray();
    if (groups.length < 2) continue;
    const sortedGroups = stableSort(
      groups,
      (a, b) => unitKey($, a, indexByName) - unitKey($, b, indexByName),
    );
    for (const group of sortedGroups) $unit.append($(group));
  }

  // Sort the units themselves and re-attach before the submit anchor.
  const sortedUnits = stableSort(
    units,
    (a, b) => unitKey($, a, indexByName) - unitKey($, b, indexByName),
  );
  const anchor = findSubmitAnchor($, form);
  for (const unit of sortedUnits) {
    if (anchor.length) anchor.before($(unit));
    else form.append($(unit));
  }
}

function unitKey($: CheerioAPI, el: Element, indexByName: Map<string, number>): number {
  let min = Number.POSITIVE_INFINITY;
  $(el)
    .find(CONTROL_SELECTOR)
    .each((_, control) => {
      const name = $(control).attr("name")?.trim();
      if (name && indexByName.has(name)) min = Math.min(min, indexByName.get(name)!);
    });
  return min;
}

function findSubmitAnchor($: CheerioAPI, form: Cheerio<Element>): Cheerio<Element> {
  const byType = form.find("button[type='submit']").first();
  if (byType.length) return byType;
  const bySubmitClass = form.find(".form-submit").first();
  if (bySubmitClass.length) return bySubmitClass;
  return form.find("button").first();
}

export function replaceBuiltInForm(html: string, rebuiltFormHtml: string): string {
  return html.replace(
    /<form[^>]*data-lp-form=("|')true\1[^>]*>[\s\S]*?<\/form>/i,
    () => rebuiltFormHtml,
  );
}

/**
 * Remove form controls whose `name` is not present in the configured fields.
 * Returns the original string unchanged when there is nothing to remove so that
 * callers (and the published HTML) are not perturbed by re-serialisation.
 */
export function removeFieldsNotInConfig(html: string, fields: LpFormField[]): string {
  const allowedNames = new Set(fields.map((field) => field.name).filter(Boolean));

  const formMatch = html.match(FORM_BLOCK_RE) ?? html.match(ANY_FORM_BLOCK_RE);
  if (!formMatch) return html;
  const originalFormBlock = formMatch[0];

  const $ = load(originalFormBlock, undefined, false);
  let removed = false;

  $(CONTROL_SELECTOR).each((_, el) => {
    const $el = $(el);
    const name = $el.attr("name")?.trim();
    if (!name) return;
    if (
      el.tagName?.toLowerCase() === "input" &&
      ($el.attr("type") ?? "").toLowerCase() === "hidden"
    ) {
      return;
    }
    if (!allowedNames.has(name)) {
      removeControl($, $el);
      removed = true;
    }
  });

  if (!removed) return html;
  return spliceOnce(html, originalFormBlock, $.html());
}

function renderMissingField(field: LpFormField, template: LpFieldStyleTemplate): string {
  const requiredAttr = field.required ? " required" : "";
  const label = `${escapeHtmlText(field.label)}${field.required ? " *" : ""}`;
  const placeholder = field.placeholder?.trim() || defaultPlaceholder(field);
  const wrapperClass = template.wrapperClass || "form-group";
  const labelClassAttr = template.labelClass
    ? ` class="${escapeHtmlAttr(template.labelClass)}"`
    : "";

  if (field.type === "textarea") {
    const classAttr = template.textareaClass
      ? ` class="${escapeHtmlAttr(template.textareaClass)}"`
      : "";
    return `<div class="${escapeHtmlAttr(wrapperClass)}"><label${labelClassAttr}>${label}</label><textarea${classAttr} name="${escapeHtmlAttr(field.name)}" placeholder="${escapeHtmlAttr(placeholder)}"${requiredAttr}></textarea></div>`;
  }

  if (field.type === "select") {
    const classAttr = template.selectClass
      ? ` class="${escapeHtmlAttr(template.selectClass)}"`
      : "";
    return `<div class="${escapeHtmlAttr(wrapperClass)}"><label${labelClassAttr}>${label}</label><select${classAttr} name="${escapeHtmlAttr(field.name)}"${requiredAttr}>${buildSelectOptions(field, placeholder)}</select></div>`;
  }

  const classAttr = template.inputClass ? ` class="${escapeHtmlAttr(template.inputClass)}"` : "";
  return `<div class="${escapeHtmlAttr(wrapperClass)}"><label${labelClassAttr}>${label}</label><input${classAttr} type="${escapeHtmlAttr(field.type)}" name="${escapeHtmlAttr(field.name)}" placeholder="${escapeHtmlAttr(placeholder)}"${requiredAttr}></div>`;
}

function buildSelectOptions(field: LpFormField, placeholder: string): string {
  const options = field.options ?? [];
  const placeholderOption = `<option value="">${escapeHtmlText(placeholder)}</option>`;
  if (options.length === 0) return placeholderOption;

  return [
    placeholderOption,
    ...options.map(
      (option) =>
        `<option value="${escapeHtmlAttr(option.value)}">${escapeHtmlText(option.label)}</option>`,
    ),
  ].join("");
}

function extractFieldStyleTemplate($: CheerioAPI): LpFieldStyleTemplate {
  const template: LpFieldStyleTemplate = {};

  const firstGroup = $(".form-group").first();
  if (firstGroup.length) {
    const wrapperClass = firstGroup.attr("class")?.trim();
    if (wrapperClass) template.wrapperClass = wrapperClass;

    const labelClass = firstGroup.find("label").first().attr("class")?.trim();
    if (labelClass) template.labelClass = labelClass;
  }

  const inputClass = $("input").first().attr("class")?.trim();
  if (inputClass) template.inputClass = inputClass;
  const textareaClass = $("textarea").first().attr("class")?.trim();
  if (textareaClass) template.textareaClass = textareaClass;
  const selectClass = $("select").first().attr("class")?.trim();
  if (selectClass) template.selectClass = selectClass;

  return template;
}

function defaultPlaceholder(field: LpFormField): string {
  if (field.type === "select") return `Select ${field.label.toLowerCase()}`;
  if (field.type === "date") return "Select a date";
  if (field.type === "email") return "you@example.com";
  if (field.type === "tel") return "+44...";
  if (field.type === "textarea") return `Enter ${field.label.toLowerCase()}`;
  return `Enter ${field.label.toLowerCase()}`;
}

function stableSort<T>(items: T[], comparator: (a: T, b: T) => number): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const result = comparator(a.item, b.item);
      return result !== 0 ? result : a.index - b.index;
    })
    .map(({ item }) => item);
}

/** Replace the first occurrence of `search` without interpreting `$` patterns. */
function spliceOnce(haystack: string, search: string, replacement: string): string {
  const index = haystack.indexOf(search);
  if (index === -1) return haystack;
  return haystack.slice(0, index) + replacement + haystack.slice(index + search.length);
}

function cssAttrEscape(value: string): string {
  return value.replace(/["\\]/g, "\\$&");
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
