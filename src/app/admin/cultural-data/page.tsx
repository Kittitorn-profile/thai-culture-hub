'use client';

import type { OverviewSection } from 'src/server/cultural-data-overview';

import { useQuery } from '@tanstack/react-query';
import { RiDatabase2Line, RiArrowRightUpLine } from '@remixicon/react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { adminApiRequest } from 'src/lib/admin-api';
import { DashboardContent } from 'src/layouts/dashboard';

import { useAuthContext } from 'src/auth/hooks';
import { type AdminPermission, canAccessAdminPermission } from 'src/auth/admin-permissions';

const countText = (count: number | null) =>
  count === null ? 'ตรวจไม่ได้' : count.toLocaleString('th-TH');
export default function CulturalDataOverviewPage() {
  const { user } = useAuthContext();
  const token = user?.accessToken ?? user?.access_token ?? '';
  const overview = useQuery({
    queryKey: ['admin-cultural-data-overview', token],
    enabled: Boolean(token),
    queryFn: ({ signal }) =>
      adminApiRequest<{
        sections: OverviewSection[];
        categorySettingsCount: number | null;
        checkedAt: string;
      }>('/api/admin/cultural-data-overview', { accessToken: token, signal }),
    staleTime: 60_000,
    retry: 1,
  });
  return (
    <DashboardContent maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box>
          <Typography component="h1" variant="h4">
            ภาพรวมชุดข้อมูลวัฒนธรรม
          </Typography>
          <Typography sx={{ color: 'text.secondary', mt: 1 }}>
            ข้อมูลประเภทไหน อยู่หมวดใด มีเท่าไร และมาจากแหล่งไหน
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          disabled={overview.isFetching}
          onClick={() => overview.refetch()}
          sx={{ flexShrink: 0, alignSelf: 'start' }}
        >
          {overview.isFetching ? 'กำลังตรวจ…' : 'ตรวจจำนวนใหม่'}
        </Button>
      </Box>
      {overview.isPending && <Alert severity="info">กำลังนับข้อมูลและตรวจหมวดจากต้นทาง…</Alert>}
      {overview.isError && <Alert severity="error">{overview.error.message}</Alert>}
      {!!overview.data && (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(5, 1fr)' },
              gap: 2,
              mb: 3,
            }}
          >
            {overview.data.sections.map((section) => (
              <Box
                component="a"
                href={`#${section.key}`}
                key={section.key}
                sx={{
                  p: 2.5,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  color: 'inherit',
                  textDecoration: 'none',
                  '&:hover': { borderColor: '#608d8c' },
                }}
              >
                <RiDatabase2Line size={22} />
                <Typography sx={{ fontSize: 13, mt: 1 }}>{section.title}</Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 700, mt: 1 }}>
                  {countText(section.total)}
                </Typography>
              </Box>
            ))}
          </Box>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 3 }}>
            ตรวจเมื่อ{' '}
            {new Intl.DateTimeFormat('th-TH', {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'Asia/Bangkok',
            }).format(new Date(overview.data.checkedAt))}{' '}
            · จำนวนแต่ละกลุ่มนับคนละหน่วยและอาจซ้อนกัน จึงไม่ควรนำมาบวกรวม
          </Typography>
          {overview.data.sections.map((section) => (
            <Card
              id={section.key}
              key={section.key}
              sx={{ p: { xs: 2, md: 3 }, mb: 3, scrollMarginTop: 100 }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 2 }}>
                <Box>
                  <Typography component="h2" variant="h5">
                    {section.title}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 1 }}>
                    {section.description}
                  </Typography>
                </Box>
                {canAccessAdminPermission(user, section.permission as AdminPermission) && (
                  <Button
                    component="a"
                    href={section.href}
                    size="small"
                    variant="outlined"
                    sx={{ flexShrink: 0, alignSelf: 'start' }}
                  >
                    ดูข้อมูลทั้งหมด
                  </Button>
                )}
              </Box>
              {section.error && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {section.error}
                </Alert>
              )}
              <TableContainer>
                <Table sx={{ minWidth: 620 }} aria-label={`หมวดข้อมูล ${section.title}`}>
                  <TableHead>
                    <TableRow>
                      <TableCell>หมวด / ประเภท</TableCell>
                      <TableCell align="right">จำนวน</TableCell>
                      <TableCell>แหล่งข้อมูล</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {section.rows.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell sx={{ fontWeight: 600 }}>{row.label}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {countText(row.count)}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, color: 'text.secondary', maxWidth: 350 }}>
                          {row.source || 'ดูแหล่งอ้างอิงในรายละเอียด'}
                        </TableCell>
                        <TableCell align="right">
                          {canAccessAdminPermission(
                            user,
                            section.permission as AdminPermission
                          ) && (
                            <Button
                              component="a"
                              href={row.href}
                              size="small"
                              endIcon={<RiArrowRightUpLine size={16} />}
                            >
                              ดูหมวดนี้
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography sx={{ fontSize: 12, fontWeight: 600, mt: 2 }}>แหล่งอ้างอิง</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {section.sources.map((source) => (
                  <Button
                    component="a"
                    key={`${source.label}:${source.url}`}
                    href={source.url}
                    size="small"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ fontSize: 12 }}
                  >
                    {source.label}
                  </Button>
                ))}
              </Box>
            </Card>
          ))}
          <Alert severity="info">
            ตั้งค่าหมวดสถานที่: {countText(overview.data.categorySettingsCount)} หมวดที่เปิดใช้งาน ·
            เป็นชื่อ สี ไอคอน และลำดับที่ระบบใช้จัดแสดง ไม่ใช่จำนวนเรื่องวัฒนธรรม{' '}
            <Button component="a" href="/admin/categories" size="small">
              ไปตั้งค่าหมวด
            </Button>
            <Button component="a" href="/admin/cultural-places/sync" size="small">
              ดูแหล่งนำเข้าและประวัติ Sync
            </Button>
          </Alert>
        </>
      )}
    </DashboardContent>
  );
}
