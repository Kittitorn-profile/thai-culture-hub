import { z } from 'zod';

export const HOME_HERO_SECTION_KEY = 'hero-images';
export const MAX_HERO_IMAGES = 20;
const imageUrl = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .refine((value) => {
    if (/^\/assets\/[a-zA-Z0-9/_ .-]+$/.test(value)) return true;
    try {
      return ['https:', 'http:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, 'กรุณาระบุ URL รูปภาพที่ถูกต้อง');
export const homeHeroSchema = z.object({
  images: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(100),
        imageUrl,
        alt: z.string().trim().min(1, 'กรุณาใส่คำอธิบายภาพ').max(200),
        isActive: z.boolean(),
      })
    )
    .max(MAX_HERO_IMAGES)
    .refine(
      (images) => new Set(images.map((item) => item.id)).size === images.length,
      'รหัสภาพซ้ำกัน'
    ),
});
export type HomeHeroImage = z.infer<typeof homeHeroSchema>['images'][number];
export const DEFAULT_HERO_IMAGES: HomeHeroImage[] = [
  {
    id: 'default-hero',
    imageUrl: '/assets/th-hub/hub-bg.png',
    alt: 'ศิลปะและการแสดงวัฒนธรรมไทย',
    isActive: true,
  },
];
export function parseHeroImages(content: unknown): HomeHeroImage[] {
  const result = homeHeroSchema.safeParse(content);
  return result.success ? result.data.images : DEFAULT_HERO_IMAGES;
}
