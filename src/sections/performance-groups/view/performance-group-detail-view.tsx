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
          <PerformanceGroupHeader group={group} counts={counts} onShare={handleShare} />

          <Box sx={{ px: { xs: 2.5, md: 3 }, pt: 0, pb: { xs: 2.5, md: 5 } }}>
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
