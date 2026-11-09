import { z } from 'zod';

import provinces from 'src/data/thailand-culture/provinces';
import { COMMUNITY_GROUPS } from 'src/lib/cultural-data-groups';

export const COMMUNITY_EDITS_KEY = 'community-heritage-edits-v1';
export const communityHeritageSchema = z.object({
  id: z.string().min(1).max(150).optional(),
  removeImage: z.boolean().optional(),
  imageCredit: z.string().trim().max(200).optional(),
  imageSourceUrl: z
    .union([
      z.literal(''),
      z
        .string()
        .trim()
        .url('กรุณาระบุลิงก์ที่มาของภาพให้ถูกต้อง')
        .refine((value) => /^https?:\/\//.test(value), 'ใช้ http:// หรือ https://'),
    ])
    .optional(),
  group: z.enum(COMMUNITY_GROUPS.map((group) => group.key)),
  name: z.string().trim().min(1, 'กรุณาระบุชื่อ').max(300),
  province: z
    .string()
    .refine((value) => provinces.some((p) => p.name === value), 'กรุณาเลือกจังหวัด'),
  practice: z.string().trim().max(1000),
  description: z.string().trim().min(1, 'กรุณาระบุเรื่องราว').max(10000),
  technique: z.string().trim().max(10000),
  lifestyle: z.string().trim().max(10000),
  organization: z.string().trim().min(1, 'กรุณาระบุผู้เผยแพร่ข้อมูล').max(500),
  sourceUrl: z
    .string()
    .url('กรุณาระบุลิงก์แหล่งข้อมูล')
    .refine((value) => /^https?:\/\//.test(value), 'ใช้ http:// หรือ https://'),
});
export type CommunityHeritageValues = z.infer<typeof communityHeritageSchema>;

export const communityHeritageFormSchema = communityHeritageSchema
  .extend({
    image: z.custom<File | string | null>(
      (value) =>
        value == null ||
        typeof value === 'string' ||
        (typeof File !== 'undefined' &&
          value instanceof File &&
          value.size > 0 &&
          value.size <= 2 * 1024 * 1024 &&
          ['image/jpeg', 'image/png', 'image/webp'].includes(value.type)),
      'รองรับ JPG, PNG หรือ WebP ไม่เกิน 2 MB'
    ),
  })
  .superRefine((value, ctx) => {
    if (value.image && !value.imageCredit?.trim())
      ctx.addIssue({ code: 'custom', path: ['imageCredit'], message: 'กรุณาระบุเครดิตภาพ' });
  });
export type CommunityHeritageFormValues = z.infer<typeof communityHeritageFormSchema>;
