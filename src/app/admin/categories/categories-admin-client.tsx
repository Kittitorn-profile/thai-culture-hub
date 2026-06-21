'use client';

import type { CategoryRow, EditingCategory } from './types';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import Autocomplete from '@mui/material/Autocomplete';
import TableContainer from '@mui/material/TableContainer';

import { DashboardContent } from 'src/layouts/dashboard';

import { TableNoData, TableHeadCustom, TablePaginationCustom } from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';

import { saveCategoryAction, getCategoriesAction } from './actions';

const TABLE_HEAD = [
  { id: 'sort', label: 'ลำดับ', width: 90 },
  { id: 'key', label: 'Key', width: 220 },
  { id: 'label', label: 'ชื่อหมวด' },
  { id: 'source', label: 'แหล่งที่มา', width: 180 },
  { id: 'count', label: 'จำนวน', width: 110, align: 'right' as const },
  { id: 'style', label: 'สี/Icon', width: 180 },
  { id: 'status', label: 'สถานะ', width: 120 },
  { id: 'actions', label: '', width: 190, align: 'right' as const },
];

type SourceOption = {
  value: string;
  label: string;
};

function toEditingCategory(category: CategoryRow): EditingCategory {
  return {
    categoryKey: category.category_key,
    label: category.label,
    description: category.description ?? '',
    color: category.color ?? '#608D8C',
    icon: category.icon ?? '',
    imageUrl: category.image_url ?? '',
    sortOrder: `${category.sort_order ?? 0}`,
    isActive: category.is_active ?? true,
  };
}

export function CategoriesAdminClient() {
  const { user, checkUserSession } = useAuthContext();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [editingCategory, setEditingCategory] = useState<EditingCategory | null>(null);
  const [nameQuery, setNameQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const accessToken = user?.accessToken ?? user?.access_token ?? '';

  const loadCategories = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await getCategoriesAction(accessToken);

      if (!result.ok) {
        if (result.status === 401) {
          await checkUserSession?.();
        }

        throw new Error(result.message);
      }

      setCategories(result.data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'โหลดหมวดไม่สำเร็จ');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, checkUserSession]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const sourceOptions = useMemo<SourceOption[]>(() => {
    const sourceMap = new Map<string, string>();

    categories.forEach((category) => {
      const source = category.source ?? '';

      if (source) {
        sourceMap.set(source, category.source_label ?? source);
      }
    });

    return [
      { value: '', label: 'ทุกแหล่งที่มา' },
      ...Array.from(sourceMap, ([value, label]) => ({ value, label })).sort((first, second) =>
        first.label.localeCompare(second.label, 'th')
      ),
    ];
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const normalizedQuery = nameQuery.trim().toLowerCase();

    return categories.filter((category) => {
      if (sourceFilter && category.source !== sourceFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [category.label, category.category_key]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [categories, nameQuery, sourceFilter]);

  const paginatedCategories = useMemo(
    () => filteredCategories.slice(page * pageSize, page * pageSize + pageSize),
    [filteredCategories, page, pageSize]
  );

  useEffect(() => {
    const maxPage = Math.max(Math.ceil(filteredCategories.length / pageSize) - 1, 0);

    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [filteredCategories.length, page, pageSize]);

  const saveCategory = async () => {
    if (!editingCategory) {
      return;
    }

    if (!editingCategory.categoryKey.trim()) {
      setError('ไม่พบ Category ID จากแหล่งที่มา');
      return;
    }

    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      const result = await saveCategoryAction(accessToken, {
        categoryKey: editingCategory.categoryKey,
        label: editingCategory.label,
        description: editingCategory.description,
        color: editingCategory.color,
        icon: editingCategory.icon,
        imageUrl: editingCategory.imageUrl,
        sortOrder: editingCategory.sortOrder,
        isActive: editingCategory.isActive,
      });

      if (!result.ok) {
        if (result.status === 401) {
          await checkUserSession?.();
        }

        throw new Error(result.message);
      }

      setMessage('บันทึก category แล้ว');
      setEditingCategory(null);
      await loadCategories();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกหมวดไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              Categories
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              แสดงหมวดระบบ และหมวด/หมวดย่อยที่พบจริงจากข้อมูลต้นทาง
            </Typography>
          </Box>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        {isLoading && <Alert severity="info">กำลังโหลด category...</Alert>}

        <Card sx={{ p: 2.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="ค้นหาชื่อหมวด"
              value={nameQuery}
              onChange={(event) => {
                setNameQuery(event.target.value);
                setPage(0);
              }}
            />
            <Autocomplete
              fullWidth
              options={sourceOptions}
              value={
                sourceOptions.find((option) => option.value === sourceFilter) ?? sourceOptions[0]
              }
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, value) => option.value === value.value}
              onChange={(_, value) => {
                setSourceFilter(value?.value ?? '');
                setPage(0);
              }}
              renderInput={(params) => <TextField {...params} label="แหล่งที่มา" />}
              sx={{ maxWidth: { md: 300 } }}
            />
          </Stack>
          <Typography sx={{ mt: 1.5, color: 'text.secondary', fontSize: 13 }}>
            แสดง {filteredCategories.length} จาก {categories.length} category
          </Typography>
        </Card>

        <Card>
          <TableContainer sx={{ overflow: 'auto' }}>
            <Table sx={{ minWidth: 1180 }}>
              <TableHeadCustom headCells={TABLE_HEAD} />
              <TableBody>
                {paginatedCategories.map((category) => (
                  <TableRow key={category.category_key} hover>
                    <TableCell>{category.sort_order ?? 0}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                        {category.category_key}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 800 }}>{category.label}</Typography>
                      {category.description && (
                        <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                          {category.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{category.source_label ?? category.source ?? '-'}</TableCell>
                    <TableCell align="right">
                      {typeof category.count === 'number' ? category.count.toLocaleString('th-TH') : '-'}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1.2} alignItems="center">
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            bgcolor: category.color ?? '#608D8C',
                            border: '1px solid rgba(0,0,0,0.12)',
                          }}
                        />
                        <Typography sx={{ fontSize: 12 }}>{category.icon || '-'}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{category.is_active === false ? 'ซ่อน' : 'ใช้งาน'}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {category.editable === false || category.source === 'system' ? (
                          <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>
                            อ้างอิง
                          </Typography>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setEditingCategory(toEditingCategory(category))}
                          >
                            แก้ไข
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}

                <TableNoData notFound={!filteredCategories.length} />
              </TableBody>
            </Table>
          </TableContainer>

          <TablePaginationCustom
            page={page}
            count={filteredCategories.length}
            rowsPerPage={pageSize}
            labelRowsPerPage="Page size:"
            rowsPerPageOptions={[5, 10, 25, 50]}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(0);
            }}
          />
        </Card>
      </Stack>

      <Drawer
        anchor="right"
        open={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        slotProps={{ paper: { sx: { width: { xs: 1, sm: 520 } } } }}
      >
        {editingCategory && (
          <Stack sx={{ height: 1 }}>
            <Stack spacing={0.5} sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                แก้ไข Metadata
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                Category ID และชื่อหมวดเป็นข้อมูลจากแหล่งที่มา แก้ได้เฉพาะข้อมูลแสดงผล
              </Typography>
            </Stack>

            <Divider />

            <Stack spacing={2.5} sx={{ p: 3, flex: 1, overflow: 'auto' }}>
              <TextField
                fullWidth
                label="Category ID"
                value={editingCategory.categoryKey}
                disabled
              />
              <TextField
                fullWidth
                label="ชื่อหมวดจากแหล่งที่มา"
                value={editingCategory.label}
                disabled
              />
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="คำอธิบาย"
                value={editingCategory.description}
                onChange={(event) =>
                  setEditingCategory({ ...editingCategory, description: event.target.value })
                }
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="สี"
                  value={editingCategory.color}
                  onChange={(event) =>
                    setEditingCategory({ ...editingCategory, color: event.target.value })
                  }
                />
                <TextField
                  fullWidth
                  label="ลำดับ"
                  value={editingCategory.sortOrder}
                  onChange={(event) =>
                    setEditingCategory({ ...editingCategory, sortOrder: event.target.value })
                  }
                />
              </Stack>
              <TextField
                fullWidth
                label="Iconify icon"
                value={editingCategory.icon}
                onChange={(event) =>
                  setEditingCategory({ ...editingCategory, icon: event.target.value })
                }
              />
              <TextField
                fullWidth
                label="Image URL"
                value={editingCategory.imageUrl}
                onChange={(event) =>
                  setEditingCategory({ ...editingCategory, imageUrl: event.target.value })
                }
              />
              <TextField
                select
                fullWidth
                label="สถานะ"
                value={editingCategory.isActive ? 'active' : 'hidden'}
                onChange={(event) =>
                  setEditingCategory({
                    ...editingCategory,
                    isActive: event.target.value === 'active',
                  })
                }
              >
                <MenuItem value="active">ใช้งาน</MenuItem>
                <MenuItem value="hidden">ซ่อน</MenuItem>
              </TextField>
            </Stack>

            <Divider />

            <Stack direction="row" spacing={1.5} sx={{ p: 2.5 }}>
              <LoadingButton fullWidth variant="contained" loading={isSaving} onClick={saveCategory}>
                บันทึก
              </LoadingButton>
              <Button fullWidth color="inherit" onClick={() => setEditingCategory(null)}>
                ยกเลิก
              </Button>
            </Stack>
          </Stack>
        )}
      </Drawer>
    </DashboardContent>
  );
}
