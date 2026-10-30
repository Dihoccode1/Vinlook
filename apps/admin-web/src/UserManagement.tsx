import { useEffect, useRef, useState } from 'react';
import { api } from './api';

interface User { id:string; username:string; full_name:string; role:'admin'|'staff'; status:'active'|'disabled'; created_at:string }
const blank = {username:'',full_name:'',role:'staff' as User['role'],status:'active' as User['status'],password:''};
export function UserManagement({current_user_id: current_user_id}:{current_user_id:string}) {
  const [users,set_users]=useState<User[]>([]), [loading,set_loading]=useState(true), [error,set_error]=useState(''), [notice,set_notice]=useState('');
  const [editing,set_editing]=useState<User|null|undefined>(undefined), [form,set_form]=useState(blank), [busy,set_busy]=useState(false), [refresh,set_refresh]=useState(0);
  const [query,set_query]=useState('');
  const [confirm_password,set_confirm_password]=useState('');
  const [changing_id,set_changing_id]=useState<string|null>(null);
  const confirm_input=useRef<HTMLInputElement>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  const modal_open=editing!==undefined;
  useEffect(()=>{
    if(!modal_open)return;
    const element=dialog.current;
    const opener=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const overflow=document.body.style.overflow;
    element?.showModal();element?.querySelector('input')?.focus();document.body.style.overflow='hidden';
    return()=>{element?.close();document.body.style.overflow=overflow;opener?.focus();};
  },[modal_open]);
  function close_editor(){if(busy)return;set_editing(undefined);set_form(blank);set_confirm_password('');set_error('');}
  useEffect(()=>{const c=new AbortController();set_loading(true);set_error('');api<{data:User[]}>('/users',{signal:c.signal}).then(r=>{if(!c.signal.aborted)set_users(r.data);}).catch(e=>{if(!c.signal.aborted)set_error(e.message);}).finally(()=>{if(!c.signal.aborted)set_loading(false);});return()=>c.abort();},[refresh]);
  function edit(user:User|null) {set_editing(user);set_form(user?{username:user.username,full_name:user.full_name,role:user.role,status:user.status,password:''}:blank);set_confirm_password('');set_error('');set_notice('');}
  async function save(event:React.SubmitEvent) {
    event.preventDefault();if(busy)return;
    if(form.password!==confirm_password){set_error('Mật khẩu xác nhận không khớp. Vui lòng nhập lại.');confirm_input.current?.focus();return;}
    set_busy(true);set_error('');
    try {const {password,...rest}=form;await api(editing?`/users/${editing.id}`:'/users',{method:editing?'PUT':'POST',headers:{'content-Type':'application/json'},body:JSON.stringify({...rest,...(!editing?{full_name:form.username}:{}),...(password?{password}:{})})});set_editing(undefined);set_form(blank);set_confirm_password('');set_notice('Đã lưu tài khoản. Nếu đổi mật khẩu, quyền hoặc trạng thái, tài khoản cần đăng nhập lại.');set_refresh(v=>v+1);if(editing?.id.toLowerCase()===current_user_id.toLowerCase()&&(password||form.status==='disabled'))window.dispatchEvent(new Event('admin-session-expired'));}
    catch(e){set_error(e instanceof Error?e.message:'Không lưu được tài khoản.');}finally{set_busy(false);}
  }
  const filtered=users.filter(u=>`${u.username} ${u.full_name}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
  function cannot_lock(user:User){return user.role==='admin'&&user.status==='active'&&user.id.toLowerCase()!==current_user_id.toLowerCase();}
  async function change_status(user:User){
    if(busy||cannot_lock(user))return;
    const status=user.status==='active'?'disabled':'active';
    set_busy(true);set_changing_id(user.id);set_error('');set_notice('');
    try{
      const result=await api<{data:{id:string;status:User['status']}}>(`/users/${user.id}/status`,{method:'PATCH',headers:{'content-Type':'application/json'},body:JSON.stringify({status})});
      set_users(previous=>previous.map(item=>item.id.toLowerCase()===result.data.id.toLowerCase()?{...item,status:result.data.status}:item));
      if(user.id.toLowerCase()===current_user_id.toLowerCase()&&status==='disabled'){window.dispatchEvent(new Event('admin-session-expired'));return;}
      set_notice(status==='disabled'?`Đã khóa tài khoản ${user.username}. Các phiên đăng nhập đã bị thu hồi.`:`Đã mở khóa tài khoản ${user.username}.`);
    }catch(e){set_error(e instanceof Error?e.message:'Không cập nhật được trạng thái tài khoản.');}finally{set_busy(false);set_changing_id(null);}
  }
  return <section className="user-management">
    <div className="user-permissions"><p><strong>Staff:</strong> Tổng quan, Quản lý địa điểm.</p><p><strong>Admin:</strong> Tất cả chức năng của Staff, Giám sát hệ thống và Quản lý tài khoản.</p></div>
    {notice&&<div className="success-banner" role="status">{notice}</div>}
    {error&&!modal_open&&<div className="error-banner" role="alert">{error} <button onClick={()=>set_refresh(v=>v+1)}>Thử lại</button></div>}
    {modal_open&&<dialog ref={dialog} className="user-dialog" aria-labelledby="user-dialog-title" onCancel={event=>{event.preventDefault();close_editor();}} onClick={event=>{if(event.target!==event.currentTarget)return;const bounds=event.currentTarget.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)close_editor();}}><form className="user-form" onSubmit={save} aria-busy={busy}>
      <header className="user-dialog-header"><div><span className="eyebrow">QUẢN LÝ TÀI KHOẢN</span><h2 id="user-dialog-title">{editing?'Chỉnh sửa tài khoản':'Tạo tài khoản'}</h2><p>{editing?'Cập nhật thông tin và quyền truy cập dashboard.':'Thêm thành viên vào không gian điều hành Vinlook.'}</p></div><button className="icon-button" type="button" aria-label="Đóng cửa sổ tài khoản" disabled={busy} onClick={close_editor}>×</button></header>
      <div className="user-dialog-body"><div className="form-grid">
      <label>Tên tài khoản<input required pattern="[a-zA-Z0-9_.\-]{3,100}" minLength={3} maxLength={100} autoComplete="off" value={form.username} disabled={busy} onChange={e=>set_form({...form,username:e.target.value})}/></label>
      {editing&&<label>Họ tên<input required maxLength={200} value={form.full_name} disabled={busy} onChange={e=>set_form({...form,full_name:e.target.value})}/></label>}
      <label>Quyền hạn<select value={form.role} disabled={busy||!!editing&&(editing.id.toLowerCase()===current_user_id.toLowerCase()||editing.role==='admin')} onChange={e=>set_form({...form,role:e.target.value as User['role']})}><option value="staff">Staff</option><option value="admin">Admin</option></select></label>
      <div className="password-pair form-grid">
      <label>{editing?'Mật khẩu mới (để trống để giữ nguyên)':'Mật khẩu'}<input type="password" autoComplete="new-password" required={!editing} minLength={5} maxLength={200} value={form.password} disabled={busy} onChange={e=>{set_form({...form,password:e.target.value});set_confirm_password('');set_error('');}}/></label>
      {(!editing||form.password)&&<label>{editing?'Xác nhận mật khẩu mới':'Xác nhận mật khẩu'}<input ref={confirm_input} type="password" autoComplete="new-password" required minLength={5} maxLength={200} value={confirm_password} disabled={busy} onChange={e=>{set_confirm_password(e.target.value);set_error('');}}/></label>}
      </div>
      <label>Trạng thái<select value={form.status} disabled={busy} onChange={e=>set_form({...form,status:e.target.value as User['status']})}><option value="active">Hoạt động</option><option value="disabled" disabled={!!editing&&editing.role==='admin'&&editing.id.toLowerCase()!==current_user_id.toLowerCase()&&editing.status==='active'}>Đã khóa</option></select></label>
    </div><p className="field-note">Mật khẩu được lưu dưới dạng mã băm và không hiển thị lại. Bạn có thể đặt mật khẩu mới khi cần.</p>{error&&<div className="error-banner" role="alert">{error}</div>}</div><footer className="user-form-actions"><button type="button" disabled={busy} onClick={close_editor}>Hủy</button><button className="primary" disabled={busy}>{busy?'Đang lưu…':'Lưu tài khoản'}</button></footer></form></dialog>}
    <section className="panel"><div className="panel-title"><h2>Tài khoản dashboard · {users.length}</h2><button className="primary" disabled={busy} onClick={()=>edit(null)}>＋ Tạo tài khoản</button></div><div className="filters"><label className="search"><input type="search" aria-label="Tìm tài khoản" placeholder="Tìm tài khoản hoặc họ tên…" value={query} onChange={e=>set_query(e.target.value)}/></label><button disabled={loading||busy} onClick={()=>set_refresh(v=>v+1)}>↻ Làm mới</button></div>
    <div className="table-wrap" aria-busy={loading}><table><thead><tr><th>Tài khoản / Họ tên</th><th>Quyền hạn</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{filtered.map(u=><tr key={u.id}><td><strong>{u.username}{u.id===current_user_id?' (Bạn)':''}</strong>{u.full_name!==u.username&&<div>{u.full_name}</div>}</td><td data-label="Quyền hạn">{u.role==='admin'?'Admin':'Staff'}</td><td data-label="Trạng thái"><span className={`publish-status ${u.status==='active'?'published':''}`}>{u.status==='active'?'Hoạt động':'Đã khóa'}</span></td><td><div className="account-actions"><button disabled={busy} onClick={()=>edit(u)}>Chỉnh sửa</button><button className={u.status==='active'?'account-lock':'account-unlock'} disabled={busy||cannot_lock(u)} title={cannot_lock(u)?'Không được khóa tài khoản Admin khác':undefined} aria-label={(u.status==='active'?'Khóa':'Mở khóa')+' tài khoản '+u.username} onClick={()=>void change_status(u)}>{changing_id===u.id?'Đang xử lý…':u.status==='active'?'Khóa tài khoản':'Mở khóa'}</button></div></td></tr>)}</tbody></table>{loading?<p className="empty-state">Đang tải tài khoản…</p>:!filtered.length&&<p className="empty-state">Không có tài khoản phù hợp.</p>}</div></section>
  </section>;
}
