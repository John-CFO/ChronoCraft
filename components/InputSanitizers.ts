///////////////////////Input Sanitizers.ts////////////////////////

// This file is used to sanitize user inputs

//////////////////////////////////////////////////////////////////

// sanitize to alow only certain characters, max. 20 characters
export const sanitizeTitle = (text: string) =>
  text.replace(/[^\w\s\-.,!?]/g, "").slice(0, 20);

// sanatize to alow more characters, but limited to 300
export const sanitizeComment = (text: string) =>
  text.replace(/[^\w\s\-.,!?'"()@€$%:;\/]/g, "").slice(0, 300);

// sanitize Hours – max 24h, only numbers + optional comma/point
export const sanitizeHours = (text: string) => {
  // only numbers and a decimal point
  const sanitized = text.replace(/[^0-9.]/g, "");

  // only the first dot can remain (when multiple dots are entered like "3.5.6")
  const parts = sanitized.split(".");
  const cleaned = parts[0] + (parts[1] ? "." + parts[1].slice(0, 2) : "");

  const hours = parseFloat(cleaned);
  if (isNaN(hours)) return "";

  return hours > 24 ? "24" : cleaned;
};

// sanitize Hourly Rate – max. 300 inside the Earnings Calculator
export const sanitizeRateInput = (text: string) => {
  // alow only numbers and a decimal point
  let sanitized = text.replace(/[^0-9.]/g, "");

  // several dots, keep only the first
  const firstDotIndex = sanitized.indexOf(".");
  if (firstDotIndex !== -1) {
    // replace all other dots after the first
    sanitized =
      sanitized.slice(0, firstDotIndex + 1) +
      sanitized.slice(firstDotIndex + 1).replace(/\./g, "");
  }

  // if the text ends with a dot, accept it (e.g. "12.")
  if (sanitized.endsWith(".")) {
    return sanitized;
  }

  // max. 2 decimal places
  const parts = sanitized.split(".");
  if (parts[1]?.length > 2) {
    sanitized = parts[0] + "." + parts[1].slice(0, 2);
  }

  // parse the value as a number
  const rate = parseFloat(sanitized);

  // if no valid number, return an empty string
  if (isNaN(rate)) return "";

  // max. 300
  return rate > 300 ? "300" : sanitized;
};

// sanitize the profile inputs

// allow only letters, spaces, hyphens for names – max 40 characters
export const sanitizeName = (text: string) =>
  text.replace(/[^a-zA-ZäöüÄÖÜß\s\-]/g, "").slice(0, 40);

// allow only digits, max 15 characters (e.g for a personalID)
export const sanitizePersonalID = (text: string) =>
  text.replace(/\D/g, "").slice(0, 15);

// sanitize the max work hours inside the Deathline-Tracker
export const sanitizeMaxWorkHours = (text: string): string => {
  // only numbers and no decimal points
  const sanitized = text.replace(/[^0-9]/g, "");

  // if the text is empty, return an empty string
  if (sanitized === "") return "";
  // change to number
  const hours = parseInt(sanitized, 10);

  // max. 10000 hours allowed
  const clamped = Math.min(hours, 10000);

  return clamped.toString();
};
