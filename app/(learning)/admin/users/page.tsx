import { requireAdmin } from '../../../../lib/auth-server';
import UserManager from '../../../../components/admin/user-manager';
export const metadata={title:'Quản lý tài khoản | English Space'};
export default async function UsersPage() {
  await requireAdmin();
  return <UserManager/>;
}
