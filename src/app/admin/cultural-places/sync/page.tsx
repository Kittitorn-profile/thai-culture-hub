'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import Autocomplete from '@mui/material/Autocomplete';
import TableContainer from '@mui/material/TableContainer';

import { adminApiRequest } from 'src/lib/admin-api';
import { DashboardContent } from 'src/layouts/dashboard';
import provinces from 'src/data/thailand-culture/provinces';

import { TableHeadCustom } from 'src/components/table';

import { useAuthContext } from 'src/auth/hooks';

type ProvinceOption = {
  code: string;
  name: string;
  region?: string;
};

type SyncEndpointResult = {
  endpoint: string;
  label: string;
  status: number;
  total?: number;
  message?: string;
  ok: boolean;
};

type SummaryRefreshResult = {
  ok: boolean;
  status: number;
  total?: number;
  message?: string;
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

type SyncDatasetStatus = {
  loading?: boolean;
  ok?: boolean;
  total?: number;
  message?: string;
  syncedAt?: string;
};

type SyncLogRow = {
  id: string;
  sync_dataset: string;
  source_label: string;
  province_code: string | null;
  province_name: string | null;
  total_records: number;
  success: boolean;
  message: string | null;
  synced_by_email: string | null;
  synced_by_name: string | null;
  synced_at: string;
};

type SyncLogsResponse = {
  data?: SyncLogRow[];
  latestByDataset?: Record<string, SyncLogRow>;
  message?: string;
};

const ALL_PROVINCES_OPTION: ProvinceOption = { code: '', name: 'ทุกจังหวัด' };
const SYNC_LIMIT = 100;
const CULTURAL_PLACES_SYNC_LIMIT = 10000;
const TAT_SYNC_MAX_PAGES = 500;

const SYNC_TABLE_HEAD = [
  { id: 'source', label: 'แหล่งข้อมูล' },
  { id: 'description', label: 'รายละเอียด' },
  { id: 'total', label: 'จำนวน data ที่ได้มา', width: 180 },
  { id: 'status', label: 'สถานะล่าสุด', width: 260 },
  { id: 'actions', label: '', width: 140, align: 'right' as const },
];

const FINE_ARTS_SYNC_SOURCE_BY_DATASET: Record<string, string> = {
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
    value: 'tat_attraction_catalog',
    label: 'ททท. attraction.json',
    description: 'ดึง attraction.json เข้า cultural_places + cultural_place_details',
  },
  {
    value: 'tat_routes_articles',
    label: 'ททท. routes/articles',
    description: 'ดึง routes, route places, article types และ articles จาก TAT DATA API',
  },
  {
    value: 'culture_catalog',
    label: 'ข้อมูลวัฒนธรรม -> Cultural Places',
    description: 'ดึงชุด culture catalog เข้า cultural_places',
  },
  {
    value: 'religious_places',
    label: 'ศาสนสถาน',
    description: 'ดึง CSV ศาสนสถานจากกระทรวงวัฒนธรรม',
  },
  {
    value: 'cpot_products',
    label: 'ผลิตภัณฑ์วัฒนธรรมไทย (CPOT)',
    description: 'ดึง dataset CPOT จาก gdcatalog.m-culture.go.th',
  },
  {
    value: 'thai_fabric_wisdom',
    label: 'มรดกภูมิปัญญาผ้าไทย',
    description: 'ดึง dataset Thai Fabric Wisdom จาก gdcatalog.m-culture.go.th',
  },
  {
    value: 'ethnic_groups',
    label: 'กลุ่มชาติพันธุ์',
    description: 'ดึงข้อมูลจากตาราง ethnic_groups เข้า cultural_places',
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

  if (syncDataset === 'tat_attraction_catalog') {
    return [
      {
        endpoint: '/api/tat/attraction-sync',
        label: 'ททท. attraction.json',
        body: withProvinceSyncPayload(provinceCode, {
          limit: CULTURAL_PLACES_SYNC_LIMIT,
        }),
      },
    ];
  }

  if (syncDataset === 'tat_routes_articles') {
    return [
      {
        endpoint: '/api/tat/routes-articles-sync',
        label: 'ททท. routes/articles',
        body: {
          limit: SYNC_LIMIT,
          maxPages: 5,
          syncRoutes: true,
          syncRoutePlaces: true,
          syncArticleTypes: true,
          syncArticles: true,
        },
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

  if (syncDataset === 'religious_places') {
    return [
      {
        endpoint: '/api/culture/religious-places-sync',
        label: 'ศาสนสถาน',
        body: withProvinceSyncPayload(provinceCode, {
          limit: CULTURAL_PLACES_SYNC_LIMIT,
        }),
      },
    ];
  }

  if (syncDataset === 'cpot_products') {
    return [
      {
        endpoint: '/api/culture/cpot-products-sync',
        label: 'ผลิตภัณฑ์วัฒนธรรมไทย (CPOT)',
        body: withProvinceSyncPayload(provinceCode, {
          limit: CULTURAL_PLACES_SYNC_LIMIT,
        }),
      },
    ];
  }

  if (syncDataset === 'thai_fabric_wisdom') {
    return [
      {
        endpoint: '/api/culture/thai-fabric-wisdom-sync',
        label: 'มรดกภูมิปัญญาผ้าไทย',
        body: withProvinceSyncPayload(provinceCode, {
          limit: CULTURAL_PLACES_SYNC_LIMIT,
        }),
      },
    ];
  }

  if (syncDataset === 'ethnic_groups') {
    return [
      {
        endpoint: '/api/culture/ethnic-groups-sync',
        label: 'กลุ่มชาติพันธุ์',
        body: withProvinceSyncPayload(provinceCode, {
          limit: CULTURAL_PLACES_SYNC_LIMIT,
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

  if (syncDataset in FINE_ARTS_SYNC_SOURCE_BY_DATASET) {
    return [
      {
        endpoint: '/api/finearts/sync',
        label:
          SYNC_DATASET_OPTIONS.find((option) => option.value === syncDataset)?.label ?? 'กรมศิลป์',
        body: withProvinceSyncPayload(provinceCode, {
          limit: SYNC_LIMIT,
          sources: [FINE_ARTS_SYNC_SOURCE_BY_DATASET[syncDataset]],
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

  if (typeof data.mappedRecords === 'number') {
    return data.mappedRecords;
  }

  if (data.upserted && typeof data.upserted === 'object') {
    return Math.max(
      ...Object.values(data.upserted).map((value) => (typeof value === 'number' ? value : 0))
    );
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

function getSyncStatusText(status?: SyncDatasetStatus) {
  if (!status) {
    return 'ยังไม่ได้ Sync';
  }

  if (status.loading) {
    return 'กำลัง Sync...';
  }

  return status.message ?? (status.ok ? 'Sync สำเร็จ' : 'Sync ไม่สำเร็จ');
}

function formatSyncedAt(value?: string) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

async function refreshProvincePlaceSummaries(): Promise<SummaryRefreshResult> {
  const response = await fetch('/api/culture/province-places?summary=true&refreshSummary=true', {
    cache: 'no-store',
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, any>;

  return {
    ok: response.ok,
    status: response.status,
    total: typeof data.total === 'number' ? data.total : undefined,
    message:
      typeof data.message === 'string'
        ? data.message
        : response.ok
          ? 'Refresh province_place_summaries สำเร็จ'
          : `Refresh province_place_summaries ไม่สำเร็จ (HTTP ${response.status})`,
  };
}

export default function CulturalPlacesSyncPage() {
  const { user, checkUserSession } = useAuthContext();
  const queryClient = useQueryClient();
  const [provinceCode, setProvinceCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [syncStatuses, setSyncStatuses] = useState<Record<string, SyncDatasetStatus>>({});
  const accessToken = user?.accessToken ?? user?.access_token ?? '';

  const provinceOptions = useMemo<ProvinceOption[]>(() => [ALL_PROVINCES_OPTION, ...provinces], []);
  const selectedProvince = useMemo(
    () =>
      provinceOptions.find((province) => province.code === provinceCode) ?? ALL_PROVINCES_OPTION,
    [provinceCode, provinceOptions]
  );

  const syncLogsQuery = useQuery({
    queryKey: ['admin-cultural-place-sync-logs', provinceCode, accessToken],
    enabled: !!accessToken,
    queryFn: () => {
      const params = new URLSearchParams({ limit: '100' });

      if (provinceCode) {
        params.set('provinceCode', provinceCode);
      }

      return adminApiRequest<SyncLogsResponse>(
        `/api/admin/cultural-place-sync-logs?${params.toString()}`,
        {
          accessToken,
        }
      );
    },
  });

  useEffect(() => {
    if (!syncLogsQuery.data) {
      return;
    }

    const latestByDataset = syncLogsQuery.data.latestByDataset ?? {};

    setSyncStatuses((previous) => {
      const nextStatuses = { ...previous };

      SYNC_DATASET_OPTIONS.forEach((option) => {
        const log = latestByDataset[option.value];

        if (!log) {
          if (!nextStatuses[option.value]?.loading) {
            delete nextStatuses[option.value];
          }
          return;
        }

        nextStatuses[option.value] = {
          ...nextStatuses[option.value],
          ok: log.success,
          total: log.total_records,
          message:
            log.message ??
            (log.success
              ? `Sync ${option.label} สำเร็จ ${log.total_records.toLocaleString('th-TH')} รายการ`
              : `Sync ${option.label} ไม่สำเร็จ`),
          syncedAt: log.synced_at,
        };
      });

      return nextStatuses;
    });
  }, [syncLogsQuery.data]);

  useEffect(() => {
    if (syncLogsQuery.error) {
      setError(
        syncLogsQuery.error instanceof Error
          ? syncLogsQuery.error.message
          : 'โหลดประวัติ Sync ไม่สำเร็จ'
      );
    }
  }, [syncLogsQuery.error]);

  const recordSyncLogMutation = useMutation({
    mutationFn: async (payload: {
      syncDatasetValue: string;
      datasetLabel: string;
      totalRecords: number;
      success: boolean;
      logMessage: string;
      results: SyncEndpointResult[];
    }) =>
      adminApiRequest<{ data?: SyncLogRow; message?: string }>('/api/admin/cultural-place-sync-logs', {
        method: 'POST',
        accessToken,
        body: {
          syncDataset: payload.syncDatasetValue,
          sourceLabel: payload.datasetLabel,
          provinceCode: provinceCode || null,
          provinceName: selectedProvince.name,
          totalRecords: payload.totalRecords,
          success: payload.success,
          message: payload.logMessage,
          responsePayload: {
            results: payload.results,
          },
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-cultural-place-sync-logs'] });
    },
  });

  const recordSyncLog = useCallback(
    async (payload: {
      syncDatasetValue: string;
      datasetLabel: string;
      totalRecords: number;
      success: boolean;
      logMessage: string;
      results: SyncEndpointResult[];
    }) => {
      if (!accessToken) {
        return null;
      }

      const data = await recordSyncLogMutation.mutateAsync(payload);

      return data.data ?? null;
    },
    [accessToken, recordSyncLogMutation]
  );

  const syncExternalData = async (syncDatasetValue: string) => {
    const syncTasks = getSyncTasks(provinceCode, syncDatasetValue);
    const datasetLabel =
      SYNC_DATASET_OPTIONS.find((option) => option.value === syncDatasetValue)?.label ?? 'API นอก';

    if (!syncTasks.length) {
      setError('กรุณาเลือกชุดข้อมูลที่ต้องการ Sync');
      setMessage('');
      return;
    }

    setError('');
    setMessage('');
    setSyncStatuses((previous) => ({
      ...previous,
      [syncDatasetValue]: {
        ...previous[syncDatasetValue],
        loading: true,
        message: 'กำลัง Sync...',
      },
    }));

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

        if (response.status === 401) {
          await checkUserSession?.();
        }

        results.push({
          endpoint: task.endpoint,
          label: task.label,
          status: response.status,
          total: getSyncTotal(data),
          message: response.ok
            ? data.message
            : getSyncFailureMessage(task.label, data, response.status),
          ok: response.ok,
        });
      }

      const failedResults = results.filter((result) => !result.ok);
      const successResults = results.filter((result) => result.ok);
      const totalSynced = successResults.reduce((total, result) => total + (result.total ?? 0), 0);
      const syncedAt = new Date().toISOString();
      const summaryRefresh = successResults.length ? await refreshProvincePlaceSummaries() : null;

      if (successResults.length) {
        const successMessage = `Sync ${datasetLabel} สำเร็จ ${totalSynced.toLocaleString(
          'th-TH'
        )} รายการ${
          summaryRefresh?.ok
            ? ` และ refresh summary แล้ว ${summaryRefresh.total?.toLocaleString('th-TH') ?? '-'} รายการ`
            : ''
        }`;

        await recordSyncLog({
          syncDatasetValue,
          datasetLabel,
          totalRecords: totalSynced,
          success: !failedResults.length && summaryRefresh?.ok !== false,
          logMessage: successMessage,
          results: summaryRefresh
            ? [
                ...results,
                {
                  endpoint: '/api/culture/province-places?summary=true&refreshSummary=true',
                  label: 'province_place_summaries',
                  status: summaryRefresh.status,
                  total: summaryRefresh.total,
                  message: summaryRefresh.message,
                  ok: summaryRefresh.ok,
                },
              ]
            : results,
        }).catch((caughtError) => {
          setError(
            caughtError instanceof Error ? caughtError.message : 'บันทึกประวัติ Sync ไม่สำเร็จ'
          );
        });

        setMessage(successMessage);
        setSyncStatuses((previous) => ({
          ...previous,
          [syncDatasetValue]: {
            loading: false,
            ok: summaryRefresh?.ok !== false,
            total: totalSynced,
            message: successMessage,
            syncedAt,
          },
        }));

        if (summaryRefresh?.ok === false) {
          setError(summaryRefresh.message ?? 'Refresh province_place_summaries ไม่สำเร็จ');
        }
      }

      if (failedResults.length) {
        const failedMessage = failedResults
          .map((result) => result.message ?? `${result.label}: sync ไม่สำเร็จ`)
          .join(', ');

        if (!successResults.length) {
          await recordSyncLog({
            syncDatasetValue,
            datasetLabel,
            totalRecords: totalSynced,
            success: false,
            logMessage: failedMessage,
            results,
          }).catch((caughtError) => {
            setError(
              caughtError instanceof Error ? caughtError.message : 'บันทึกประวัติ Sync ไม่สำเร็จ'
            );
          });
        }

        setError(failedMessage);
        setSyncStatuses((previous) => ({
          ...previous,
          [syncDatasetValue]: {
            loading: false,
            ok: false,
            total: totalSynced || previous[syncDatasetValue]?.total,
            message: failedMessage,
            syncedAt,
          },
        }));
      }

      if (!successResults.length && failedResults.length) {
        setMessage('');
      }
    } catch (caughtError) {
      const failedMessage =
        caughtError instanceof Error ? caughtError.message : 'Sync API นอกไม่สำเร็จ';

      await recordSyncLog({
        syncDatasetValue,
        datasetLabel,
        totalRecords: 0,
        success: false,
        logMessage: failedMessage,
        results: [],
      }).catch(() => null);

      setError(failedMessage);
      setSyncStatuses((previous) => ({
        ...previous,
        [syncDatasetValue]: {
          loading: false,
          ok: false,
          total: previous[syncDatasetValue]?.total,
          message: failedMessage,
          syncedAt: new Date().toISOString(),
        },
      }));
    } finally {
      setSyncStatuses((previous) => ({
        ...previous,
        [syncDatasetValue]: {
          ...previous[syncDatasetValue],
          loading: false,
        },
      }));
    }
  };

  return (
    <DashboardContent maxWidth="xl">
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>
              Cultural Places Sync
            </Typography>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              แสดงแหล่งข้อมูลภายนอกและจำนวน data ล่าสุดที่ดึงเข้าระบบ
            </Typography>
          </Box>
          <Button
            href="/admin/cultural-places"
            variant="outlined"
            sx={{ alignSelf: { md: 'flex-start' } }}
          >
            กลับไปรายการสถานที่
          </Button>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        <Alert severity="info">
          Sync จาก ททท. ต้องมี <strong>TAT_DATA_API_KEY</strong> และกรมศิลป์ต้องมี{' '}
          <strong>FINE_ARTS_API_KEY</strong> ใน env ของ server
        </Alert>

        <Card sx={{ p: 2.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <Autocomplete
              fullWidth
              options={provinceOptions}
              value={selectedProvince}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.code === value.code}
              onChange={(_, value) => setProvinceCode(value?.code ?? '')}
              renderInput={(params) => <TextField {...params} label="ขอบเขตจังหวัด" />}
              sx={{ maxWidth: { md: 360 } }}
            />
            <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
              เลือกจังหวัดเพื่อ Sync เฉพาะจังหวัด หรือเลือกทุกจังหวัดเพื่อดึงทั้งหมด
            </Typography>
          </Stack>
        </Card>

        <Card sx={{ p: 2.5 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            spacing={1}
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                แหล่งข้อมูล Sync
              </Typography>
              <Typography sx={{ mt: 0.5, color: 'text.secondary', fontSize: 13 }}>
                ตารางนี้อ่านประวัติล่าสุดจาก cultural_place_sync_logs
              </Typography>
            </Box>
            <Stack spacing={0.5} sx={{ color: 'text.secondary', fontSize: 13 }}>
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                ขอบเขตจังหวัด: {selectedProvince.name}
              </Typography>
              {syncLogsQuery.isLoading && (
                <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                  กำลังโหลดประวัติ Sync...
                </Typography>
              )}
            </Stack>
          </Stack>

          <TableContainer sx={{ overflow: 'auto' }}>
            <Table sx={{ minWidth: 920 }}>
              <TableHeadCustom headCells={SYNC_TABLE_HEAD} />
              <TableBody>
                {SYNC_DATASET_OPTIONS.map((option) => {
                  const status = syncStatuses[option.value];

                  return (
                    <TableRow key={option.value} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 900 }}>{option.label}</Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                          {option.value}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            color: status?.ok
                              ? 'success.main'
                              : status?.ok === false
                                ? 'error.main'
                                : 'text.secondary',
                            fontSize: 13,
                            fontWeight: 800,
                          }}
                        >
                          {getSyncStatusText(status)}
                        </Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                          {option.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 900 }}>
                          {typeof status?.total === 'number'
                            ? status.total.toLocaleString('th-TH')
                            : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                          {option?.label}
                        </Typography>
                        {status?.syncedAt && (
                          <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                            {formatSyncedAt(status.syncedAt)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <LoadingButton
                          size="small"
                          variant="outlined"
                          loading={Boolean(status?.loading)}
                          onClick={() => syncExternalData(option.value)}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
                          Sync
                        </LoadingButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Stack>
    </DashboardContent>
  );
}
