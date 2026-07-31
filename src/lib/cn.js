/**
 * Joins class names, dropping anything falsy.
 * Keeps conditional Tailwind classes readable without pulling in a dependency.
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
