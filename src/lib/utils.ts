import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Standard utility function for combining Tailwind CSS class names cleanly.
 * Merges conditional classes via clsx and resolves Tailwind conflicts via tailwind-merge.
 * Compatible with all shadcn/ui, 21st.dev, and v0.dev components.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
