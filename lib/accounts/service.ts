import { assertAdmin, assertLearnerTarget, credentials, passwordValue, AccountError } from './policy.ts';
import type { AppUser } from './policy.ts';
export type AccountBackend = {
  create: (email:string,password:string)=>Promise<unknown>;
  find: (id:string)=>Promise<AppUser|null>;
  setDisabled: (id:string,disabled:boolean)=>Promise<void>;
  resetPassword: (id:string,password:string)=>Promise<void>;
};
export async function createAccount(actor:AppUser|null,input:unknown,backend:AccountBackend) {
  assertAdmin(actor);
  const {email,password}=credentials(input,true);
  await backend.create(email,password);
}
export async function updateAccount(actor:AppUser|null,id:string,input:unknown,backend:AccountBackend) {
  assertAdmin(actor);
  const target=await backend.find(id);
  assertLearnerTarget(actor,target);
  if (!input || typeof input!=='object') throw new AccountError('Dữ liệu không hợp lệ.');
  const value=input as Record<string,unknown>;
  if (value.action==='disable' || value.action==='enable') return backend.setDisabled(id,value.action==='disable');
  if (value.action==='password') return backend.resetPassword(id,passwordValue(value.password));
  throw new AccountError('Thao tác không hợp lệ.');
}
