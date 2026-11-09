'use client';

import type { CulturalArtist } from 'src/server/cultural-artists';

import Link from 'next/link';
import { useState } from 'react';
import { RiArrowRightUpLine } from '@remixicon/react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { culturalExploreUrl } from 'src/utils/cultural-explore';

import { DashboardContent } from 'src/layouts/dashboard';

import { useAuthContext } from 'src/auth/hooks';
import { ADMIN_PERMISSION, canAccessAdminPermission } from 'src/auth/admin-permissions';

const TYPES: Record<string, string> = {
  national_artist: 'ทำเนียบศิลปินแห่งชาติ',
  contemporary_artist: 'ศิลปินร่วมสมัย',
  silpathorn_artist: 'ศิลปินศิลปาธร',
  folk_artist: 'ศิลปินพื้นบ้าน',
  local_artist: 'ศิลปินท้องถิ่น',
  performing_artist: 'ศิลปินนักร้อง/นักดนตรี',
};
const RELATIONSHIPS: Record<string, string> = {
  birthplace: 'จังหวัดเกิด',
  origin: 'ภูมิลำเนา',
  work_area: 'พื้นที่ทำงาน',
  learning_site: 'บ้านศิลปิน/แหล่งเรียนรู้',
  cultural_legacy: 'มรดกผลงานวัฒนธรรม',
};
export function ArtistDetailClient({ artist }: { artist: CulturalArtist }) {
  const { user } = useAuthContext();
  const canExploreHeritage = canAccessAdminPermission(user, ADMIN_PERMISSION.culturalHeritage);
  const [selected, setSelected] = useState(artist);
  return (
    <DashboardContent maxWidth="md">
      <Button
        component={Link}
        href="/admin/cultural-artists/"
        color="inherit"
        sx={{ alignSelf: 'flex-start', mb: 3 }}
      >
        ← กลับหน้ารายการศิลปิน
      </Button>
      <Box
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: 2,
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <ArtistImageEditor
          key={selected.id}
          artist={selected}
          onSaved={(updatedArtist) => {
            setSelected(updatedArtist);
          }}
        />
        <Typography component="h1" variant="h4">
          {selected.name}
        </Typography>
        <Typography sx={{ color: 'text.secondary', mt: 1 }}>
          {selected.types.map((kind) => TYPES[kind]).join(' · ')}
        </Typography>
        <Typography sx={{ fontWeight: 600, mt: 3, mb: 1 }}>สาขาและแนวการแสดง</Typography>
        <Typography sx={{ fontSize: 14, lineHeight: 1.8 }}>
          {selected.fields.join(' · ')}
        </Typography>
        {canExploreHeritage && (
          <Box sx={{ mt: 2, p: 2, bgcolor: '#f4f6f2', borderRadius: 2 }}>
            <Typography sx={{ fontWeight: 600, mb: 0.5 }}>สำรวจเรื่องวัฒนธรรมต่อ</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
              ค้นหาจากแนวการแสดงหรือจังหวัด ไม่ใช่การรับรองว่าเป็นผู้สืบทอดรายการนั้น
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {selected.genres.map((topic) => (
                <Button
                  component="a"
                  key={topic}
                  size="small"
                  variant="outlined"
                  href={culturalExploreUrl('heritage', topic)}
                  sx={{ borderRadius: 99 }}
                >
                  {topic}
                </Button>
              ))}
              {[
                ...new Map(
                  selected.provinceAssociations.map((item) => [item.provinceCode, item])
                ).values(),
              ].map((item) => (
                <Button
                  component="a"
                  key={item.provinceCode}
                  size="small"
                  href={culturalExploreUrl('heritage', '', item.provinceCode)}
                >
                  มรดกภูมิปัญญา · {item.provinceName}
                </Button>
              ))}
              {!selected.genres.length && !selected.provinceAssociations.length && (
                <Button component="a" href={culturalExploreUrl('heritage')}>
                  ดูมรดกภูมิปัญญาทั้งหมด
                </Button>
              )}
            </Box>
          </Box>
        )}
        <Typography sx={{ fontWeight: 600, mt: 3, mb: 1 }}>ความเกี่ยวข้องกับจังหวัด</Typography>
        {selected.provinceAssociations.length ? (
          selected.provinceAssociations.map((item, index) => (
            <Box
              key={`${item.provinceCode}:${index}`}
              sx={{ p: 2, mb: 1, borderRadius: 1.5, bgcolor: '#f0f3ed' }}
            >
              <Typography sx={{ fontWeight: 600 }}>{item.provinceName}</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                {RELATIONSHIPS[item.relationship]}
                {item.district ? ` · ${item.district}` : ''}
              </Typography>
              <Button
                size="small"
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<RiArrowRightUpLine size={14} />}
              >
                หลักฐานอ้างอิง
              </Button>
            </Box>
          ))
        ) : (
          <Alert severity="warning">ยังไม่มีหลักฐานระบุจังหวัด จึงยังไม่จัดลงจังหวัดใด</Alert>
        )}
        {!!selected.awards?.length && (
          <>
            <Typography sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
              รางวัลและผลงานที่ได้รับการยอมรับ
            </Typography>
            {selected.awards.map((award, index) => (
              <Box key={index} sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: 14 }}>
                  {award.title} · พ.ศ. {award.yearBE}
                </Typography>
                <Button
                  size="small"
                  href={award.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  endIcon={<RiArrowRightUpLine size={14} />}
                >
                  แหล่งอ้างอิงรางวัล
                </Button>
              </Box>
            ))}
          </>
        )}
        {selected.recognitions.length > 0 && (
          <>
            <Typography sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
              ประวัติการยกย่องตามทำเนียบ
            </Typography>
            {selected.recognitions.map((item, index) => (
              <Typography key={index} sx={{ fontSize: 14, mb: 1 }}>
                พ.ศ. {item.yearBE} · {item.field} {item.specialty}
              </Typography>
            ))}
          </>
        )}
        <Typography sx={{ fontWeight: 600, mt: 3, mb: 1 }}>แหล่งข้อมูลทั้งหมด</Typography>
        {[...new Set(selected.sources.map((source) => source.url))].map((url) => (
          <Button
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<RiArrowRightUpLine size={14} />}
            sx={{ justifyContent: 'flex-start', mb: 1 }}
          >
            ดูแหล่งข้อมูล · {new URL(url).hostname}
          </Button>
        ))}
      </Box>
    </DashboardContent>
  );
}

function ArtistImageEditor({
  artist,
  onSaved,
}: {
  artist: CulturalArtist;
  onSaved: (artist: CulturalArtist) => void;
}) {
  const { user } = useAuthContext();
  const [file, setFile] = useState<File | null>(null);
  const [credit, setCredit] = useState(artist.image?.credit ?? '');
  const [sourceUrl, setSourceUrl] = useState(artist.image?.sourceUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  return (
    <Box
      component="form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!file || saving) return;
        setSaving(true);
        setMessage('');
        setSuccess(false);
        try {
          const form = new FormData();
          form.set('artistId', artist.id);
          form.set('file', file);
          form.set('credit', credit.trim());
          form.set('sourceUrl', sourceUrl.trim());
          const token = user?.accessToken ?? user?.access_token;
          const response = await fetch('/api/admin/cultural-artists/image/', {
            method: 'POST',
            body: form,
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.message ?? 'บันทึกรูปไม่สำเร็จ');
          onSaved(result.data);
          setFile(null);
          setSuccess(true);
          setMessage('บันทึกรูปศิลปินแล้ว');
        } catch (error) {
          setMessage(error instanceof Error ? error.message : 'บันทึกรูปไม่สำเร็จ');
        } finally {
          setSaving(false);
        }
      }}
      sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: '#f4f6f2' }}
    >
      <Avatar
        variant="rounded"
        src={artist.image?.url}
        alt={artist.name}
        sx={{ width: 120, height: 120, mb: 1.5, fontSize: 36 }}
      >
        {artist.name.slice(0, 1)}
      </Avatar>
      {artist.image && (
        <Typography sx={{ fontSize: 12, mb: 1 }}>
          ภาพ: {artist.image.credit}{' '}
          {artist.image.sourceUrl && (
            <a href={artist.image.sourceUrl} target="_blank" rel="noopener noreferrer">
              แหล่งที่มา
            </a>
          )}
        </Typography>
      )}
      <Typography sx={{ fontWeight: 600, mb: 1 }}>รูปศิลปิน</Typography>
      <Button component="label" variant="outlined" size="small" disabled={saving}>
        เลือกรูปภาพ
        <input
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const picked = event.target.files?.[0];
            event.target.value = '';
            if (!picked) return;
            if (
              picked.size > 2 * 1024 * 1024 ||
              !['image/jpeg', 'image/png', 'image/webp'].includes(picked.type)
            ) {
              setSuccess(false);
              setMessage('รองรับ JPG, PNG หรือ WebP ไม่เกิน 2 MB');
              return;
            }
            setFile(picked);
            setMessage('');
          }}
        />
      </Button>
      <Typography sx={{ fontSize: 12, mt: 1, color: 'text.secondary' }}>
        {file?.name ?? 'JPG, PNG หรือ WebP ไม่เกิน 2 MB'}
      </Typography>
      <TextField
        required
        fullWidth
        size="small"
        label="เครดิตภาพ / เจ้าของภาพ"
        value={credit}
        onChange={(event) => setCredit(event.target.value)}
        sx={{ mt: 2 }}
      />
      <TextField
        fullWidth
        size="small"
        type="url"
        label="ลิงก์แหล่งภาพ (ถ้ามี)"
        value={sourceUrl}
        onChange={(event) => setSourceUrl(event.target.value)}
        helperText="ใช้ลิงก์ https://"
        sx={{ mt: 2 }}
      />
      {message && (
        <Alert severity={success ? 'success' : 'error'} sx={{ mt: 1.5 }}>
          {message}
        </Alert>
      )}
      <Button
        type="submit"
        variant="contained"
        size="small"
        disabled={!file || !credit.trim() || saving}
        sx={{ mt: 1.5 }}
      >
        {saving ? 'กำลังบันทึก…' : 'บันทึกรูปภาพ'}
      </Button>
    </Box>
  );
}
