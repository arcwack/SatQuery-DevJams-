import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional class names and resolve Tailwind conflicts.
 * Used by every component in /components/system.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
