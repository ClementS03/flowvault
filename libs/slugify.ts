/**
 * Generate a URL-safe slug from a component name.
 * Format: {name-slug}-{6 random chars}
 * Example: "Hero Section" → "hero-section-a3f8x2"
 */
function randomSuffix(length = 6): string {
  return Math.random().toString(36).slice(2, 2 + length).padEnd(length, '0');
}

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'component';
  return `${base}-${randomSuffix(6)}`;
}
