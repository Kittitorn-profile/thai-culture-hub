'use client';

import type { HomeEventItem, PerformanceGroupEntry } from 'src/sections/home/components/home-types';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';
import { trackAnalyticsEvent } from 'src/components/analytics';

import { MOCK_PERFORMANCE_GROUPS } from 'src/sections/home/components/home-mock-data';
import { normalizePerformanceGroupsContent } from 'src/sections/home/components/home-utils';
import { PERFORMANCE_GROUPS_SECTION_KEY } from 'src/sections/home/components/home-constants';

import { PerformanceGroupHeader } from '../components/performance-group-header';
import { PerformanceGroupRelated } from '../components/performance-group-related';
import { findGroup, getRandomRelatedGroups } from '../components/performance-group-utils';
import { PerformanceGroupSourceFooter } from '../components/performance-group-source-footer';
import { PerformanceGroupYearlyArchive } from '../components/performance-group-yearly-archive';
import {
  PerformanceGroupPersonnelList,
  PerformanceGroupMembersSummary,
} from '../components/performance-group-personnel';

type Props = {
  groupId: string;
  initialGroup?: PerformanceGroupEntry;
};

export function PerformanceGroupDetailView({ groupId, initialGroup }: Props) {
  const [group, setGroup] = useState<PerformanceGroupEntry | undefined>(initialGroup);
  const [isLoading, setIsLoading] = useState(true);
  const [counts, setCounts] = useState({ views: 0, shares: 0 });
  const [selectedYear, setSelectedYear] = useState(initialGroup?.yearlyData[0]?.year ?? '');
  const [contestEvents, setContestEvents] = useState<HomeEventItem[]>([]);
  const [relatedGroups, setRelatedGroups] = useState<PerformanceGroupEntry[]>([]);

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
          | Parameters<typeof normalizePerformanceGroupsContent>[0]
          | undefined;
        const content = normalizePerformanceGroupsContent(draft);
        const nextGroup =
          findGroup(content, groupId) ?? findGroup(MOCK_PERFORMANCE_GROUPS, groupId);

        setGroup(nextGroup);
        setRelatedGroups(
          nextGroup
            ? getRandomRelatedGroups(content?.groups ?? MOCK_PERFORMANCE_GROUPS.groups, nextGroup)
            : []
        );
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

    const loadCounts = () => {
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
    };

    loadCounts();
    const refreshTimer = window.setTimeout(loadCounts, 1200);

    return () => {
      window.clearTimeout(refreshTimer);
      controller.abort();
    };
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

  const handleShare = (platform: 'facebook' | 'line') => {
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
          xs: 3,
          md: 4,
        },
        pb: { xs: 5, md: 9 },
        overflow: 'hidden',
        position: 'relative',
        bgcolor: '#f7f7f5',
        backgroundImage: 'none',
        fontFamily: "'LINE Seed Sans TH', sans-serif",
      }}
    >
      <Container
        maxWidth={false}
        sx={{ maxWidth: 1408, px: { xs: 2.5, sm: 4, md: 6 }, position: 'relative' }}
      >
        <Button
          component={RouterLink}
          href="/"
          color="inherit"
          startIcon={<Iconify icon="eva:arrowhead-left-fill" width={18} />}
          sx={{
            mb: 2.5,
            px: 1.5,
            color: '#202124',
            bgcolor: 'transparent',
            '&:hover': { bgcolor: '#eeefec' },
          }}
        >
          กลับหน้าแรก
        </Button>

        <Box
          sx={{
            minWidth: 0,
          }}
        >
          <PerformanceGroupHeader group={group} counts={counts} onShare={handleShare} />

          <Box sx={{ pt: { xs: 3, md: 4 }, pb: { xs: 2.5, md: 4 } }}>
            <Box
              component="nav"
              aria-label="ส่วนข้อมูลวง"
              sx={{
                display: 'flex',
                gap: 1,
                overflowX: 'auto',
                py: 1.5,
                borderTop: '1px solid',
                borderBottom: '1px solid',
                borderColor: 'divider',
                '& .MuiButton-root': {
                  flexShrink: 0,
                  minHeight: 44,
                  fontWeight: 500,
                  px: 2,
                  '&:hover': { bgcolor: '#e9ede6', color: '#293c34' },
                },
              }}
            >
              {Boolean(
                group.totalMembers ||
                group.managers.length ||
                group.principalMembers.length ||
                group.leadRoles.length ||
                group.otherPositions.length
              ) && (
                <Button href="#group-members" color="inherit">
                  ข้อมูลสมาชิก
                </Button>
              )}
              {group.personnel.length > 0 && (
                <Button href="#group-personnel" color="inherit">
                  บุคลากรในวง
                </Button>
              )}
              {group.yearlyData.length > 0 && (
                <Button href="#group-archive" color="inherit">
                  ผลงานรายปี
                </Button>
              )}
              {relatedGroups.length > 0 && (
                <Button href="#group-related" color="inherit">
                  วงที่เกี่ยวข้อง
                </Button>
              )}
            </Box>
            <PerformanceGroupMembersSummary group={group} />
            <PerformanceGroupPersonnelList group={group} />
            <PerformanceGroupYearlyArchive
              group={group}
              contestEvents={contestEvents}
              selectedYear={selectedYear}
              onSelectYear={setSelectedYear}
            />
          </Box>

          <PerformanceGroupSourceFooter group={group} />
        </Box>

        <PerformanceGroupRelated category={group.category} relatedGroups={relatedGroups} />
      </Container>
    </Box>
  );
}
