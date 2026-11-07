import * as z from 'zod';

function isPhone(value: string) {
  if (!value) return true;
  const digits = value.replace(/\D/g, '');
  return /^\+?[\d\s()-]+$/.test(value) && digits.length >= 9 && digits.length <= 15;
}

export const ContactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: 'กรุณากรอกชื่อหรือหน่วยงาน' })
    .max(120, { error: 'ชื่อหรือหน่วยงานต้องไม่เกิน 120 ตัวอักษร' }),
  email: z
    .string()
    .trim()
    .min(1, { error: 'กรุณากรอกอีเมล' })
    .email({ error: 'รูปแบบอีเมลไม่ถูกต้อง' })
    .max(254, { error: 'อีเมลต้องไม่เกิน 254 ตัวอักษร' }),
  phone: z
    .string()
    .trim()
    .max(30, { error: 'เบอร์โทรต้องไม่เกิน 30 ตัวอักษร' })
    .refine(isPhone, { error: 'กรุณากรอกเบอร์โทรให้ถูกต้อง' }),
  area: z.string().trim().max(200, { error: 'จังหวัดหรือพื้นที่ต้องไม่เกิน 200 ตัวอักษร' }),
  message: z
    .string()
    .trim()
    .min(1, { error: 'กรุณากรอกข้อความ' })
    .max(5000, { error: 'ข้อความต้องไม่เกิน 5,000 ตัวอักษร' }),
});

export type ContactFormValues = z.infer<typeof ContactSchema>;
