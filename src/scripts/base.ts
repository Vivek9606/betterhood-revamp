// Site-relative links built in the browser. The build serves the site from a sub-path on GitHub Pages
// (/betterhood-revamp/) and rewrites links in the HTML, but it can't see URLs made at runtime.
// Base.astro has <meta name="bh-base" content="/">, which that rewrite turns into the real base.
export function href(path: string): string {
  const base = (document.querySelector<HTMLMetaElement>('meta[name="bh-base"]')?.content || "/").replace(/\/+$/, "");
  if (!base || !path.startsWith("/") || path === base || path.startsWith(`${base}/`)) return path;
  return `${base}${path}`;
}
