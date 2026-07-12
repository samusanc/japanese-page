import { $, toast } from './dom.js';

/**
 * PWA install support. Registers the service worker (production builds only)
 * and wires the #btnInstall button: Chrome/Android get the native install
 * prompt, iOS Safari gets add-to-home-screen instructions.
 */

let deferredPrompt = null;

const isStandalone = () =>
  (typeof matchMedia !== "undefined" && matchMedia("(display-mode: standalone)").matches) ||
  navigator.standalone === true;

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export function initPwa() {
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }))
      .catch(() => {});
  }

  const btn = $("#btnInstall");
  if (!btn) return;

  const hide = () => { btn.style.display = "none"; };

  // Show whenever the app isn't already installed; tapping always does
  // something useful (native prompt, or instructions for this browser).
  if (!isStandalone()) btn.style.display = "";

  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredPrompt = e;
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    hide();
    toast("Installed! Look for 活 on your home screen 🎉");
  });

  btn.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") hide();
      deferredPrompt = null;
    } else if (isIOS()) {
      toast("In Safari: Share button → “Add to Home Screen” 📲");
    } else if (location.protocol !== "https:" && location.hostname !== "localhost") {
      toast("Installing needs the HTTPS site — the dev-server address can't install 📵");
    } else {
      toast("Open the browser menu (⋮) and choose “Install app”");
    }
  });
}
