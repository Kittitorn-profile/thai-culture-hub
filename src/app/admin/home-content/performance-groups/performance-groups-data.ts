import { z as zod } from 'zod';

export const SECTION_KEY = 'performance-groups';
export const GROUP_CATEGORIES = ['วงโปงลาง', 'วงหมอลำ', 'วงดนตรี', 'อื่น ๆ'];
export const DEFAULT_POSITIONS = [
  'ผู้จัดการวง',
  'ผู้จัดการร่วม',
  'พระเอก',
  'นางเอก',
  'นักร้องนำ',
  'ตัวหลักวง',
  'นักดนตรี',
  'นักเต้น',
];

const nonNegativeNumber = (message?: string) =>
  zod.number().min(0, { message: message ?? 'ต้องไม่ติดลบ' });

const optionalEmail = (message?: string) =>
  zod
    .string()
    .trim()
    .refine((value) => !value || zod.email().safeParse(value).success, {
      message: message ?? 'อีเมลไม่ถูกต้อง',
    });

export const AwardSchema = zod.object({
  year: zod.string(),
  title: zod.string(),
  description: zod.string(),
});

export const OrganizerSchema = zod.object({
  id: zod.string(),
  name: zod.string().trim().min(1, { message: 'กรุณากรอกชื่อผู้จัด' }),
  color: zod.string(),
  logoUrl: zod.string(),
});

export const PersonnelSchema = zod.object({
  id: zod.string(),
  role: zod.string().trim().min(1, { message: 'กรุณาเลือกตำแหน่ง' }),
  fullName: zod.string().trim().min(1, { message: 'กรุณากรอกชื่อจริง-นามสกุล' }),
  nickname: zod.string(),
  imageUrl: zod.string(),
  yearsWithGroup: nonNegativeNumber(),
  age: nonNegativeNumber(),
  education: zod.string(),
  otherDetails: zod.string(),
});

export const YearRecordSchema = zod.object({
  year: zod.string(),
  note: zod.string(),
  logoUrl: zod.string(),
  organizerId: zod.string(),
  organizerName: zod.string(),
  organizerColor: zod.string(),
  organizerLogoUrl: zod.string(),
  contestEventIds: zod.array(zod.string()),
  contestCategoryIds: zod.record(zod.string(), zod.string()),
  contestResultIds: zod.record(zod.string(), zod.array(zod.string())),
  contestSingerIds: zod.record(zod.string(), zod.array(zod.string())),
  contestLeadPerformerIds: zod.record(zod.string(), zod.array(zod.string())),
  details: zod.string(),
  about: zod.string(),
  storyTypes: zod.array(zod.string()),
  bookletUrl: zod.string(),
  bookletName: zod.string(),
  youtubeUrl: zod.string(),
  singerIds: zod.array(zod.string()),
  leadPerformerIds: zod.array(zod.string()),
  performanceImages: zod.array(zod.string()),
  awards: zod.array(AwardSchema),
});

export const GroupEntrySchema = zod.object({
  id: zod.string(),
  name: zod.string().trim().min(1, { message: 'กรุณากรอกชื่อวง' }),
  logoUrl: zod.string(),
  coverImageUrl: zod.string(),
  primaryColor: zod.string(),
  provinceCode: zod.string().trim().min(1, { message: 'กรุณาเลือกจังหวัด' }),
  provinceName: zod.string(),
  isPublished: zod.boolean(),
  isFeatured: zod.boolean(),
  acceptsBookings: zod.boolean(),
  contactPhone: zod.string(),
  contactEmail: optionalEmail(),
  lineUrl: zod.string(),
  facebookUrl: zod.string(),
  youtubeUrl: zod.string(),
  category: zod.string(),
  managers: zod.array(zod.string()),
  coManagers: zod.array(zod.string()),
  principalMembers: zod.array(zod.string()),
  leadRoles: zod.array(zod.string()),
  otherPositions: zod.array(zod.string()),
  personnel: zod.array(PersonnelSchema),
  positions: zod.array(zod.string()),
  totalMembers: nonNegativeNumber(),
  description: zod.string(),
  yearlyData: zod.array(YearRecordSchema),
});

export type Award = zod.infer<typeof AwardSchema>;
export type Organizer = zod.infer<typeof OrganizerSchema>;
export type YearRecord = zod.infer<typeof YearRecordSchema>;
export type Personnel = zod.infer<typeof PersonnelSchema>;
export type GroupEntry = zod.infer<typeof GroupEntrySchema>;
export type GroupsContent = {
  title: string;
  description: string;
  organizers: Organizer[];
  groups: GroupEntry[];
};
export type HomeContentResponse = { data?: { content?: unknown } | null; message?: string };

export const EMPTY_CONTENT: GroupsContent = {
  title: 'วงศิลปินและวงดนตรี',
  description: 'ข้อมูลวงโปงลาง วงหมอลำ และวงดนตรี',
  organizers: [],
  groups: [],
};

export function createGroup(): GroupEntry {
  return {
    id: crypto.randomUUID(),
    name: '',
    logoUrl: '',
    coverImageUrl: '',
    primaryColor: '#8b5e3c',
    provinceCode: '',
    provinceName: '',
    isPublished: false,
    isFeatured: false,
    acceptsBookings: true,
    contactPhone: '',
    contactEmail: '',
    lineUrl: '',
    facebookUrl: '',
    youtubeUrl: '',
    category: 'วงดนตรี',
    managers: [],
    coManagers: [],
    principalMembers: [],
    leadRoles: [],
    otherPositions: [],
    personnel: [],
    positions: [...DEFAULT_POSITIONS],
    totalMembers: 0,
    description: '',
    yearlyData: [],
  };
}

export function createPersonnel(role = ''): Personnel {
  return {
    id: crypto.randomUUID(),
    role,
    fullName: '',
    nickname: '',
    imageUrl: '',
    yearsWithGroup: 0,
    age: 0,
    education: '',
    otherDetails: '',
  };
}

const stringList = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export function normalizeContent(value: unknown): GroupsContent {
  if (!value || typeof value !== 'object') return EMPTY_CONTENT;
  const content = value as Partial<GroupsContent>;
  const storedOrganizers: Organizer[] = Array.isArray(content.organizers)
    ? content.organizers
        .map((organizer, index) => ({
          id:
            typeof organizer?.id === 'string' && organizer.id
              ? organizer.id
              : `legacy-organizer-${index}`,
          name: typeof organizer?.name === 'string' ? organizer.name.trim() : '',
          color: typeof organizer?.color === 'string' ? organizer.color : '#637e69',
          logoUrl: typeof organizer?.logoUrl === 'string' ? organizer.logoUrl : '',
        }))
        .filter((organizer) => organizer.name)
    : [];
  const legacyOrganizerMap = new Map(
    storedOrganizers.map((organizer) => [organizer.name, organizer])
  );
  const groups = Array.isArray(content.groups)
    ? content.groups.map((group, index): GroupEntry => {
        const legacyPersonnel = [
          ...stringList(group?.managers).map((fullName) => ({ fullName, role: 'ผู้จัดการวง' })),
          ...stringList(group?.coManagers).map((fullName) => ({ fullName, role: 'ผู้จัดการร่วม' })),
          ...stringList(group?.principalMembers).map((fullName, personIndex) => ({
            fullName,
            role: stringList(group?.leadRoles)[personIndex] ?? 'ตัวหลักวง',
          })),
        ];
        const personnelSource: Array<Partial<Personnel>> = Array.isArray(group?.personnel)
          ? group.personnel
          : legacyPersonnel;
        const storedPositions = stringList(group?.positions);
        const positions = Array.from(
          new Set([
            ...(storedPositions.length ? storedPositions : DEFAULT_POSITIONS),
            ...personnelSource.map((person) => person.role?.trim()).filter(Boolean),
          ])
        ) as string[];

        return {
          id: typeof group?.id === 'string' && group.id ? group.id : `legacy-${index}`,
          name: typeof group?.name === 'string' ? group.name : '',
          logoUrl: typeof group?.logoUrl === 'string' ? group.logoUrl : '',
          coverImageUrl: typeof group?.coverImageUrl === 'string' ? group.coverImageUrl : '',
          primaryColor: typeof group?.primaryColor === 'string' ? group.primaryColor : '#8b5e3c',
          provinceCode: typeof group?.provinceCode === 'string' ? group.provinceCode : '',
          provinceName: typeof group?.provinceName === 'string' ? group.provinceName : '',
          isPublished: typeof group?.isPublished === 'boolean' ? group.isPublished : true,
          isFeatured: group?.isFeatured === true,
          acceptsBookings:
            typeof group?.acceptsBookings === 'boolean' ? group.acceptsBookings : true,
          contactPhone: typeof group?.contactPhone === 'string' ? group.contactPhone : '',
          contactEmail: typeof group?.contactEmail === 'string' ? group.contactEmail : '',
          lineUrl: typeof group?.lineUrl === 'string' ? group.lineUrl : '',
          facebookUrl: typeof group?.facebookUrl === 'string' ? group.facebookUrl : '',
          youtubeUrl: typeof group?.youtubeUrl === 'string' ? group.youtubeUrl : '',
          category: typeof group?.category === 'string' ? group.category : 'วงดนตรี',
          managers: stringList(group?.managers),
          coManagers: stringList(group?.coManagers),
          principalMembers: stringList(group?.principalMembers),
          leadRoles: stringList(group?.leadRoles),
          otherPositions: stringList(group?.otherPositions),
          personnel: personnelSource.map((person, personIndex) => ({
            id:
              typeof person?.id === 'string' && person.id
                ? person.id
                : `legacy-person-${index}-${personIndex}`,
            role: typeof person?.role === 'string' ? person.role : '',
            fullName: typeof person?.fullName === 'string' ? person.fullName : '',
            nickname: typeof person?.nickname === 'string' ? person.nickname : '',
            imageUrl: typeof person?.imageUrl === 'string' ? person.imageUrl : '',
            yearsWithGroup: Math.max(0, Number(person?.yearsWithGroup) || 0),
            age: Math.max(0, Number(person?.age) || 0),
            education: typeof person?.education === 'string' ? person.education : '',
            otherDetails: typeof person?.otherDetails === 'string' ? person.otherDetails : '',
          })),
          positions,
          totalMembers: Math.max(0, Number(group?.totalMembers) || 0),
          description: typeof group?.description === 'string' ? group.description : '',
          yearlyData: Array.isArray(group?.yearlyData)
            ? group.yearlyData.map((record) => {
                const organizerName =
                  typeof record?.organizerName === 'string' ? record.organizerName.trim() : '';
                let organizer = organizerName ? legacyOrganizerMap.get(organizerName) : undefined;
                if (organizerName && !organizer) {
                  organizer = {
                    id: `organizer-${legacyOrganizerMap.size + 1}-${organizerName}`,
                    name: organizerName,
                    color:
                      typeof record?.organizerColor === 'string'
                        ? record.organizerColor
                        : '#637e69',
                    logoUrl:
                      typeof record?.organizerLogoUrl === 'string' ? record.organizerLogoUrl : '',
                  };
                  legacyOrganizerMap.set(organizerName, organizer);
                }
                const organizerId =
                  typeof record?.organizerId === 'string' && record.organizerId
                    ? record.organizerId
                    : (organizer?.id ?? '');
                const resolvedOrganizer =
                  storedOrganizers.find((item) => item.id === organizerId) ?? organizer;
                return {
                  year: typeof record?.year === 'string' ? record.year : '',
                  note: typeof record?.note === 'string' ? record.note : '',
                  logoUrl: typeof record?.logoUrl === 'string' ? record.logoUrl : '',
                  organizerId,
                  organizerName: resolvedOrganizer?.name ?? organizerName,
                  organizerColor: resolvedOrganizer?.color ?? '#637e69',
                  organizerLogoUrl: resolvedOrganizer?.logoUrl ?? '',
                  contestEventIds: stringList(record?.contestEventIds),
                  contestCategoryIds:
                    record?.contestCategoryIds && typeof record.contestCategoryIds === 'object'
                      ? (record.contestCategoryIds as Record<string, string>)
                      : {},
                  contestResultIds:
                    record?.contestResultIds && typeof record.contestResultIds === 'object'
                      ? (record.contestResultIds as Record<string, string[]>)
                      : {},
                  contestSingerIds:
                    record?.contestSingerIds && typeof record.contestSingerIds === 'object'
                      ? (record.contestSingerIds as Record<string, string[]>)
                      : Object.fromEntries(
                          stringList(record?.contestEventIds).map((eventId) => [
                            eventId,
                            stringList(record?.singerIds),
                          ])
                        ),
                  contestLeadPerformerIds:
                    record?.contestLeadPerformerIds &&
                    typeof record.contestLeadPerformerIds === 'object'
                      ? (record.contestLeadPerformerIds as Record<string, string[]>)
                      : Object.fromEntries(
                          stringList(record?.contestEventIds).map((eventId) => [
                            eventId,
                            stringList(record?.leadPerformerIds),
                          ])
                        ),
                  details: typeof record?.details === 'string' ? record.details : '',
                  about: typeof record?.about === 'string' ? record.about : '',
                  storyTypes: stringList(record?.storyTypes),
                  bookletUrl: typeof record?.bookletUrl === 'string' ? record.bookletUrl : '',
                  bookletName: typeof record?.bookletName === 'string' ? record.bookletName : '',
                  youtubeUrl: typeof record?.youtubeUrl === 'string' ? record.youtubeUrl : '',
                  singerIds: stringList(record?.singerIds),
                  leadPerformerIds: stringList(record?.leadPerformerIds),
                  performanceImages: stringList(record?.performanceImages),
                  awards: Array.isArray(record?.awards)
                    ? record.awards.map((award) => ({
                        year: typeof award?.year === 'string' ? award.year : '',
                        title: typeof award?.title === 'string' ? award.title : '',
                        description:
                          typeof award?.description === 'string' ? award.description : '',
                      }))
                    : [],
                };
              })
            : [],
        };
      })
    : [];
  return {
    title: typeof content.title === 'string' ? content.title : EMPTY_CONTENT.title,
    description:
      typeof content.description === 'string' ? content.description : EMPTY_CONTENT.description,
    organizers: Array.from(legacyOrganizerMap.values()),
    groups,
  };
}

export const parseList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
