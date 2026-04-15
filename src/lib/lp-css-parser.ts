/**
 * Parse and update :root CSS custom properties in LP HTML.
 * Used by the global design panel.
 */

export interface CSSVariable {
  name: string;       // e.g. "--primary"
  value: string;      // e.g. "#2563eb"
  category: "colour" | "font" | "size" | "other";
}

// Heuristic to categorise a CSS variable
function categorise(name: string, value: string): CSSVariable["category"] {
  const n = name.toLowerCase();
  const v = value.trim().toLowerCase();

  // Colour detection
  if (v.startsWith("#") || v.startsWith("rgb") || v.startsWith("hsl")) return "colour";
  if (n.includes("color") || n.includes("colour") || n.includes("bg") || n.includes("accent") || n.includes("primary") || n.includes("secondary")) return "colour";

  // Font detection
  if (n.includes("font") || n.includes("family")) return "font";
  if (v.includes("sans-serif") || v.includes("serif") || v.includes("monospace")) return "font";

  // Size detection
  if (v.match(/^\d+(\.\d+)?(px|rem|em|%)$/) || n.includes("radius") || n.includes("size") || n.includes("gap") || n.includes("pad") || n.includes("spacing")) return "size";

  return "other";
}

/**
 * Extract all CSS custom properties from the :root block in an HTML string.
 */
export function parseCSSVariables(html: string): CSSVariable[] {
  const variables: CSSVariable[] = [];

  // Find the <style> block(s)
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch: RegExpExecArray | null;

  while ((styleMatch = styleRegex.exec(html)) !== null) {
    const css = styleMatch[1];

    // Find :root { ... } block
    const rootRegex = /:root\s*\{([^}]+)\}/g;
    let rootMatch: RegExpExecArray | null;

    while ((rootMatch = rootRegex.exec(css)) !== null) {
      const block = rootMatch[1];
      const propRegex = /(--[\w-]+)\s*:\s*([^;]+);/g;
      let propMatch: RegExpExecArray | null;

      while ((propMatch = propRegex.exec(block)) !== null) {
        const name = propMatch[1].trim();
        const value = propMatch[2].trim();
        variables.push({ name, value, category: categorise(name, value) });
      }
    }
  }

  return variables;
}

/**
 * Update a single CSS custom property in the HTML's :root block.
 */
export function updateCSSVariable(html: string, name: string, newValue: string): string {
  // Escape the variable name for regex
  const escaped = name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const regex = new RegExp(`(${escaped}\\s*:\\s*)[^;]+(;)`, "g");
  return html.replace(regex, `$1${newValue}$2`);
}

/**
 * Update multiple CSS custom properties at once.
 */
export function updateCSSVariables(html: string, updates: Record<string, string>): string {
  let result = html;
  for (const [name, value] of Object.entries(updates)) {
    result = updateCSSVariable(result, name, value);
  }
  return result;
}
