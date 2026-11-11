// Area → city mapping for the physio directory, shared by astro.config.mjs (redirects) and the city pages.
//
// The old site had one archive per neighbourhood at /learn/physio_location/{city}-{area}/. Those pages are now
// merged into their city page (/learn/physio-city/{city}/), where the area is a filter instead of a page.
// Why: docs/physio-city-pages.md.
//
// Pure functions over the taxonomy/physio data so they work both in Node config and in Astro pages.

/** WordPress archives show 5 entries per page; /page/N/ URLs exist on the live site up to ceil(count / 5). */
export const LIVE_PER_PAGE = 5;

/** City slug an area belongs to: the longest city slug that prefixes it ("navi-mumbai-vashi" → "navi-mumbai"). */
export function areaCity(areaSlug, citySlugs) {
  if (citySlugs.includes(areaSlug)) return areaSlug; // e.g. area "bangalore" = the whole city
  return citySlugs.filter((c) => areaSlug.startsWith(c + "-")).sort((a, b) => b.length - a.length)[0];
}

/** The area part of the slug, used in the city page filter (?area=ambawadi / #area-ambawadi). */
export function areaKey(areaSlug, citySlug) {
  return citySlug && areaSlug.startsWith(citySlug + "-") ? areaSlug.slice(citySlug.length + 1) : "";
}

/**
 * Redirects for every old area archive (and its /page/N/), plus /page/N/ of each city archive.
 * Areas with physios land on the city page with that area pre-selected; empty or city-wide areas land on the
 * plain city page.
 */
export function locationRedirects(taxonomies, physios) {
  const cities = taxonomies["physio-city"].map((c) => c.slug);
  const live = new Map();
  for (const p of physios) for (const a of p.area || []) live.set(a, (live.get(a) || 0) + 1);
  const out = {};
  const pages = (base, count, to) => {
    for (let n = 2; n <= Math.ceil(count / LIVE_PER_PAGE); n++) out[`${base}/page/${n}`] = to;
  };
  for (const a of taxonomies.physio_location) {
    const city = areaCity(a.slug, cities);
    const key = areaKey(a.slug, city);
    const to = !city ? "/physio-directory/" : key && live.get(a.slug) ? `/learn/physio-city/${city}/?area=${key}` : `/learn/physio-city/${city}/`;
    out[`/learn/physio_location/${a.slug}`] = to;
    pages(`/learn/physio_location/${a.slug}`, a.count, to);
  }
  for (const c of taxonomies["physio-city"]) pages(`/learn/physio-city/${c.slug}`, c.count, `/learn/physio-city/${c.slug}/`);
  return out;
}
