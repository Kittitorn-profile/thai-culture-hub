import { EthnicGroupsClient } from './ethnic-groups-client';

export const metadata = { title: 'กลุ่มชาติพันธุ์ | Admin' };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const group = typeof params.group === 'string' ? params.group.slice(0, 200) : '';
  return <EthnicGroupsClient key={group} initialGroup={group} />;
}
