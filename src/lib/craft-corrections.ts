import { z } from 'zod';

export const craftRecordIdSchema = z
  .string()
  .max(200)
  .regex(/^(community|fabric|artists|heritage|ethnic|products):[a-zA-Z0-9_-]+$/);
export const MAX_CRAFT_IMAGES = 8;
export const craftImageSchema = z.object({
  url: z
    .string()
    .max(2000)
    .url()
    .refine((url) => /^https?:\/\//i.test(url), 'ลิงก์ภาพไม่ถูกต้อง'),
  caption: z.string().trim().max(300),
  credit: z.string().trim().max(300),
});
export type CraftImage = z.infer<typeof craftImageSchema>;
export const craftEditSchema = z.object({
  images: z.array(craftImageSchema).max(MAX_CRAFT_IMAGES).optional(),
  description: z.string().trim().max(15000),
  practice: z.string().trim().max(1000),
  technique: z.string().trim().max(5000),
  lifestyle: z.string().trim().max(5000),
  referenceUrl: z
    .string()
    .trim()
    .max(2000)
    .refine(
      (value) => !value || (z.url().safeParse(value).success && /^https?:\/\//i.test(value)),
      'กรุณาใส่ลิงก์อ้างอิง http หรือ https'
    ),
});
export type CraftEdit = z.infer<typeof craftEditSchema>;
export const CRAFT_EDIT_LABELS: Record<keyof CraftEdit, string> = {
  images: 'ภาพประกอบ',
  description: 'รายละเอียด',
  practice: 'พื้นที่ปฏิบัติ / ชุมชน',
  technique: 'เทคนิคและภูมิปัญญา',
  lifestyle: 'การสืบทอดและวิถีชีวิต',
  referenceUrl: 'ลิงก์อ้างอิงเพิ่มเติม',
};
export const craftSubmissionSchema = z.object({
  recordId: craftRecordIdSchema,
  values: craftEditSchema,
  reason: z.string().trim().min(1, 'กรุณาระบุเหตุผลหรือข้อมูลที่เพิ่มเติม').max(3000),
  revision: z.string().datetime({ offset: true }).nullable(),
});
