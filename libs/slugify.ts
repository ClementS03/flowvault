/**
 * Generate a URL-safe slug from a component name.
 * Format: {name-slug}-{6 random chars}
 * Example: "Hero Section" → "hero-section-a3f8x2"
 */
function randomSuffix(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, length);
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
