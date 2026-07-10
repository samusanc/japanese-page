/** localStorage wrapper — JSON-encoded, namespaced, never throws. */
export const LS = {
  get(k) {
    try {
      const v = localStorage.getItem("katsuyo:" + k);
      return v ? JSON.parse(v) : null;
    } catch (e) {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem("katsuyo:" + k, JSON.stringify(v));
    } catch (e) {}
  }
};
