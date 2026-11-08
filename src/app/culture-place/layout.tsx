'use client';

import { MainLayout } from 'src/layouts/main';
import { HomeFooter } from 'src/layouts/main/footer';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <MainLayout sx={{ bgcolor: '#f7f7f5', backgroundImage: 'none' }}>
      {children}
      <HomeFooter />
    </MainLayout>
  );
}
