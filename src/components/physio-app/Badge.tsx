import { useEffect, useState } from "react";
import { api, useStore, type Doc } from "./store";
import { Btn, Screen, Sheet, go } from "./ui";
import { Icon } from "./icons";
import { native } from "./bridge";

const KINDS: [Doc["kind"], string, string][] = [
  ["iap", "IAP membership", "Card or certificate"],
  ["council", "State council", "Registration certificate"],
];
const kb = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);

// Catch the two reasons documents get rejected (too small, too blurry) before they're submitted.
async function inspect(file: File): Promise<{ preview?: string; issue?: string }> {
  if (file.size > 10e6) return { issue: "This file is over 10 MB. Try a photo or a smaller PDF." };
  if (!file.type.startsWith("image/")) return {};
  const preview = URL.createObjectURL(file);
  const img = await createImageBitmap(file);
  if (Math.min(img.width, img.height) < 700) return { preview, issue: "Low resolution. The registration number may be unreadable." };
  // Sharpness: variance of a Laplacian over a downscaled greyscale copy.
  const w = 240, h = Math.round((img.height / img.width) * w);
  const c = new OffscreenCanvas(w, h);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
  let sum = 0, sq = 0, n = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const l = g[i - w] + g[i + w] + g[i - 1] + g[i + 1] - 4 * g[i];
    sum += l; sq += l * l; n++;
  }
  const variance = sq / n - (sum / n) ** 2;
  return variance < 40 ? { preview, issue: "Looks blurry. Hold steady, in good light, and retake." } : { preview };
}

export function Verify() {
  const s = useStore();
  const rejected = s.verification.status === "rejected";
  const [kind, setKind] = useState<Doc["kind"]>("iap");
  const [doc, setDoc] = useState<Doc | null>(null);
  const [issue, setIssue] = useState<string | undefined>();
  const [checking, setChecking] = useState(false);
  const [regNo, setRegNo] = useState(s.profile.regNo);
  const [done, setDone] = useState(false);

  useEffect(() => () => { if (doc?.preview) URL.revokeObjectURL(doc.preview); }, [doc]);

  async function pick(f?: File) {
    if (!f) return;
    setChecking(true); setIssue(undefined);
    const r = await inspect(f).catch(() => ({} as { preview?: string; issue?: string }));
    setDoc({ kind, name: f.name, size: f.size, preview: r.preview, lowRes: !!r.issue });
    setIssue(r.issue);
    setChecking(false);
    native.haptic(r.issue ? "warning" : "success");
  }
  const submit = () => { api.submitDocs([{ ...doc!, kind }], regNo.trim()); native.haptic("success"); setDone(true); };

  return (
    <Screen backTo={s.verification.status === "none" ? undefined : "#/today"} eyebrow="Step 3 of 3 · Verification" title="Earn your verified badge"
      lead="One document is enough. Only our verification team ever sees it."
      dock={<>
        <Btn onClick={submit} disabled={!doc || checking}>{issue ? "Submit anyway" : "Submit for review"}</Btn>
        {s.verification.status === "none" && <Btn kind="quiet" href="#/today" onClick={() => { try { sessionStorage.setItem("pa-skip-badge", "1"); } catch {} }}>I'll do this later</Btn>}
      </>}>
      {rejected && (
        <div className="pa-callout no"><Icon name="alert" size={18} /><div><b>Your last upload couldn't be verified</b><p>{s.verification.reason}</p></div></div>
      )}

      <div className="pa-tiles" role="radiogroup" aria-label="Document type">
        {KINDS.map(([k, l, sub]) => (
          <button key={k} role="radio" aria-checked={kind === k} className={kind === k ? "on" : ""} onClick={() => { setKind(k); native.haptic(); }}>
            <Icon name={k === "iap" ? "shield" : "file"} size={22} /><b>{l}</b><small>{sub}</small>
          </button>
        ))}
      </div>

      {!doc ? (
        <div className="pa-upload">
          <label className="pa-upload-btn primary"><Icon name="camera" size={22} /><span><b>Take a photo</b><small>Fastest</small></span>
            <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files?.[0])} /></label>
          <label className="pa-upload-btn"><Icon name="upload" size={22} /><span><b>Upload a file</b><small>Image or PDF</small></span>
            <input type="file" accept="image/*,application/pdf" hidden onChange={(e) => pick(e.target.files?.[0])} /></label>
          <p className="pa-tip"><Icon name="spark" size={14} />Lay it flat in good light with all four corners visible.</p>
        </div>
      ) : (
        <div className={`pa-doc ${issue ? "warn" : "ok"}`}>
          <div className="thumb">{doc.preview ? <img src={doc.preview} alt="" /> : <Icon name="file" size={28} />}</div>
          <div className="meta">
            <b>{doc.name}</b>
            <small>{kb(doc.size)}</small>
            <span className="status">{checking ? "Checking quality…" : issue ? <><Icon name="alert" size={14} />{issue}</> : <><Icon name="check" size={14} stroke={2.6} />Clear and readable</>}</span>
          </div>
          <label className="pa-link small">Replace<input type="file" accept="image/*,application/pdf" hidden onChange={(e) => pick(e.target.files?.[0])} /></label>
        </div>
      )}

      <label className="pa-field">
        <span>Registration number <em>optional</em></span>
        <input value={regNo} onChange={(e) => setRegNo(e.target.value.toUpperCase())} placeholder="MH/PT/2017/04821" autoCapitalize="characters" spellCheck={false} />
        <small>Speeds up review. Shown on your profile as proof of practice.</small>
      </label>

      <Sheet open={done} onClose={() => go("#/today")} title="Submitted. Here's what happens next"
        footer={<><Btn href="#/me">Finish my profile meanwhile</Btn><Btn kind="quiet" href="#/today">Go to Today</Btn></>}>
        <ol className="pa-timeline">
          <li className="is-done"><i /><div><b>Document received</b><small>Just now</small></div></li>
          <li className="now"><i /><div><b>Clinical team review</b><small>Usually within 48 hours. We'll notify you either way.</small></div></li>
          <li><i /><div><b>Badge goes live</b><small>On your profile and every article you review.</small></div></li>
        </ol>
        <p className="pa-fine">You can use the app fully while you wait.</p>
      </Sheet>
    </Screen>
  );
}
