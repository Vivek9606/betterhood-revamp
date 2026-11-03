import { useEffect, useMemo, useState } from "react";
import { localityOf, physios, set, shortDegree, titleCase, useStore, type Row } from "./store";
import { Avatar, Btn, Empty, Screen, Skeleton, Tick } from "./ui";
import { Icon } from "./icons";
import { native } from "./bridge";

const FOCUS: [string, RegExp][] = [
  ["Sports", /sport/i], ["Ortho", /ortho|musculo/i], ["Spine", /spine|back|neck|cervical/i], ["Neuro", /neuro/i],
  ["Geriatric", /geriatric/i], ["Women's health", /antenatal|postnatal|women|pelvic/i], ["Home visits", /home visit/i], ["Online", /video|online|tele/i],
];

export function Network() {
  const { profile: me, saved } = useStore();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [city, setCity] = useState(me.city.toLowerCase());
  const [focus, setFocus] = useState("");
  const [limit, setLimit] = useState(24);

  useEffect(() => { physios().then((d) => setRows([...d].sort((a, b) => Number(!!b.i) - Number(!!a.i) || b.y - a.y))); }, []);
  useEffect(() => setLimit(24), [q, city, focus]);

  const cities = useMemo(() => {
    const n: Record<string, number> = {};
    rows?.forEach((r) => r.c && (n[r.c] = (n[r.c] || 0) + 1));
    return Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([c]) => c);
  }, [rows]);

  const list = useMemo(() => {
    if (!rows) return [];
    const t = q.trim().toLowerCase();
    const re = FOCUS.find(([k]) => k === focus)?.[1];
    return rows.filter((r) => r.s !== me.slug && (!city || r.c === city) && (!re || re.test(`${r.sp.join(" ")} ${r.g} ${r.m.join(" ")}`)) &&
      (!t || `${r.n} ${r.sp.join(" ")} ${r.p} ${r.a.join(" ")}`.toLowerCase().includes(t)));
  }, [rows, q, city, focus, me.slug]);

  const savedRows = rows?.filter((r) => saved.includes(r.s)) ?? [];

  return (
    <Screen tabs className="pa-network">
      <header className="pa-net-top">
        <h1 className="pa-h" tabIndex={-1} data-autofocus>Network</h1>
        <p className="pa-muted">Find peers to refer to, or learn from.</p>
        <label className="pa-search">
          <Icon name="search" size={18} />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, speciality or area" aria-label="Search physios" />
          {q && <button onClick={() => setQ("")} aria-label="Clear"><Icon name="x" size={16} /></button>}
        </label>
        <div className="pa-scroll-chips">
          <select value={city} onChange={(e) => setCity(e.target.value)} aria-label="City" className={city ? "on" : ""}>
            <option value="">All India</option>
            {[...new Set([city, ...cities].filter(Boolean))].map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}
          </select>
          {FOCUS.map(([k]) => <button key={k} className={focus === k ? "on" : ""} aria-pressed={focus === k} onClick={() => { setFocus(focus === k ? "" : k); native.haptic(); }}>{k}</button>)}
        </div>
      </header>

      {savedRows.length > 0 && !q && !focus && (
        <div className="pa-saved-row">
          <p className="pa-label">Saved</p>
          <div>{savedRows.map((r) => <a key={r.s} href={`#/physio/${r.s}`}><Avatar name={r.n} image={r.i} size={52} /><small>{r.n.replace(/^Dr\.?\s*/, "").split(" ")[0]}</small></a>)}</div>
        </div>
      )}

      {!rows ? <><Skeleton /><Skeleton /><Skeleton /></> : (
        <>
          <p className="pa-label">{list.length.toLocaleString("en-IN")} {city ? `in ${titleCase(city)}` : "across India"}</p>
          <div className="pa-people">
            {list.slice(0, limit).map((r) => (
              <a key={r.s} href={`#/physio/${r.s}`} className="pa-person">
                <Avatar name={r.n} image={r.i} size={48} />
                <span className="grow">
                  <b>{r.n} <Tick size={14} /></b>
                  <small>{shortDegree(r.g)}{r.y ? ` · ${r.y} yrs` : ""}</small>
                  <small>{[localityOf(r), r.sp.find((x) => !/^physiotherap/i.test(x))].filter(Boolean).join(" · ") || r.p}</small>
                </span>
                {saved.includes(r.s) && <Icon name="bookmark" size={16} className="pa-saved-ic" />}
              </a>
            ))}
          </div>
          {!list.length && <Empty icon="search" title="No one matches yet">Try another area, or clear the filters.</Empty>}
          {list.length > limit && <Btn kind="quiet" onClick={() => setLimit(limit + 24)}>Show more</Btn>}
        </>
      )}
    </Screen>
  );
}

export function Peer({ slug }: { slug: string }) {
  const { saved } = useStore();
  const [r, setR] = useState<Row | null | undefined>();
  useEffect(() => { physios().then((d) => setR(d.find((x) => x.s === slug) ?? null)); }, [slug]);
  if (r === undefined) return <Screen backTo="#/network"><Skeleton lines={5} /></Screen>;
  if (!r) return <Screen backTo="#/network"><Empty icon="users" title="Profile not found" /></Screen>;
  const on = saved.includes(r.s);
  const url = new URL(`/physio/${r.s}/`, location.origin).href;
  const toggle = () => { set((s) => ({ saved: on ? s.saved.filter((x) => x !== r.s) : [...s.saved, r.s] })); native.haptic(on ? "light" : "success"); };

  return (
    <Screen backTo="#/network" action={<button className={`pa-icon-btn ${on ? "on" : ""}`} onClick={toggle} aria-pressed={on} aria-label={on ? "Remove from saved" : "Save"}><Icon name="bookmark" size={20} /></button>}
      dock={<div className="pa-two"><Btn kind="secondary" icon="eye" onClick={() => native.open(url)}>Full profile</Btn><Btn icon="share" onClick={() => native.share(url, `I'd recommend ${r.n} for your treatment. Their profile on betterhood:`)}>Refer a patient</Btn></div>}>
      <div className="pa-peer">
        <Avatar name={r.n} image={r.i} size={96} ring />
        <h1 className="pa-h" tabIndex={-1} data-autofocus>{r.n}</h1>
        <p>{shortDegree(r.g)}{r.y ? ` · ${r.y} yrs` : ""}</p>
        <span className="pa-pf-verified"><Tick size={15} />Verified by Betterhood</span>
      </div>
      <div className="pa-facts">
        <div><Icon name="pin" size={18} /><span><small>Practice</small>{[localityOf(r), titleCase(r.c) || r.p].filter(Boolean).join(", ") || "India"}</span></div>
        {r.m.length > 0 && <div><Icon name="users" size={18} /><span><small>Sees patients</small>{r.m.join(" · ")}</span></div>}
        {r.f && <div><Icon name="flag" size={18} /><span><small>Consultation</small>From ₹{r.f}</span></div>}
      </div>
      {r.sp.length > 0 && <><p className="pa-label">Specialities</p><div className="pa-chips static">{r.sp.map((x) => <span key={x}>{x}</span>)}</div></>}
      <p className="pa-fine">Referrals are shared as a link. No patient details leave your phone.</p>
    </Screen>
  );
}

