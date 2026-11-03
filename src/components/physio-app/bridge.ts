// Talks to the native shell (physio-journey-app) when the page runs inside its WebView, and falls back
// to browser APIs otherwise. Messages are JSON: { type, ...payload }. The shell sets
// window.BH_NATIVE = { platform, version } before the page loads.
declare global {
  interface Window {
    ReactNativeWebView?: { postMessage(msg: string): void };
    BH_NATIVE?: { platform: "ios" | "android"; version: string };
  }
}

const post = (type: string, payload: Record<string, unknown> = {}) => {
  window.ReactNativeWebView?.postMessage(JSON.stringify({ type, ...payload }));
  return !!window.ReactNativeWebView;
};

export const inApp = () => typeof window !== "undefined" && !!window.ReactNativeWebView;

export const native = {
  // Ask the shell to show a system notification. In a browser the in-app toast is all there is.
  notify: (title: string, body: string, to?: string) => post("notify", { title, body, to }),
  haptic: (style: "light" | "success" | "warning" = "light") => post("haptic", { style }),
  async share(url: string, text: string) {
    if (post("share", { url, text })) return;
    if (navigator.share) return navigator.share({ url, text }).catch(() => {});
    await navigator.clipboard?.writeText(url);
  },
  // Links that leave the app flow (WhatsApp, public pages) open in the system browser when in the shell.
  open(url: string) {
    if (!post("open", { url })) window.open(url, "_blank", "noopener");
  },
  ready: () => post("ready"),
};
