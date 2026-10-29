// Assessment catalogue: which form, which result pages, and how the old Gravity Forms totals map to outcomes.
export type Cat = "muscle" | "nerve" | "bone" | "joint";
export type AreaKey = "back" | "neck" | "shoulder" | "knee";

export interface PainAssessment {
  kind: "pain";
  slug: string;
  area: AreaKey;
  title: string;
  totals: Record<number, Cat>;
  results: Record<Cat, string>;
  conditions: Record<Cat, string>;
}
export interface HealthAssessment {
  kind: "health" | "longevity";
  slug: string;
  area: AreaKey | "overall";
  title: string;
}
export type Assessment = PainAssessment | HealthAssessment;

const T = { 14: "muscle", 40: "nerve", 41: "bone", 42: "joint" } as const;

export const assessments: Assessment[] = [
  {
    kind: "pain", slug: "assessment-knee-pain-level-1", area: "knee", title: "Knee Pain", totals: T,
    results: { muscle: "result-knee-pain-muscular-imbalance-muscle", nerve: "result-knee-pain-bursitis-nerve", bone: "result-knee-pain-patellar-instability-bone", joint: "result-knee-pain-osteoarthritis-joint" },
    conditions: { muscle: "Muscular Imbalance", nerve: "Bursitis", bone: "Patellar Instability", joint: "Osteoarthritis" },
  },
  {
    kind: "pain", slug: "assessment-neck-pain-level-1", area: "neck", title: "Neck Pain", totals: T,
    results: { muscle: "result-neck-pain-muscular-imbalance-muscle", nerve: "result-neck-pain-compressed-nerves-nerve", bone: "result-neck-pain-cervical-instability-bone", joint: "result-neck-pain-osteoarthritis-joint" },
    conditions: { muscle: "Muscular Imbalance", nerve: "Compressed Nerves", bone: "Cervical Instability", joint: "Osteoarthritis" },
  },
  {
    kind: "pain", slug: "assessment-shoulder-pain-level-1", area: "shoulder", title: "Shoulder Pain", totals: T,
    results: { muscle: "result-shoulder-pain-rotator-cuff-tendinopathy", nerve: "result-shoulder-pain-frozen-shoulder-nerve", bone: "result-shoulder-pain-shoulder-instability-bone", joint: "result-shoulder-pain-osteoarthritis-in-shoulder-joint" },
    conditions: { muscle: "Rotator Cuff Tendinopathy", nerve: "Frozen Shoulder", bone: "Shoulder Instability", joint: "Osteoarthritis in Shoulder" },
  },
  {
    kind: "pain", slug: "assessment-lower-back-pain", area: "back", title: "Lower Back Pain", totals: T,
    results: { muscle: "result-lower-back-pain-muscle", nerve: "result-lower-back-pain-nerve", bone: "result-lower-back-pain-bone-health", joint: "result-lower-back-pain-joint-health" },
    conditions: { muscle: "Muscular Imbalance", nerve: "Nerve Compression", bone: "Bone Health", joint: "Joint Health" },
  },
  { kind: "health", slug: "assessment-knee-health-level-2", area: "knee", title: "Knee Health" },
  { kind: "health", slug: "assessment-neck-health-level-2", area: "neck", title: "Neck Health" },
  { kind: "health", slug: "assessment-shoulder-health-level-2", area: "shoulder", title: "Shoulder Health" },
  { kind: "health", slug: "assessment-back-health", area: "back", title: "Back Health" },
  { kind: "longevity", slug: "assessment-longevity-goals", area: "overall", title: "Longevity Goals" },
];

export const bySlug = (slug: string) => assessments.find((a) => a.slug === slug)!;
export const painFor = (area: AreaKey) => assessments.find((a) => a.kind === "pain" && a.area === area) as PainAssessment;
export const healthFor = (area: AreaKey) => assessments.find((a) => a.kind === "health" && a.area === area) as HealthAssessment;

export const resultPages = assessments.flatMap((a) =>
  a.kind === "pain" ? (Object.entries(a.results) as [Cat, string][]).map(([cat, slug]) => ({ slug, cat, assessment: a })) : [],
);

export const cornerSlugs: Record<AreaKey | "overall", string> = {
  back: "better-you-corner-back-health",
  neck: "better-you-corner-neck-health",
  shoulder: "better-you-corner-shoulder-health",
  knee: "better-you-corner-knee-health",
  overall: "betteryou-corner-overall-skeletomuscular-health",
};
