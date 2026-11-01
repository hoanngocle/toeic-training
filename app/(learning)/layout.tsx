import { requireUser } from '../../lib/auth-server';
import AppShell from '../../components/layout/app-shell';

export default async function LearningLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
