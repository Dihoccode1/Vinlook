import {Icon} from '../../components/Icon';
import {categories} from '../../services/api';
import type {ActivitySample,Stats} from '../../types';
import {ActivityChart} from './ActivityChart';
interface OverviewDashboardProps{stats:Stats|null;activity:{visitors:number;listeners:number}|null;samples:ActivitySample[];onNavigateCategories:()=>void;onCreatePoi:()=>void}
export function OverviewDashboard({stats,activity,samples,onNavigateCategories,onCreatePoi}:OverviewDashboardProps){
 return <>
  <section className="overview-metrics" aria-label="Các chỉ số chính">
   <article className="overview-metric"><div><span className="overview-metric-label">Tổng địa điểm</span><span className="overview-metric-icon sage"><Icon kind="pin"/></span></div><strong>{stats?.total??'—'}</strong><p><span className="metric-indicator"/>{stats?stats.published+' địa điểm đã xuất bản':'Đang tải nội dung…'}</p></article>
   <article className="overview-metric"><div><span className="overview-metric-label">Đang truy cập</span><span className="overview-metric-icon blue"><Icon kind="eye"/></span></div><strong>{activity?.visitors??'—'}</strong><p>Phiên khách đang hoạt động trên bản đồ</p></article>
   <article className="overview-metric"><div><span className="overview-metric-label">Đang lắng nghe</span><span className="overview-metric-icon amber"><Icon kind="listen"/></span></div><strong>{activity?.listeners??'—'}</strong><p>Phiên đang phát thuyết minh</p></article>
  </section>
  <div className="overview-workspace"><ActivityChart samples={samples}/><section className="panel categories-overview"><div className="panel-title"><div><h2>Những điểm đến</h2><p>Phân bố theo danh mục</p></div><span className="soft-badge">{stats?.categories.length??'—'} danh mục</span></div><div className="category-bars">{stats?.categories.map(c=>{const pct=stats.total?Math.round(c.total/stats.total*100):0;return <div key={c.category} className="cat-row"><div className="cat-meta"><span>{categories[c.category]??c.category}</span><strong>{c.total}</strong></div><div className="cat-bar"><div className={'cat-fill '+c.category} style={{width:pct+'%'}}/></div><small>{pct}% tổng địa điểm</small></div>;})}</div><button className="category-detail-link" onClick={onNavigateCategories}>Xem tất cả danh mục <span>↗</span></button></section></div>
  <div className="overview-invitation"><span className="invitation-icon"><Icon kind="pin" size={26}/></span><div><strong>Thêm một điểm đến. Mở một hành trình.</strong><p>Đưa những câu chuyện mới lên bản đồ Vinlook.</p></div><button onClick={onCreatePoi}>Tạo địa điểm mới <Icon kind="plus" size={17}/></button></div>
 </>;
}
