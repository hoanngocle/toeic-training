import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config';
import { AccountError } from '../accounts/policy';
import type { AccountBackend } from '../accounts/service';
export function adminClient() {
  const {url}=supabaseConfig();
  const key=process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error('Missing SUPABASE_SECRET_KEY');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
export function accountBackend(): AccountBackend {
  const client=adminClient();
  return {
    async create(email,password) {
      const {error}=await client.auth.admin.createUser({email,password,email_confirm:true});
      if (error) {
        if (error.code==='email_exists' || error.code==='user_already_exists') throw new AccountError('Email này đã có tài khoản.',409);
        throw new AccountError('Chưa tạo được tài khoản. Kiểm tra cấu hình Supabase rồi thử lại.',502);
      }
    },
    async find(id) {
      const {data,error}=await client.from('profiles').select('id,email,role').eq('id',id).maybeSingle();
      if (error) throw new AccountError('Chưa đọc được tài khoản.',502);
      return data;
    },
    async setDisabled(id,disabled) {
      const {data,error}=await client.from('profiles').update({disabled}).eq('id',id).eq('role','learner').select('id').maybeSingle();
      if (error || !data) throw new AccountError('Chưa cập nhật được tài khoản.',502);
    },
    async resetPassword(id,password) {
      const {error}=await client.auth.admin.updateUserById(id,{password});
      if (error) throw new AccountError('Chưa đổi được mật khẩu. Vui lòng thử lại.',502);
    },
  };
}
