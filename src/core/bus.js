/**
 * Tiny event bus for cross-module notifications, so feature modules never
 * import each other just to trigger a re-render.
 *
 * Events in use:
 *   "daily:committed"  {kind, score} — a daily score was saved
 *   "profile:changed"  — profile created/edited via onboarding
 *   "debug:changed"    boolean — infinite-tries debug mode toggled
 */
const handlers = {};

export const bus = {
  on(evt, fn) {
    (handlers[evt] ??= new Set()).add(fn);
    return () => handlers[evt].delete(fn);
  },
  off(evt, fn) {
    handlers[evt]?.delete(fn);
  },
  emit(evt, data) {
    handlers[evt]?.forEach(fn => {
      try { fn(data); } catch (e) { console.error("[bus]", evt, e); }
    });
  }
};
