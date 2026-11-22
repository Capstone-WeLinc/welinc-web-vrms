import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/*
  tailwind-merge only knows Tailwind's own scale, so it would read our type sizes (`text-body`) as
  colors and drop one of `text-body text-primary-foreground`. These lists mirror the type scale and
  shadows in index.css (suite spec 0016, design.md).
*/
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "title", "heading", "subheading", "group", "body", "small", "caption", "label", "base-input"],
      shadow: ["card", "pop", "bar", "dialog"],
    },
  },
});

/** Joins class names (clsx) and resolves Tailwind conflicts (tailwind-merge) for every component. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
