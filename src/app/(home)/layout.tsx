import { MainLayout } from 'src/layouts/main';

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <MainLayout
      sx={{
        bgcolor: '#7b8476',
        backgroundImage: `
          radial-gradient(circle at 50% 18%, rgba(239,236,224,0.3) 0%, rgba(239,236,224,0.1) 28%, rgba(111,135,144,0) 58%),
          linear-gradient(180deg, #6f8790 0%, #7b8476 54%, #8f7c5c 100%)
        `,
      }}
    >
      {children}
    </MainLayout>
  );
}
