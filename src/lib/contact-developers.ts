import { z } from 'zod';

export const DEVELOPERS_SECTION_KEY = 'contact-developers';
const webUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((value) => {
    if (!value) return true;
    try {
      return ['https:', 'http:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, 'กรุณากรอก URL ที่ขึ้นต้นด้วย https:// หรือ http://');
export const developersSchema = z.object({
  developers: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        name: z.string().trim().min(1, 'กรุณากรอกชื่อ').max(120),
        role: z.string().trim().max(160),
        bio: z.string().trim().max(1000),
        imageUrl: webUrl,
        email: z.union([z.literal(''), z.string().trim().email('อีเมลไม่ถูกต้อง').max(254)]),
        website: webUrl,
        github: webUrl,
        isPublished: z.boolean(),
      })
    )
    .max(30),
});
export type Developer = z.infer<typeof developersSchema>['developers'][number];
