// Brand-wide constants: contact details, navigation, shop links, offers.
export const SHOP = "https://shop.betterhood.in";
export const PRODUCT_BASE = `${SHOP}/products/`;

// Uploads keep their WordPress paths and are served from public/wp-content/uploads (npm run mirror:media).
// Set PUBLIC_MEDIA_ORIGIN (e.g. https://betterhood.in or a CDN) to load them from elsewhere instead.
export const MEDIA_ORIGIN: string = import.meta.env.PUBLIC_MEDIA_ORIGIN || "";

export const media = (src = "") =>
  src.startsWith("/wp-content/") ? MEDIA_ORIGIN + src : src;

export const mediaHtml = (html = "") =>
  MEDIA_ORIGIN ? html.replace(/(["'(])\/wp-content\//g, `$1${MEDIA_ORIGIN}/wp-content/`) : html;

export const contact = {
  phone: "+91 84848 05885",
  phoneHref: "tel:+918484805885",
  email: "care@betterhood.in",
  whatsapp: "https://api.whatsapp.com/send?phone=917483305929&text=Hi",
  whatsappCommunity: "https://chat.whatsapp.com/CJ3Rt2tK9Fg97Nu1b2rFT7",
  address: "1st Floor, 52, SPD Plaza, 4th A Cross Road, Near Jyothi Nivas College, Koramangala, Bengaluru, Karnataka, 560034",
  registered: "Agebetter Solutions Private Limited, 1st floor, SPD Plaza, Koramangala Industrial Layout, 5th Block, Koramangala, Bengaluru, Karnataka 560034",
  corporate: "17th IAS Layout, 1st cross Road, Kasavanahalli, Bengaluru, Karnataka 560035",
  trackOrder: "https://www.delhivery.com/tracking",
};

export const socials = [
  { name: "Instagram", href: "https://www.instagram.com/betterhood.in", icon: "instagram" },
  { name: "YouTube", href: "https://www.youtube.com/@mybetterhood?utm_source=Website&utm_medium=Organic&utm_id=BH21", icon: "youtube" },
  { name: "LinkedIn", href: "https://www.linkedin.com/company/betterhood-in/", icon: "linkedin" },
  { name: "Facebook", href: "https://www.facebook.com/betterhood.in", icon: "facebook" },
];

export const offers = [
  "10% off orders above ₹2,999 — code betterhood10",
  "🚀 Express Pan-India Delivery in 2–4 Days",
  "Physio-Trusted Pain Care",
  "🎁 Guaranteed FREE GIFT at Checkout",
  "Certified By The Indian Association Of Physiotherapist",
  "🛍️ Buy 3 Get 1 FREE - Sitewide",
];

const c = (slug: string) => `${SHOP}/collections/${slug}`;

export const shopByConcern = [
  { label: "Back Pain Relief", href: c("back-pain"), icon: "back" },
  { label: "Neck Pain & Tech Neck", href: c("neck-pain"), icon: "neck" },
  { label: "Knee Pain Relief", href: c("knee-pain"), icon: "knee" },
  { label: "Sciatica Relief", href: c("sciatica"), icon: "nerve" },
  { label: "Frozen Shoulder Relief", href: c("shoulder-neck"), icon: "shoulder" },
  { label: "Slip Disc Management", href: c("slip-disc"), icon: "spine" },
  { label: "Spondylosis Care", href: c("spondylosis"), icon: "spine" },
  { label: "Carpal Tunnel Relief", href: c("carpal-tunnel-relief"), icon: "wrist" },
  { label: "Tennis Elbow Relief", href: c("tennis-elbow-relief"), icon: "elbow" },
];
export const shopByUseCase = [
  { label: "Long Drive Spine Care", href: c("long-drive-spine-care"), icon: "car" },
  { label: "Gym Support Essentials", href: c("gym"), icon: "gym" },
  { label: "Badminton Player", href: c("badminton-essentials"), icon: "racket" },
  { label: "Working Desk Ergonomic", href: c("desk-ergonomic"), icon: "desk" },
  { label: "Parent Care Gift", href: c("parents-wellness"), icon: "gift" },
];
export const shopByCategory = [
  { label: "Driving Posture", href: c("car-cushions") },
  { label: "Seating Posture", href: c("chair-cushions") },
  { label: "Sleeping Posture", href: c("cervical-pillows") },
  { label: "Support Insoles", href: c("insoles") },
  { label: "Pain Relief & Recovery", href: c("pain-relief-recovery") },
  { label: "Orthotic Supports", href: c("orthotics") },
];
export const shopAll = c("all");
export const shopLinks = { concerns: c("concerns"), useCase: c("use-case"), category: c("shop-by-category") };

export const careTools = [
  { label: "Pain Assessments", href: "/quiz-landing-page/", desc: "A 5-minute, physio-designed check of your back, neck, shoulder or knee pain.", icon: "clipboard" },
  { label: "Slouch Catcher", href: "/slouch-catcher/", desc: "Catch a friend slouching and reveal their posture animal.", icon: "camera" },
  { label: "Physio Directory", href: "/physio-directory/", desc: "Find betterhood-certified physiotherapists near you.", icon: "map" },
  { label: "PhysioEdge Course", href: "/physioedge-course/", desc: "Certification in preventive pain care for physiotherapists.", icon: "award" },
];

export const mainNav = [
  { label: "Shop", href: shopAll, mega: "shop" },
  { label: "Care Tools", href: "/quiz-landing-page/", mega: "tools" },
  { label: "Learn", href: "/learn/" },
  { label: "betterYou corner", href: "/better-you-corner-back-health/" },
  { label: "About", href: "/about-us/" },
];

export const footerNav = [
  {
    title: "Shop",
    links: [
      { label: "Shop by Concern", href: shopLinks.concerns },
      { label: "Shop by Use Case", href: shopLinks.useCase },
      { label: "Shop by Category", href: shopLinks.category },
      { label: "All Products", href: shopAll },
    ],
  },
  {
    title: "Care",
    links: [
      { label: "Pain Assessments", href: "/quiz-landing-page/" },
      { label: "Physio Directory", href: "/physio-directory/" },
      { label: "PhysioEdge Course", href: "/physioedge-course/" },
      { label: "Longevity Toolkit", href: "/longevity-toolkit/" },
      { label: "Corporate Wellness", href: "/corporate-wellness/" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Expert-Led Articles", href: "/learn/" },
      { label: "Wellness Hub", href: "/wellness-hub/" },
      { label: "Track Your Order", href: contact.trackOrder },
      { label: "Contact Us", href: "/contact-us/" },
      { label: "About Us", href: "/about-us/" },
    ],
  },
  {
    title: "Policies",
    links: [
      { label: "Terms & Conditions", href: "/terms-of-services/" },
      { label: "Shipping Policy", href: "/shipping-policy/" },
      { label: "Returns Policy", href: "/return-policy/" },
      { label: "Privacy Policy", href: "/privacy-policy/" },
      { label: "Equal Employment Opportunity", href: "/equal-employment-opportunity-eeo-policy/" },
    ],
  },
];

// The four body areas the assessments, protocols and betterYou corner are built around.
export const areas = [
  { key: "back", name: "Back", label: "Back Pain", assessment: "/assessment-lower-back-pain/", health: "/assessment-back-health/", corner: "/better-you-corner-back-health/", protocols: "/back-health-protocols/", concern: "back-pain", shop: c("back-pain"), stat: "Timely action can prevent 80% of back surgeries", img: "/wp-content/uploads/2024/12/bp-1.webp" },
  { key: "neck", name: "Neck", label: "Neck Pain", assessment: "/assessment-neck-pain-level-1/", health: "/assessment-neck-health-level-2/", corner: "/better-you-corner-neck-health/", protocols: "/neck-protocols/", concern: "neck-pain", shop: c("neck-pain"), stat: "Persistent neck pain could signal nerve damage", img: "" },
  { key: "shoulder", name: "Shoulder", label: "Shoulder Pain", assessment: "/assessment-shoulder-pain-level-1/", health: "/assessment-shoulder-health-level-2/", corner: "/better-you-corner-shoulder-health/", protocols: "/shoulder-protocols/", concern: "shoulder-pain", shop: c("shoulder-neck"), stat: "Long-term shoulder pain risks serious tendon injury", img: "" },
  { key: "knee", name: "Knee", label: "Knee Pain", assessment: "/assessment-knee-pain-level-1/", health: "/assessment-knee-health-level-2/", corner: "/better-you-corner-knee-health/", protocols: "/knee-protocols/", concern: "knee-pain", shop: c("knee-pain"), stat: "Chronic knee pain often indicates arthritis", img: "" },
] as const;

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
