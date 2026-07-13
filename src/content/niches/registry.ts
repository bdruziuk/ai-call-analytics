import type { NicheDefinition } from "./types";
import { cafe } from "./cafe";
import { bar } from "./bar";
import { pizzeria } from "./pizzeria";
import { hotel } from "./hotel";
import { foodDelivery } from "./food-delivery";
import { darkKitchen } from "./dark-kitchen";

/** All niches served by the dynamic /{lang}/{slug} route.
 *  "restaurant" is intentionally excluded — it has its own static route
 *  (src/app/[lang]/restaurant) backed by the shared `landing` dictionary. */
export const niches: NicheDefinition[] = [cafe, bar, pizzeria, hotel, foodDelivery, darkKitchen];

export const nicheSlugs: string[] = niches.map((n) => n.slug);

export const getNicheBySlug = (slug: string): NicheDefinition | undefined =>
  niches.find((n) => n.slug === slug);
