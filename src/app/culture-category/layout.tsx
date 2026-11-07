import { MainLayout } from 'src/layouts/main';

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <MainLayout
      sx={{
        bgcolor: '#f7f7f5',
        backgroundImage: 'none',
      }}
      slotProps={{
        footer: {
          sx: {
            bgcolor: 'transparent',
            boxShadow: 'none',
          },
        },
      }}
    >
      {children}
    </MainLayout>
  );
}
