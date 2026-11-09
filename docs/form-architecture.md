# โครงสร้างและมาตรฐานหน้าฟอร์ม

หน้าฟอร์มใหม่และฟอร์มที่ปรับปรุงให้ใช้ **React Hook Form + Zod + MUI** ตามแนวทางนี้ โดยใช้คอมโพเนนต์กลางของระบบ ไม่สร้างระบบจัดการฟอร์มแยกซ้ำ

## โครงสร้าง

```text
src/app/admin/<resource>/new/page.tsx        Server Component: metadata และเปิดฟอร์มสร้าง
src/app/admin/<resource>/[id]/page.tsx       Server Component: โหลดข้อมูล ตรวจไม่พบ แล้วส่งให้ฟอร์ม
src/app/admin/<resource>/...-client.tsx      Client Component: ฟอร์มร่วมสำหรับสร้างและแก้ไข
src/lib/<resource>-form.ts                  Zod schema และ type ของฟอร์ม
src/components/hook-form/                   Form, Field และ Controller wrappers กลาง
src/app/api/admin/<resource>/route.ts       ตรวจสิทธิ์ ตรวจ payload และบันทึกฐานข้อมูล
```

ตัวอย่างจริงคือ `src/app/admin/cultural-artists/new/artist-create-client.tsx` ซึ่งหน้าสร้างและหน้าแก้ไขใช้ร่วมกัน ส่วน schema อยู่ที่ `src/lib/cultural-artist-form.ts`

## การจัดการฟอร์ม

- กำหนด schema ด้วย Zod และ derive type ด้วย `z.infer` หลีกเลี่ยง type ที่เขียนซ้ำกับ schema
- สร้าง `useForm` พร้อม `zodResolver(schema)` และ `defaultValues` ให้ครบทุกช่อง
- ใช้ `<Form methods={methods} onSubmit={handleSubmit(onSubmit)}>` เพื่อให้ทุกช่องเข้าถึง FormProvider และแสดง validation ผ่าน React Hook Form
- ใช้ `Field.Text`, `Field.Select`, `Field.Upload`, `Field.DatePicker` จาก `src/components/hook-form` สำหรับช่องมาตรฐาน
- ช่องที่ต้องแปลงค่าระหว่าง UI กับ payload ให้ใช้ `Controller` เช่น Autocomplete ที่แสดงชื่อจังหวัด แต่เก็บรหัสจังหวัด
- อ่านค่าที่มีผลต่อ UI ด้วย `watch` และเปลี่ยนค่าด้วย `setValue` พร้อม `shouldValidate` และ `shouldDirty` ไม่แยก state ซ้ำกับค่าฟอร์ม
- ใช้ `formState.isSubmitting` สำหรับสถานะบันทึก ปิดการแก้ไขระหว่างบันทึก และแสดง loading ที่ปุ่ม
- Error รายช่องอยู่ใต้ input; error จาก API แสดงด้วย Alert และเก็บค่าที่ผู้ใช้กรอกไว้ให้แก้ไขแล้วลองใหม่
- หน้าแก้ไขโหลดค่าเดิมผ่าน props ใช้ `key={record.id}` หรือ `reset` เมื่อเปลี่ยน record และรักษาข้อมูลที่ไม่ได้เปิดให้แก้ไขไว้ในฝั่งเซิร์ฟเวอร์

```tsx
const methods = useForm<FormValues>({
  resolver: zodResolver(formSchema),
  defaultValues,
});

return (
  <Form methods={methods} onSubmit={methods.handleSubmit(onSubmit)}>
    <Field.Text name="name" label="ชื่อ" />
    <Field.DatePicker name="birthDate" label="วันเกิด" disableFuture format="DD/MM/YYYY" />
    <Button type="submit" loading={methods.formState.isSubmitting}>บันทึกข้อมูล</Button>
  </Form>
);
```

## วันที่และเวลา

ใช้ MUI X ผ่าน `Field.DatePicker`, `Field.TimePicker` หรือ `Field.DateTimePicker` ระบบมี `LocalizationProvider` และ Day.js adapter ที่ app root แล้ว ไม่ต้องเพิ่ม provider ในแต่ละหน้า

วันแบบไม่มีเวลาเก็บเป็น `YYYY-MM-DD` หรือ `null` ในฟอร์ม ไม่แปลงเป็น UTC timestamp เพราะอาจทำให้วันเปลี่ยนเมื่อแสดงใน timezone อื่น ใช้ `format` สำหรับรูปแบบที่แสดงเท่านั้น และ validate ด้วย Zod ว่าเป็นวันจริง รวมทั้งข้อจำกัดทางธุรกิจ เช่น วันเกิดห้ามเกินวันนี้ ไม่พึ่ง `disableFuture` เพียงอย่างเดียว

ช่องวันเกิดศิลปินเป็นข้อมูลไม่บังคับ ส่งค่าว่างเมื่อผู้ใช้ล้างวันเกิด และตรวจวันที่ซ้ำใน API โดยใช้ schema ร่วม ข้อมูลนี้ใช้ปี ค.ศ. ตามค่า ISO; หากต้องการปี พ.ศ. ให้กำหนดการแสดงและการแปลงอย่างชัดเจนก่อนใช้งาน

## รูปภาพ

ใช้ `Field.Upload` สำหรับ drag and drop พร้อม click เลือกไฟล์และ preview เก็บ `File | string | null` ในฟอร์ม: File คือรูปใหม่, string คือ URL รูปเดิม, null คือไม่มีรูป/ลบรูป จำกัดชนิดและขนาดทั้งใน dropzone, Zod และ API

ฟอร์มศิลปินรองรับ JPG, PNG, WebP ไม่เกิน 2 MB ต้องระบุเครดิตเมื่อมีรูป ส่งข้อมูล JSON ใน field `data` และไฟล์ใน field `file` ของ FormData โดยไม่ตั้ง Content-Type เอง เพื่อให้ browser ใส่ multipart boundary

## API และการบันทึก

Client validation ใช้ช่วยผู้ใช้ แต่ API ต้องตรวจสิทธิ์และ validate payload อีกครั้งเสมอ ห้ามเชื่อข้อมูลจาก browser โดยตรง ใช้ POST สำหรับสร้างและ PATCH สำหรับแก้ไข ตรวจชื่อซ้ำโดยยกเว้น record ปัจจุบัน และตรวจ `updated_at` เพื่อป้องกันการเขียนทับข้อมูลที่เปลี่ยนระหว่างบันทึก

รูปใหม่ต้องอัปโหลดสำเร็จก่อนบันทึกข้อมูล หากบันทึกชนกับการแก้ไขอื่นให้ลบไฟล์ใหม่ที่อัปโหลด และส่ง error ให้ผู้ใช้ลองใหม่ เมื่อสำเร็จให้ invalidate query ของรายการแล้วนำทางกลับไปยังข้อมูลที่บันทึก

## การตรวจสอบ

รัน TypeScript และ ESLint สำหรับไฟล์ที่เปลี่ยน ทดสอบ schema ที่มีเงื่อนไขร่วม วันที่ว่าง/ผิดรูปแบบ/อนาคต และ API สำหรับสิทธิ์ การสร้าง การแก้ไข ชื่อซ้ำ การคงหลักฐานเดิม และการอัปโหลดล้มเหลว ตรวจหน้าจอ desktop/mobile รวมถึง error ใต้ช่องและการใช้คีย์บอร์ดก่อนส่งมอบ

เอกสารนี้เป็นมาตรฐานสำหรับงานฟอร์มต่อไป ไม่ได้หมายความว่าฟอร์มเก่าทุกหน้าได้รับการย้ายแล้ว

## ฟอร์มหัตถกรรมชุมชน

กลุ่ม `/admin/cultural-heritage/group/weaving/` และ `/admin/cultural-heritage/group/mats/` ใช้ฟอร์มร่วม `src/app/admin/cultural-heritage/community-heritage-form.tsx` และ schema `src/lib/community-heritage-form.ts` เส้นทาง `new/` สำหรับสร้างและ `[recordId]/` สำหรับแก้ไข ใช้ POST/PATCH ที่ `/api/admin/cultural-heritage/` พร้อมสิทธิ์ `cultural_heritage`

ข้อมูลใหม่และข้อมูลทับรายการต้นทางเก็บใน `home_content_sections` ภายใต้ key `community-heritage-edits-v1` โดยไม่แก้ไฟล์ JSON ต้นฉบับ ฝั่งอ่านรวมข้อมูลจากฐานข้อมูลกับต้นฉบับตาม ID ก่อนค้นหา กรอง และแบ่งหน้า มีการตรวจ `updated_at` ก่อนบันทึกเพื่อป้องกันการเขียนทับพร้อมกัน และไม่รวม section นี้ใน payload หน้าแรก


### CRUD ครบทุกกลุ่มชุมชน

ฟอร์มและ API รองรับทุก key ใน `COMMUNITY_GROUPS` ที่ `src/lib/cultural-data-groups.ts`: lifestyle, weaving, mats, basketry, products, otop และ support-centers โดยใช้ค่า category จากรายการกลางเดียวกัน ไม่แยกเงื่อนไขชื่อหมวดในแต่ละหน้า

DELETE ใช้สิทธิ์ `cultural_heritage` เช่นเดียวกับ POST/PATCH ตรวจ ID และหมวดก่อนลบ และบันทึก `deleted: true` ลงรายการแก้ไขเพื่อป้องกันข้อมูล JSON ต้นฉบับกลับมาแสดงอีก ฝั่งอ่านนำรายการลบออกก่อนค้นหา แบ่งหน้า และนับจำนวน หน้า UI มีหน้าต่างยืนยันชื่อรายการก่อนลบ รูปและต้นฉบับยังเก็บไว้ การลบไม่ลบไฟล์ภาพใน storage
