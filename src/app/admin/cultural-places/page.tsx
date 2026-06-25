'use client';

import type { CulturalPlace } from 'src/sections/province/province-data';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
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
import provinces from 'src/data/thailand-culture/provinces';
import { AdminApiError, adminApiRequest } from 'src/lib/admin-api';
import { SYSTEM_CULTURE_CATEGORIES } from 'src/lib/culture-categories';

import { Editor } from 'src/components/editor';
import { TableNoData, TableHeadCustom, TablePaginationCustom } from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';

type CmsPlace = CulturalPlace & {
  provinceCode?: string;
  override?: {
    lat?: number | null;
    lng?: number | null;
    category?: string | null;
    district?: string | null;
    map_url?: string | null;
    image_url?: string | null;
    note?: string | null;
    detail?: string | null;
    updated_at?: string | null;
    updated_by_id?: string | null;
    updated_by_email?: string | null;
    updated_by_name?: string | null;
  } | null;
};

type EditingPlace = {
  id: string;
  isNew?: boolean;
  provinceCode: string;
  name: string;
  source?: CulturalPlace['source'];
  category: string;
  district: string;
  lat: string;
  lng: string;
  mapUrl: string;
  imageUrl: string;
  note: string;
  detail: string;
};

type ProvincePlacesResponse = {
  data?: CmsPlace[];
  districts?: string[];
  pagination?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
  page?: number;
  pageSize?: number;
  total?: number;
  readiness?: {
    ready?: number;
    notReady?: number;
  };
  message?: string;
};

type ThailandDistrictsResponse = {
  districts?: Array<{ name?: string }>;
};

type CategoryOption = {
  value: string;
  label: string;
};

type ProvinceOption = {
  code: string;
  name: string;
  region?: string;
};

type CategoryConfigResponse = {
  data?: Array<{
    key?: string;
    label?: string;
  }>;
  message?: string;
};

type RemapResponse = {
  updated?: number;
  scanned?: number;
  remappable?: number;
  skipped?: number;
  message?: string;
};

const TABLE_HEAD = [
  { id: 'image', label: 'ภาพ', width: 120 },
  { id: 'name', label: 'ชื่อสถานที่', width: 200 },
  { id: 'source', label: 'แหล่งข้อมูล', width: 150 },
  { id: 'province', label: 'จังหวัด', width: 100 },
  { id: 'district', label: 'อำเภอ', width: 160 },
  { id: 'coordinate', label: 'พิกัด', width: 100 },
  { id: 'override', label: 'Override', width: 150 },
  { id: 'updatedBy', label: 'แก้ไขล่าสุดโดย', width: 180 },
  { id: 'actions', label: '', width: 240, align: 'right' as const },
];

const SOURCE_OPTIONS: Array<{ value: NonNullable<CulturalPlace['source']>; label: string }> = [
  { value: 'tat', label: 'ททท.' },
  { value: 'finearts_monument', label: 'กรมศิลป์ - โบราณสถาน' },
  { value: 'finearts_archeology', label: 'กรมศิลป์ - แหล่งโบราณคดี' },
  { value: 'finearts_buddha', label: 'กรมศิลป์ - พระพุทธรูป' },
  { value: 'finearts_museum', label: 'กรมศิลป์ - พิพิธภัณฑ์' },
  { value: 'culture_catalog', label: 'ข้อมูลวัฒนธรรม' },
  { value: 'religious_places', label: 'ศาสนสถาน' },
  { value: 'cpot_products', label: 'ผลิตภัณฑ์วัฒนธรรมไทย (CPOT)' },
  { value: 'thai_fabric_wisdom', label: 'มรดกภูมิปัญญาผ้าไทย' },
  { value: 'ethnic_groups', label: 'กลุ่มชาติพันธุ์' },
  { value: 'thailand_cultural_hub', label: 'ข้อมูลจาก Thailand Cultural Hub' },
];
const DEFAULT_CATEGORY_OPTIONS: CategoryOption[] = SYSTEM_CULTURE_CATEGORIES.map((category) => ({
  value: category.key,
  label: category.label,
}));
const ALL_PROVINCES_OPTION: ProvinceOption = { code: '', name: 'ทุกจังหวัด' };

function getSourceText(source?: CulturalPlace['source']) {
  if (source === 'tat') {
    return 'ททท.';
  }

  if (source?.startsWith('finearts')) {
    return 'กรมศิลป์';
  }

  if (source === 'culture_catalog') {
    return 'ข้อมูลวัฒนธรรม';
  }

  if (source === 'religious_places') {
    return 'ศาสนสถาน';
  }

  if (source === 'cpot_products') {
    return 'CPOT';
  }

  if (source === 'thai_fabric_wisdom') {
    return 'ผ้าไทย';
  }

  if (source === 'ethnic_groups') {
    return 'กลุ่มชาติพันธุ์';
  }

  if (source === 'thailand_cultural_hub') {
    return 'ข้อมูลจาก Thailand Cultural Hub';
  }

  return 'อื่น ๆ';
}

function canDeletePlace(place: CmsPlace) {
  return place.source === 'thailand_cultural_hub' && !!place.override;
}

function getProvinceName(provinceCode?: string) {
  if (!provinceCode) {
    return 'ทุกจังหวัด';
  }

  return provinces.find((province) => province.code === provinceCode)?.name ?? provinceCode;
}

function mergeCategoryOptions(apiOptions: CategoryOption[]) {
  return Array.from(
    new Map(
      [...DEFAULT_CATEGORY_OPTIONS, ...apiOptions].map((category) => [category.value, category])
    ).values()
  );
}

function getDisplayHighlight(place: CmsPlace, categories: CategoryOption[]) {
  const highlight = place.highlight?.trim();

  if (!highlight) {
    return '';
  }

  return categories.find((category) => category.value === highlight)?.label ?? highlight;
}

function getPlaceUpdatedAt(place: CmsPlace) {
  return place.override?.updated_at ?? place.details?.updatedAt ?? '';
}

function getPlaceUpdatedByName(place: CmsPlace) {
  return (
    place.override?.updated_by_name ??
    place.override?.updated_by_email ??
    place.details?.updatedByName ??
    place.details?.updatedByEmail ??
    ''
  );
}

function getPlaceUpdatedByEmail(place: CmsPlace) {
  return place.override?.updated_by_email ?? place.details?.updatedByEmail ?? '';
}

async function refreshProvincePlaceSummaries() {
  const response = await fetch('/api/culture/province-places?summary=true&refreshSummary=true', {
    cache: 'no-store',
  });
  const data = (await response.json().catch(() => ({}))) as { total?: number; message?: string };

  if (!response.ok) {
    throw new Error(data.message ?? 'Refresh province_place_summaries ไม่สำเร็จ');
  }

  return data;
}

export default function CulturalPlacesCmsPage() {
  const { user, checkUserSession } = useAuthContext();
  const queryClient = useQueryClient();
  const [provinceCode, setProvinceCode] = useState('');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [readinessFilter, setReadinessFilter] = useState<'ready' | 'not_ready'>('ready');
  const [districtFilter, setDistrictFilter] = useState('');
  const [districts, setDistricts] = useState<string[]>([]);
  const [drawerDistricts, setDrawerDistricts] = useState<string[]>([]);
  const [places, setPlaces] = useState<CmsPlace[]>([]);
  const [categoryOptions, setCategoryOptions] =
    useState<CategoryOption[]>(DEFAULT_CATEGORY_OPTIONS);
  const [editingPlace, setEditingPlace] = useState<EditingPlace | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [readyRows, setReadyRows] = useState(0);
  const [notReadyRows, setNotReadyRows] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const accessToken = user?.accessToken ?? user?.access_token ?? '';

  const selectedProvince = useMemo(
    () => [ALL_PROVINCES_OPTION, ...provinces].find((province) => province.code === provinceCode),
    [provinceCode]
  );
  const provinceOptions = useMemo<ProvinceOption[]>(() => [ALL_PROVINCES_OPTION, ...provinces], []);
  const districtFilterOptions = useMemo<CategoryOption[]>(
    () => [
      { value: '', label: 'ทุกอำเภอ' },
      ...districts.map((district) => ({ value: district, label: district })),
    ],
    [districts]
  );
  const sourceFilterOptions = useMemo<CategoryOption[]>(
    () => [{ value: '', label: 'ทุกแหล่งที่มา' }, ...SOURCE_OPTIONS],
    []
  );
  const hasActiveFilters = Boolean(
    provinceCode || districtFilter || sourceFilter || appliedQuery || query.trim()
  );
  const handleUnauthorized = useCallback(async () => {
    setPlaces([]);
    setTotalRows(0);
    setEditingPlace(null);
    await checkUserSession?.();
  }, [checkUserSession]);

  const placesQueryParams = useMemo(() => {
    const params = new URLSearchParams({
      page: `${page + 1}`,
      pageSize: `${rowsPerPage}`,
      status: readinessFilter,
    });

    if (provinceCode) {
      params.set('provinceCode', provinceCode);
    }

    if (districtFilter) {
      params.set('district', districtFilter);
    }

    if (sourceFilter) {
      params.set('source', sourceFilter);
    }

    if (appliedQuery) {
      params.set('q', appliedQuery);
    }

    return params.toString();
  }, [
    appliedQuery,
    districtFilter,
    page,
    provinceCode,
    readinessFilter,
    rowsPerPage,
    sourceFilter,
  ]);

  const placesQuery = useQuery({
    queryKey: ['admin-cultural-places', placesQueryParams, accessToken],
    enabled: !!accessToken,
    queryFn: () =>
      adminApiRequest<ProvincePlacesResponse>(`/api/admin/cultural-places?${placesQueryParams}`, {
        accessToken,
      }),
  });

  useEffect(() => {
    if (!placesQuery.data) {
      return;
    }

    const nextPlaces = Array.isArray(placesQuery.data.data) ? placesQuery.data.data : [];
    const nextTotal =
      placesQuery.data.pagination?.total ?? placesQuery.data.total ?? nextPlaces.length;
    const nextPage = (placesQuery.data.pagination?.page ?? placesQuery.data.page ?? page + 1) - 1;

    setPlaces(nextPlaces);
    setDistricts(Array.isArray(placesQuery.data.districts) ? placesQuery.data.districts : []);
    setTotalRows(nextTotal);
    setReadyRows(placesQuery.data.readiness?.ready ?? 0);
    setNotReadyRows(placesQuery.data.readiness?.notReady ?? 0);
    setMessage(`โหลดข้อมูล ${nextTotal} รายการ`);

    if (nextPage !== page) {
      setPage(Math.max(nextPage, 0));
    }
  }, [page, placesQuery.data]);

  useEffect(() => {
    if (
      placesQuery.error &&
      placesQuery.error instanceof AdminApiError &&
      placesQuery.error.status === 401
    ) {
      handleUnauthorized();
    }
  }, [handleUnauthorized, placesQuery.error]);

  const loadPlaces = useCallback(
    async (options?: { keepMessage?: boolean }) => {
      setError('');
      if (!options?.keepMessage) {
        setMessage('');
      }

      const result = await placesQuery.refetch();

      if (result.error) {
        setError(result.error instanceof Error ? result.error.message : 'โหลดข้อมูลไม่สำเร็จ');
      }
    },
    [placesQuery]
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      try {
        const response = await fetch('/api/culture/category-config', { signal: controller.signal });
        const data = (await response.json()) as CategoryConfigResponse;

        if (!response.ok) {
          return;
        }

        const nextOptions = Array.isArray(data.data)
          ? data.data
              .map((category) => ({
                value: category.key ?? '',
                label: category.label ?? category.key ?? '',
              }))
              .filter((category) => category.value && category.label)
          : [];

        setCategoryOptions(mergeCategoryOptions(nextOptions));
      } catch (caughtError) {
        if (!(caughtError instanceof Error && caughtError.name === 'AbortError')) {
          setCategoryOptions(DEFAULT_CATEGORY_OPTIONS);
        }
      }
    }

    loadCategories();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!editingPlace?.isNew) {
      setDrawerDistricts([]);
      return undefined;
    }

    if (editingPlace.provinceCode === provinceCode) {
      setDrawerDistricts(districts);
      return undefined;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ provinceId: editingPlace.provinceCode });

    fetch(`/api/thailand-districts?${params.toString()}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data: ThailandDistrictsResponse) => {
        setDrawerDistricts(
          Array.isArray(data.districts)
            ? data.districts
                .map((district) => district.name)
                .filter((name): name is string => !!name)
            : []
        );
      })
      .catch((caughtError) => {
        if (caughtError instanceof Error && caughtError.name !== 'AbortError') {
          setDrawerDistricts([]);
        }
      });

    return () => controller.abort();
  }, [districts, editingPlace?.isNew, editingPlace?.provinceCode, provinceCode]);

  const handleSearch = () => {
    const nextQuery = query.trim();

    setPage(0);

    if (nextQuery === appliedQuery && page === 0) {
      loadPlaces();
      return;
    }

    setAppliedQuery(nextQuery);
  };

  const clearFilters = () => {
    setProvinceCode('');
    setQuery('');
    setAppliedQuery('');
    setSourceFilter('');
    setDistrictFilter('');
    setPage(0);
  };

  const startAdd = () => {
    const nextProvinceCode = provinceCode || 'TH-44';

    setEditingPlace({
      isNew: true,
      id: `cms-${nextProvinceCode}-${Date.now()}`,
      provinceCode: nextProvinceCode,
      name: '',
      source: 'thailand_cultural_hub',
      category: 'cultural_attraction',
      district: districtFilter,
      lat: '',
      lng: '',
      mapUrl: '',
      imageUrl: '',
      note: '',
      detail: '',
    });
  };

  const startEdit = (place: CmsPlace) => {
    setEditingPlace({
      id: place.id,
      provinceCode: place.provinceCode || provinceCode || 'TH-44',
      name: place.name,
      source: place.source,
      category: place.category,
      district: place.district,
      lat: place.lat == null ? '' : `${place.lat}`,
      lng: place.lng == null ? '' : `${place.lng}`,
      mapUrl: place.mapUrl ?? '',
      imageUrl: place.imageUrls?.[0] ?? place.override?.image_url ?? '',
      note: place.override?.note ?? '',
      detail: place.details?.detailTh ?? place.override?.detail ?? place.description ?? '',
    });
  };

  const savePlaceMutation = useMutation({
    mutationFn: async (place: EditingPlace) =>
      adminApiRequest<{ message?: string }>('/api/admin/cultural-places', {
        method: 'PUT',
        accessToken,
        body: {
          placeId: place.id,
          provinceCode: place.provinceCode,
          name: place.name,
          source: place.source,
          category: place.category,
          district: place.district,
          lat: place.lat,
          lng: place.lng,
          mapUrl: place.mapUrl,
          imageUrl: place.imageUrl,
          note: place.note,
          detail: place.detail,
        },
      }),
    onSuccess: async (_, savedPlace) => {
      setMessage('บันทึกพิกัดแล้ว');
      setEditingPlace(null);

      if (provinceCode && savedPlace.provinceCode !== provinceCode) {
        setProvinceCode(savedPlace.provinceCode);
        setDistrictFilter('');
        setPage(0);
      } else {
        await queryClient.invalidateQueries({ queryKey: ['admin-cultural-places'] });
        await loadPlaces();
      }
    },
    onError: async (caughtError) => {
      if (caughtError instanceof AdminApiError && caughtError.status === 401) {
        await handleUnauthorized();
      }

      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกไม่สำเร็จ');
    },
  });

  const deletePlaceMutation = useMutation({
    mutationFn: async (place: CmsPlace) => {
      const params = new URLSearchParams({ placeId: place.id });

      return adminApiRequest<{ message?: string }>(
        `/api/admin/cultural-places?${params.toString()}`,
        {
          method: 'DELETE',
          accessToken,
        }
      );
    },
    onSuccess: async () => {
      setMessage('ลบ override แล้ว');
      await queryClient.invalidateQueries({ queryKey: ['admin-cultural-places'] });
      await loadPlaces();
    },
    onError: async (caughtError) => {
      if (caughtError instanceof AdminApiError && caughtError.status === 401) {
        await handleUnauthorized();
      }

      setError(caughtError instanceof Error ? caughtError.message : 'ลบ override ไม่สำเร็จ');
    },
  });

  const remapPlacesMutation = useMutation({
    mutationFn: async () =>
      adminApiRequest<RemapResponse>('/api/admin/cultural-places', {
        method: 'PATCH',
        accessToken,
        body: {
          provinceCode: provinceCode || undefined,
          source: sourceFilter || undefined,
        },
      }),
    onSuccess: async (data) => {
      const summary = await refreshProvincePlaceSummaries();

      setMessage(
        `Remap สำเร็จ ${Number(data.updated ?? 0).toLocaleString('th-TH')} รายการ${
          typeof data.skipped === 'number'
            ? `, ข้าม ${data.skipped.toLocaleString('th-TH')} รายการ`
            : ''
        } และ refresh summary แล้ว${
          typeof summary.total === 'number'
            ? ` ${summary.total.toLocaleString('th-TH')} รายการ`
            : ''
        }`
      );
      await queryClient.invalidateQueries({ queryKey: ['admin-cultural-places'] });
      await loadPlaces({ keepMessage: true });
    },
    onError: async (caughtError) => {
      if (caughtError instanceof AdminApiError && caughtError.status === 401) {
        await handleUnauthorized();
      }

      setError(caughtError instanceof Error ? caughtError.message : 'Remap data ไม่สำเร็จ');
    },
  });

  const savePlace = async () => {
    if (!editingPlace) {
      return;
    }

    setError('');
    setMessage('');

    try {
      if (!editingPlace.name.trim()) {
        throw new Error('กรุณากรอกชื่อสถานที่');
      }

      if (
        !Number.isFinite(Number(editingPlace.lat)) ||
        !Number.isFinite(Number(editingPlace.lng))
      ) {
        throw new Error('กรุณากรอก latitude และ longitude เป็นตัวเลข');
      }

      await savePlaceMutation.mutateAsync(editingPlace);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกไม่สำเร็จ');
    }
  };

  const deleteOverride = async (place: CmsPlace) => {
    if (!canDeletePlace(place)) {
      setError('ลบได้เฉพาะข้อมูลจาก Thailand Cultural Hub เท่านั้น');
      return;
    }

    setError('');
    setMessage('');

    await deletePlaceMutation.mutateAsync(place).catch(() => undefined);
  };

  const remapPlaces = async () => {
    const scope = [
      provinceCode ? `จังหวัด ${getProvinceName(provinceCode)}` : 'ทุกจังหวัด',
      sourceFilter ? `แหล่งข้อมูล ${getSourceText(sourceFilter as CulturalPlace['source'])}` : '',
    ]
      .filter(Boolean)
      .join(' / ');
    const confirmed = window.confirm(
      `ต้องการ remap data ใน cultural_places สำหรับ ${scope} หรือไม่? ข้อมูล override ที่แก้มือไว้จะไม่ถูกลบ`
    );

    if (!confirmed) {
      return;
    }

    setError('');
    setMessage('');
    await remapPlacesMutation.mutateAsync().catch(() => undefined);
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              Cultural Places CMS
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              แก้พิกัด lat/lng โดยเก็บเป็น override ไม่ทับข้อมูลต้นทาง
            </Typography>
          </Box>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ alignSelf: { md: 'flex-start' } }}
          >
            <LoadingButton
              color="inherit"
              variant="outlined"
              loading={remapPlacesMutation.isPending}
              onClick={remapPlaces}
            >
              Remap data
            </LoadingButton>
            <Button variant="contained" onClick={startAdd}>
              เพิ่มสถานที่
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}

        <>
          <Card sx={{ p: 2.5 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="ค้นหาชื่อ/อำเภอ"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              <Autocomplete
                fullWidth
                options={provinceOptions}
                value={selectedProvince ?? null}
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.code === value.code}
                onChange={(_, value) => {
                  if (!value) {
                    return;
                  }

                  setProvinceCode(value.code);
                  setDistrictFilter('');
                  setPage(0);
                }}
                renderInput={(params) => <TextField {...params} label="จังหวัด" />}
                sx={{ maxWidth: { md: 200 } }}
              />
              <Autocomplete
                fullWidth
                options={districtFilterOptions}
                value={
                  districtFilterOptions.find((option) => option.value === districtFilter) ??
                  districtFilterOptions[0]
                }
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, value) => option.value === value.value}
                onChange={(_, value) => {
                  setDistrictFilter(value?.value ?? '');
                  setPage(0);
                }}
                renderInput={(params) => <TextField {...params} label="อำเภอ" />}
                sx={{ maxWidth: { md: 200 } }}
              />
              <Autocomplete
                fullWidth
                options={sourceFilterOptions}
                value={
                  sourceFilterOptions.find((option) => option.value === sourceFilter) ??
                  sourceFilterOptions[0]
                }
                getOptionLabel={(option) => option.label}
                isOptionEqualToValue={(option, value) => option.value === value.value}
                onChange={(_, value) => {
                  setSourceFilter(value?.value ?? '');
                  setPage(0);
                }}
                renderInput={(params) => <TextField {...params} label="แหล่งที่มา" />}
                sx={{ maxWidth: { md: 200 } }}
              />

              <LoadingButton
                variant="contained"
                loading={placesQuery.isFetching}
                onClick={handleSearch}
                sx={{ px: 3, fontWeight: 900 }}
              >
                ค้นหา
              </LoadingButton>
              {hasActiveFilters && (
                <Button
                  color="inherit"
                  variant="outlined"
                  onClick={clearFilters}
                  sx={{ px: 2.5, whiteSpace: 'nowrap', width: 200 }}
                >
                  เคลียร์ทั้งหมด
                </Button>
              )}
            </Stack>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ mt: 1.5, color: 'text.secondary', fontSize: 13 }}
            >
              <Typography sx={{ fontSize: 13 }}>
                จังหวัดที่เลือก: {selectedProvince?.name ?? 'ทุกจังหวัด'}
              </Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
                ข้อมูลทั้งหมด: {totalRows.toLocaleString('th-TH')} รายการ
              </Typography>
            </Stack>
          </Card>

          <Card>
            <Box sx={{ px: 2.5, pt: 1 }}>
              <Tabs
                value={readinessFilter}
                onChange={(_, value: 'ready' | 'not_ready') => {
                  setReadinessFilter(value);
                  setPage(0);
                }}
              >
                <Tab
                  value="ready"
                  label={`ข้อมูลพร้อมใช้ (${readyRows.toLocaleString('th-TH')})`}
                />
                <Tab
                  value="not_ready"
                  label={`ยังไม่พร้อมใช้ (${notReadyRows.toLocaleString('th-TH')})`}
                />
              </Tabs>
            </Box>
            <Divider sx={{ mt: 1 }} />
            <TableContainer sx={{ overflow: 'auto' }}>
              <Table sx={{ minWidth: 1240 }}>
                <TableHeadCustom headCells={TABLE_HEAD} />

                <TableBody>
                  {places.map((place) => (
                    <TableRow key={place.id} hover>
                      {(() => {
                        const displayHighlight = getDisplayHighlight(place, categoryOptions);
                        const updatedAt = getPlaceUpdatedAt(place);
                        const updatedByName = getPlaceUpdatedByName(place);
                        const updatedByEmail = getPlaceUpdatedByEmail(place);

                        return (
                          <>
                            <TableCell>
                              {place.imageUrls?.[0] ? (
                                <Box
                                  component="img"
                                  src={place.imageUrls[0]}
                                  alt={place.name}
                                  sx={{
                                    width: 64,
                                    height: 48,
                                    borderRadius: 1,
                                    objectFit: 'cover',
                                    bgcolor: 'background.neutral',
                                  }}
                                />
                              ) : (
                                <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>
                                  ไม่มีภาพ
                                </Typography>
                              )}
                            </TableCell>

                            <TableCell>
                              <Typography sx={{ fontWeight: 800 }}>{place.name}</Typography>
                              {displayHighlight && (
                                <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                                  {displayHighlight}
                                </Typography>
                              )}
                            </TableCell>

                            <TableCell>{getProvinceName(place.provinceCode)}</TableCell>

                            <TableCell>{getSourceText(place.source)}</TableCell>

                            <TableCell>{place.district || 'ไม่ระบุอำเภอ'}</TableCell>

                            <TableCell>
                              {place.lat != null && place.lng != null ? (
                                <>
                                  <Typography sx={{ fontSize: 13 }}>{place.lat}</Typography>
                                  <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                                    {place.lng}
                                  </Typography>
                                </>
                              ) : (
                                <Typography
                                  sx={{ color: 'error.main', fontSize: 13, fontWeight: 800 }}
                                >
                                  ยังไม่มีพิกัด
                                </Typography>
                              )}
                            </TableCell>

                            <TableCell>
                              {place.override || place.details ? (
                                <Box>
                                  {place.override && (
                                    <Typography
                                      sx={{ color: '#b65d20', fontSize: 13, fontWeight: 800 }}
                                    >
                                      มี override แล้ว
                                    </Typography>
                                  )}
                                  {place.details && (
                                    <Typography
                                      sx={{ color: 'success.main', fontSize: 13, fontWeight: 800 }}
                                    >
                                      มีรายละเอียดแล้ว
                                    </Typography>
                                  )}
                                  {updatedAt && (
                                    <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                                      {updatedAt}
                                    </Typography>
                                  )}
                                </Box>
                              ) : (
                                <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>
                                  ยังไม่มี
                                </Typography>
                              )}
                            </TableCell>

                            <TableCell>
                              {updatedByName || updatedByEmail ? (
                                <Box>
                                  <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
                                    {updatedByName || updatedByEmail}
                                  </Typography>
                                  {updatedByEmail && updatedByEmail !== updatedByName && (
                                    <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                                      {updatedByEmail}
                                    </Typography>
                                  )}
                                </Box>
                              ) : (
                                <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>
                                  -
                                </Typography>
                              )}
                            </TableCell>

                            <TableCell align="right">
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                {place.lat != null && place.lng != null && (
                                  <Button
                                    size="small"
                                    component="a"
                                    href={
                                      place.mapUrl ||
                                      `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    Map
                                  </Button>
                                )}
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => startEdit(place)}
                                >
                                  แก้ไข
                                </Button>
                                {canDeletePlace(place) && (
                                  <Button
                                    size="small"
                                    color="error"
                                    onClick={() => deleteOverride(place)}
                                  >
                                    ลบ
                                  </Button>
                                )}
                              </Stack>
                            </TableCell>
                          </>
                        );
                      })()}
                    </TableRow>
                  ))}

                  <TableNoData notFound={!places.length} />
                </TableBody>
              </Table>
            </TableContainer>

            <TablePaginationCustom
              page={page}
              count={totalRows}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[5, 10, 25]}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(Number(event.target.value));
                setPage(0);
              }}
            />
          </Card>

          <Drawer
            anchor="right"
            open={!!editingPlace}
            onClose={() => setEditingPlace(null)}
            slotProps={{
              paper: {
                sx: {
                  width: { xs: 1, sm: 480 },
                },
              },
            }}
          >
            {editingPlace && (
              <Stack sx={{ height: 1 }}>
                <Stack spacing={0.5} sx={{ p: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    {editingPlace.isNew ? 'เพิ่ม Cultural Place' : 'แก้ไข Cultural Place'}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                    {editingPlace.id}
                  </Typography>
                </Stack>

                <Divider />

                <Stack spacing={2.5} sx={{ p: 3, flex: 1, overflow: 'auto' }}>
                  <TextField
                    fullWidth
                    label="ชื่อสถานที่"
                    value={editingPlace.name}
                    onChange={(event) =>
                      setEditingPlace({ ...editingPlace, name: event.target.value })
                    }
                  />

                  <TextField
                    select
                    fullWidth
                    label="แหล่งข้อมูล"
                    value={editingPlace.source ?? ''}
                    onChange={(event) =>
                      setEditingPlace({
                        ...editingPlace,
                        source: event.target.value as CulturalPlace['source'],
                      })
                    }
                  >
                    {SOURCE_OPTIONS.map((source) => (
                      <MenuItem key={source.value} value={source.value}>
                        {source.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    fullWidth
                    label="หมวดหมู่"
                    value={editingPlace.category}
                    onChange={(event) =>
                      setEditingPlace({
                        ...editingPlace,
                        category: event.target.value,
                      })
                    }
                  >
                    {categoryOptions.map((category) => (
                      <MenuItem key={category.value} value={category.value}>
                        {category.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    fullWidth
                    label="จังหวัด"
                    value={editingPlace.provinceCode}
                    onChange={(event) =>
                      setEditingPlace({
                        ...editingPlace,
                        provinceCode: event.target.value,
                        district: event.target.value === provinceCode ? editingPlace.district : '',
                      })
                    }
                  >
                    {provinces.map((province) => (
                      <MenuItem key={province.code} value={province.code}>
                        {province.name}
                      </MenuItem>
                    ))}
                  </TextField>

                  {editingPlace.isNew ? (
                    <Autocomplete
                      freeSolo
                      options={drawerDistricts}
                      value={editingPlace.district}
                      inputValue={editingPlace.district}
                      onInputChange={(_, value) =>
                        setEditingPlace({ ...editingPlace, district: value })
                      }
                      renderInput={(params) => <TextField {...params} fullWidth label="อำเภอ" />}
                    />
                  ) : (
                    <TextField
                      fullWidth
                      label="อำเภอ"
                      value={editingPlace.district}
                      onChange={(event) =>
                        setEditingPlace({ ...editingPlace, district: event.target.value })
                      }
                    />
                  )}

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      fullWidth
                      label="Latitude"
                      value={editingPlace.lat}
                      onChange={(event) =>
                        setEditingPlace({ ...editingPlace, lat: event.target.value })
                      }
                    />
                    <TextField
                      fullWidth
                      label="Longitude"
                      value={editingPlace.lng}
                      onChange={(event) =>
                        setEditingPlace({ ...editingPlace, lng: event.target.value })
                      }
                    />
                  </Stack>

                  <TextField
                    fullWidth
                    label="Google Maps URL"
                    value={editingPlace.mapUrl}
                    onChange={(event) =>
                      setEditingPlace({ ...editingPlace, mapUrl: event.target.value })
                    }
                  />

                  <TextField
                    fullWidth
                    label="รูปภาพ URL"
                    value={editingPlace.imageUrl}
                    onChange={(event) =>
                      setEditingPlace({ ...editingPlace, imageUrl: event.target.value })
                    }
                  />

                  {editingPlace.imageUrl && (
                    <Box
                      component="img"
                      src={editingPlace.imageUrl}
                      alt={editingPlace.name || 'Cultural place preview'}
                      sx={{
                        width: 1,
                        height: 180,
                        borderRadius: 1,
                        objectFit: 'cover',
                        bgcolor: 'background.neutral',
                      }}
                    />
                  )}

                  <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    label="เนื้อหา/หมายเหตุ"
                    value={editingPlace.note}
                    onChange={(event) =>
                      setEditingPlace({ ...editingPlace, note: event.target.value })
                    }
                  />

                  <Stack spacing={1}>
                    <Typography sx={{ color: 'text.secondary', fontSize: 13, fontWeight: 800 }}>
                      รายละเอียด
                    </Typography>
                    <Editor
                      value={editingPlace.detail}
                      placeholder="เพิ่มรายละเอียดสถานที่..."
                      onChange={(value) => setEditingPlace({ ...editingPlace, detail: value })}
                      sx={{
                        minHeight: 280,
                        '& .tiptap.ProseMirror': {
                          minHeight: 170,
                        },
                      }}
                    />
                  </Stack>

                  <Button
                    component="a"
                    href={`https://www.google.com/maps/search/?api=1&query=${editingPlace.lat},${editingPlace.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    เปิด Google Maps
                  </Button>
                </Stack>

                <Divider />

                <Stack direction="row" spacing={1.5} sx={{ p: 2.5 }}>
                  <LoadingButton
                    fullWidth
                    variant="contained"
                    loading={savePlaceMutation.isPending}
                    onClick={savePlace}
                  >
                    บันทึก
                  </LoadingButton>
                  <Button fullWidth color="inherit" onClick={() => setEditingPlace(null)}>
                    ยกเลิก
                  </Button>
                </Stack>
              </Stack>
            )}
          </Drawer>
        </>
      </Stack>
    </DashboardContent>
  );
}
