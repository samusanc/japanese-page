/**
 * Global mutable app state. Prefer module-local state where possible;
 * this object holds only what genuinely crosses module boundaries.
 */
export const state = {
  profile: null,
  dayRec: { sU: 0, sB: 0, kU: 0, kB: 0 },
  G: null,
  KG: null,
  sndOn: true,
  beReady: false,
  beError: "",
  sb: null,
  uid: null,
  debugMode: false
};
