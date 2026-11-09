import { z } from 'zod';

const requiredText = z
  .string()
  .trim()
  .min(1, 'กรุณาระบุข้อมูล')
  .max(200, 'ระบุได้ไม่เกิน 200 ตัวอักษร');
const httpUrl = z
  .string()
  .trim()
  .url('กรุณาระบุ URL ให้ถูกต้อง')
  .refine((value) => /^https?:\/\//.test(value), 'ใช้ลิงก์ http:// หรือ https://');
export const artistBirthDateSchema = z.string().refine((value) => {
  if (!value) return true;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value <=
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date())
  );
}, 'กรุณาระบุวันเกิดที่ถูกต้องและไม่เกินวันนี้');

export const culturalArtistFormSchema = z
  .object({
    name: requiredText,
    aliases: z.string(),
    types: z
      .array(
        z.enum([
          'national_artist',
          'contemporary_artist',
          'silpathorn_artist',
          'folk_artist',
          'local_artist',
          'performing_artist',
        ])
      )
      .min(1, 'กรุณาเลือกประเภทศิลปิน'),
    fields: requiredText,
    genres: z.string(),
    birthDate: artistBirthDateSchema.nullable(),
    sourceUrl: httpUrl,
    provinceCode: z.string(),
    relationship: z.enum(['birthplace', 'origin', 'work_area', 'learning_site', 'cultural_legacy']),
    provinceSourceUrl: z.union([z.literal(''), httpUrl]),
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
    credit: z.string().trim().max(200),
    imageSourceUrl: z.union([
      z.literal(''),
      httpUrl.refine((value) => value.startsWith('https://'), 'ใช้ลิงก์ https://'),
    ]),
  })
  .superRefine((value, ctx) => {
    if (value.provinceCode && !value.provinceSourceUrl)
      ctx.addIssue({
        code: 'custom',
        path: ['provinceSourceUrl'],
        message: 'กรุณาระบุหลักฐานความเกี่ยวข้องกับจังหวัด',
      });
    if (value.image && !value.credit)
      ctx.addIssue({ code: 'custom', path: ['credit'], message: 'กรุณาระบุเครดิตภาพ' });
  });
export type CulturalArtistFormValues = z.infer<typeof culturalArtistFormSchema>;
