// Common regex patterns and validation functions for RetailERP forms

export const PATTERNS = {
  GSTIN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  PINCODE: /^[1-9][0-9]{5}$/,
  PHONE: /^[6-9]\d{9}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  IFSC: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  CIN: /^[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/,
  BARCODE: /^[A-Z0-9]{3,20}-[0-9]{2,3}$/,
};

export type ValidationError = Record<string, string>;

export function required(value: string, label: string): string {
  return value.trim() ? "" : `${label} is required`;
}

export function minLength(value: string, min: number, label: string): string {
  return value.trim().length >= min ? "" : `${label} must be at least ${min} characters`;
}

export function maxLength(value: string, max: number, label: string): string {
  return value.trim().length <= max ? "" : `${label} must be at most ${max} characters`;
}

export function pattern(value: string, regex: RegExp, label: string, hint?: string): string {
  if (!value.trim()) return "";
  return regex.test(value.trim()) ? "" : `${label} format is invalid${hint ? ` (${hint})` : ""}`;
}

export function positiveNumber(value: number | string, label: string): string {
  const n = Number(value);
  return !isNaN(n) && n > 0 ? "" : `${label} must be a positive number`;
}

export function minValue(value: number | string, min: number, label: string): string {
  const n = Number(value);
  return !isNaN(n) && n >= min ? "" : `${label} must be at least ${min}`;
}

export function hasErrors(errors: ValidationError): boolean {
  return Object.values(errors).some(Boolean);
}
