import { MainLayout } from 'src/layouts/main';

type Props = {
  children: React.ReactNode;
};

export default function CreatorLayout({ children }: Props) {
  return <MainLayout>{children}</MainLayout>;
}
