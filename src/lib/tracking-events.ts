/**
 * Tracking Events Schema & Utilities
 * Defines event firing rules, validation, and GTM rule generation
 */

export type EventAction = "PAGEVIEW" | "CLICK" | "FORM_SUBMIT" | "CUSTOM";
export type ParameterType = "STRING" | "NUMBER" | "BOOL";

export interface EventParameter {
  name: string;
  type: ParameterType;
}

export interface FiringRule {
  action: EventAction;
  selector?: string; // CSS selector for CLICK/FORM_SUBMIT
  urlPatterns?: string[]; // regex patterns for PAGEVIEW filtering
  delay?: number; // milliseconds before firing
  customCondition?: string; // user-written JS expression (limited to 500 chars)
}

export interface TrackingEventSchema {
  eventName: string;
  eventCategory?: string;
  eventParameters: EventParameter[];
  firingRules: FiringRule[];
  status: "DRAFT" | "ACTIVE";
}

/**
 * Validate event name (GA4 naming convention: lowercase, underscore-separated)
 */
export function validateEventName(name: string): { valid: boolean; error?: string } {
  if (!name || name.length === 0) {
    return { valid: false, error: "Event name is required" };
  }
  if (name.length > 40) {
    return { valid: false, error: "Event name must be 40 characters or less" };
  }
  if (!/^[a-z0-9_]{1,40}$/.test(name)) {
    return {
      valid: false,
      error: "Event name must be lowercase letters, numbers, and underscores only",
    };
  }
  return { valid: true };
}

/**
 * Validate event parameters
 */
export function validateEventParameters(params: EventParameter[]): {
  valid: boolean;
  error?: string;
} {
  if (!Array.isArray(params)) {
    return { valid: false, error: "Parameters must be an array" };
  }

  for (const param of params) {
    if (!param.name || !param.type) {
      return { valid: false, error: "All parameters must have name and type" };
    }
    if (!/^[a-z0-9_]{1,40}$/.test(param.name)) {
      return {
        valid: false,
        error: `Parameter name "${param.name}" is invalid (use lowercase, numbers, underscores)`,
      };
    }
    if (!["STRING", "NUMBER", "BOOL"].includes(param.type)) {
      return { valid: false, error: `Parameter type "${param.type}" is invalid` };
    }
  }
  return { valid: true };
}

/**
 * Validate firing rules
 */
export function validateFiringRules(rules: FiringRule[]): { valid: boolean; error?: string } {
  if (!Array.isArray(rules) || rules.length === 0) {
    return { valid: false, error: "At least one firing rule is required" };
  }

  for (const rule of rules) {
    if (!rule.action || !["PAGEVIEW", "CLICK", "FORM_SUBMIT", "CUSTOM"].includes(rule.action)) {
      return { valid: false, error: `Invalid action: ${rule.action}` };
    }

    if (rule.action === "CLICK" && !rule.selector) {
      return { valid: false, error: "CLICK rule must have a selector" };
    }

    if (rule.selector && !isValidCSSSelector(rule.selector)) {
      return { valid: false, error: `Invalid CSS selector: ${rule.selector}` };
    }

    if (rule.urlPatterns) {
      for (const pattern of rule.urlPatterns) {
        if (!isValidRegex(pattern)) {
          return { valid: false, error: `Invalid regex pattern: ${pattern}` };
        }
      }
    }

    if (rule.delay !== undefined && (rule.delay < 0 || rule.delay > 10000)) {
      return { valid: false, error: "Delay must be between 0 and 10000ms" };
    }

    if (rule.customCondition && rule.customCondition.length > 500) {
      return { valid: false, error: "Custom condition must be 500 characters or less" };
    }
  }

  return { valid: true };
}

/**
 * Validate CSS selector (basic check — don't rely on this for production)
 */
function isValidCSSSelector(selector: string): boolean {
  try {
    document.querySelector(selector);
    return true;
  } catch {
    // If we're in a server context, do a basic regex check
    return /^[a-zA-Z0-9\s\[\]()=:.,#\-_]+$/.test(selector);
  }
}

/**
 * Validate regex pattern
 */
function isValidRegex(pattern: string): boolean {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a GTM custom event trigger configuration from a firing rule
 * This is a reference implementation — actual GTM JSON is more complex
 */
export function generateGTMTriggerFromRule(
  rule: FiringRule,
  eventName: string,
): Record<string, string | number | boolean | Record<string, string | boolean>[] | undefined> {
  const trigger: Record<
    string,
    string | number | boolean | Record<string, string | boolean>[] | undefined
  > = {
    name: `${eventName} - ${rule.action}`,
    type:
      rule.action === "PAGEVIEW"
        ? "pageview"
        : rule.action === "CLICK"
          ? "click"
          : rule.action === "FORM_SUBMIT"
            ? "formSubmission"
            : "custom",
  };

  if (rule.selector) {
    trigger.selector = rule.selector;
  }

  if (rule.urlPatterns && rule.urlPatterns.length > 0) {
    trigger.urlPatterns = rule.urlPatterns.map((pattern) => ({
      pattern,
      isRegex: true,
    }));
  }

  if (rule.delay) {
    trigger.waitForTags = rule.delay;
  }

  return trigger;
}
