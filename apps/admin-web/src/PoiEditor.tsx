import { useEffect, useRef, useState } from 'react';
import { api, categories, type Poi } from './api';

const language_names: Record<string,string> = { vi:'Tiếng Việt',en:'English',fr:'Français',de:'Deutsch',es:'Español',it:'Italiano',pt:'Português',ru:'Русский',ja:'日本語',ko:'한국어','zh-CN':'简体中文',th:'ไทย',id:'Bahasa Indonesia',ms:'Bahasa Melayu',ar:'العربية',hi:'हिन्दी' };
interface AddressMatch { label: string; latitude: number; longitude: number }
export function PoiEditor({ poi, on_close: on_close, on_saved: on_saved }: { poi: Poi | null; on_close(): void; on_saved(): void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [form, set_form] = useState({ name: poi?.name ?? '', slug: poi?.slug ?? '', description: poi?.description ?? '', address: poi?.address ?? '',
    visitor_description: poi?.visitor_description ?? '',
    latitude: poi ? String(poi.latitude) : '', longitude: poi ? String(poi.longitude) : '', category: poi?.category ?? 'architecture', source_language: poi?.source_language ?? 'vi',
    is_published: poi?.is_published ?? false, image_credit: poi?.image_credit ?? '', image_source_url: poi?.image_source_url ?? '', image_license_url: poi?.image_license_url ?? '' });
  const [file, set_file] = useState<File | null>(null);
  const [preview, set_preview] = useState(''); const [error, set_error] = useState(''); const [saving, set_saving] = useState(false);
  const [locating, set_locating] = useState(false);
  const [matches, set_matches] = useState<AddressMatch[]>([]);
  const [location_note, set_location_note] = useState('');
  const lookup_version = useRef(0);
  const request_running = useRef(false);
  const queued_lookup = useRef(false);
  const last_address = useRef(poi?.address.trim() ?? '');
  const [address_revision, set_address_revision] = useState(0);
  const locate_ref = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    if (!address_revision) return;
    const timer = window.setTimeout(() => void locate_ref.current(), 1200);
    return () => window.clearTimeout(timer);
  }, [address_revision]);
  useEffect(() => () => { lookup_version.current++; queued_lookup.current = false; }, []);
  useEffect(() => { dialog.current?.showModal(); return () => dialog.current?.close(); }, []);
  useEffect(() => {
    const element = dialog.current;
    const viewport = window.visualViewport;
    const update_viewport = () => {
      const layout_height = Math.min(window.innerHeight, document.documentElement.clientHeight || window.innerHeight);
      const visible_height = Math.min(viewport?.height ?? layout_height, layout_height);
      element?.style.setProperty('--editor-visible-height', `${visible_height}px`);
      element?.style.setProperty('--editor-visible-top', `${viewport?.offsetTop ?? 0}px`);
    };
    update_viewport();
    viewport?.addEventListener('resize', update_viewport);
    viewport?.addEventListener('scroll', update_viewport);
    window.addEventListener('resize', update_viewport);
    return () => {
      viewport?.removeEventListener('resize', update_viewport);
      viewport?.removeEventListener('scroll', update_viewport);
      window.removeEventListener('resize', update_viewport);
    };
  }, []);
  useEffect(() => { if (!file) { set_preview(''); return; } const url = URL.createObjectURL(file); set_preview(url); return () => URL.revokeObjectURL(url); }, [file]);
  const set = (key: keyof typeof form, value: string | boolean) => {
    if (key === 'latitude' || key === 'longitude') { lookup_version.current++; queued_lookup.current = false; last_address.current = form.address.trim(); set_locating(false); set_matches([]); set_location_note('Đang dùng tọa độ bạn nhập.'); }
    set_form(previous => ({ ...previous, [key]: value }));
  };
  function choose_location(match: AddressMatch) {
    set_form(previous => ({ ...previous, latitude: String(match.latitude), longitude: String(match.longitude) }));
    set_matches([]); set_location_note(`Đã lấy tọa độ: ${match.label}`);
  }
  async function locate() {
    const address = form.address.trim();
    if (saving || address === last_address.current) return;
    if (address.length < 5) { set_location_note('Nhập đủ số nhà, đường và tỉnh/thành phố để tìm vị trí.'); return; }
    if (request_running.current) { queued_lookup.current = true; set_locating(true); set_location_note('Đang chờ tra cứu địa chỉ mới nhất…'); return; }
    request_running.current = true;
    last_address.current = address;
    const version = ++lookup_version.current;
    set_locating(true); set_matches([]); set_location_note('Đang tìm tọa độ…');
    try {
      const result = await api<{ data: AddressMatch[] }>(`/geocode?q=${encodeURIComponent(address)}`);
      if (version !== lookup_version.current) return;
      if (result.data.length === 1) choose_location(result.data[0]!);
      else { set_matches(result.data); set_location_note(result.data.length ? 'Có nhiều kết quả. Chọn đúng vị trí bên dưới.' : 'Chưa tìm thấy vị trí khớp địa chỉ/số nhà này. Hãy kiểm tra địa chỉ hoặc nhập tọa độ bằng tay.'); }
    } catch (failure) { if (version === lookup_version.current) { last_address.current = ''; set_location_note(failure instanceof Error ? failure.message : 'Không tra cứu được địa chỉ.'); } }
    finally {
      request_running.current = false;
      if (version === lookup_version.current) set_locating(false);
      if (queued_lookup.current) { queued_lookup.current = false; void locate_ref.current(); }
    }
  }
  locate_ref.current = locate;
  async function save(event: React.SubmitEvent) {
    event.preventDefault();
    if (locating || matches.length > 0) return;
    if (!form.latitude.trim() || !form.longitude.trim()) { set_error('Hãy tìm vị trí hoặc nhập đầy đủ kinh độ, vĩ độ trước khi lưu.'); return; }
    set_saving(true); set_error('');
    try {
      let image: { content_type: string; base64: string } | undefined;
      if (file) {
        if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5242880) throw new Error('Chọn ảnh JPG, PNG hoặc WebP không quá 5 MB.');
        const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Không đọc được ảnh.')); reader.readAsDataURL(file); });
        image = { content_type: file.type, base64: data.split(',')[1]! };
      }
      await api(poi ? `/pois/${poi.id}` : '/pois', { method: poi ? 'PUT' : 'POST', headers: { 'content-Type': 'application/json' },
        body: JSON.stringify({ ...form, latitude: Number(form.latitude), longitude: Number(form.longitude), updated_at: poi?.updated_at, image }) });
      on_saved();
    } catch (failure) { set_error(failure instanceof Error ? failure.message : 'Không thể lưu địa điểm.'); }
    finally { set_saving(false); }
  }
  return <dialog ref={dialog} className="editor" aria-labelledby="editor-title" onCancel={event => { event.preventDefault(); if (!saving) on_close(); }}>
    <form onSubmit={save}>
      <header className="editor-header"><div><span className="eyebrow">THÔNG TIN ĐỊA ĐIỂM</span><h2 id="editor-title">{poi ? 'Chỉnh sửa POI' : 'Thêm địa điểm mới'}</h2></div><button type="button" className="icon-button" aria-label="Đóng chỉnh sửa" disabled={saving} onClick={on_close}>×</button></header>
      <div className="editor-scroll">
        <div className="editor-section"><h3>01 <span>Thông tin cơ bản</span></h3>
          <label>Tên địa điểm<input required maxLength={200} value={form.name} onChange={event => { const name = event.target.value; set_form(previous => ({ ...previous, name, slug: !poi && (!previous.slug || previous.slug === slugify(previous.name)) ? slugify(name) : previous.slug })); }} placeholder="Ví dụ: Chợ Bến Thành" /></label>
          <label>Đường dẫn (slug)<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={160} value={form.slug} onChange={event => set('slug',event.target.value)} placeholder="cho-ben-thanh" /></label>
          <div className="form-grid"><label>Danh mục<select value={form.category} onChange={event => set('category',event.target.value)}>{Object.entries(categories).map(([value,name]) => <option value={value} key={value}>{name}</option>)}</select></label><label>Ngôn ngữ gốc<select value={form.source_language} onChange={event => set('source_language',event.target.value)}>{Object.entries(language_names).map(([value,name]) => <option value={value} key={value}>{name}</option>)}</select></label></div>
          <label>Địa chỉ<input required maxLength={500} value={form.address} onBlur={() => void locate()} onChange={event => {
            const address = event.target.value;
            lookup_version.current++; queued_lookup.current = false; last_address.current = ''; set_address_revision(previous => previous + 1); set_locating(false); set_matches([]); set_location_note('Địa chỉ đã đổi. Ngừng nhập khoảng 1 giây để tự lấy tọa độ mới.');
            set_form(previous => ({ ...previous, address, latitude: '', longitude: '' }));
          }} placeholder="Số nhà, tên đường, tỉnh/thành phố tại Việt Nam" /></label>
          <p className="field-note" role="status">{location_note || 'Tọa độ sẽ được điền tự động; bạn vẫn có thể chỉnh lại bên dưới.'}</p>
          {matches.length > 0 && <div className="geocode-matches" aria-label="Chọn vị trí">{matches.map((match, index) => <button type="button" key={index} onClick={() => choose_location(match)}>{match.label}<small>{match.latitude}, {match.longitude}</small></button>)}</div>}
          <p className="field-note">Tra cứu: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></p>
          <div className="form-grid"><label>Vĩ độ<input required type="number" min={-90} max={90} step="any" value={form.latitude} onChange={event => set('latitude',event.target.value)} /></label><label>Kinh độ<input required type="number" min={-180} max={180} step="any" value={form.longitude} onChange={event => set('longitude',event.target.value)} /></label></div>
        </div>
        <div className="editor-section"><h3>02 <span>Giới thiệu & thuyết minh</span></h3>
          <label>Thông tin giới thiệu hiển thị cho khách<textarea maxLength={3000} rows={4} value={form.visitor_description} onChange={event => set('visitor_description',event.target.value)} placeholder="Giới thiệu ngắn về địa điểm, điểm nổi bật và lưu ý tham quan…" /></label>
          <p className="field-note">Nội dung này hiển thị trong thẻ địa điểm, tách riêng với bài đọc audio.</p>
          <label>Bài thuyết minh gốc (dùng cho audio)<textarea required maxLength={20000} rows={8} value={form.description} onChange={event => set('description',event.target.value)} placeholder="Viết câu chuyện và thông tin thuyết minh của địa điểm…" /></label><p className="field-note">Bài thuyết minh không hiện trên thẻ địa điểm. Sửa tên, bài thuyết minh hoặc ngôn ngữ gốc sẽ làm bản dịch và audio cũ cần được tạo lại.</p></div>
        <div className="editor-section"><h3>03 <span>Ảnh minh họa</span></h3>
          {(preview || poi?.image_url) && <img className="editor-photo" src={preview || `${poi?.image_url}?v=${encodeURIComponent(poi?.updated_at ?? '')}`} alt="Ảnh minh họa địa điểm" />}
          <label className="file-input">Chọn ảnh mới<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const next = event.target.files?.[0]; if (next && (!['image/jpeg','image/png','image/webp'].includes(next.type) || next.size > 5242880)) { set_error('Chọn ảnh JPG, PNG hoặc WebP không quá 5 MB.'); event.target.value = ''; return; } set_file(next ?? null); set_error(''); }} /></label>
          <p className="field-note">JPG, PNG hoặc WebP · Tối đa 5 MB · Lưu trực tiếp vào database.</p>
          <label>Tác giả / ghi công ảnh<input required={!!file} maxLength={300} value={form.image_credit} onChange={event => set('image_credit',event.target.value)} placeholder="Tên tác giả · Giấy phép" /></label>
          <div className="form-grid"><label>Link nguồn ảnh<input type="url" maxLength={2048} value={form.image_source_url} onChange={event => set('image_source_url',event.target.value)} placeholder="https://…" /></label><label>Link giấy phép<input type="url" maxLength={2048} value={form.image_license_url} onChange={event => set('image_license_url',event.target.value)} placeholder="https://…" /></label></div>
        </div>
        <label className="publish-option"><input type="checkbox" checked={form.is_published} onChange={event => set('is_published',event.target.checked)} /><span><strong>Xuất bản lên bản đồ</strong><small>Tắt để giữ bản nháp, chưa hiển thị cho khách.</small></span></label>
        {error && <p className="error-banner" role="alert">{error}</p>}
      </div>
      <footer className="editor-footer"><button type="button" disabled={saving} onClick={on_close}>Hủy</button><button className="primary" disabled={saving || locating || matches.length > 0} type="submit">{saving ? 'Đang lưu…' : poi ? 'Lưu thay đổi' : 'Tạo địa điểm'}</button></footer>
    </form>
  </dialog>;
}
function slugify(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
