import * as z from 'zod';

export const CreatorArticleSchema = z.object({
  id: z.string(),
  categoryKey: z.string().min(1, { message: 'กรุณาเลือกหมวดหมู่' }),
  categoryLabel: z.string(),
  title: z.string().trim().min(1, { message: 'กรุณากรอกชื่อบทความ' }),
  excerpt: z.string().trim().min(1, { message: 'กรุณากรอกคำโปรย' }),
  coverImageUrl: z
    .string()
    .trim()
    .refine((value) => !value || /^https?:\/\//i.test(value), {
      message: 'Cover image URL ต้องขึ้นต้นด้วย http:// หรือ https://',
    }),
  contentHtml: z.string().trim().min(1, { message: 'กรุณาเขียนเนื้อหาบทความ' }),
});

export type CreatorArticleFormValues = z.infer<typeof CreatorArticleSchema>;

export const CreatorProfileSchema = z.object({
  displayName: z.string().trim().min(1, { message: 'กรุณากรอกชื่อที่แสดง' }),
  bio: z.string(),
  phone: z.string(),
  websiteUrl: z
    .string()
    .trim()
    .refine((value) => !value || /^https?:\/\//i.test(value), {
      message: 'Website URL ต้องขึ้นต้นด้วย http:// หรือ https://',
    }),
  facebookUrl: z
    .string()
    .trim()
    .refine((value) => !value || /^https?:\/\//i.test(value), {
      message: 'Facebook URL ต้องขึ้นต้นด้วย http:// หรือ https://',
    }),
  avatarUrl: z
    .string()
    .trim()
    .refine((value) => !value || /^https?:\/\//i.test(value), {
      message: 'Avatar URL ต้องขึ้นต้นด้วย http:// หรือ https://',
    }),
});

export type CreatorProfileFormValues = z.infer<typeof CreatorProfileSchema>;

export const CreatorPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'กรุณากรอกรหัสผ่านเดิม' }),
    newPassword: z.string().min(6, { message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' }),
    confirmPassword: z.string().min(1, { message: 'กรุณายืนยันรหัสผ่านใหม่' }),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'รหัสผ่านใหม่และการยืนยันไม่ตรงกัน',
  });

export type CreatorPasswordFormValues = z.infer<typeof CreatorPasswordSchema>;

export const emptyArticleValues: CreatorArticleFormValues = {
  id: '',
  categoryKey: '',
  categoryLabel: '',
  title: '',
  excerpt: '',
  coverImageUrl: '',
  contentHtml: '',
};

export const emptyProfileValues: CreatorProfileFormValues = {
  displayName: '',
  bio: '',
  phone: '',
  websiteUrl: '',
  facebookUrl: '',
  avatarUrl: '',
};

export const emptyPasswordValues: CreatorPasswordFormValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};
