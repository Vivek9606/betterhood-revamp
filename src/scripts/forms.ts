// Every <form data-bh-form="name"> on the site is handled here.
// Submissions are saved to the Betterhood API (PUBLIC_API_URL, shown in the admin dashboard) and POSTed
// as JSON to PUBLIC_FORM_ENDPOINT (any webhook: Google Apps Script, Make, Zapier, Formspree, a CRM...).
// With neither configured (or both failing) we fall back to a pre-filled email to care@betterhood.in
// so a lead is never silently dropped.
const ENDPOINT: string = import.meta.env.PUBLIC_FORM_ENDPOINT ?? "";
const FALLBACK_EMAIL = "care@betterhood.in";

// The Betterhood API also keeps every submission (lead forms and assessment results) for the admin dashboard.
const API: string = (import.meta.env.PUBLIC_API_URL ?? "").replace(/\/$/, "");

const pick = (data: Record<string, unknown>, re: RegExp) => {
  const k = Object.keys(data).find((k) => re.test(k) && typeof data[k] === "string" && data[k]);
  return k ? String(data[k]).slice(0, 120) : undefined;
};

/** Save a submission to the Betterhood API. Resolves false (never throws) when there's no API or it fails. */
export async function recordSubmission(kind: "form" | "assessment", form: string, data: Record<string, unknown>): Promise<boolean> {
  if (!API) return false;
  try {
    const { website: _honeypot, ...rest } = data;
    const body = JSON.stringify({ kind, form: form.slice(0, 80), page: location.pathname, name: pick(rest, /name/i), phone: pick(rest, /phone|mobile|tel/i), email: pick(rest, /email/i), data: rest });
    // keepalive: assessments move on to the result page straight after
    const res = await fetch(`${API}/public/web/submissions`, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: body.length < 60000 });
    return res.ok;
  } catch {
    return false;
  }
}

export async function submitLead(form: string, data: Record<string, unknown>, opts: { record?: boolean } = {}) {
  const payload = { form, page: location.pathname, submittedAt: new Date().toISOString(), ...data };
  const saved = opts.record === false ? false : await recordSubmission("form", form, data);
  if (ENDPOINT) {
    const res = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok && !saved) throw new Error(`Submit failed (${res.status})`);
    return "sent" as const;
  }
  if (saved) return "sent" as const;
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
