'use client';

import type { InventoryRow } from 'src/server/cultural-data-inventory';

import { useQuery } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { adminApiRequest } from 'src/lib/admin-api';

export function DataInventory({
  accessToken,
  provinceCode,
  provinceName,
}: {
  accessToken: string;
  provinceCode: string;
  provinceName: string;
}) {
  const inventory = useQuery({
    queryKey: ['admin-cultural-data-inventory', provinceCode, accessToken],
    enabled: Boolean(accessToken),
    queryFn: ({ signal }) =>
      adminApiRequest<{ data: InventoryRow[]; checkedAt: string }>(
        `/api/admin/cultural-data-inventory?${new URLSearchParams({ provinceCode })}`,
        { accessToken, signal }
      ),
    staleTime: 30_000,
    retry: 1,
  });
  const groups = [...new Set(inventory.data?.data.map((row) => row.group) ?? [])];
  return (
    <Card sx={{ p: 2.5 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 2,
          alignItems: 'start',
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h5">จำนวนข้อมูลที่มีอยู่จริง</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
            แยกข้อมูลในฐานข้อมูล ชุดที่เก็บในโปรเจกต์ และจำนวนที่อ่านจากต้นทาง ไม่ใช้ยอด Sync
            เก่าแทนจำนวนปัจจุบัน
          </Typography>
          {inventory.data && (
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1 }}>
              ตรวจเมื่อ{' '}
              {new Intl.DateTimeFormat('th-TH', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'Asia/Bangkok',
              }).format(new Date(inventory.data.checkedAt))}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={() => inventory.refetch()}
          disabled={inventory.isFetching}
          sx={{ flexShrink: 0 }}
        >
          {inventory.isFetching ? 'กำลังตรวจ…' : 'ตรวจจำนวนใหม่'}
        </Button>
      </Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        ขอบเขต: {provinceName} · รายการที่ระบุ “ทุกจังหวัด” ไม่ได้กรองตามจังหวัดที่เลือก
        จำนวนสถานที่เป็นแถวข้อมูลดิบ อาจซ้ำข้ามแหล่ง และไม่ควรบวกยอดรวมกับแถวย่อย
      </Alert>
      {inventory.isError && <Alert severity="error">โหลดจำนวนไม่สำเร็จ กรุณากดตรวจจำนวนใหม่</Alert>}
      {inventory.isPending && <Typography sx={{ py: 3 }}>กำลังตรวจจำนวนจากแต่ละแหล่ง…</Typography>}
      {!!inventory.data && (
        <TableContainer>
          <Table sx={{ minWidth: 760 }} aria-label="จำนวนข้อมูลปัจจุบันแยกตามแหล่ง">
            <TableHead>
              <TableRow>
                <TableCell>แหล่งข้อมูล / ชุดข้อมูล</TableCell>
                <TableCell align="right">จำนวนปัจจุบัน</TableCell>
                <TableCell>ขอบเขต</TableCell>
                <TableCell>วิธีนับ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.flatMap((group) => [
                <TableRow key={group}>
                  <TableCell colSpan={4} sx={{ bgcolor: '#f2f4ef', fontWeight: 700 }}>
                    {group}
                  </TableCell>
                </TableRow>,
                ...inventory
                  .data!.data.filter((row) => row.group === group)
                  .map((row) => (
                    <TableRow key={row.key}>
                      <TableCell sx={{ fontWeight: 600 }}>{row.label}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {row.count === null ? 'ตรวจไม่ได้' : row.count.toLocaleString('th-TH')}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {row.scope === 'all' ? 'ทุกจังหวัด' : provinceName}
                      </TableCell>
                      <TableCell
                        sx={{ fontSize: 12, color: row.error ? 'warning.dark' : 'text.secondary' }}
                      >
                        {row.error ?? row.basis}
                      </TableCell>
                    </TableRow>
                  )),
              ])}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  );
}
