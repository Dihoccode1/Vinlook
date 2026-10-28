import { useEffect, useState } from 'react';
import { api, categories, type Poi, type Stats } from './api';
import { PoiEditor } from './PoiEditor';
import { MonitorDashboard } from './MonitorDashboard';

function Icon({ kind }: { kind: 'grid' | 'pin' | 'eye' | 'photo' | 'draft' | 'search' | 'listen' }) {
  const paths = { listen: 'M4 14v-3a8 8 0 0 1 16 0v3 M4 13H2v7h5v-7z M20 13h2v7h-5v-7z', grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z', pin: 'M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6', photo: 'M3 3h18v18H3z M3 17l6-6 4 4 3-3 5 5 M15 7h.01', draft: 'M5 3h10l4 4v14H5z M14 3v5h5 M8 12h8 M8 16h5', search: 'M21 21l-5-5 M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14' };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>;
}
const date = (value: string) => new Date(value).toLocaleDateString('vi-VN', { day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Asia/Ho_Chi_Minh' });
export default function App({ onLogout }: { onLogout: () => Promise<void> }) {
  const [view,setView] = useState<'overview'|'pois'|'monitor'>('overview'); const [stats,setStats] = useState<Stats | null>(null);
  const [pois,setPois] = useState<Poi[]>([]); const [total,setTotal] = useState(0); const [page,setPage] = useState(1);
  const [search,setSearch] = useState(''); const [category,setCategory] = useState(''); const [status,setStatus] = useState('all');
  const [loading,setLoading] = useState(true); const [error,setError] = useState(''); const [refresh,setRefresh] = useState(0);
  const [activity,setActivity] = useState<{visitors:number;listeners:number}|null>(null);
  const [editor,setEditor] = useState<Poi | null | undefined>(undefined); const [toast,setToast] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  async function logout() {
    setLoggingOut(true);
    try { await onLogout(); }
    catch { setToast('Chưa đăng xuất được. Vui lòng thử lại.'); setLoggingOut(false); }
  }
  useEffect(() => {
    const controller = new AbortController();
    api<{data:Stats}>('/stats', {signal:controller.signal}).then(result => setStats(result.data)).catch(() => { if(!controller.signal.aborted) setError('Không tải được tổng quan từ database.'); });
    return () => controller.abort();
  },[refresh]);
  useEffect(() => {
    if (view === 'monitor') return;
    const controller = new AbortController(); setLoading(true); setError('');
    const timer = setTimeout(() => {
      const query = new URLSearchParams({q:view === 'overview' ? '' : search,status:view === 'overview' ? 'all' : status,page:String(view === 'overview' ? 1 : page),limit:view === 'overview' ? '5' : '10'});
      if(category && view === 'pois') query.set('category',category);
      api<{data:Poi[];pagination:{total:number}}>(`/pois?${query}`,{signal:controller.signal}).then(result => { setPois(result.data);setTotal(result.pagination.total); })
        .catch(failure => { if(!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Không tải được địa điểm.'); })
        .finally(() => { if(!controller.signal.aborted) setLoading(false); });
    },200);
    return () => { clearTimeout(timer);controller.abort(); };
  },[view,search,category,status,page,refresh]);
  useEffect(() => { if(!toast) return; const timer=setTimeout(()=>setToast(''),5000);return()=>clearTimeout(timer); },[toast]);
  useEffect(() => {
    if(view !== 'overview') return;
    const controller = new AbortController(); let pending = false;
    const poll = async () => {
      if(pending) return; pending=true;
      try { const result=await api<{data:{visitors:number;listeners:number}}>('/activity',{signal:controller.signal});if(!controller.signal.aborted)setActivity(result.data); }
      catch { if(!controller.signal.aborted)setActivity(null); }
      finally { pending=false; }
    };
    void poll(); const timer=setInterval(()=>void poll(),3000);
    return()=>{clearInterval(timer);controller.abort();};
  },[view]);
  function navigate(next:'overview'|'pois'|'monitor') { setView(next);setPage(1); }
  function saved() { setEditor(undefined);setToast('Đã lưu địa điểm thành công.');setRefresh(value=>value+1); }
  const metrics = [{label:'Tổng địa điểm',value:stats?.total,icon:'pin' as const,note:'Trong kho nội dung',color:'green'}, {label:'Đang truy cập',value:activity?.visitors,icon:'eye' as const,note:activity?'Phiên truy cập đang hoạt động':'Đang tải thông tin trực tiếp…',color:'blue'}, {label:'Đang lắng nghe',value:activity?.listeners,icon:'listen' as const,note:activity?'Phiên đang phát thuyết minh':'Đang tải thông tin trực tiếp…',color:'orange'}];
  return <div className="admin-layout">
    <aside className="sidebar"><a className="brand" href="/">vinlook<span>.</span><small>Dashboard</small></a><div className="nav-caption">KHÔNG GIAN LÀM VIỆC</div><nav aria-label="Điều hướng quản trị"><button className={view==='overview'?'active':''} aria-current={view==='overview'?'page':undefined} onClick={()=>navigate('overview')}><Icon kind="grid"/>Tổng quan</button><button className={view==='pois'?'active':''} aria-current={view==='pois'?'page':undefined} onClick={()=>navigate('pois')}><Icon kind="pin"/>Quản lý địa điểm</button><button className={view==='monitor'?'active':''} aria-current={view==='monitor'?'page':undefined} onClick={()=>navigate('monitor')}><Icon kind="eye"/>Giám sát hệ thống</button></nav><div className="sidebar-bottom"><span className={stats?'connection online':'connection'} />{stats?'Hệ thống sẵn sàng':'Đang tải thông tin'}<small>Không gian điều hành Vinlook</small></div></aside>
    <main><div className="topbar"><span>Quản trị <span className="slash">/</span> {view==='overview'?'Tổng quan':view==='monitor'?'Giám sát hệ thống':'Địa điểm'}</span><div className="admin-badge"><span>V</span>Vinlook Admin<button onClick={() => void logout()} disabled={loggingOut}>{loggingOut ? 'Đang thoát…' : 'Đăng xuất'}</button></div></div>
      <header className="page-heading"><div><span className="eyebrow">KHÁM PHÁ BẮT ĐẦU TỪ NỘI DUNG</span><h1>{view==='overview'?'Tổng quan':view==='monitor'?'Giám sát hệ thống':'Quản lý địa điểm'}</h1><p>{view==='overview'?'Một góc nhìn toàn cảnh về những điểm đến bạn đang xây dựng.':view==='monitor'?'Theo dõi hoạt động, kết nối và trạng thái các dịch vụ.':'Biên tập câu chuyện, hình ảnh và thông tin của từng điểm đến.'}</p></div><div className="heading-actions"><a href="http://127.0.0.1:5173/" target="_blank" rel="noreferrer">Xem bản đồ ↗</a><button className="primary" onClick={()=>setEditor(null)}>＋ Thêm địa điểm</button></div></header>
      {toast && <div className="success-banner" role="status">✓ {toast}</div>}
      {view==='overview' && <><section className="metrics" aria-label="Thống kê địa điểm">{metrics.map(item=><article key={item.label}><div className="metric-label">{item.label}<span className={`metric-icon ${item.color}`}><Icon kind={item.icon}/></span></div><strong>{item.value??'—'}</strong><p>{item.note}</p></article>)}</section>
      <div className="overview-grid"><section className="panel categories"><div className="panel-title"><div><h2>Phân bố địa điểm</h2><p>Mỗi danh mục, một cách khám phá thành phố.</p></div><span className="soft-badge">{stats?.categories.length??'—'} danh mục</span></div>{Object.entries(categories).map(([key,name],index)=>{const count=stats?.categories.find(item=>item.category===key)?.total??0;const percent=stats?.total?Math.round(count/stats.total*100):0;return <div className="category-row" key={key}><div><span className={`category-dot c${index}`}/>{name}<strong>{count} <small>địa điểm</small></strong></div><div className="bar-track"><span className={`bar-fill c${index}`} style={{width:`${percent}%`}}/></div></div>;})}<p className="chart-note">Tính trên toàn bộ địa điểm, gồm cả bản nháp.</p></section>
      <section className="editorial-note"><span className="note-symbol" aria-hidden="true">↗</span><span className="eyebrow">KỂ MỘT CÂU CHUYỆN HAY</span><h2>Mỗi nơi đến,<br/>một điều đáng nhớ.</h2><p>Thêm địa điểm, chọn một bức ảnh và viết câu chuyện gốc. Vinlook kết nối những câu chuyện ấy với hành trình của khách.</p><button onClick={()=>setEditor(null)}>Bắt đầu với địa điểm mới <span>→</span></button></section></div></>}
      {view==='monitor' ? <MonitorDashboard/> : <section className="panel poi-panel"><div className="panel-title"><div><h2>{view==='overview'?'Cập nhật gần đây':'Danh sách địa điểm'} <span className="count-badge">{view==='overview'?(stats?.total??'—'):total}</span></h2><p>{view==='overview'?'Các địa điểm được cập nhật gần nhất trong database.':'Tìm và quản lý các POI đang có trong hệ thống.'}</p></div>{view==='overview'?<button className="text-button" onClick={()=>navigate('pois')}>Xem tất cả →</button>:<button onClick={()=>setRefresh(value=>value+1)} disabled={loading}>↻ Làm mới</button>}</div>
      {view==='pois' && <div className="filters"><label className="search"><Icon kind="search"/><input aria-label="Tìm địa điểm" type="search" value={search} placeholder="Tìm tên hoặc địa chỉ…" maxLength={200} onChange={event=>{setSearch(event.target.value);setPage(1);}}/></label><select aria-label="Lọc danh mục" value={category} onChange={event=>{setCategory(event.target.value);setPage(1);}}><option value="">Tất cả danh mục</option>{Object.entries(categories).map(([value,name])=><option key={value} value={value}>{name}</option>)}</select><select aria-label="Lọc trạng thái" value={status} onChange={event=>{setStatus(event.target.value);setPage(1);}}><option value="all">Tất cả trạng thái</option><option value="published">Đã xuất bản</option><option value="draft">Bản nháp</option></select></div>}
      {error && <div className="error-banner" role="alert">{error} <button onClick={()=>setRefresh(value=>value+1)}>Thử lại</button></div>}
      <div className="table-wrap" aria-busy={loading}><table><thead><tr><th>Địa điểm</th><th>Danh mục</th><th>Trạng thái</th><th>Cập nhật</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{!loading && !error && pois.map(poi=><tr key={poi.id}><td><div className="poi-cell">{poi.imageUrl?<img src={`${poi.imageUrl}?v=${encodeURIComponent(poi.updatedAt)}`} alt="" loading="lazy"/>:<span className="photo-placeholder"><Icon kind="photo"/></span>}<div><strong>{poi.name}</strong><small>{poi.address}</small></div></div></td><td><span className={`category-tag ${poi.category}`}>{categories[poi.category]??poi.category}</span></td><td><span className={`publish-status ${poi.isPublished?'published':''}`}><i/>{poi.isPublished?'Đã xuất bản':'Bản nháp'}</span></td><td className="updated-date">{date(poi.updatedAt)}</td><td><button className="edit-button" aria-label={`Chỉnh sửa ${poi.name}`} onClick={()=>setEditor(poi)}>Chỉnh sửa ↗</button></td></tr>)}</tbody></table>{loading && <p className="empty-state" role="status">Đang tải địa điểm…</p>}{!loading&&!error&&!pois.length&&<p className="empty-state">Chưa có địa điểm phù hợp. Thử bộ lọc khác hoặc thêm địa điểm mới.</p>}</div>
      <footer className="table-footer"><span>{view==='overview'?`Hiển thị ${pois.length} địa điểm cập nhật gần nhất`:`${total} địa điểm · Trang ${page}/${Math.max(1,Math.ceil(total/10))}`}</span>{view==='pois' && <div><button disabled={page===1||loading} onClick={()=>setPage(value=>value-1)}>← Trước</button><button disabled={page*10>=total||loading} onClick={()=>setPage(value=>value+1)}>Sau →</button></div>}</footer></section>}
      <div className="page-footer">VINLOOK <span>Những câu chuyện làm nên hành trình.</span></div>
    </main>{editor!==undefined&&<PoiEditor poi={editor} onClose={()=>setEditor(undefined)} onSaved={saved}/>}</div>;
}
