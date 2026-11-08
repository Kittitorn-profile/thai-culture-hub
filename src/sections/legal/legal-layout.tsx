'use client';

import { MainLayout } from 'src/layouts/main';
import { HomeFooter } from 'src/layouts/main/footer';

export function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <MainLayout sx={{ bgcolor: '#f7f7f5', backgroundImage: 'none' }}>
      {children}
      <HomeFooter sx={{ bgcolor: '#f7f7f5' }} />
    </MainLayout>
  );
}
