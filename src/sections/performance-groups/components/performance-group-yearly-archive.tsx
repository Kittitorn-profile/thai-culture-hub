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
