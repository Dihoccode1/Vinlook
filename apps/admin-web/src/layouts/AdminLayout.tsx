import {useLayoutEffect,useRef,type ReactNode} from 'react';
import {Icon,type IconKind} from '../components/Icon';
export type AdminViewTab='overview'|'pois'|'monitor'|'users'|'categories'|'languages';
interface AdminLayoutProps{
 user:{id:string;username:string;role:'admin'|'staff'};
 currentView:AdminViewTab;onViewChange:(view:AdminViewTab)=>void;onLogout:()=>void;
 loggingOut?:boolean;toast?:string;onClearToast?:()=>void;children:ReactNode;
 onCreatePoi:()=>void;onRefresh:()=>void;
}
const pages:Record<AdminViewTab,{title:string;description:string}>={
 overview:{title:'Tổng quan',description:'Một góc nhìn trọn vẹn về những điểm đến và hành trình của du khách.'},
 pois:{title:'Quản lý địa điểm',description:'Chăm chút từng điểm đến, từ thông tin, hình ảnh đến câu chuyện.'},
 users:{title:'Quản lý tài khoản',description:'Quản lý thành viên và quyền truy cập trong không gian của bạn.'},
 monitor:{title:'Giám sát hệ thống',description:'Theo dõi hoạt động và tình trạng các dịch vụ theo thời gian thực.'},
 categories:{title:'Danh mục địa điểm',description:'Sắp xếp những điểm đến theo từng trải nghiệm khám phá.'},
 languages:{title:'Ngôn ngữ',description:'Kết nối những câu chuyện địa phương với du khách khắp thế giới.'}
};
const nav_items:{id:AdminViewTab;label:string;icon:IconKind;adminOnly?:boolean}[]=[
 {id:'overview',label:'Tổng quan',icon:'grid'},{id:'pois',label:'Quản lý địa điểm',icon:'pin'},
 {id:'categories',label:'Danh mục',icon:'photo'},{id:'languages',label:'Ngôn ngữ',icon:'listen'},
 {id:'users',label:'Quản lý tài khoản',icon:'user',adminOnly:true},{id:'monitor',label:'Giám sát hệ thống',icon:'eye',adminOnly:true}
];
export function AdminLayout({user,currentView,onViewChange,onLogout,loggingOut=false,toast,onClearToast,children,onCreatePoi,onRefresh}:AdminLayoutProps){
 const main_ref=useRef<HTMLElement>(null);
 function reset_scroll(behavior:ScrollBehavior='instant'){main_ref.current?.scrollTo({top:0,left:0,behavior});window.scrollTo({top:0,left:0,behavior});}
 useLayoutEffect(()=>{reset_scroll();},[currentView]);
 const page=pages[currentView];
 const map_url=import.meta.env.VITE_PUBLIC_WEB_URL||(import.meta.env.PROD?'/':'http://127.0.0.1:5173/');
 const account=<><span className="workspace-avatar"><Icon kind="user" size={19}/></span><div className="workspace-greeting"><strong>Xin chào, {user.username}</strong><span>Quyền hạn: {user.role==='admin'?'Admin':'Staff'}</span></div><button className="workspace-logout" onClick={onLogout} disabled={loggingOut}>{loggingOut?'Đang thoát…':'Đăng xuất'}</button></>;
 return <div className="admin-app">
  <aside className="workspace-sidebar">
   <div className="workspace-brand-row"><a className="workspace-brand" href={import.meta.env.BASE_URL} aria-label="Vinlook Dashboard"><span className="workspace-brand-mark">v</span><span>vinlook<i>.</i><small>ĐI ĐỂ HIỂU THÊM</small></span></a><div className="workspace-mobile-account">{account}</div></div>
   <span className="workspace-nav-caption">KHÔNG GIAN LÀM VIỆC</span>
   <nav className="workspace-nav" aria-label="Điều hướng quản trị">{nav_items.filter(item=>!item.adminOnly||user.role==='admin').map(item=><button key={item.id} className={currentView===item.id?'active':''} aria-current={currentView===item.id?'page':undefined} onClick={()=>{reset_scroll();onViewChange(item.id);}}><Icon kind={item.icon} size={19}/><span>{item.label}</span>{currentView===item.id&&<i className="nav-active-dot"/>}</button>)}</nav>
   <div className="workspace-sidebar-bottom"><a href={map_url} target="_blank" rel="noreferrer"><Icon kind="pin" size={18}/><span>Mở bản đồ du khách</span><span aria-hidden="true">↗</span></a><p>Mỗi nơi đến,<br/><strong>một câu chuyện.</strong></p><small>VINLOOK · DASHBOARD</small></div>
  </aside>
  <div className="workspace-shell">
   <header className="workspace-topbar"><div className="workspace-breadcrumb">Không gian quản trị <span>/</span><strong>{page.title}</strong></div><div className="workspace-account">{account}</div></header>
   <main ref={main_ref} className="main-content" id="admin-main">
    <div className="workspace-page-heading"><div><span className="eyebrow">VINLOOK / KHÔNG GIAN QUẢN TRỊ</span><h1>{page.title}</h1><p>{page.description}</p></div><div className="workspace-page-actions">{currentView==='overview'&&<button onClick={onRefresh} aria-label="Làm mới tổng quan"><Icon kind="refresh" size={16}/><span>Làm mới</span></button>}{(currentView==='overview'||currentView==='pois')&&<button className="primary" onClick={onCreatePoi}><Icon kind="plus" size={17}/>Thêm địa điểm</button>}</div></div>
    {toast&&<div className="workspace-toast" role="status"><Icon kind="check" size={18}/><span>{toast}</span><button onClick={onClearToast} aria-label="Đóng thông báo"><Icon kind="close" size={16}/></button></div>}
    {children}
    <footer className="workspace-footer"><span>vinlook<span className="brand-dot">.</span></span><small>Những câu chuyện làm nên hành trình.</small></footer>
   </main>
  </div>
  <button className="workspace-back-top" aria-label="Về đầu trang" title="Về đầu trang" onClick={()=>reset_scroll(window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth')}><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20V5m-7 7 7-7 7 7M5 3h14"/></svg></button>
 </div>;
}
