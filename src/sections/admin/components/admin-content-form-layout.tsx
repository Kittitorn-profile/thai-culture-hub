import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

type ActionProps = { listHref: string; submitLabel: string; loading: boolean; disabled?: boolean };
type HeaderProps = ActionProps & {
  title: string;
  description: string;
  sections: { id: string; label: string }[];
};
export function AdminContentFormHeader({
  title,
  description,
  sections,
  listHref,
  submitLabel,
  loading,
  disabled,
}: HeaderProps) {
  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'flex-start' }}
        spacing={2}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="h1"
            variant="h3"
            sx={{ fontWeight: 900, overflowWrap: 'anywhere' }}
          >
            {title}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.8 }}>
            {description}
          </Typography>
        </Box>
        <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1.5} sx={{ flexShrink: 0 }}>
          <Button component="a" href={listHref} variant="outlined" disabled={loading}>
            กลับหน้ารายการ
          </Button>
          <LoadingButton type="submit" variant="contained" loading={loading} disabled={disabled}>
            {submitLabel}
          </LoadingButton>
        </Stack>
      </Stack>
      <Card component="nav" aria-label="ส่วนของแบบฟอร์ม" sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {sections.map((section, index) => (
            <Button
              key={section.id}
              component="a"
              href={`#${section.id}`}
              color="inherit"
              size="small"
              sx={{
                px: 1.5,
                py: 0.75,
                justifyContent: 'flex-start',
                bgcolor: 'background.neutral',
                '&:hover': { bgcolor: 'action.selected' },
              }}
            >
              <Box component="span" sx={{ mr: 1, color: 'text.secondary' }}>
                {String(index + 1).padStart(2, '0')}
              </Box>
              {section.label}
            </Button>
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}
export function AdminContentFormActions({ listHref, submitLabel, loading, disabled }: ActionProps) {
  return (
    <Stack
      direction="row"
      justifyContent="flex-end"
      spacing={1.5}
      sx={{
        position: 'sticky',
        bottom: { xs: 'calc(12px + env(safe-area-inset-bottom, 0px))', md: 16 },
        zIndex: 10,
        p: 2,
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        '& > .MuiButton-root': { flex: { xs: 1, sm: '0 0 auto' } },
      }}
    >
      <Button component="a" href={listHref} color="inherit" variant="outlined" disabled={loading}>
        ยกเลิก
      </Button>
      <LoadingButton type="submit" variant="contained" loading={loading} disabled={disabled}>
        {submitLabel}
      </LoadingButton>
    </Stack>
  );
}
