import { requireUser } from '../../lib/auth-server';
import AppShell from '../../components/layout/app-shell';

export default async function LearningLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <AppShell>{children}</AppShell>;
}
