'use client';

import type { HomeEventItem, PerformanceGroupEntry } from 'src/sections/home/components/home-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { PerformanceGroupYearlyRecordCard } from './performance-group-yearly-record';

type Props = {
  group: PerformanceGroupEntry;
  contestEvents: HomeEventItem[];
  selectedYear: string;
  onSelectYear: (year: string) => void;
};

export function PerformanceGroupYearlyArchive({
  group,
  contestEvents,
  selectedYear,
  onSelectYear,
}: Props) {
  if (group.yearlyData.length === 0) return null;

  const sortedYears = [...group.yearlyData].sort(
    (first, second) => Number(second.year) - Number(first.year)
  );

  return (
    <Box
      component="section"
      id="group-archive"
      sx={{
        mt: 4,
        scrollMarginTop: 112,
        pt: 4,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="overline" sx={{ color: '#79613b', fontWeight: 600 }}>
        บันทึกการแสดง
      </Typography>
      <Typography component="h2" sx={{ mt: 0.5, fontSize: { xs: 24, md: 30 }, fontWeight: 600 }}>
        ผลงานและข้อมูลรายปี
      </Typography>
      <Typography sx={{ mt: 1, mb: 2, maxWidth: 720, color: 'text.secondary' }}>
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
        {sortedYears.map((record) => {
          const isSelected = record.year === selectedYear;

          return (
            <Button
              key={record.year}
              type="button"
              variant={isSelected ? 'contained' : 'outlined'}
              onClick={() => onSelectYear(record.year)}
              aria-pressed={isSelected}
              sx={{
                minWidth: 92,
                minHeight: 44,
                borderRadius: 1.5,
                flexShrink: 0,
                fontWeight: 600,
                ...(isSelected && {
                  color: '#fff',
                  bgcolor: '#293c34',
                  '&:hover': { bgcolor: '#3c5147' },
                }),
              }}
            >
              ปี {record.year}
            </Button>
          );
        })}
      </Box>
      <Stack spacing={{ xs: 3, md: 4 }}>
        {group.yearlyData
          .filter((record) => record.year === selectedYear)
          .map((record, index) => (
            <PerformanceGroupYearlyRecordCard
              key={`${record.year}-${index}`}
              group={group}
              record={record}
              contestEvents={contestEvents}
            />
          ))}
      </Stack>
    </Box>
  );
}
