import { z } from 'zod';

import { homeHeroSchema, MAX_HERO_IMAGES, type HomeHeroImage } from './home-hero';

const imageSchema = homeHeroSchema.shape.images.element;
const imageId = imageSchema.shape.id;
export const homeHeroOperationSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), image: imageSchema }),
  z.object({
    action: z.literal('update'),
    id: imageId,
    expected: imageSchema,
    patch: imageSchema
      .omit({ id: true })
      .partial()
      .refine((patch) => Object.keys(patch).length > 0, 'ไม่มีข้อมูลที่แก้ไข'),
  }),
  z.object({ action: z.literal('delete'), id: imageId, expected: imageSchema }),
  z.object({
    action: z.literal('move'),
    id: imageId,
    direction: z.union([z.literal(-1), z.literal(1)]),
  }),
]);
export type HomeHeroOperation = z.infer<typeof homeHeroOperationSchema>;
export class HomeHeroOperationError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
/** Apply one record operation to the latest saved list, preserving unrelated records. */
export function applyHomeHeroOperation(images: HomeHeroImage[], operation: HomeHeroOperation) {
  const next = images.map((image) => ({ ...image }));
  if (operation.action === 'create') {
    if (next.length >= MAX_HERO_IMAGES)
      throw new HomeHeroOperationError(`เพิ่มได้สูงสุด ${MAX_HERO_IMAGES} ภาพ`, 400);
    if (next.some((image) => image.id === operation.image.id))
      throw new HomeHeroOperationError('ภาพนี้ถูกเพิ่มแล้ว กรุณาโหลดข้อมูลใหม่', 409);
    next.push(operation.image);
  } else {
    const index = next.findIndex((image) => image.id === operation.id);
    if (index < 0) throw new HomeHeroOperationError('ไม่พบภาพนี้ กรุณาโหลดข้อมูลใหม่', 404);
    if (operation.action === 'update' || operation.action === 'delete') {
      const fields =
        operation.action === 'delete'
          ? (['imageUrl', 'alt', 'isActive'] as const)
          : (Object.keys(operation.patch) as (keyof HomeHeroImage)[]);
      if (fields.some((key) => next[index][key] !== operation.expected[key]))
        throw new HomeHeroOperationError(
          'ภาพนี้มีการเปลี่ยนแปลงแล้ว กรุณาโหลดข้อมูลใหม่ก่อนแก้ไข',
          409
        );
      if (operation.action === 'delete') next.splice(index, 1);
      else next[index] = { ...next[index], ...operation.patch };
    } else {
      const target = index + operation.direction;
      if (target >= 0 && target < next.length)
        [next[index], next[target]] = [next[target], next[index]];
    }
  }
  return homeHeroSchema.parse({ images: next }).images;
}
