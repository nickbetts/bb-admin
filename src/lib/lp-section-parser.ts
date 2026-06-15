/**
 * Parse LP HTML into semantic sections and provide reorder/duplicate/delete operations.
 */

export interface LPSection {
  id: string; // Stable identifier (index-based)
  tagName: string; // e.g. "SECTION", "HEADER", "FOOTER", "NAV", "DIV"
  label: string; // Human-readable label from heading or class/id
  outerHtml: string; // Full HTML of this section
  animation?: string; // data-animate value if present
}

// Tags that are treated as top-level sections
const SECTION_TAGS = new Set(["SECTION", "HEADER", "FOOTER", "NAV", "MAIN", "ARTICLE", "ASIDE"]);

// Class/ID patterns that hint at a section
const SECTION_HINTS =
  /hero|banner|cta|features|benefits|testimonials|pricing|faq|contact|about|stats|team|gallery|process|how-it-works|social-proof|footer|header|nav/i;

/**
 * Parse HTML to find top-level landmark sections.
 * Works by finding the <body> content and extracting direct children.
 */
export function parseSections(html: string): LPSection[] {
  const sections: LPSection[] = [];

  // Extract body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : html;

  // Use a simple regex-based approach to find top-level landmark elements in the body
  // This regex finds opening tags of landmark elements at the top level
  // tagRegex kept here as reference for the pattern used in extractTopLevelElements
  const _tagRegex =
    /<(section|header|footer|nav|main|article|aside|div)(\s[^>]*)?>[\s\S]*?<\/\1>/gi;
  void _tagRegex;

  let idx = 0;

  // For better parsing, find all top-level elements by tracking nesting
  const elements = extractTopLevelElements(bodyContent);

  for (const el of elements) {
    const tagMatch = el.match(/^<(\w+)(\s[^>]*)?>/i);
    if (!tagMatch) continue;

    const tagName = tagMatch[1].toUpperCase();
    const attrs = tagMatch[2] || "";

    // Only include section-like elements
    const isSection = SECTION_TAGS.has(tagName);
    const hasHint = SECTION_HINTS.test(attrs) || SECTION_HINTS.test(el.slice(0, 200));
    const isDivSection = tagName === "DIV" && hasHint;

    if (!isSection && !isDivSection) continue;

    // Extract a human-readable label
    const label = extractLabel(el, tagName, attrs, idx);
    const animMatch = el.match(/data-animate="([^"]+)"/);

    sections.push({
      id: `section-${idx}`,
      tagName,
      label,
      outerHtml: el.trim(),
      animation: animMatch ? animMatch[1] : undefined,
    });
    idx++;
  }

  // Fallback: if no semantic sections were detected, expose top-level body blocks
  // so the section organiser still works for div-heavy pages.
  if (sections.length === 0) {
    for (const el of elements) {
      const tagMatch = el.match(/^<(\w+)(\s[^>]*)?>/i);
      if (!tagMatch) continue;

      const tagName = tagMatch[1].toUpperCase();
      const attrs = tagMatch[2] || "";
      if (["SCRIPT", "STYLE", "NOSCRIPT", "META", "LINK"].includes(tagName)) continue;

      const text = el
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Skip tiny/structural nodes that don't represent meaningful sections.
      if (text.length < 20 && !attrs.match(/id=|class=/i)) continue;

      const label = extractLabel(el, tagName, attrs, idx);
      const animMatch = el.match(/data-animate="([^"]+)"/);
      sections.push({
        id: `section-${idx}`,
        tagName,
        label,
        outerHtml: el.trim(),
        animation: animMatch ? animMatch[1] : undefined,
      });
      idx++;

      if (sections.length >= 16) break;
    }
  }

  return sections;
}

/**
 * Extract a label for a section from its content.
 */
function extractLabel(html: string, tagName: string, attrs: string, idx: number): string {
  // Try id
  const idMatch = attrs.match(/id="([^"]+)"/i);
  if (idMatch) return formatLabel(idMatch[1]);

  // Try class for semantic hints
  const classMatch = attrs.match(/class="([^"]+)"/i);
  if (classMatch) {
    const hintMatch = classMatch[1].match(SECTION_HINTS);
    if (hintMatch) return formatLabel(hintMatch[0]);
  }

  // Try first heading
  const headingMatch = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
  if (headingMatch) {
    const text = headingMatch[1].replace(/<[^>]+>/g, "").trim();
    if (text.length > 0 && text.length < 60) return text;
    if (text.length >= 60) return text.slice(0, 57) + "...";
  }

  // Fallback: use tag name + index
  const friendly: Record<string, string> = {
    HEADER: "Header",
    FOOTER: "Footer",
    NAV: "Navigation",
    MAIN: "Main Content",
    ARTICLE: "Article",
    ASIDE: "Sidebar",
    SECTION: `Section ${idx + 1}`,
    DIV: `Block ${idx + 1}`,
  };
  return friendly[tagName] || `Section ${idx + 1}`;
}

function formatLabel(raw: string): string {
  return raw
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Extract top-level elements from HTML body content.
 * Tracks nesting depth to only capture outermost elements.
 */
function extractTopLevelElements(bodyContent: string): string[] {
  const elements: string[] = [];
  const selfClosingTags = new Set([
    "BR",
    "HR",
    "IMG",
    "INPUT",
    "META",
    "LINK",
    "AREA",
    "BASE",
    "COL",
    "EMBED",
    "SOURCE",
    "TRACK",
    "WBR",
  ]);

  let depth = 0;
  let currentStart = -1;
  let currentTag = "";
  let i = 0;
  const len = bodyContent.length;

  while (i < len) {
    // Skip whitespace and text between elements at depth 0
    if (depth === 0) {
      const nextTag = bodyContent.indexOf("<", i);
      if (nextTag === -1) break;

      // Check for comment
      if (bodyContent.startsWith("<!--", nextTag)) {
        const endComment = bodyContent.indexOf("-->", nextTag + 4);
        i = endComment === -1 ? len : endComment + 3;
        continue;
      }

      // Check for script/style at top level - skip them
      const topMatch = bodyContent.slice(nextTag).match(/^<(script|style)[\s>]/i);
      if (topMatch) {
        const closeTag = `</${topMatch[1]}>`;
        const endScript = bodyContent.indexOf(closeTag, nextTag + 1);
        i = endScript === -1 ? len : endScript + closeTag.length;
        continue;
      }

      // Check for closing tag at depth 0 (orphan)
      if (bodyContent[nextTag + 1] === "/") {
        const endBracket = bodyContent.indexOf(">", nextTag);
        i = endBracket === -1 ? len : endBracket + 1;
        continue;
      }

      // Opening tag at depth 0
      const tagNameMatch = bodyContent.slice(nextTag).match(/^<(\w+)/);
      if (!tagNameMatch) {
        i = nextTag + 1;
        continue;
      }

      const tag = tagNameMatch[1].toUpperCase();
      if (selfClosingTags.has(tag)) {
        const endBracket = bodyContent.indexOf(">", nextTag);
        i = endBracket === -1 ? len : endBracket + 1;
        continue;
      }

      // Check for self-closing (e.g. <div />)
      const endBracket = bodyContent.indexOf(">", nextTag);
      if (endBracket === -1) break;
      if (bodyContent[endBracket - 1] === "/") {
        i = endBracket + 1;
        continue;
      }

      currentStart = nextTag;
      currentTag = tag;
      depth = 1;
      i = endBracket + 1;
    } else {
      // Inside an element: find next tag
      const nextTag = bodyContent.indexOf("<", i);
      if (nextTag === -1) break;

      // Comment
      if (bodyContent.startsWith("<!--", nextTag)) {
        const endComment = bodyContent.indexOf("-->", nextTag + 4);
        i = endComment === -1 ? len : endComment + 3;
        continue;
      }

      // Closing tag
      if (bodyContent[nextTag + 1] === "/") {
        const closeMatch = bodyContent.slice(nextTag).match(/^<\/(\w+)\s*>/);
        if (closeMatch) {
          if (closeMatch[1].toUpperCase() === currentTag) {
            depth--;
          }
          if (depth === 0) {
            const endPos = nextTag + closeMatch[0].length;
            elements.push(bodyContent.slice(currentStart, endPos));
            i = endPos;
            continue;
          }
        }
        const endBracket = bodyContent.indexOf(">", nextTag);
        i = endBracket === -1 ? len : endBracket + 1;
        continue;
      }

      // Opening tag
      const tagNameMatch = bodyContent.slice(nextTag).match(/^<(\w+)/);
      if (tagNameMatch) {
        const tag = tagNameMatch[1].toUpperCase();
        const endBracket = bodyContent.indexOf(">", nextTag);
        if (endBracket === -1) break;

        if (selfClosingTags.has(tag) || bodyContent[endBracket - 1] === "/") {
          i = endBracket + 1;
          continue;
        }

        // Script/style: skip the whole thing
        if (tag === "SCRIPT" || tag === "STYLE") {
          const closeTag = `</${tagNameMatch[1]}>`;
          const endScript = bodyContent.toLowerCase().indexOf(closeTag.toLowerCase(), nextTag + 1);
          i = endScript === -1 ? len : endScript + closeTag.length;
          continue;
        }

        if (tag === currentTag) depth++;
        i = endBracket + 1;
      } else {
        i = nextTag + 1;
      }
    }
  }

  return elements;
}

// ── Operations ───────────────────────────────────────────────────────────────

/**
 * Reorder sections in the HTML. Takes the current order and new order as arrays of section ids.
 */
export function reorderSections(html: string, sections: LPSection[], newOrder: string[]): string {
  const ordered = newOrder
    .map((id) => sections.find((s) => s.id === id))
    .filter(Boolean) as LPSection[];

  let result = html;
  // Remove all existing sections from body
  for (const s of sections) {
    result = result.replace(s.outerHtml, `<!-- LP_PLACEHOLDER_${s.id} -->`);
  }

  // Replace placeholders with sections in new order
  let orderIdx = 0;
  for (const s of sections) {
    const placeholder = `<!-- LP_PLACEHOLDER_${s.id} -->`;
    if (orderIdx < ordered.length) {
      result = result.replace(placeholder, ordered[orderIdx].outerHtml);
      orderIdx++;
    } else {
      result = result.replace(placeholder, "");
    }
  }

  return result;
}

/**
 * Duplicate a section — insert a copy immediately after the original.
 */
export function duplicateSection(html: string, section: LPSection): string {
  return html.replace(section.outerHtml, section.outerHtml + "\n\n" + section.outerHtml);
}

/**
 * Delete a section from the HTML.
 */
export function deleteSection(html: string, section: LPSection): string {
  return html.replace(section.outerHtml, "");
}

/**
 * Replace a section's HTML with new content.
 */
export function replaceSection(html: string, section: LPSection, newOuterHtml: string): string {
  return html.replace(section.outerHtml, newOuterHtml);
}

/**
 * Set an animation attribute on a section.
 */
export function setSectionAnimation(
  html: string,
  section: LPSection,
  animation: string | null,
): string {
  const oldHtml = section.outerHtml;
  let newHtml: string;

  if (animation) {
    // Add or update data-animate attribute
    if (oldHtml.match(/data-animate="[^"]*"/)) {
      newHtml = oldHtml.replace(/data-animate="[^"]*"/, `data-animate="${animation}"`);
    } else {
      // Add attribute to the opening tag
      newHtml = oldHtml.replace(/^(<\w+)/, `$1 data-animate="${animation}"`);
    }
  } else {
    // Remove attribute
    newHtml = oldHtml.replace(/\s*data-animate="[^"]*"/, "");
  }

  return html.replace(oldHtml, newHtml);
}
