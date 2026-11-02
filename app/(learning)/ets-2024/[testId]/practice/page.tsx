import { notFound } from 'next/navigation';
import { requireUser } from '../../../../../lib/auth-server';
import { getPublicEtsTest } from '../../../../../lib/ets/catalog';
import EtsWorkspace from '../../../../../components/ets/workspace';
type Props = { params: Promise<{ testId: string }>; searchParams: Promise<{ part?: string }> };
export default async function EtsPracticePage({ params, searchParams }: Props) {
  const user = await requireUser();
  const { testId } = await params;
  const { part: value } = await searchParams;
  if (!/^[1-9]\d*$/.test(testId) || (value !== undefined && !/^[1-7]$/.test(value))) notFound();
  const test = getPublicEtsTest(Number(testId));
  const part = Number(value ?? 0);
  if (!test || (part > 0 && !test.parts.some(p => p.number === part))) notFound();
  return <EtsWorkspace key={`${user.id}:${test.id}:${part}`} userId={user.id} test={test} part={part}/>;
}
