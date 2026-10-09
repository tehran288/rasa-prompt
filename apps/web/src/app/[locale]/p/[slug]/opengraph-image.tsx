import { getPrompt } from "@/lib/data";
import { OG_SIZE, ogCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Rasa Prompt";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const p = await getPrompt(decodeURIComponent(slug), "en");
  if (!p) return ogCard({ kicker: "Prompt", title: "Rasa Prompt" });
  const price = p.tier === "free" ? "Free" : `${p.priceStars} Stars`;
  return ogCard({
    kicker: `${p.tier} • ${p.type} • score ${p.score}`,
    title: p.title,
    meta: `${p.models.join(" • ")} • ${price}`,
  });
}
