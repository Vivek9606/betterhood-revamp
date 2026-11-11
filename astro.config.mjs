import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import fs from "node:fs";
import { locationRedirects } from "./src/lib/physio-locations.mjs";

const SHOP = "https://shop.betterhood.in";

// Old WordPress URLs that no longer need their own page. Everything else keeps its exact slug.
export const redirects = {
  "/home": "/",
  "/new-homepage": "/",
  "/bh-homepage": "/",
  "/shop": `${SHOP}/collections/all`,
  "/shop-2": `${SHOP}/collections/all`,
  "/cart": `${SHOP}/cart`,
  "/checkout": `${SHOP}/cart`,
  "/my-account": `${SHOP}/account`,
  "/wishlist": `${SHOP}/pages/wishlist`,
  "/affiliate": "https://chat.whatsapp.com/CJ3Rt2tK9Fg97Nu1b2rFT7",
  "/longevity-toolkit-old": "/longevity-toolkit/",
  "/wellness-hub-2": "/wellness-hub/",
  "/shopify-product-listing-test": `${SHOP}/collections/all`,
  "/shop-page-variations": `${SHOP}/collections/all`,
  "/standard-quiz-page_1a": "/quiz-landing-page/",
  "/wati-testing": "/",
  "/learn/et_tb_item_type/template": "/learn/",
  "/longevity-goals": "/longevity-goals-before/",
  // was an unfinished template on the old site (placeholder name and lorem ipsum)
  "/diagnostics-page": "/quiz-landing-page/",
  // 833 one-physio neighbourhood archives merged into their city page, plus old /page/N/ archive URLs.
  // Why: docs/physio-city-pages.md
  ...locationRedirects(
    JSON.parse(fs.readFileSync(new URL("./src/data/taxonomies.json", import.meta.url), "utf8")),
    JSON.parse(fs.readFileSync(new URL("./src/data/physios.json", import.meta.url), "utf8")),
  ),
};
const redirected = new Set(Object.keys(redirects).map((r) => r + "/"));

export default defineConfig({
  site: "https://betterhood.in",
  trailingSlash: "always",
  build: { format: "directory", inlineStylesheets: "auto" },
  redirects,
  integrations: [
    react(),
    sitemap({
      // personal result/confirmation screens and redirect stubs stay out of search
      filter: (page) => !/\/(result-|completed-message|diagnostics-page|physio-app)/.test(page) && !redirected.has(new URL(page).pathname),
    }),
  ],
  prefetch: { prefetchAll: false, defaultStrategy: "hover" },
});
