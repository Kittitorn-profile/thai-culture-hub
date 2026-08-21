'use client';

import type { PerformanceGroupEntry } from 'src/sections/home/components/home-types';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

type Props = {
  group: PerformanceGroupEntry;
};

export function PerformanceGroupMembersSummary({ group }: Props) {
  const roles = [...group.leadRoles, ...group.otherPositions];

  return (
    <Box
      sx={{
        mt: { xs: 3, md: 4 },
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
          <Typography sx={{ mt: 1 }}>สมาชิกหลัก: {group.principalMembers.join(', ')}</Typography>
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
  );
}

export function PerformanceGroupPersonnelList({ group }: Props) {
  const [personnelSearch, setPersonnelSearch] = useState('');

  const normalizedPersonnelSearch = personnelSearch.trim().toLocaleLowerCase('th');
  const filteredPersonnel = useMemo(
    () =>
      normalizedPersonnelSearch
        ? group.personnel.filter((person) =>
            [
              person.fullName,
              person.nickname,
              person.role,
              person.education,
              person.otherDetails,
            ].some((value) => value.toLocaleLowerCase('th').includes(normalizedPersonnelSearch))
          )
        : group.personnel,
    [group.personnel, normalizedPersonnelSearch]
  );

  if (group.personnel.length === 0) return null;

  return (
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
              sm: 'minmax(200px, 42vw)',
              lg: 'minmax(200px, 31%)',
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
                  <Typography sx={{ fontWeight: 900 }}>
                    {person.nickname || ''} - {person.fullName}
                  </Typography>
                  <Typography variant="body2" color="secondary.main">
                    {person.role}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    อายุ {person.age > 0 ? `${person.age} ปี` : '-'}
                  </Typography>
                </Box>
              </Stack>
              {person.yearsWithGroup > 0 && (
                <Typography variant="body2" sx={{ mt: 1.5 }}>
                  อยู่กับวง {person.yearsWithGroup > 0 ? `${person.yearsWithGroup} ปี` : '-'}
                </Typography>
              )}

              <Typography variant="body2" sx={{ mt: 0.5 }}>
                การศึกษา: {person.education || '-'}
              </Typography>
              {person.otherDetails && (
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  {person.otherDetails}
                </Typography>
              )}
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
  );
}
