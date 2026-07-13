import type ukDict from "@/dictionaries/uk.json";
import type { Locale } from "@/lib/dictionaries";

/** Full copy for one niche landing page, in one language. Mirrors the shape
 *  of the original `landing` dictionary block so the page component can stay
 *  dictionary-agnostic. */
export type NicheLanding = typeof ukDict["landing"];

export type NicheMeta = {
  /** Short display name of the niche, e.g. "Кафе" */
  name: string;
  /** <title> — must contain the primary keyword */
  title: string;
  /** meta description — must contain the primary keyword */
  description: string;
};

export type NicheDefinition = {
  /** URL segment: /{lang}/{slug} */
  slug: string;
  /** Telephony/CRM/PMS integrations shown on this niche's page, in display order */
  integrations: string[];
  content: Record<Locale, NicheLanding>;
  meta: Record<Locale, NicheMeta>;
};
