/**
 * Tracking Validation Rules Library
 * Validates GTM, GA4, Meta, and Google Ads tracking configurations
 */

export interface ValidationFinding {
  status: "PASS" | "WARNING" | "FAIL";
  message: string;
  recommendation?: string;
}

export interface ValidationResult {
  platform: string;
  status: "PASS" | "WARNING" | "FAIL";
  findings: ValidationFinding[];
}

/**
 * Validate GTM container configuration
 */
export function validateGTMConfig(containerId: string | null | undefined): ValidationResult {
  const findings: ValidationFinding[] = [];

  if (!containerId) {
    findings.push({
      status: "FAIL",
      message: "No GTM container ID configured",
      recommendation: "Set up Google Tag Manager container in client settings",
    });
    return {
      platform: "GTM",
      status: "FAIL",
      findings,
    };
  }

  // Validate container ID format (GTM-XXXXXX)
  if (!/^GTM-[A-Z0-9]{4,10}$/.test(containerId)) {
    findings.push({
      status: "WARNING",
      message: `GTM container ID format may be invalid: ${containerId}`,
      recommendation: "Expected format: GTM-XXXXXX (letters and numbers only)",
    });
  } else {
    findings.push({
      status: "PASS",
      message: `GTM container ${containerId} is properly formatted`,
    });
  }

  return {
    platform: "GTM",
    status: findings.some((f) => f.status === "FAIL")
      ? "FAIL"
      : findings.some((f) => f.status === "WARNING")
        ? "WARNING"
        : "PASS",
    findings,
  };
}

/**
 * Validate GA4 property configuration
 */
export function validateGA4Config(propertyId: string | null | undefined): ValidationResult {
  const findings: ValidationFinding[] = [];

  if (!propertyId) {
    findings.push({
      status: "FAIL",
      message: "No GA4 property ID configured",
      recommendation: "Set up Google Analytics 4 property in client settings",
    });
    return {
      platform: "GA4",
      status: "FAIL",
      findings,
    };
  }

  // Validate property ID format (G-XXXXXXXXXX or numbers only)
  if (!/^(G-[A-Z0-9]{9,12}|\d{8,20})$/.test(propertyId)) {
    findings.push({
      status: "WARNING",
      message: `GA4 property ID format may be invalid: ${propertyId}`,
      recommendation: "Expected format: G-XXXXXXXXXX or numeric property ID",
    });
  } else {
    findings.push({
      status: "PASS",
      message: `GA4 property ${propertyId} is properly formatted`,
    });
  }

  return {
    platform: "GA4",
    status: findings.some((f) => f.status === "FAIL")
      ? "FAIL"
      : findings.some((f) => f.status === "WARNING")
        ? "WARNING"
        : "PASS",
    findings,
  };
}

/**
 * Validate Meta Pixel configuration
 */
export function validateMetaPixel(pixelId: string | null | undefined): ValidationResult {
  const findings: ValidationFinding[] = [];

  if (!pixelId) {
    findings.push({
      status: "FAIL",
      message: "No Meta Pixel ID configured",
      recommendation: "Set up Meta Pixel in client settings (numeric ID, 8-20 digits)",
    });
    return {
      platform: "Meta",
      status: "FAIL",
      findings,
    };
  }

  // Validate Meta pixel ID format (numeric, 8-20 digits)
  if (!/^\d{8,20}$/.test(pixelId)) {
    findings.push({
      status: "WARNING",
      message: `Meta Pixel ID format may be invalid: ${pixelId}`,
      recommendation: "Expected format: numeric ID with 8-20 digits",
    });
  } else {
    findings.push({
      status: "PASS",
      message: `Meta Pixel ${pixelId} is properly formatted`,
    });
  }

  return {
    platform: "Meta",
    status: findings.some((f) => f.status === "FAIL")
      ? "FAIL"
      : findings.some((f) => f.status === "WARNING")
        ? "WARNING"
        : "PASS",
    findings,
  };
}

/**
 * Validate Google Ads conversion tracking configuration
 */
export function validateGoogleAdsTracking(
  conversionId: string | null | undefined,
): ValidationResult {
  const findings: ValidationFinding[] = [];

  if (!conversionId) {
    findings.push({
      status: "FAIL",
      message: "No Google Ads conversion ID configured",
      recommendation: "Set up Google Ads conversion tracking in client settings",
    });
    return {
      platform: "Google Ads",
      status: "FAIL",
      findings,
    };
  }

  // Validate Google Ads conversion ID format (usually like AW-XXXXXXXXXX/conversion_label)
  // Accept various formats for flexibility
  if (!/^AW-\d{9,10}(\/\w+)?$|^[0-9]{8,20}$/.test(conversionId)) {
    findings.push({
      status: "WARNING",
      message: `Google Ads conversion ID format may be invalid: ${conversionId}`,
      recommendation: "Expected format: AW-XXXXXXXXXX/conversion_label or numeric ID",
    });
  } else {
    findings.push({
      status: "PASS",
      message: `Google Ads conversion ID ${conversionId} is properly formatted`,
    });
  }

  return {
    platform: "Google Ads",
    status: findings.some((f) => f.status === "FAIL")
      ? "FAIL"
      : findings.some((f) => f.status === "WARNING")
        ? "WARNING"
        : "PASS",
    findings,
  };
}
