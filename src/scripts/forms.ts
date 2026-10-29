// Every <form data-bh-form="name"> on the site is handled here.
// Submissions are POSTed as JSON to PUBLIC_FORM_ENDPOINT (any webhook: Google Apps Script, Make,
// Zapier, Formspree, a CRM...). Without an endpoint configured we fall back to a pre-filled email
// to care@betterhood.in so a lead is never silently dropped.
import { track } from "./tracker";

const ENDPOINT: string = import.meta.env.PUBLIC_FORM_ENDPOINT ?? "";
const FALLBACK_EMAIL = "care@betterhood.in";

export async function submitLead(form: string, data: Record<string, unknown>) {
  const payload = { form, page: location.pathname, submittedAt: new Date().toISOString(), ...data };
  // assessments record their own (richer) assessment_complete event
  if (!form.startsWith("assessment:")) track("form_submit", { form, fields: data });
  if (ENDPOINT) {
    const res = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`Submit failed (${res.status})`);
    return "sent" as const;
  }
  const body = Object.entries(payload).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join("\n");
  location.href = `mailto:${FALLBACK_EMAIL}?subject=${encodeURIComponent(`Website: ${form}`)}&body=${encodeURIComponent(body)}`;
  return "mailto" as const;
}

function collect(f: HTMLFormElement) {
  const data: Record<string, unknown> = {};
  new FormData(f).forEach((v, k) => {
    if (k in data) data[k] = ([] as unknown[]).concat(data[k], v);
    else data[k] = v;
  });
  return data;
}

document.querySelectorAll<HTMLFormElement>("form[data-bh-form]").forEach((f) => {
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!f.reportValidity()) return;
    const note = f.querySelector<HTMLElement>("[data-note]");
    const btn = f.querySelector<HTMLButtonElement>("button[type=submit]");
    if ((f.elements.namedItem("website") as HTMLInputElement | null)?.value) return; // honeypot
    btn?.setAttribute("disabled", "");
    try {
      const how = await submitLead(f.dataset.bhForm!, collect(f));
      if (note) {
        note.hidden = false;
        note.className = "form-note ok";
        note.textContent = how === "sent" ? f.dataset.success || "Thank you! We'll be in touch soon." : "Your email app has opened with your details — just hit send.";
      }
      if (how === "sent") f.reset();
    } catch {
      if (note) { note.hidden = false; note.className = "form-note err"; note.textContent = `Something went wrong. Please try again or write to ${FALLBACK_EMAIL}.`; }
    } finally {
      btn?.removeAttribute("disabled");
    }
  });
});
