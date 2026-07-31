/** Joins class names, filtering falsy values. Does not resolve Tailwind conflicts. */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}
