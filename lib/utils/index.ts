import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
  }).format(date);
}

export function formatSSMNumber(ssm: string): string {
  // Format: 123456-A or 202301012345 (new format)
  return ssm.replace(/[^0-9A-Za-z-]/g, "").toUpperCase();
}
