import { z } from "zod";

// ─── Block type enum ─────────────────────────────────────────────────────────

export const BlockType = {
  hero: "hero",
  services: "services",
  richText: "richText",
  contact: "contact",
} as const;

export type BlockType = (typeof BlockType)[keyof typeof BlockType];

// ─── Per-block prop schemas ───────────────────────────────────────────────────

export const HeroPropsSchema = z.object({
  heading: z.string().min(1),
  subheading: z.string().optional().default(""),
  ctaText: z.string().optional().default(""),
  ctaHref: z.string().optional().default(""),
  backgroundImageKey: z.string().optional(),
});

export const ServicesPropsSchema = z.object({
  title: z.string().min(1),
  serviceIds: z.array(z.string()),
  showPrices: z.boolean().default(true),
});

export const RichTextPropsSchema = z.object({
  html: z.string(),
});

export const ContactPropsSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  mapEnabled: z.boolean().default(false),
});

// ─── Discriminated block schema ───────────────────────────────────────────────

export const BlockSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string(), type: z.literal("hero"), props: HeroPropsSchema }),
  z.object({
    id: z.string(),
    type: z.literal("services"),
    props: ServicesPropsSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("richText"),
    props: RichTextPropsSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("contact"),
    props: ContactPropsSchema,
  }),
]);

export const BlocksArraySchema = z.array(BlockSchema);

export type Block = z.infer<typeof BlockSchema>;
export type HeroProps = z.infer<typeof HeroPropsSchema>;
export type ServicesProps = z.infer<typeof ServicesPropsSchema>;
export type RichTextProps = z.infer<typeof RichTextPropsSchema>;
export type ContactProps = z.infer<typeof ContactPropsSchema>;

// ─── Parse helper ─────────────────────────────────────────────────────────────

export function parseBlocks(json: unknown): Block[] {
  const result = BlocksArraySchema.safeParse(json);
  if (!result.success) return [];
  return result.data;
}
