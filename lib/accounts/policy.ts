export type AppUser = { id: string; email: string; role: 'admin' | 'learner' };
export class AccountError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
export function activeUser(identity: {id:string; email?:string}, profile: {id:string;role:string;disabled:boolean}|null): AppUser|null {
  if (!profile || profile.id!==identity.id || profile.disabled || !['admin','learner'].includes(profile.role)) return null;
  return {id:identity.id,email:identity.email??'',role:profile.role as AppUser['role']};
}
export function passwordValue(value: unknown, creating = true): string {
  if (typeof value!=='string' || value.length<(creating?12:1) || value.length>256) throw new AccountError(creating?'Mật khẩu cần từ 12 đến 256 ký tự.':'Vui lòng nhập mật khẩu.');
  return value;
}
export function credentials(input: unknown, creating = false) {
  if (!input || typeof input!=='object') throw new AccountError('Dữ liệu không hợp lệ.');
  const {email,password}=input as Record<string,unknown>;
  if (typeof email!=='string' || email.trim().length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new AccountError('Vui lòng nhập email hợp lệ.');
  return {email:email.trim().toLowerCase(),password:passwordValue(password,creating)};
}
export function assertAdmin(actor: AppUser|null): asserts actor is AppUser {
  if (!actor) throw new AccountError('Vui lòng đăng nhập.',401);
  if (actor.role!=='admin') throw new AccountError('Bạn không có quyền quản lý tài khoản.',403);
}
export function assertLearnerTarget(actor:AppUser,target:AppUser|null): asserts target is AppUser {
  if (!target) throw new AccountError('Không tìm thấy tài khoản.',404);
  if (target.id===actor.id || target.role!=='learner') throw new AccountError('Không thể thay đổi tài khoản quản trị tại đây.',403);
}
