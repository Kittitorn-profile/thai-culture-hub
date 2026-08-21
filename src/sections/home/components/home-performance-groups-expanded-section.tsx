import type { PerformanceGroupsContent } from './home-types';

import dynamic from 'next/dynamic';

import { Box } from '@mui/material';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { Markdown } from 'src/components/markdown';

import { HOME_DEEP, HOME_SECTION_PX, HOME_SECTION_MAX_WIDTH } from './home-constants';

const ReactPlayer = dynamic(() => import('react-player'), {
  ssr: false,
  loading: () => null,
});

type Props = {
  content: PerformanceGroupsContent;
};

export function HomePerformanceGroupsExpandedSection({ content }: Props) {
  return (
    <Box
      sx={{
        px: HOME_SECTION_PX,
        py: { xs: 8, md: 12 },
        position: 'relative',
        zIndex: 1,
        background: 'rgba(42,55,54,0.06)',
      }}
    >
      <Box sx={{ mx: 'auto', maxWidth: HOME_SECTION_MAX_WIDTH }}>
        <Typography variant="overline" sx={{ display: 'block', letterSpacing: 2, fontWeight: 900 }}>
          วงศิลปินและวงดนตรี
        </Typography>
        <Typography component="h2" sx={{ mt: 1, mb: 3, fontSize: { xs: 28, md: 40 }, fontWeight: 900 }}>
          {content.title}
        </Typography>
        {content.description && (
          <Typography sx={{ mb: 4, maxWidth: 760, lineHeight: 1.75 }}>
            {content.description}
          </Typography>
        )}

        <Box
          sx={{
            gap: 3,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
          }}
        >
          {content.groups
            .filter((group) => group.isPublished !== false)
            .sort((first, second) => Number(second.isFeatured) - Number(first.isFeatured))
            .map((group) => (
              <Box
                key={group.name}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(42,55,54,0.12)',
                  borderTop: `4px solid ${group.primaryColor || HOME_DEEP}`,
                  boxShadow: '0 18px 45px rgba(42,55,54,0.08)',
                }}
              >
                {group.coverImageUrl ? (
                  <Box
                    component="img"
                    src={group.coverImageUrl}
                    alt={`ภาพปก ${group.name}`}
                    sx={{
                      width: '100%',
                      mb: 2.5,
                      display: 'block',
                      aspectRatio: '16 / 9',
                      objectFit: 'cover',
                      borderRadius: 2,
                    }}
                  />
                ) : null}
                <Stack direction="row" justifyContent="space-between" spacing={1.5} alignItems="center">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    {group.logoUrl ? (
                      <Avatar
                        variant="rounded"
                        src={group.logoUrl}
                        alt={`โลโก้ ${group.name}`}
                        sx={{ width: 56, height: 56 }}
                      />
                    ) : null}
                    <Typography variant="h5" sx={{ fontWeight: 900, color: HOME_DEEP }}>
                      {group.name}
                    </Typography>
                  </Stack>
                  <Chip label={group.category} size="small" color="secondary" />
                </Stack>

                {group.provinceName ? (
                  <Chip
                    label={`จังหวัด${group.provinceName}`}
                    size="small"
                    variant="outlined"
                    sx={{ mt: 1.5, borderColor: group.primaryColor || undefined }}
                  />
                ) : null}

                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                  {group.isFeatured ? <Chip label="วงแนะนำ" size="small" color="warning" /> : null}
                  {group.acceptsBookings ? (
                    <Chip label="เปิดรับงาน" size="small" color="success" variant="outlined" />
                  ) : null}
                </Stack>

                {group.description && (
                  <Typography sx={{ mt: 1.5, color: 'text.secondary', lineHeight: 1.7 }}>
                    {group.description}
                  </Typography>
                )}

                {group.acceptsBookings &&
                (group.contactPhone ||
                  group.contactEmail ||
                  group.lineUrl ||
                  group.facebookUrl ||
                  group.youtubeUrl) ? (
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
                    {group.contactPhone ? (
                      <Button size="small" variant="contained" component="a" href={`tel:${group.contactPhone}`}>
                        โทรติดต่อ
                      </Button>
                    ) : null}
                    {group.contactEmail ? (
                      <Button
                        size="small"
                        variant="outlined"
                        component="a"
                        href={`mailto:${group.contactEmail}`}
                      >
                        อีเมล
                      </Button>
                    ) : null}
                    {group.lineUrl ? (
                      <Button
                        size="small"
                        variant="outlined"
                        component="a"
                        href={group.lineUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        LINE
                      </Button>
                    ) : null}
                    {group.facebookUrl ? (
                      <Button
                        size="small"
                        variant="outlined"
                        component="a"
                        href={group.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Facebook
                      </Button>
                    ) : null}
                    {group.youtubeUrl ? (
                      <Button
                        size="small"
                        variant="outlined"
                        component="a"
                        href={group.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        YouTube
                      </Button>
                    ) : null}
                  </Stack>
                ) : null}

                {group.personnel.length > 0 && (
                  <Box sx={{ mt: 2.5 }}>
                    <Typography variant="subtitle1" sx={{ color: HOME_DEEP, fontWeight: 900 }}>
                      บุคลากรและตำแหน่ง
                    </Typography>
                    <Box
                      sx={{
                        mt: 1.5,
                        gap: 1.5,
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                      }}
                    >
                      {group.personnel.map((person) => (
                        <Box
                          key={person.id}
                          sx={{
                            p: 1.5,
                            display: 'flex',
                            gap: 1.5,
                            borderRadius: 2,
                            border: '1px solid rgba(42,55,54,0.12)',
                          }}
                        >
                          <Avatar src={person.imageUrl} alt={person.fullName} sx={{ width: 64, height: 64 }} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 800, color: HOME_DEEP }}>
                              {person.fullName || 'ไม่ระบุชื่อ'}
                              {person.nickname ? ` (${person.nickname})` : ''}
                            </Typography>
                            {person.role && (
                              <Typography variant="body2" sx={{ color: 'secondary.main' }}>
                                {person.role}
                              </Typography>
                            )}
                            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                              {[
                                person.age ? `อายุ ${person.age} ปี` : '',
                                person.yearsWithGroup ? `อยู่กับวง ${person.yearsWithGroup} ปี` : '',
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </Typography>
                            {person.education && (
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                การศึกษา: {person.education}
                              </Typography>
                            )}
                            {person.otherDetails && (
                              <Markdown
                                sx={{
                                  mt: 0.5,
                                  color: 'text.secondary',
                                  fontSize: '0.75rem',
                                  '& p': { m: 0 },
                                }}
                              >
                                {person.otherDetails}
                              </Markdown>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                <Box sx={{ mt: 2, display: 'grid', gap: 1.5 }}>
                  {group.personnel.length === 0 && group.managers.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: HOME_DEEP, fontWeight: 800 }}>
                        ผู้จัดการวง
                      </Typography>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                        {group.managers.map((manager) => (
                          <Chip key={manager} label={manager} size="small" />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {group.personnel.length === 0 && group.coManagers.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: HOME_DEEP, fontWeight: 800 }}>
                        ผู้จัดการร่วม
                      </Typography>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                        {group.coManagers.map((manager) => (
                          <Chip key={manager} label={manager} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {group.personnel.length === 0 && group.principalMembers.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: HOME_DEEP, fontWeight: 800 }}>
                        ตัวหลักวง
                      </Typography>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                        {group.principalMembers.map((person) => (
                          <Chip key={person} label={person} size="small" color="warning" />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {group.personnel.length === 0 && group.leadRoles.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: HOME_DEEP, fontWeight: 800 }}>
                        บทบาทหลัก
                      </Typography>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                        {group.leadRoles.map((role) => (
                          <Chip key={role} label={role} size="small" color="warning" variant="outlined" />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2" sx={{ color: HOME_DEEP, fontWeight: 800 }}>
                      จำนวนทั้งหมด
                    </Typography>
                    <Typography sx={{ fontWeight: 700, color: HOME_DEEP }}>
                      {group.totalMembers}
                    </Typography>
                  </Box>

                  {group.otherPositions.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ color: HOME_DEEP, fontWeight: 800 }}>
                        ตำแหน่งอื่น ๆ
                      </Typography>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                        {group.otherPositions.map((position) => (
                          <Chip key={position} label={position} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Box>

                {group.yearlyData.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: HOME_DEEP, fontWeight: 800 }}>
                      ข้อมูลรายปีและรางวัล
                    </Typography>
                    <Stack spacing={1.5}>
                      {group.yearlyData.map((yearRecord, yearIndex) => (
                        <Box
                          key={`${group.name}-${yearRecord.year}-${yearIndex}`}
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            border: '1px solid rgba(42,55,54,0.12)',
                            bgcolor: 'rgba(111,135,144,0.04)',
                          }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            {yearRecord.logoUrl ? (
                              <Avatar
                                variant="rounded"
                                src={yearRecord.logoUrl}
                                alt={`โลโก้ปี ${yearRecord.year}`}
                                sx={{ width: 40, height: 40 }}
                              />
                            ) : null}
                            <Typography sx={{ fontWeight: 800, color: HOME_DEEP }}>
                              ปี {yearRecord.year}
                            </Typography>
                          </Stack>
                          {yearRecord.note && (
                            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
                              {yearRecord.note}
                            </Typography>
                          )}
                          {yearRecord.about ? (
                            <Typography sx={{ mt: 1 }}>
                              <strong>เกี่ยวกับ:</strong> {yearRecord.about}
                            </Typography>
                          ) : null}
                          {yearRecord.details ? (
                            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
                              {yearRecord.details}
                            </Typography>
                          ) : null}
                          {yearRecord.performanceImages?.length ? (
                            <Box
                              sx={{
                                mt: 1.5,
                                gap: 1,
                                display: 'grid',
                                gridTemplateColumns: {
                                  xs: 'repeat(2, minmax(0, 1fr))',
                                  sm: 'repeat(3, minmax(0, 1fr))',
                                },
                              }}
                            >
                              {yearRecord.performanceImages.map((imageUrl, imageIndex) => (
                                <Box
                                  key={`${imageUrl}-${imageIndex}`}
                                  component="img"
                                  src={imageUrl}
                                  alt={`ภาพการแสดง ${group.name} ปี ${yearRecord.year}`}
                                  sx={{
                                    width: '100%',
                                    aspectRatio: '4 / 3',
                                    objectFit: 'cover',
                                    borderRadius: 1,
                                  }}
                                />
                              ))}
                            </Box>
                          ) : null}
                          {yearRecord.storyTypes?.length ? (
                            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                              {yearRecord.storyTypes.map((storyType) => (
                                <Chip key={storyType} label={storyType} size="small" variant="outlined" />
                              ))}
                            </Stack>
                          ) : null}
                          {yearRecord.singerIds?.length ? (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              <strong>ผู้ร้อง:</strong>{' '}
                              {group.personnel
                                .filter((person) => yearRecord.singerIds?.includes(person.id))
                                .map((person) => person.nickname || person.fullName)
                                .join(', ') || 'ไม่ระบุ'}
                            </Typography>
                          ) : null}
                          {yearRecord.bookletUrl ? (
                            <Button
                              component="a"
                              href={yearRecord.bookletUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="small"
                              sx={{ mt: 1 }}
                            >
                              เปิดสูจิบัตร {yearRecord.bookletName ? `(${yearRecord.bookletName})` : ''}
                            </Button>
                          ) : null}
                          {yearRecord.youtubeUrl ? (
                            <Box sx={{ mt: 1.5, aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: 1 }}>
                              <ReactPlayer src={yearRecord.youtubeUrl} controls width="100%" height="100%" />
                            </Box>
                          ) : null}
                          {yearRecord.awards.length > 0 && (
                            <Stack spacing={0.75} sx={{ mt: 1 }}>
                              {yearRecord.awards.map((award, awardIndex) => (
                                <Box key={`${award.title}-${award.year}-${awardIndex}`}>
                                  <Typography sx={{ fontWeight: 700, color: HOME_DEEP }}>
                                    {award.title}
                                  </Typography>
                                  {award.description && (
                                    <Typography sx={{ color: 'text.secondary' }}>
                                      {award.description}
                                    </Typography>
                                  )}
                                </Box>
                              ))}
                            </Stack>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Box>
            ))}
        </Box>
      </Box>
    </Box>
  );
}
