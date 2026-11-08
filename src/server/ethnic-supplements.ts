import { z } from 'zod';

export const ETHNIC_SUPPLEMENTS_KEY = 'ethnic-community-supplements-v1';
export const ethnicSupplementSchema = z.object({
  id: z.string().regex(/^sac-community-\d+$/),
  title: z.string().min(1),
  group: z.string().min(1),
  groups: z.array(z.string().min(1)).min(1),
  province: z.string().min(1),
  provinceEnglish: z.string(),
  district: z.string(),
  subDistrict: z.string(),
  village: z.string().min(1),
  villageEnglish: z.string(),
  region: z.string(),
  description: z.string(),
  latitude: z.number().min(5).max(21),
  longitude: z.number().min(97).max(106),
  sourceUrl: z.string().url().startsWith('https://wikicommunity.sac.or.th/community/'),
  coordinateSourceUrl: z.string().url().startsWith('https://wikicommunity.sac.or.th/community/'),
  sourceName: z.string().min(1),
  coordinateKind: z.literal('community_reference'),
  checkedAt: z.string(),
});
export const ethnicSupplementDirectorySchema = z.object({
  schemaVersion: z.literal(1),
  items: z.array(ethnicSupplementSchema),
});
