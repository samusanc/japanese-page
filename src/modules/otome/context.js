/**
 * Shared VN run context. `ctx.vn` is the single mutable object describing the
 * active route/training run (null when the overlay is closed). Split engine
 * files (stage/quiz/spell/route/training) all coordinate through it.
 */
export const ctx = { vn: null };

/** Abort the async flow when the player quit (thrown value caught in route/training). */
export function vnCheck() {
  if (!ctx.vn || ctx.vn.quit) throw "quit";
}

/** Resolves on the next dialog tap. */
export function vnTap() {
  return new Promise(res => {
    ctx.vn._tap = res;
  });
}
