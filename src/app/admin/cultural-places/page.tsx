'use client';

import type { CulturalPlace } from 'src/sections/province/province-data';

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
import provinces from 'src/data/thailand-culture/provinces';

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

type SyncEndpointResult = {
  endpoint: string;
  label: string;
  status: number;
  total?: number;
  upserted?: number;
  message?: string;
  ok: boolean;
};

type SyncTask = {
  endpoint: string;
  label: string;
  body: Record<string, unknown>;
};

type SyncDatasetOption = {
  value: string;
  label: string;
  description: string;
};

const TABLE_HEAD = [
  { id: 'image', label: 'ภาพ', width: 96 },
  { id: 'name', label: 'ชื่อสถานที่' },
  { id: 'province', label: 'จังหวัด', width: 100 },
  { id: 'source', label: 'แหล่งข้อมูล', width: 140 },
  { id: 'district', label: 'อำเภอ', width: 160 },
  { id: 'coordinate', label: 'พิกัด', width: 120 },
  { id: 'override', label: 'Override', width: 150 },
  { id: 'updatedBy', label: 'แก้ไขล่าสุดโดย', width: 120 },
  { id: 'actions', label: '', width: 240, align: 'right' as const },
];

const SOURCE_OPTIONS: Array<{ value: NonNullable<CulturalPlace['source']>; label: string }> = [
  { value: 'tat', label: 'ททท.' },
  { value: 'finearts_monument', label: 'กรมศิลป์ - โบราณสถาน' },
  { value: 'finearts_archeology', label: 'กรมศิลป์ - แหล่งโบราณคดี' },
  { value: 'finearts_buddha', label: 'กรมศิลป์ - พระพุทธรูป' },
  { value: 'finearts_museum', label: 'กรมศิลป์ - พิพิธภัณฑ์' },
  { value: 'culture_catalog', label: 'ข้อมูลวัฒนธรรม' },
  { value: 'thailand_cultural_hub', label: 'ข้อมูลจาก Thailand Cultural Hub' },
];
const DEFAULT_CATEGORY_OPTIONS: CategoryOption[] = [];
const ALL_PROVINCES_OPTION: ProvinceOption = { code: '', name: 'ทุกจังหวัด' };
const SYNC_LIMIT = 100;
const CULTURAL_PLACES_SYNC_LIMIT = 10000;
const TAT_SYNC_MAX_PAGES = 500;

const FINE_ARTS_SYNC_SOURCE_BY_PLACE_SOURCE: Record<string, string> = {
  finearts_monument: 'monument',
  finearts_archeology: 'archeology',
  finearts_buddha: 'buddha',
  finearts_museum: 'museum',
};

const SYNC_DATASET_OPTIONS: SyncDatasetOption[] = [
  {
    value: 'tat_metadata',
    label: 'ททท. metadata',
    description: 'categories / sub-categories / places table',
  },
  {
    value: 'tat_cultural_places',
    label: 'ททท. -> Cultural Places',
    description: 'ดึงสถานที่จาก ททท. เข้า cultural_places',
  },
  {
    value: 'culture_catalog',
    label: 'ข้อมูลวัฒนธรรม -> Cultural Places',
    description: 'ดึงชุด culture catalog เข้า cultural_places',
  },
  {
    value: 'finearts_monument',
    label: 'กรมศิลป์ - โบราณสถาน',
    description: 'ดึง monument เข้า cultural_places',
  },
  {
    value: 'finearts_archeology',
    label: 'กรมศิลป์ - แหล่งโบราณคดี',
    description: 'ดึง archeology เข้า cultural_places',
  },
  {
    value: 'finearts_buddha',
    label: 'กรมศิลป์ - พระพุทธรูป',
    description: 'ดึง buddha เข้า cultural_places',
  },
  {
    value: 'finearts_museum',
    label: 'กรมศิลป์ - พิพิธภัณฑ์',
    description: 'ดึง museum เข้า cultural_places',
  },
  {
    value: 'finearts_all',
    label: 'กรมศิลป์ทั้งหมด',
    description: 'ดึงทุกชุดของกรมศิลป์เข้า cultural_places',
  },
];

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

function withProvinceSyncPayload(provinceCode: string, payload: Record<string, unknown>) {
  if (!provinceCode) {
    return payload;
  }

  return {
    ...payload,
    provinceCode,
  };
}

function getSyncTasks(provinceCode: string, syncDataset: string): SyncTask[] {
  if (syncDataset === 'tat_metadata') {
    return [
      {
        endpoint: '/api/tat/sync',
        label: 'ททท. metadata',
        body: withProvinceSyncPayload(provinceCode, {
          limit: SYNC_LIMIT,
          maxPages: TAT_SYNC_MAX_PAGES,
          syncCategories: true,
          syncSubCategories: true,
          syncPlaces: true,
        }),
      },
    ];
  }

  if (syncDataset === 'tat_cultural_places') {
    return [
      {
        endpoint: '/api/culture/sync',
        label: 'ททท. -> Cultural Places',
        body: withProvinceSyncPayload(provinceCode, {
          limit: CULTURAL_PLACES_SYNC_LIMIT,
          sources: ['tat'],
        }),
      },
    ];
  }

  if (syncDataset === 'culture_catalog') {
    return [
      {
        endpoint: '/api/culture/sync',
        label: 'ข้อมูลวัฒนธรรม',
        body: withProvinceSyncPayload(provinceCode, {
          limit: CULTURAL_PLACES_SYNC_LIMIT,
          sources: ['culture_catalog'],
        }),
      },
    ];
  }

  if (syncDataset === 'finearts_all') {
    return [
      {
        endpoint: '/api/finearts/sync',
        label: 'กรมศิลป์ทั้งหมด',
        body: withProvinceSyncPayload(provinceCode, {
          limit: SYNC_LIMIT,
        }),
      },
    ];
  }

  if (syncDataset in FINE_ARTS_SYNC_SOURCE_BY_PLACE_SOURCE) {
    return [
      {
        endpoint: '/api/finearts/sync',
        label: getSourceText(syncDataset as CulturalPlace['source']),
        body: withProvinceSyncPayload(provinceCode, {
          limit: SYNC_LIMIT,
          sources: [FINE_ARTS_SYNC_SOURCE_BY_PLACE_SOURCE[syncDataset]],
        }),
      },
    ];
  }

  return [];
}

function getSyncTotal(data: Record<string, any>) {
  if (typeof data.upserted === 'number') {
    return data.upserted;
  }

  if (typeof data.total === 'number') {
    return data.total;
  }

  if (Array.isArray(data.results)) {
    return data.results.reduce((total: number, result: Record<string, any>) => {
      if (typeof result.upserted === 'number') {
        return total + result.upserted;
      }

      if (typeof result.total === 'number') {
        return total + result.total;
      }

      if (Array.isArray(result.rows)) {
        return total + result.rows.length;
      }

      return total;
    }, 0);
  }

  return 0;
}

function getSyncFailureMessage(label: string, data: Record<string, any>, status: number) {
  const messages = [
    typeof data.message === 'string' ? data.message : '',
    ...(Array.isArray(data.results)
      ? data.results
          .map((result: Record<string, any>) => result.message)
          .filter((message): message is string => typeof message === 'string' && !!message)
      : []),
    ...(Array.isArray(data.sources)
      ? data.sources
          .map((source: Record<string, any>) => source.message)
          .filter((message): message is string => typeof message === 'string' && !!message)
      : []),
  ].filter(Boolean);
  const rawMessage = messages[0] ?? `HTTP ${status}`;
  const normalizedMessage = rawMessage.toLowerCase();

  if (
    label.includes('ททท.') &&
    /api[_\s-]?key|unauthorized|forbidden|401|403/.test(normalizedMessage)
  ) {
    return `${label}: API key ไม่ถูกต้อง หรือยังไม่ได้ตั้งค่า TAT_DATA_API_KEY`;
  }

  if (
    label.includes('กรมศิลป์') &&
    /api[_\s-]?key|unauthorized|forbidden|401|403/.test(normalizedMessage)
  ) {
    return `${label}: API key ไม่ถูกต้อง หรือยังไม่ได้ตั้งค่า FINE_ARTS_API_KEY`;
  }

  return `${label}: ${rawMessage}`;
}

export default function CulturalPlacesCmsPage() {
  const { user, checkUserSession } = useAuthContext();
  const [provinceCode, setProvinceCode] = useState('');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [syncDataset, setSyncDataset] = useState(SYNC_DATASET_OPTIONS[0].value);
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
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
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
  const selectedSyncDataset = useMemo(
    () => SYNC_DATASET_OPTIONS.find((option) => option.value === syncDataset),
    [syncDataset]
  );

  const handleUnauthorized = async () => {
    setPlaces([]);
    setTotalRows(0);
    setEditingPlace(null);
    await checkUserSession?.();
  };

  const loadPlaces = useCallback(
    async (options?: { keepMessage?: boolean }) => {
      setError('');
      if (!options?.keepMessage) {
        setMessage('');
      }
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          page: `${page + 1}`,
          pageSize: `${rowsPerPage}`,
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

        const response = await fetch(`/api/culture/province-places?${params.toString()}`);
        const data = (await response.json()) as ProvincePlacesResponse;

        if (!response.ok) {
          throw new Error(data.message ?? 'โหลดข้อมูลไม่สำเร็จ');
        }

        const nextPlaces = Array.isArray(data.data) ? data.data : [];
        const nextTotal = data.pagination?.total ?? data.total ?? nextPlaces.length;
        const nextPage = (data.pagination?.page ?? data.page ?? page + 1) - 1;

        setPlaces(nextPlaces);
        setDistricts(Array.isArray(data.districts) ? data.districts : []);
        setTotalRows(nextTotal);
        if (!options?.keepMessage) {
          setMessage(`โหลดข้อมูล ${nextTotal} รายการ`);
        }

        if (nextPage !== page) {
          setPage(Math.max(nextPage, 0));
        }
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'โหลดข้อมูลไม่สำเร็จ');
      } finally {
        setIsLoading(false);
      }
    },
    [appliedQuery, districtFilter, page, provinceCode, rowsPerPage, sourceFilter]
  );

  useEffect(() => {
    loadPlaces();
  }, [loadPlaces]);

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

        if (nextOptions.length) {
          setCategoryOptions(nextOptions);
        }
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

  const syncExternalData = async () => {
    const syncTasks = getSyncTasks(provinceCode, syncDataset);

    if (!syncTasks.length) {
      setError('กรุณาเลือกชุดข้อมูลที่ต้องการ Sync');
      setMessage('');
      return;
    }

    setError('');
    setMessage('');
    setIsSyncing(true);

    try {
      const results: SyncEndpointResult[] = [];

      for (const task of syncTasks) {
        const response = await fetch(task.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(task.body),
        });
        const data = (await response.json().catch(() => ({}))) as Record<string, any>;

        results.push({
          endpoint: task.endpoint,
          label: task.label,
          status: response.status,
          total: getSyncTotal(data),
          upserted: typeof data.upserted === 'number' ? data.upserted : undefined,
          message: response.ok
            ? data.message
            : getSyncFailureMessage(task.label, data, response.status),
          ok: response.ok,
        });
      }

      const failedResults = results.filter((result) => !result.ok);
      const successResults = results.filter((result) => result.ok);
      const totalSynced = successResults.reduce((total, result) => total + (result.total ?? 0), 0);
      const datasetLabel = selectedSyncDataset?.label ?? 'API นอก';

      if (successResults.length) {
        setMessage(
          `Sync ${datasetLabel} สำเร็จ ${totalSynced} รายการ (${successResults
            .map((result) => `${result.label} ${result.total ?? 0}`)
            .join(', ')})`
        );
        setPage(0);
        await loadPlaces({ keepMessage: true });
      }

      if (failedResults.length) {
        setError(
          failedResults
            .map((result) => result.message ?? `${result.label}: sync ไม่สำเร็จ`)
            .join(', ')
        );
      }

      if (!successResults.length && failedResults.length) {
        setMessage('');
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Sync API นอกไม่สำเร็จ');
    } finally {
      setIsSyncing(false);
    }
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
      lat: `${place.lat}`,
      lng: `${place.lng}`,
      mapUrl: place.mapUrl ?? '',
      imageUrl: place.imageUrls?.[0] ?? place.override?.image_url ?? '',
      note: place.override?.note ?? '',
    });
  };

  const savePlace = async () => {
    if (!editingPlace) {
      return;
    }

    setError('');
    setMessage('');
    setIsSaving(true);

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

      const response = await fetch('/api/admin/cultural-places', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          placeId: editingPlace.id,
          provinceCode: editingPlace.provinceCode,
          name: editingPlace.name,
          source: editingPlace.source,
          category: editingPlace.category,
          district: editingPlace.district,
          lat: editingPlace.lat,
          lng: editingPlace.lng,
          mapUrl: editingPlace.mapUrl,
          imageUrl: editingPlace.imageUrl,
          note: editingPlace.note,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          await handleUnauthorized();
        }

        throw new Error(data.message ?? 'บันทึกไม่สำเร็จ');
      }

      setMessage('บันทึกพิกัดแล้ว');
      setEditingPlace(null);

      if (provinceCode && editingPlace.provinceCode !== provinceCode) {
        setProvinceCode(editingPlace.provinceCode);
        setDistrictFilter('');
        setPage(0);
      } else {
        await loadPlaces();
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteOverride = async (place: CmsPlace) => {
    if (!canDeletePlace(place)) {
      setError('ลบได้เฉพาะข้อมูลจาก Thailand Cultural Hub เท่านั้น');
      return;
    }

    setError('');
    setMessage('');

    try {
      const params = new URLSearchParams({ placeId: place.id });
      const response = await fetch(`/api/admin/cultural-places?${params.toString()}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          await handleUnauthorized();
        }

        throw new Error(data.message ?? 'ลบ override ไม่สำเร็จ');
      }

      setMessage('ลบ override แล้ว');
      await loadPlaces();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'ลบ override ไม่สำเร็จ');
    }
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
            alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          >
            <TextField
              select
              size="small"
              label="ชุดข้อมูล Sync"
              value={syncDataset}
              onChange={(event) => setSyncDataset(event.target.value)}
              helperText={selectedSyncDataset?.description}
              sx={{ minWidth: { xs: 1, sm: 280 } }}
            >
              {SYNC_DATASET_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <LoadingButton
              color="inherit"
              variant="outlined"
              loading={isSyncing}
              onClick={syncExternalData}
              sx={{ alignSelf: { md: 'flex-start' }, whiteSpace: 'nowrap' }}
            >
              Sync API นอก
            </LoadingButton>
            <Button variant="contained" onClick={startAdd} sx={{ alignSelf: { md: 'flex-start' } }}>
              เพิ่มสถานที่
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        <Alert severity="info">
          Sync จาก ททท. ต้องมี <strong>TAT_DATA_API_KEY</strong> และกรมศิลป์ต้องมี{' '}
          <strong>FINE_ARTS_API_KEY</strong> ใน env ของ server
        </Alert>

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
                sx={{ maxWidth: { md: 320 } }}
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
                sx={{ maxWidth: { md: 260 } }}
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
                sx={{ maxWidth: { md: 280 } }}
              />

              <LoadingButton
                variant="contained"
                loading={isLoading}
                onClick={handleSearch}
                sx={{ px: 3, fontWeight: 900 }}
              >
                ค้นหา
              </LoadingButton>
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
            <TableContainer sx={{ overflow: 'auto' }}>
              <Table sx={{ minWidth: 1240 }}>
                <TableHeadCustom headCells={TABLE_HEAD} />

                <TableBody>
                  {places.map((place) => (
                    <TableRow key={place.id} hover>
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
                        {place.highlight && (
                          <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                            {place.highlight}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>{getProvinceName(place.provinceCode)}</TableCell>

                      <TableCell>{getSourceText(place.source)}</TableCell>

                      <TableCell>{place.district || 'ไม่ระบุอำเภอ'}</TableCell>

                      <TableCell>
                        <Typography sx={{ fontSize: 13 }}>{place.lat}</Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                          {place.lng}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {place.override ? (
                          <Box>
                            <Typography sx={{ color: '#b65d20', fontSize: 13, fontWeight: 800 }}>
                              มี override แล้ว
                            </Typography>
                            {place.override.updated_at && (
                              <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                                {place.override.updated_at}
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
                        {place.override?.updated_by_name || place.override?.updated_by_email ? (
                          <Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
                              {place.override.updated_by_name || place.override.updated_by_email}
                            </Typography>
                            {place.override.updated_by_email &&
                              place.override.updated_by_email !==
                                place.override.updated_by_name && (
                                <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                                  {place.override.updated_by_email}
                                </Typography>
                              )}
                          </Box>
                        ) : (
                          <Typography sx={{ color: 'text.disabled', fontSize: 13 }}>-</Typography>
                        )}
                      </TableCell>

                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
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
                          <Button size="small" variant="outlined" onClick={() => startEdit(place)}>
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
              rowsPerPageOptions={[10]}
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
                    loading={isSaving}
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
