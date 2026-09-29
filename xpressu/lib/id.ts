/** Collision-resistant enough for local IDs; not for security. */
export function createId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
