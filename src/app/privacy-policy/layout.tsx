import { LegalLayout } from 'src/sections/legal/legal-layout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <LegalLayout>{children}</LegalLayout>;
}
