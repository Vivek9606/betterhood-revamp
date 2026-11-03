// Raster brand images that search engines and social apps need (SVG isn't accepted everywhere):
//   public/img/og-home.jpg        1200x630 share card for the homepage (og:image / twitter:image)
//   public/img/logo-512.png       square logo for Organization structured data
//   public/apple-touch-icon.png   180x180, public/icon-192.png, public/icon-512.png
// Run: node scripts/make-brand-images.mjs
import fs from "node:fs";
import sharp from "sharp";

const fav = fs.readFileSync("public/favicon.svg");
await sharp(fav, { density: 600 }).resize(512, 512, { fit: "contain", background: "#00000000" }).png().toFile("public/icon-512.png");
await sharp(fav, { density: 300 }).resize(192, 192, { fit: "contain", background: "#00000000" }).png().toFile("public/icon-192.png");
// iOS ignores transparency, so the touch icon sits on the brand plum
await sharp(fav, { density: 300 }).resize(150, 150, { fit: "contain", background: "#5e1951" }).extend({ top: 15, bottom: 15, left: 15, right: 15, background: "#5e1951" }).flatten({ background: "#5e1951" }).png().toFile("public/apple-touch-icon.png");
await sharp(fav, { density: 600 }).resize(512, 512, { fit: "contain", background: "#ffffff" }).flatten({ background: "#ffffff" }).png().toFile("public/img/logo-512.png");

// share card: the homepage hero photo on the right, headline + logo on the plum left
const W = 1200, H = 630;
const hero = await sharp("public/wp-content/uploads/Home-page-banner-30july-02-02.webp")
  .resize({ height: H, width: Math.round((1920 / 676) * H) })
  .extract({ left: Math.round((1920 / 676) * H) - 640, top: 0, width: 640, height: H })
  .toBuffer();
const logo = await sharp("public/img/logo.svg", { density: 400 }).resize({ width: 300 }).toBuffer().catch(() => null);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const text = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0.55" stop-color="#2a0f31"/><stop offset="0.75" stop-color="#2a0f31" stop-opacity="0"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <text x="72" y="270" font-family="Segoe UI, Arial, sans-serif" font-weight="700" font-size="62" fill="#ffffff">${esc("Physio trusted")}</text>
  <text x="72" y="345" font-family="Segoe UI, Arial, sans-serif" font-weight="700" font-size="62" fill="#ffffff">${esc("pain care for")}</text>
  <text x="72" y="420" font-family="Segoe UI, Arial, sans-serif" font-weight="700" font-style="italic" font-size="62" fill="#ffb547">${esc("everyday movement")}</text>
  <text x="72" y="490" font-family="Segoe UI, Arial, sans-serif" font-size="27" fill="#e9dbe6">${esc("To move better. Recover better. Stay active for longer")}</text>
  <rect x="72" y="532" rx="22" width="300" height="44" fill="#ffb547"/>
  <text x="222" y="561" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="700" font-size="20" fill="#240c2c">40K+ happy customers</text>
</svg>`;
const layers = [{ input: hero, left: W - 640, top: 0 }, { input: Buffer.from(text), left: 0, top: 0 }];
if (logo) {
  // logo.svg is plum on transparent; turn it white for the dark card
  const white = await sharp(logo).ensureAlpha().composite([{ input: { create: { width: 1, height: 1, channels: 4, background: "#ffffff" } }, tile: true, blend: "in" }]).toBuffer();
  layers.push({ input: white, left: 72, top: 92 });
}
await sharp({ create: { width: W, height: H, channels: 3, background: "#2a0f31" } }).composite(layers).jpeg({ quality: 86, mozjpeg: true }).toFile("public/img/og-home.jpg");
console.log("brand images written");
