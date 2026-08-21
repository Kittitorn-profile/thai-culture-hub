'use client';

import type {
  HomeEventItem,
  PerformanceGroupEntry,
  PerformanceGroupsContent,
} from 'src/sections/home/components/home-types';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { trackAnalyticsEvent } from 'src/components/analytics';

import { HomePlayButton } from 'src/sections/home/components/home-play-button';
import { MOCK_PERFORMANCE_GROUPS } from 'src/sections/home/components/home-mock-data';
import { normalizePerformanceGroupsContent } from 'src/sections/home/components/home-utils';
import { PERFORMANCE_GROUPS_SECTION_KEY } from 'src/sections/home/components/home-constants';

type Props = {
  groupId: string;
  initialGroup?: PerformanceGroupEntry;
};

const ReactPlayer = dynamic(() => import('react-player'), {
  ssr: false,
  loading: () => <Box sx={{ width: 1, height: 1, bgcolor: 'rgba(42,55,54,0.12)' }} />,
});

function findGroup(content: PerformanceGroupsContent | undefined, groupId: string) {
  return content?.groups.find((group) => (group.id || group.name) === groupId);
}

function formatUpdatedDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function PerformanceGroupDetailView({ groupId, initialGroup }: Props) {
  const [group, setGroup] = useState<PerformanceGroupEntry | undefined>(initialGroup);
  const [isLoading, setIsLoading] = useState(true);
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [counts, setCounts] = useState({ views: 0, shares: 0 });
  const [shareAnchor, setShareAnchor] = useState<HTMLElement | null>(null);
  const [selectedYear, setSelectedYear] = useState(initialGroup?.yearlyData[0]?.year ?? '');
  const [contestEvents, setContestEvents] = useState<HomeEventItem[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/events', { signal: controller.signal })
      .then((response) => response.json())
      .then((json: { data?: HomeEventItem[] }) =>
        setContestEvents((json.data ?? []).filter((eventItem) => eventItem.isContest))
      )
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGroup() {
      try {
        const response = await fetch('/api/home-content', { signal: controller.signal });
        const json = (await response.json()) as { data?: Record<string, unknown> };
        const draft = json.data?.[PERFORMANCE_GROUPS_SECTION_KEY] as
          | PerformanceGroupsContent
          | undefined;
        const content = normalizePerformanceGroupsContent(draft);
        const nextGroup =
          findGroup(content, groupId) ?? findGroup(MOCK_PERFORMANCE_GROUPS, groupId);

        setGroup(nextGroup);
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn('Unable to load performance group', error);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadGroup();

    return () => controller.abort();
  }, [groupId]);

  useEffect(() => {
    if (!group?.yearlyData.length) {
      setSelectedYear('');
      return;
    }

    const hasSelectedYear = group.yearlyData.some((record) => record.year === selectedYear);

    if (!hasSelectedYear) {
      const latestRecord = [...group.yearlyData].sort(
        (first, second) => Number(second.year) - Number(first.year)
      )[0];

      setSelectedYear(latestRecord?.year ?? '');
    }
  }, [group, selectedYear]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/performance-groups/counts?groupIds=${encodeURIComponent(groupId)}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((json: { data?: Record<string, { views: number; shares: number }> } | null) => {
        if (json?.data?.[groupId]) {
          setCounts(json.data[groupId]);
        }
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn('Unable to load performance group counts', error);
        }
      });

    return () => controller.abort();
  }, [groupId]);

  if (!group && !isLoading) {
    return (
      <Container sx={{ py: 12, textAlign: 'center' }}>
        <Typography variant="h3">ไม่พบข้อมูลวง</Typography>
        <Button component={RouterLink} href="/" sx={{ mt: 3 }}>
          กลับหน้าแรก
        </Button>
      </Container>
    );
  }

  if (!group) {
    return <Box sx={{ minHeight: '70vh' }} />;
  }

  const roles = [...group.leadRoles, ...group.otherPositions];
  const normalizedPersonnelSearch = personnelSearch.trim().toLocaleLowerCase('th');
  const filteredPersonnel = normalizedPersonnelSearch
    ? group.personnel.filter((person) =>
        [person.fullName, person.nickname, person.role, person.education, person.otherDetails].some(
          (value) => value.toLocaleLowerCase('th').includes(normalizedPersonnelSearch)
        )
      )
    : group.personnel;

  const handleShare = (platform: 'facebook' | 'line') => {
    setShareAnchor(null);
    trackAnalyticsEvent('performance_group_share', groupId, { platform, groupId });
    setCounts((currentCounts) => ({
      ...currentCounts,
      shares: currentCounts.shares + 1,
    }));

    const shareUrl = encodeURIComponent(window.location.href);
    const targetUrl =
      platform === 'facebook'
        ? `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`
        : `https://social-plugins.line.me/lineit/share?url=${shareUrl}`;

    window.open(targetUrl, '_blank', 'noopener,noreferrer,width=720,height=640');
  };

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        pt: {
          xs: 'calc(var(--layout-header-mobile-height) + 24px)',
          md: 'calc(var(--layout-header-desktop-height) + 32px)',
        },
        pb: { xs: 5, md: 9 },
        overflow: 'hidden',
        position: 'relative',
        bgcolor: '#7b8476',
        backgroundImage: `
          radial-gradient(circle at 50% 18%, rgba(239,236,224,0.3) 0%, rgba(239,236,224,0.1) 28%, rgba(111,135,144,0) 58%),
          linear-gradient(180deg, #6f8790 0%, #7b8476 54%, #8f7c5c 100%)
        `,
        fontFamily: "'LINE Seed Sans TH', sans-serif",
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: { xs: -80, md: -120 },
          zIndex: 0,
          opacity: 0.22,
          pointerEvents: 'none',
          backgroundImage: `
            repeating-radial-gradient(circle at 78% 12%, transparent 0 44px, rgba(230,236,232,0.22) 46px 48px),
            repeating-radial-gradient(circle at 10% 82%, transparent 0 52px, rgba(230,236,232,0.12) 54px 56px),
            linear-gradient(120deg, transparent 0 58%, rgba(229,221,198,0.13) 58% 59%, transparent 59% 100%)
          `,
          transform: 'rotate(-4deg)',
        },
      }}
    >
      <Container maxWidth="lg" sx={{ zIndex: 1, px: { xs: 1.5, sm: 3 }, position: 'relative' }}>
        <Button
          component={RouterLink}
          href="/"
          color="inherit"
          startIcon={<Iconify icon="eva:arrowhead-left-fill" width={18} />}
          sx={{
            mb: 1,
            px: 1.5,
            color: '#f8f6ee',
            bgcolor: 'rgba(42,55,54,0.28)',
            backdropFilter: 'blur(8px)',
            '&:hover': { bgcolor: 'rgba(42,55,54,0.42)' },
          }}
        >
          กลับหน้าแรก
        </Button>

        <Box
          sx={{
            overflow: 'hidden',
            borderRadius: 3,
            bgcolor: 'background.paper',
            borderTop: `5px solid ${group.primaryColor || '#2a3736'}`,
            boxShadow: '0 24px 70px rgba(42,55,54,0.12)',
          }}
        >
          {group.coverImageUrl && (
            <Box
              component="img"
              src={group.coverImageUrl}
              alt={`ภาพปก ${group.name}`}
              sx={{
                width: 1,
                display: 'block',
                maxHeight: 620,
                aspectRatio: { xs: '4 / 3', sm: '16 / 8', lg: '16 / 7' },
                objectFit: 'cover',
              }}
            />
          )}

          <Box sx={{ p: { xs: 2.5, md: 5 } }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
            >
              <Stack
                direction="row"
                spacing={{ xs: 1.5, sm: 2 }}
                alignItems="center"
                sx={{ minWidth: 0 }}
              >
                {group.logoUrl && (
                  <Avatar
                    variant="rounded"
                    src={group.logoUrl}
                    alt={`โลโก้ ${group.name}`}
                    sx={{ width: { xs: 64, md: 100 }, height: { xs: 64, md: 100 } }}
                  />
                )}
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    component="h1"
                    sx={{
                      fontSize: { xs: 26, sm: 34, md: 46 },
                      lineHeight: 1.2,
                      fontWeight: 950,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {group.name}
                  </Typography>
                  <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
                    {[group.category, group.provinceName && `จังหวัด${group.provinceName}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {group.isFeatured && <Chip label="วงแนะนำ" color="warning" />}
                {group.acceptsBookings && (
                  <Chip label="เปิดรับงาน" color="success" variant="outlined" />
                )}
              </Stack>
            </Stack>

            {group.description && (
              <Typography sx={{ mt: 4, maxWidth: 900, fontSize: 18, lineHeight: 1.85 }}>
                {group.description}
              </Typography>
            )}

            <Stack
              direction="row"
              spacing={1.25}
              useFlexGap
              flexWrap="wrap"
              sx={{ mt: 3, '& .MuiButton-root': { flexGrow: { xs: 1, sm: 0 } } }}
            >
              {group.contactPhone && (
                <Button component="a" href={`tel:${group.contactPhone}`} variant="contained">
                  โทร {group.contactPhone}
                </Button>
              )}
              {group.contactEmail && (
                <Button component="a" href={`mailto:${group.contactEmail}`} variant="outlined">
                  อีเมล
                </Button>
              )}
              {group.lineUrl && (
                <Button
                  component="a"
                  href={group.lineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outlined"
                  startIcon={<Iconify icon={'simple-icons:line' as never} />}
                  endIcon={<Iconify icon="eva:external-link-fill" width={17} />}
                  sx={{ color: '#06a947', borderColor: '#06c755' }}
                >
                  LINE
                </Button>
              )}
              {group.facebookUrl && (
                <Button
                  component="a"
                  href={group.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="contained"
                  startIcon={<Iconify icon="socials:facebook" />}
                  endIcon={<Iconify icon="eva:external-link-fill" width={17} />}
                  sx={{
                    color: '#fff',
                    bgcolor: '#1877f2',
                    '&:hover': { bgcolor: '#1265d5' },
                  }}
                >
                  ไปยังเพจ Facebook
                </Button>
              )}
              {group.youtubeUrl && (
                <Button
                  component="a"
                  href={group.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outlined"
                  startIcon={<Iconify icon={'logos:youtube-icon' as never} />}
                  endIcon={<Iconify icon="eva:external-link-fill" width={17} />}
                  sx={{ color: '#d92323', borderColor: 'rgba(217,35,35,0.5)' }}
                >
                  YouTube
                </Button>
              )}
            </Stack>

            <Stack direction="row" spacing={2.5} alignItems="center" sx={{ mt: 3 }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Iconify icon="solar:eye-bold" width={21} />
                <Typography sx={{ fontWeight: 800 }}>{counts.views} ครั้ง</Typography>
              </Stack>
              <Stack direction="row" spacing={0.25} alignItems="center">
                <IconButton
                  aria-label="แชร์วงนี้"
                  aria-haspopup="true"
                  aria-expanded={Boolean(shareAnchor)}
                  onClick={(event) => setShareAnchor(event.currentTarget)}
                  sx={{ color: 'inherit' }}
                >
                  <Iconify icon="solar:share-bold" width={21} />
                </IconButton>
                <Typography sx={{ fontWeight: 800 }}>{counts.shares} แชร์</Typography>
              </Stack>
            </Stack>

            <Popover
              open={Boolean(shareAnchor)}
              anchorEl={shareAnchor}
              onClose={() => setShareAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
              transformOrigin={{ vertical: 'top', horizontal: 'center' }}
              slotProps={{
                paper: {
                  sx: {
                    mt: 1,
                    p: 1.5,
                    borderRadius: 2,
                    boxShadow: '0 16px 40px rgba(31,40,38,0.2)',
                  },
                },
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 900 }}>
                แชร์วงนี้ไปยัง
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  type="button"
                  variant="contained"
                  onClick={() => handleShare('facebook')}
                  sx={{ color: '#fff', bgcolor: '#1877f2', '&:hover': { bgcolor: '#0f65d8' } }}
                >
                  Facebook
                </Button>
                <Button
                  type="button"
                  variant="contained"
                  onClick={() => handleShare('line')}
                  sx={{ color: '#fff', bgcolor: '#06c755', '&:hover': { bgcolor: '#05ad4a' } }}
                >
                  LINE
                </Button>
              </Stack>
            </Popover>

            <Box
              sx={{
                mt: 5,
                gap: 2,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
              }}
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  ข้อมูลสมาชิก
                </Typography>
                <Typography sx={{ mt: 1.5 }}>สมาชิกทั้งหมด {group.totalMembers} คน</Typography>
                {group.managers.length > 0 && (
                  <Typography sx={{ mt: 1 }}>ผู้จัดการวง: {group.managers.join(', ')}</Typography>
                )}
                {group.principalMembers.length > 0 && (
                  <Typography sx={{ mt: 1 }}>
                    สมาชิกหลัก: {group.principalMembers.join(', ')}
                  </Typography>
                )}
              </Box>

              {roles.length > 0 && (
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    บทบาทและเครื่องดนตรี
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
                    {roles.map((role) => (
                      <Chip key={role} label={role} variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>

            {group.personnel.length > 0 && (
              <Box sx={{ mt: 5 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  justifyContent="space-between"
                  sx={{ mb: 2 }}
                >
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>
                      บุคลากรในวง
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      พบ {filteredPersonnel.length} จาก {group.personnel.length} คน
                    </Typography>
                  </Box>
                  <TextField
                    value={personnelSearch}
                    onChange={(event) => setPersonnelSearch(event.target.value)}
                    placeholder="ค้นหาชื่อ ตำแหน่ง หรือการศึกษา"
                    size="small"
                    sx={{ width: { xs: 1, sm: 340 } }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Iconify icon="eva:search-fill" width={20} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Stack>

                {filteredPersonnel.length > 0 ? (
                  <Box
                    sx={{
                      gap: 2,
                      pb: 2,
                      display: 'grid',
                      overflowX: 'auto',
                      scrollSnapType: 'x mandatory',
                      gridAutoFlow: 'column',
                      gridAutoColumns: {
                        xs: 'minmax(260px, 84vw)',
                        sm: 'minmax(280px, 42vw)',
                        lg: 'minmax(300px, 31%)',
                      },
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'rgba(42,55,54,0.35) transparent',
                      '&::-webkit-scrollbar': { height: 8 },
                      '&::-webkit-scrollbar-thumb': {
                        borderRadius: 999,
                        bgcolor: 'rgba(42,55,54,0.35)',
                      },
                    }}
                  >
                    {filteredPersonnel.map((person) => (
                      <Box
                        key={person.id}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          scrollSnapAlign: 'start',
                          bgcolor: 'rgba(111,135,144,0.08)',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Box
                          component="img"
                          src={person.imageUrl}
                          alt={person.fullName}
                          loading="lazy"
                          sx={{
                            width: '100%',
                            display: 'block',
                            aspectRatio: '1 / 1',
                            objectFit: 'cover',
                            borderRadius: 1.5,
                          }}
                        />
                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1.5 }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 900 }}>{person.fullName}</Typography>
                            <Typography variant="body2" color="secondary.main">
                              {person.role}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {person.nickname ? `ชื่อเล่น ${person.nickname} · ` : ''}
                              อายุ {person.age} ปี
                            </Typography>
                          </Box>
                        </Stack>
                        <Typography variant="body2" sx={{ mt: 1.5 }}>
                          อยู่กับวง {person.yearsWithGroup} ปี
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          การศึกษา: {person.education}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                          {person.otherDetails}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box
                    sx={{
                      py: 6,
                      px: 2,
                      textAlign: 'center',
                      borderRadius: 2,
                      bgcolor: 'rgba(111,135,144,0.08)',
                      border: '1px dashed',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography sx={{ fontWeight: 800 }}>ไม่พบบุคลากรที่ค้นหา</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      ลองค้นหาด้วยชื่อ ชื่อเล่น หรือตำแหน่งอื่น
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {group.yearlyData.length > 0 && (
              <Box
                component="section"
                sx={{
                  mt: 5,
                  mx: { xs: -1, md: -2 },
                  p: { xs: 1, md: 3 },
                  borderRadius: 3,
                  bgcolor: { xs: 'none', md: 'rgba(111,135,144,0.07)' },
                }}
              >
                <Typography variant="overline" sx={{ color: 'secondary.main', fontWeight: 900 }}>
                  YEARLY ARCHIVE
                </Typography>
                <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 950 }}>
                  ผลงานและข้อมูลรายปี
                </Typography>
                <Typography sx={{ mt: 1, mb: 3, maxWidth: 720, color: 'text.secondary' }}>
                  ย้อนดูเรื่องราว ศิลปินนำ ภาพการแสดง วิดีโอ และรางวัลที่วงได้รับในแต่ละปี
                </Typography>
                <Box
                  sx={{
                    mb: 3,
                    pb: 1,
                    display: 'flex',
                    gap: 1,
                    overflowX: 'auto',
                    scrollbarWidth: 'thin',
                  }}
                >
                  {[...group.yearlyData]
                    .sort((first, second) => Number(second.year) - Number(first.year))
                    .map((record) => {
                      const isSelected = record.year === selectedYear;

                      return (
                        <Button
                          key={record.year}
                          type="button"
                          variant={isSelected ? 'contained' : 'outlined'}
                          onClick={() => setSelectedYear(record.year)}
                          aria-pressed={isSelected}
                          sx={{
                            minWidth: 92,
                            flexShrink: 0,
                            fontWeight: 900,
                            ...(isSelected && {
                              bgcolor: group.primaryColor || '#637e69',
                              '&:hover': { bgcolor: group.primaryColor || '#637e69' },
                            }),
                          }}
                        >
                          ปี {record.year}
                        </Button>
                      );
                    })}
                </Box>
                <Stack
                  spacing={{ xs: 3, md: 4 }}
                  sx={{
                    position: 'relative',
                    '&::before': {
                      content: '""',
                      top: 20,
                      bottom: 20,
                      left: { md: -25 },
                      width: 2,
                      display: { xs: 'none', md: 'block' },
                      position: 'absolute',
                      bgcolor: 'rgba(99,126,105,0.24)',
                    },
                  }}
                >
                  {group.yearlyData
                    .filter((record) => record.year === selectedYear)
                    .map((record, index) => (
                      <Box
                        key={`${record.year}-${index}`}
                        sx={{
                          p: { xs: 2, md: 3 },
                          overflow: 'hidden',
                          position: 'relative',
                          borderRadius: 3,
                          border: '1px solid rgba(42,55,54,0.16)',
                          bgcolor: '#fff',
                          boxShadow: '0 20px 50px rgba(42,55,54,0.11)',
                          transition: 'transform 180ms ease, box-shadow 180ms ease',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 26px 60px rgba(42,55,54,0.15)',
                          },
                        }}
                      >
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={2}
                          alignItems={{ xs: 'flex-start', sm: 'center' }}
                          justifyContent="space-between"
                          sx={{
                            mx: { xs: -2, md: -3 },
                            mt: { xs: -2, md: -3 },
                            mb: { xs: 2, md: 3 },
                            px: { xs: 2, md: 3 },
                            py: 2.25,
                            color: '#f8f6ee',
                            background: `linear-gradient(135deg, ${group.primaryColor || '#637e69'}, #2a3736)`,
                          }}
                        >
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            {record.logoUrl ? (
                              <Avatar
                                variant="circular"
                                src={record.logoUrl}
                                alt={`โลโก้ปี ${record.year}`}
                                sx={{ width: 60, height: 60, bgcolor: 'rgba(255,255,255,0.16)' }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  width: 56,
                                  height: 56,
                                  display: 'grid',
                                  flexShrink: 0,
                                  placeItems: 'center',
                                  borderRadius: 1.5,
                                  bgcolor: 'rgba(255,255,255,0.14)',
                                  fontWeight: 950,
                                }}
                              >
                                {record.year.slice(-2)}
                              </Box>
                            )}
                            <Box>
                              <Typography variant="overline" sx={{ opacity: 0.7, fontWeight: 900 }}>
                                YEARLY HIGHLIGHT
                              </Typography>
                              <Typography variant="h4" sx={{ fontWeight: 950 }}>
                                ปี {record.year}
                              </Typography>
                            </Box>
                          </Stack>
                          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            <Chip
                              label={`${record.performanceImages?.length ?? 0} ภาพ`}
                              size="small"
                              sx={{ color: '#f8f6ee', bgcolor: 'rgba(255,255,255,0.14)' }}
                            />
                            <Chip
                              label={`${record.awards.length} รางวัล`}
                              size="small"
                              sx={{ color: '#f8f6ee', bgcolor: 'rgba(255,255,255,0.14)' }}
                            />
                          </Stack>
                        </Stack>
                        {record.organizerName && (
                          <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                            sx={{
                              mb: 2.5,
                              p: 1.75,
                              width: 'fit-content',
                              minWidth: { sm: 320 },
                              borderRadius: 2,
                              bgcolor: `${record.organizerColor || '#637e69'}14`,
                              border: '1px solid',
                              borderColor: `${record.organizerColor || '#637e69'}45`,
                              borderLeft: `5px solid ${record.organizerColor || '#637e69'}`,
                            }}
                          >
                            <Avatar
                              variant="rounded"
                              src={record.organizerLogoUrl}
                              alt={record.organizerName}
                              sx={{
                                width: 52,
                                height: 52,
                                bgcolor: record.organizerColor || '#637e69',
                              }}
                            >
                              {record.organizerName.slice(0, 1)}
                            </Avatar>
                            <Box>
                              <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary', fontWeight: 800 }}
                              >
                                ผู้จัดการแสดงประจำปี
                              </Typography>
                              <Typography sx={{ fontWeight: 950 }}>
                                {record.organizerName}
                              </Typography>
                            </Box>
                          </Stack>
                        )}
                        {record.contestEventIds?.length ? (
                          <Box sx={{ mb: 2.5 }}>
                            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 900 }}>
                              การประกวดที่เข้าร่วม
                            </Typography>
                            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                              {record.contestEventIds.map((eventId) => {
                                const eventItem = contestEvents.find((item) => item.id === eventId);
                                const resultLabels = (record.contestResultIds?.[eventId] ?? []).map(
                                  (resultId) =>
                                    eventItem?.contestResultOptions?.find(
                                      (option) => option.id === resultId
                                    )?.name ?? resultId
                                );
                                const eventCast = [
                                  {
                                    label: 'นักร้องนำ',
                                    ids: record.contestSingerIds?.[eventId] ?? [],
                                    color: '#a85f38',
                                  },
                                  {
                                    label: 'นักแสดงนำ',
                                    ids: record.contestLeadPerformerIds?.[eventId] ?? [],
                                    color: '#4e7560',
                                  },
                                ];
                                return (
                                  <Box
                                    key={eventId}
                                    sx={{
                                      p: 1.25,
                                      borderRadius: 1.5,
                                      bgcolor: 'background.neutral',
                                      border: '1px solid',
                                      borderColor: 'divider',
                                      width: { xs: 1 },
                                    }}
                                  >
                                    <Button
                                      component={RouterLink}
                                      href={paths.event.details(eventId)}
                                      variant="outlined"
                                      aria-label={`ดูรายละเอียด ${eventItem?.title || 'การประกวด'}`}
                                      sx={{
                                        position: 'relative',
                                        width: 1,
                                        minHeight: { xs: 148, md: 100 },
                                        px: 2,
                                        py: 2,
                                        gap: 1,
                                        flexDirection: { xs: 'column', md: 'row' },
                                        justifyContent: { xs: 'center', md: 'flex-start' },
                                        borderRadius: 1.5,
                                      }}
                                    >
                                      {eventItem?.logoUrl ? (
                                        <Avatar
                                          variant="rounded"
                                          src={eventItem.logoUrl}
                                          alt={eventItem.title}
                                          sx={{
                                            width: 64,
                                            height: 64,
                                            bgcolor: 'common.white',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                          }}
                                        />
                                      ) : (
                                        <Avatar
                                          variant="rounded"
                                          sx={{ width: 64, height: 64, bgcolor: 'primary.lighter' }}
                                        >
                                          <Iconify icon="solar:cup-star-bold" width={30} />
                                        </Avatar>
                                      )}
                                      <Typography
                                        component="span"
                                        variant="subtitle2"
                                        sx={{
                                          maxWidth: 1,
                                          color: 'text.primary',
                                          fontWeight: 900,
                                          lineHeight: 1.45,
                                          mr: { xs: 0, md: 2 },
                                          display: '-webkit-box',
                                          overflow: 'hidden',
                                          WebkitBoxOrient: 'vertical',
                                          WebkitLineClamp: 2,
                                        }}
                                      >
                                        {eventItem?.title || 'ดูรายละเอียดการประกวด'}
                                      </Typography>
                                      <Iconify
                                        icon="eva:arrow-ios-forward-fill"
                                        width={22}
                                        sx={{
                                          position: 'absolute',
                                          top: '50%',
                                          right: 12,
                                          transform: 'translateY(-50%)',
                                        }}
                                      />
                                    </Button>
                                    {resultLabels.length > 0 && (
                                      <Stack
                                        direction="row"
                                        spacing={0.75}
                                        useFlexGap
                                        flexWrap="wrap"
                                        sx={{ mt: 1 }}
                                      >
                                        {resultLabels.map((resultLabel) => (
                                          <Chip
                                            key={resultLabel}
                                            size="small"
                                            icon={
                                              <Iconify
                                                icon={'solar:medal-ribbons-star-bold' as never}
                                              />
                                            }
                                            label={resultLabel}
                                            sx={{
                                              color: '#6b4700',
                                              bgcolor: '#f3dda0',
                                              fontWeight: 850,
                                            }}
                                          />
                                        ))}
                                      </Stack>
                                    )}
                                    {eventCast.some((castGroup) => castGroup.ids.length > 0) && (
                                      <Box
                                        sx={{
                                          mt: 1.25,
                                          pt: 1.25,
                                          borderTop: '1px solid',
                                          borderColor: 'divider',
                                        }}
                                      >
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                          sx={{ fontWeight: 800 }}
                                        >
                                          บุคลากรหลักของรายการนี้
                                        </Typography>
                                        <Stack spacing={1} sx={{ mt: 0.75 }}>
                                          {eventCast.map((castGroup) => {
                                            const people = group.personnel.filter((person) =>
                                              castGroup.ids.includes(person.id)
                                            );
                                            if (!people.length) return null;

                                            return (
                                              <Stack
                                                key={castGroup.label}
                                                direction="row"
                                                spacing={0.75}
                                                useFlexGap
                                                flexWrap="wrap"
                                                alignItems="center"
                                              >
                                                <Typography
                                                  variant="caption"
                                                  sx={{ color: castGroup.color, fontWeight: 900 }}
                                                >
                                                  {castGroup.label}
                                                </Typography>
                                                {people.map((person) => (
                                                  <Chip
                                                    key={person.id}
                                                    size="small"
                                                    avatar={
                                                      <Avatar
                                                        src={person.imageUrl || undefined}
                                                        alt={person.fullName}
                                                      >
                                                        {person.fullName.slice(0, 1)}
                                                      </Avatar>
                                                    }
                                                    label={person.fullName}
                                                    sx={{ fontWeight: 800 }}
                                                  />
                                                ))}
                                              </Stack>
                                            );
                                          })}
                                        </Stack>
                                      </Box>
                                    )}
                                  </Box>
                                );
                              })}
                            </Stack>
                          </Box>
                        ) : null}
                        {record.about && <Typography sx={{ mt: 1 }}>{record.about}</Typography>}
                        {record.details && (
                          <Typography sx={{ mt: 0.75, color: 'text.secondary' }}>
                            {record.details}
                          </Typography>
                        )}
                        {record.note && (
                          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                            หมายเหตุ: {record.note}
                          </Typography>
                        )}
                        {record.storyTypes?.length ? (
                          <Stack
                            direction="row"
                            spacing={1}
                            useFlexGap
                            flexWrap="wrap"
                            sx={{ mt: 1.5 }}
                          >
                            {record.storyTypes.map((storyType) => (
                              <Chip
                                key={storyType}
                                label={storyType}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Stack>
                        ) : null}
                        {record.singerIds?.length || record.leadPerformerIds?.length ? (
                          <Box sx={{ mt: 2.5 }}>
                            <Box
                              sx={{
                                mb: 1.75,
                                p: 2,
                                borderRadius: 2,
                                color: '#f8f6ee',
                                background: `linear-gradient(135deg, ${group.primaryColor || '#637e69'}, #2a3736)`,
                              }}
                            >
                              <Typography
                                variant="overline"
                                sx={{ opacity: 0.76, fontWeight: 900 }}
                              >
                                CAST OF THE YEAR · {record.year}
                              </Typography>
                              <Typography variant="h5" sx={{ mt: 0.25, fontWeight: 950 }}>
                                นักร้องนำและนักแสดงนำประจำปี {record.year}
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.76 }}>
                                รายชื่อผู้รับบทบาทหลักในการแสดงและผลงานของวงในปีนี้
                              </Typography>
                            </Box>

                            <Box
                              sx={{
                                gap: 1.5,
                                display: 'grid',
                                gridTemplateColumns: {
                                  xs: '1fr',
                                  sm: 'repeat(2, minmax(0, 1fr))',
                                  lg: 'repeat(3, minmax(0, 1fr))',
                                },
                              }}
                            >
                              {[
                                {
                                  title: 'นักร้องนำ',
                                  ids: record.singerIds ?? [],
                                  color: '#a85f38',
                                  tint: 'rgba(168,95,56,0.1)',
                                },
                                {
                                  title: 'นักแสดงนำ',
                                  ids: record.leadPerformerIds ?? [],
                                  color: '#4e7560',
                                  tint: 'rgba(78,117,96,0.1)',
                                },
                              ].flatMap((leadGroup) =>
                                group.personnel
                                  .filter((person) => leadGroup.ids.includes(person.id))
                                  .map((person) => (
                                    <Box
                                      key={`${leadGroup.title}-${person.id}`}
                                      sx={{
                                        p: 1.75,
                                        minWidth: 0,
                                        borderRadius: 2,
                                        bgcolor: leadGroup.tint,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderLeft: `5px solid ${leadGroup.color}`,
                                        boxShadow: '0 8px 24px rgba(42,55,54,0.06)',
                                      }}
                                    >
                                      <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Avatar
                                          variant="rounded"
                                          src={person.imageUrl}
                                          alt={person.fullName}
                                          sx={{ width: 76, height: 76, flexShrink: 0 }}
                                        />
                                        <Box sx={{ minWidth: 0 }}>
                                          <Chip
                                            label={leadGroup.title}
                                            size="small"
                                            sx={{
                                              mb: 0.75,
                                              color: '#fff',
                                              fontWeight: 900,
                                              bgcolor: leadGroup.color,
                                            }}
                                          />
                                          <Typography sx={{ fontSize: 16, fontWeight: 950 }}>
                                            {person.fullName}
                                          </Typography>
                                          <Typography variant="body2" color="text.secondary">
                                            {person.nickname
                                              ? `ชื่อเล่น ${person.nickname}`
                                              : person.role}
                                          </Typography>
                                        </Box>
                                      </Stack>
                                    </Box>
                                  ))
                              )}
                            </Box>
                          </Box>
                        ) : null}
                        {record.performanceImages?.length ? (
                          <Box sx={{ mt: 3 }}>
                            <Typography sx={{ mb: 1.25, fontWeight: 900 }}>ภาพการแสดง</Typography>
                            <Box
                              sx={{
                                gap: 1,
                                display: 'grid',
                                gridTemplateColumns: {
                                  xs: '1fr',
                                  sm: 'repeat(3, minmax(0, 1fr))',
                                },
                              }}
                            >
                              {record.performanceImages.map((imageUrl, imageIndex) => (
                                <Box
                                  key={`${imageUrl}-${imageIndex}`}
                                  component="img"
                                  src={imageUrl}
                                  loading="lazy"
                                  alt={`ภาพการแสดง ${group.name} ปี ${record.year}`}
                                  sx={{
                                    width: 1,
                                    aspectRatio: '4 / 3',
                                    objectFit: 'cover',
                                    borderRadius: 1.5,
                                    transition: 'transform 180ms ease',
                                    '&:hover': { transform: 'scale(1.02)' },
                                  }}
                                />
                              ))}
                            </Box>
                          </Box>
                        ) : null}
                        {record.bookletUrl && (
                          <Button
                            component="a"
                            href={record.bookletUrl}
                            target="_blank"
                            variant="outlined"
                            size="small"
                            sx={{ mt: 1.5 }}
                          >
                            เปิดสูจิบัตร {record.bookletName ? `(${record.bookletName})` : ''}
                          </Button>
                        )}
                        {record.youtubeUrl && (
                          <Box sx={{ mt: 2.5 }}>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              sx={{ mb: 1.25 }}
                            >
                              <Iconify icon="solar:video-frame-play-horizontal-bold" width={24} />
                              <Typography sx={{ fontWeight: 900 }}>วิดีโอการแสดง</Typography>
                            </Stack>
                            <Box
                              sx={{
                                width: 1,
                                aspectRatio: '16 / 9',
                                overflow: 'hidden',
                                borderRadius: 2,
                                bgcolor: '#1f2928',
                                border: '1px solid rgba(42,55,54,0.18)',
                                boxShadow: '0 16px 38px rgba(31,40,38,0.16)',
                                '& > div': { width: '100% !important', height: '100% !important' },
                              }}
                            >
                              <ReactPlayer
                                src={record.youtubeUrl}
                                light={record.performanceImages?.[0] || true}
                                controls
                                width="100%"
                                height="100%"
                                playIcon={<HomePlayButton />}
                                previewAriaLabel={`เล่นวิดีโอการแสดง ${group.name} ปี ${record.year}`}
                              />
                            </Box>
                          </Box>
                        )}
                        {record.awards.length > 0 && (
                          <Box sx={{ mt: 2.5 }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                              <Iconify
                                icon="solar:cup-star-bold"
                                width={24}
                                sx={{ color: '#b56a00' }}
                              />
                              <Typography sx={{ fontWeight: 900, color: '#5b431d' }}>
                                รางวัลที่ได้รับ
                              </Typography>
                            </Stack>
                            <Stack spacing={1.5}>
                              {record.awards.map((award) => (
                                <Box
                                  key={`${award.year}-${award.title}`}
                                  sx={{
                                    p: { xs: 2, md: 2.5 },
                                    overflow: 'hidden',
                                    position: 'relative',
                                    borderRadius: 2,
                                    border: '1px solid rgba(196,126,24,0.24)',
                                    background:
                                      'linear-gradient(135deg, rgba(255,246,224,0.98), rgba(250,229,181,0.58))',
                                    boxShadow: '0 10px 28px rgba(132,86,20,0.08)',
                                    '&::before': {
                                      content: '""',
                                      position: 'absolute',
                                      inset: '0 auto 0 0',
                                      width: 5,
                                      bgcolor: '#c47e18',
                                    },
                                  }}
                                >
                                  <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={{ xs: 0.75, sm: 1.5 }}
                                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                                  >
                                    <Box
                                      sx={{
                                        px: 1.25,
                                        py: 0.45,
                                        flexShrink: 0,
                                        borderRadius: 999,
                                        color: '#fff8e8',
                                        bgcolor: '#b56a00',
                                        fontSize: 13,
                                        fontWeight: 900,
                                      }}
                                    >
                                      {award.year}
                                    </Box>
                                    <Typography
                                      sx={{
                                        color: '#754700',
                                        fontSize: { xs: 17, md: 19 },
                                        fontWeight: 900,
                                        lineHeight: 1.4,
                                      }}
                                    >
                                      {award.title}
                                    </Typography>
                                  </Stack>
                                  {award.description && (
                                    <Typography
                                      sx={{
                                        mt: 1.25,
                                        pl: { sm: 0 },
                                        color: '#6d7885',
                                        lineHeight: 1.7,
                                      }}
                                    >
                                      {award.description}
                                    </Typography>
                                  )}
                                </Box>
                              ))}
                            </Stack>
                          </Box>
                        )}
                      </Box>
                    ))}
                </Stack>
              </Box>
            )}
          </Box>

          <Box sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
            {(group.sourceLabel || group.sourceUrl || group.updatedAt) && (
              <Box>
                {(group.sourceLabel || group.sourceUrl) && (
                  <Stack spacing={1} alignItems="flex-start">
                    <Typography
                      variant="overline"
                      sx={{ color: 'text.secondary', fontWeight: 900 }}
                    >
                      ที่มาของข้อมูล
                    </Typography>
                    {group.sourceUrl ? (
                      <Button
                        component="a"
                        href={group.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="contained"
                        endIcon={<Iconify icon="eva:external-link-fill" />}
                        sx={{
                          color: '#fff',
                          bgcolor: '#1d2933',
                          fontWeight: 900,
                          '&:hover': { bgcolor: '#111c25' },
                        }}
                      >
                        {group.sourceLabel || 'ดูข้อมูลจากแหล่งต้นทาง'}
                      </Button>
                    ) : (
                      <Typography sx={{ fontWeight: 800 }}>{group.sourceLabel}</Typography>
                    )}
                  </Stack>
                )}
                {group.updatedAt && (
                  <Stack
                    direction="row"
                    spacing={0.75}
                    alignItems="center"
                    sx={{
                      mt: group.sourceLabel || group.sourceUrl ? 2 : 0,
                      color: 'text.secondary',
                    }}
                  >
                    <Iconify icon="solar:calendar-date-bold" width={18} />
                    <Typography variant="body2">
                      อัปเดตล่าสุด {formatUpdatedDate(group.updatedAt)}
                    </Typography>
                  </Stack>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
