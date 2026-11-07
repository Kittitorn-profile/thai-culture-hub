'use client';

import type { PerformanceGroupYearlyRecord } from './performance-group-types';
import type { PerformanceGroupEntry } from 'src/sections/home/components/home-types';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

type Props = {
  group: PerformanceGroupEntry;
  record: PerformanceGroupYearlyRecord;
  primaryColor: string;
};

export function PerformanceGroupCastOfYear({ group, record }: Props) {
  const visibleIds = [...(record.singerIds ?? []), ...(record.leadPerformerIds ?? [])];
  if (!group.personnel.some((person) => visibleIds.includes(person.id))) return null;

  const leadGroups = [
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
  ];

  return (
    <Box sx={{ mt: 2.5 }}>
      <Box
        sx={{
          mb: 1.75,
          pt: 2.5,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="overline" sx={{ opacity: 0.76, fontWeight: 600 }}>
          บุคลากรประจำปี {record.year}
        </Typography>
        <Typography component="h3" variant="h6" sx={{ mt: 0.25, fontWeight: 600 }}>
          นักร้องนำและนักแสดงนำ
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
        {leadGroups.flatMap((leadGroup) =>
          group.personnel
            .filter((person) => leadGroup.ids.includes(person.id))
            .map((person) => (
              <Box
                key={`${leadGroup.title}-${person.id}`}
                sx={{
                  p: 1.75,
                  minWidth: 0,
                  borderRadius: 2,
                  bgcolor: '#f5f6f3',
                  border: 0,
                  boxShadow: 'none',
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar
                    variant="rounded"
                    src={person.imageUrl}
                    alt={person.fullName}
                    sx={{ width: 56, height: 56, flexShrink: 0 }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Chip
                      label={leadGroup.title}
                      size="small"
                      sx={{
                        mb: 0.75,
                        color: '#fff',
                        fontWeight: 600,
                        bgcolor: leadGroup.color,
                      }}
                    />
                    <Typography sx={{ fontSize: 16, fontWeight: 600 }}>
                      {person.fullName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {person.nickname ? `ชื่อเล่น ${person.nickname}` : person.role}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            ))
        )}
      </Box>
    </Box>
  );
}
