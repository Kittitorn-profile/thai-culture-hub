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
  if (
    !group.totalMembers &&
    !group.managers.length &&
    !group.principalMembers.length &&
    !roles.length
  )
    return null;

  return (
    <Box
      component="section"
      id="group-members"
      sx={{
        scrollMarginTop: 112,
        mt: 3,
        p: { xs: 2, md: 2.5 },
        bgcolor: '#f5f6f3',
        borderRadius: 2,
        gap: 2,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
      }}
    >
      <Box>
        <Typography component="h2" variant="h6" sx={{ fontWeight: 600 }}>
          ข้อมูลสมาชิก
        </Typography>
        <Typography sx={{ mt: 1, fontSize: 15 }}>สมาชิกทั้งหมด {group.totalMembers} คน</Typography>
        {group.managers.length > 0 && (
          <Typography sx={{ mt: 1, fontSize: 14, color: 'text.secondary' }}>
            ผู้จัดการวง: {group.managers.join(', ')}
          </Typography>
        )}
        {group.principalMembers.length > 0 && (
          <Typography sx={{ mt: 1, fontSize: 14, color: 'text.secondary' }}>
            สมาชิกหลัก: {group.principalMembers.join(', ')}
          </Typography>
        )}
      </Box>

      {roles.length > 0 && (
        <Box>
          <Typography component="h2" variant="h6" sx={{ fontWeight: 600 }}>
            บทบาทและเครื่องดนตรี
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
            {roles.map((role) => (
              <Chip key={role} label={role} size="small" variant="outlined" />
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
    <Box component="section" id="group-personnel" sx={{ mt: 4, scrollMarginTop: 112 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography component="h2" variant="h6" sx={{ fontWeight: 600 }}>
            บุคลากรในวง
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            พบ {filteredPersonnel.length} จาก {group.personnel.length} คน
          </Typography>
        </Box>
        <TextField
          value={personnelSearch}
          onChange={(event) => setPersonnelSearch(event.target.value)}
          label="ค้นหาบุคลากร"
          placeholder="ชื่อ ตำแหน่ง หรือการศึกษา"
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
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(4, minmax(0, 1fr))',
            },
            alignItems: 'start',
          }}
        >
          {filteredPersonnel.map((person) => (
            <Box
              key={person.id}
              sx={{
                p: 1.25,
                minWidth: 0,
                borderRadius: 2,
                bgcolor: '#fff',
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
                  aspectRatio: '4 / 5',
                  objectPosition: 'center top',
                  objectFit: 'cover',
                  borderRadius: 1.5,
                }}
              />
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1.5 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 16, overflowWrap: 'anywhere' }}>
                    {person.nickname ? `${person.nickname} · ` : ''}
                    {person.fullName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#52665a', mt: 0.25, fontSize: 12 }}>
                    {person.role}
                  </Typography>
                  {person.age > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      อายุ {person.age} ปี
                    </Typography>
                  )}
                </Box>
              </Stack>
              {person.yearsWithGroup > 0 && (
                <Typography variant="body2" sx={{ mt: 1.5 }}>
                  อยู่กับวง {person.yearsWithGroup > 0 ? `${person.yearsWithGroup} ปี` : '-'}
                </Typography>
              )}

              {person.education && (
                <Typography
                  variant="caption"
                  sx={{ mt: 0.5, display: 'block', color: 'text.secondary' }}
                >
                  การศึกษา: {person.education}
                </Typography>
              )}
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
            bgcolor: '#fafbf9',
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
