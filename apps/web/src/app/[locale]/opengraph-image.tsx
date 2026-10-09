import { routing } from "@/i18n/routing";
import { OG_SIZE, ogCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Rasa Prompt — tested AI prompts";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Image() {
  return ogCard({
    kicker: "Tested prompt library",
    title: "Prompts that actually work",
    meta: "ChatGPT • Claude • Gemini • Midjourney • Flux",
  });
}
