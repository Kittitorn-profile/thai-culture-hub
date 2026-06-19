# Thailand Culture Hub Data Report

## Phase 0: Data Foundation

สถานะ: สร้างโครงฐานข้อมูลและรายการจังหวัด ISO 3166-2 Thailand ครบ 77 จังหวัดแล้ว

ไฟล์ที่สร้าง:

- `src/data/thailand-culture/types.ts`
- `src/data/thailand-culture/provinces.ts`
- `src/data/thailand-culture/places/`
- `src/data/thailand-culture/festivals/`
- `src/data/thailand-culture/cultures/`
- `src/data/thailand-culture/foods/`

## Province Coverage

- จำนวนจังหวัดใน `provinces.ts`: 77
- ใช้รหัสจังหวัดรูปแบบ `TH-10` ถึง `TH-96` ตาม ISO 3166-2 Thailand

## Content Validation

ยังไม่ผ่าน production validation เพราะยังไม่ได้เติมข้อมูลจริงรายจังหวัดในหมวดต่อไปนี้:

- Places: ต้องมีอย่างน้อย 5 รายการต่อจังหวัด พร้อม `lat` และ `lng`
- Festivals: ต้องมีอย่างน้อย 3 รายการต่อจังหวัด
- Cultures: ต้องมีอย่างน้อย 3 รายการต่อจังหวัด
- Foods: ต้องมีอย่างน้อย 5 รายการต่อจังหวัด

## Recommended Production Plan

เพื่อไม่ให้เกิดข้อมูลมั่วหรือ placeholder ควรเติมข้อมูลเป็นรอบและตรวจทุกจังหวัดหลังจบรอบ:

1. รอบ 1: ภาคอีสาน 20 จังหวัด
2. รอบ 2: ภาคเหนือ 17 จังหวัด
3. รอบ 3: ภาคกลางและภาคตะวันตก
4. รอบ 4: ภาคใต้และภาคตะวันออก

หลังจบแต่ละรอบให้ตรวจ:

- ครบทุกไฟล์รายจังหวัดใน `places`, `festivals`, `cultures`, `foods`
- ทุกจังหวัดมี `Place >= 5`
- ทุก `Place` มี `lat/lng`
- ทุกจังหวัดมี `Festival >= 3`
- ทุกจังหวัดมี `Culture >= 3`
- ทุกจังหวัดมี `Food >= 5`
