'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import './users.css';
type UserRow={id:string;email:string;role:'admin'|'learner';disabled:boolean};
export default function UserManager() {
  const [users,setUsers]=useState<UserRow[]>([]);
  const [page,setPage]=useState(1);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [resetId,setResetId]=useState<string|null>(null);
  const load=useCallback((signal?:AbortSignal)=>fetch(`/api/admin/users?page=${page}`,{cache:'no-store',signal})
    .then(async response=>{
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||'Chưa tải được danh sách.');
      if(!signal?.aborted){setUsers(data.users);setTotal(data.total);}
    })
    .catch(error=>{if(!signal?.aborted) setError(error instanceof Error?error.message:'Không thể kết nối.');})
    .finally(()=>{if(!signal?.aborted) setLoading(false);}),[page]);
  useEffect(()=>{const controller=new AbortController();void load(controller.signal);return ()=>controller.abort();},[load]);
  async function mutate(url:string,method:string,body:Record<string,unknown>,success:string) {
    if(busy) return false;
    setBusy(true);setError('');setMessage('');
    try {
      const response=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||'Chưa thực hiện được.');
      setMessage(success);setLoading(true);await load();return true;
    } catch(error) {setError(error instanceof Error?error.message:'Không thể kết nối.');return false;}
    finally {setBusy(false);}
  }
  async function create(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();const form=event.currentTarget;const data=new FormData(form);
    if(await mutate('/api/admin/users','POST',{email:data.get('email'),password:data.get('password')},'Đã tạo tài khoản. Bạn có thể gửi thông tin đăng nhập cho người học.')) form.reset();
  }
  async function reset(event:FormEvent<HTMLFormElement>,id:string) {
    event.preventDefault();const data=new FormData(event.currentTarget);
    if(await mutate(`/api/admin/users/${id}`,'PATCH',{action:'password',password:data.get('password')},'Đã đặt mật khẩu mới. Hãy thông báo cho người học.')) setResetId(null);
  }
  return <section className="users-page" aria-labelledby="users-title">
    <header className="users-heading"><p>QUẢN TRỊ</p><h1 id="users-title">Tài khoản học tập</h1><span>Chỉ những người bạn cấp tài khoản mới có thể vào học.</span></header>
    <div className="users-feedback" aria-live="polite"><p role="alert" className="users-error">{error}</p><p className="users-success">{message}</p></div>
    <div className="users-grid">
      <section className="users-card users-create"><h2>Tạo tài khoản</h2><p>Nhập email và mật khẩu để cấp quyền học.</p>
        <form onSubmit={create} aria-busy={busy}>
          <label htmlFor="new-email">Email</label><input id="new-email" name="email" type="email" autoComplete="off" placeholder="nguoi.hoc@example.com" maxLength={254} required disabled={busy}/>
          <label htmlFor="new-password">Mật khẩu ban đầu</label><input id="new-password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} required disabled={busy} aria-describedby="password-help"/>
          <small id="password-help">Ít nhất 12 ký tự. Gửi mật khẩu riêng cho người học.</small>
          <button className="users-primary" disabled={busy}>{busy?'Đang xử lý…':'Tạo tài khoản'}</button>
        </form>
      </section>
      <section className="users-card users-list" aria-busy={loading}><div className="users-list-title"><h2>Danh sách tài khoản</h2><span>{total} tài khoản</span></div>
        {loading?<p role="status">Đang tải…</p>:users.length===0?<p>Chưa có tài khoản nào.</p>:<ul>{users.map(user=><li key={user.id}>
          <div className="users-row"><div className="users-identity"><strong>{user.email}</strong><span className={`users-badge${user.disabled?' is-disabled':''}`}>{user.role==='admin'?'Quản trị viên':user.disabled?'Đã khóa':'Đang hoạt động'}</span></div>
            {user.role==='learner'&&<div className="users-actions">
              <button type="button" disabled={busy} onClick={()=>{setResetId(resetId===user.id?null:user.id);setMessage('');}}>Đặt mật khẩu</button>
              <button type="button" disabled={busy} onClick={()=>void mutate(`/api/admin/users/${user.id}`,'PATCH',{action:user.disabled?'enable':'disable'},user.disabled?'Đã mở khóa tài khoản.':'Đã khóa tài khoản. Dữ liệu học được giữ lại.')}>{user.disabled?'Mở khóa':'Khóa'}</button>
            </div>}
          </div>
          {resetId===user.id&&<form className="users-reset" onSubmit={event=>void reset(event,user.id)}><label htmlFor={`reset-${user.id}`}>Mật khẩu mới</label><input id={`reset-${user.id}`} name="password" type="password" autoComplete="new-password" minLength={12} maxLength={256} required disabled={busy} autoFocus/><div><button className="users-primary" disabled={busy}>Lưu mật khẩu</button><button type="button" disabled={busy} onClick={()=>setResetId(null)}>Hủy</button></div></form>}
        </li>)}</ul>}
        <div className="users-pagination"><button type="button" disabled={page===1||loading||busy} onClick={()=>{setResetId(null);setLoading(true);setPage(page-1);}}>Trước</button><span>Trang {page}</span><button type="button" disabled={page*20>=total||loading||busy} onClick={()=>{setResetId(null);setLoading(true);setPage(page+1);}}>Sau</button></div>
      </section>
    </div>
  </section>;
}
