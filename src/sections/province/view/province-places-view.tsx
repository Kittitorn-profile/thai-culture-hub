'use client';

import type { CulturalPlace } from '../province-data';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RiMapPin2Line, RiArrowRightUpLine } from '@remixicon/react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

import { HOME_SECTION_PX } from 'src/sections/home/components/home-constants';

import { useCategoryConfig } from '../category-config';
import { getProvinceDisplayName } from '../province-data';
import { ProvincePlacesList } from './province-places-list';
import { resolvePlaceDistricts } from '../province-districts';
import { useThailandDistrictCenters } from '../thailand-geojson';

export function ProvincePlacesView() {
  const { provinceId } = useParams<{ provinceId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const config = useCategoryConfig();
  const district = searchParams.get('district') || null;
  const provinceName = getProvinceDisplayName(provinceId, searchParams.get('name') ?? undefined);
  const backUrl = `/province/${encodeURIComponent(provinceId)}/?${new URLSearchParams({ name: provinceName }).toString()}`;
  const { data: centers } = useThailandDistrictCenters(provinceId);
  const { data, isPending, error, refetch } = useQuery<CulturalPlace[]>({
    queryKey: ['province-map-places', provinceId],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/culture/province-places?provinceCode=${encodeURIComponent(provinceId)}&view=map`,
        { signal }
      );
      if (!response.ok) throw new Error('ไม่สามารถโหลดสถานที่ได้ กรุณาลองอีกครั้ง');
      const result = await response.json();
      return Array.isArray(result.data) ? result.data : [];
    },
    staleTime: 60_000,
  });
  const allPlaces = useMemo(
    () => resolvePlaceDistricts(data ?? [], centers?.districts ?? []),
    [data, centers]
  );
  const places = useMemo(
    () =>
      district
        ? allPlaces.filter((place) => (place.district || 'ไม่ระบุอำเภอ') === district)
        : allPlaces,
    [allPlaces, district]
  );

  const otherDistricts = useMemo(() => {
    const counts = new Map<string, number>();
    allPlaces.forEach((place) => {
      if (place.district && place.district !== 'ไม่ระบุอำเภอ' && place.district !== district) {
        counts.set(place.district, (counts.get(place.district) ?? 0) + 1);
      }
    });
    return Array.from(counts, ([name, count]) => ({ name, count })).sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, 'th')
    );
  }, [allPlaces, district]);
  const districtUrl = (name?: string) =>
    `/province/${encodeURIComponent(provinceId)}/places/?${new URLSearchParams({ name: provinceName, ...(name ? { district: name } : {}) }).toString()}`;

  return (
    <Box
      sx={{
        width: 1,
        minWidth: 0,
        maxWidth: 1408,
        mx: 'auto',
        px: { ...HOME_SECTION_PX, xs: 2 },
        pt: { xs: 3, md: 5 },
        pb: { xs: 'calc(96px + env(safe-area-inset-bottom, 0px))', md: 8 },
      }}
    >
      <Button
        component={RouterLink}
        href={backUrl}
        color="inherit"
        startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
        sx={{ mb: 3 }}
      >
        กลับแผนที่{provinceName}
      </Button>
      {isPending ? (
        <Box
          aria-label="กำลังโหลดสถานที่"
          aria-busy="true"
          sx={{
            width: 1,
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
            gap: { xs: 2, sm: 2.5 },
          }}
        >
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton
              key={index}
              variant="rounded"
              width="100%"
              height={360}
              sx={{ minWidth: 0 }}
            />
          ))}
        </Box>
      ) : error ? (
        <Alert severity="error" action={<Button onClick={() => refetch()}>ลองอีกครั้ง</Button>}>
          {error.message}
        </Alert>
      ) : (
        <ProvincePlacesList
          key={`${provinceId}:${district}`}
          selectedDistrictDetail={district || `สถานที่ใน${provinceName}`}
          places={places}
          categoryConfig={config}
          onPlaceSelect={(place) => router.push(`/culture-place/${encodeURIComponent(place.id)}/`)}
        />
      )}
      {!isPending && !error && otherDistricts.length > 0 && (
        <Box
          component="section"
          aria-labelledby="other-districts-heading"
          sx={{ mt: { xs: 5, md: 7 }, pt: 4, borderTop: '1px solid', borderColor: 'divider' }}
        >
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              mb: 2.5,
            }}
          >
            <Box>
              <Typography
                id="other-districts-heading"
                component="h2"
                sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 700 }}
              >
                สำรวจอำเภออื่นในจังหวัด
              </Typography>
              <Typography sx={{ mt: 0.5, fontSize: 13, color: 'text.secondary' }}>
                ค้นพบสถานที่และเรื่องราววัฒนธรรมใน{provinceName}ต่อ
              </Typography>
            </Box>
            {district && (
              <Button
                component={RouterLink}
                href={districtUrl()}
                color="inherit"
                endIcon={<RiArrowRightUpLine size={16} />}
              >
                ดูทั้งจังหวัด
              </Button>
            )}
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(3, minmax(0, 1fr))',
              },
              gap: 1.5,
            }}
          >
            {otherDistricts.map((item) => (
              <Box
                key={item.name}
                component={RouterLink}
                href={districtUrl(item.name)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  textDecoration: 'none',
                  transition: 'background-color 150ms, border-color 150ms',
                  '&:hover, &:focus-visible': { bgcolor: '#edf1e9', borderColor: '#839b7c' },
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    bgcolor: '#edf1e9',
                    color: '#526c56',
                    flexShrink: 0,
                  }}
                >
                  <RiMapPin2Line size={20} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{item.name}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
                    {item.count.toLocaleString('th-TH')} สถานที่และข้อมูลวัฒนธรรม
                  </Typography>
                </Box>
                <RiArrowRightUpLine size={18} aria-hidden="true" />
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
