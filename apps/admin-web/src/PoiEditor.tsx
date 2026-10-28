import { useEffect, useRef, useState } from 'react';
import { api, categories, type Poi } from './api';

const languageNames: Record<string,string> = { vi:'Tiếng Việt',en:'English',fr:'Français',de:'Deutsch',es:'Español',it:'Italiano',pt:'Português',ru:'Русский',ja:'日本語',ko:'한국어','zh-CN':'简体中文',th:'ไทย',id:'Bahasa Indonesia',ms:'Bahasa Melayu',ar:'العربية',hi:'हिन्दी' };
interface AddressMatch { label: string; latitude: number; longitude: number }
export function PoiEditor({ poi, onClose, onSaved }: { poi: Poi | null; onClose(): void; onSaved(): void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState({ name: poi?.name ?? '', slug: poi?.slug ?? '', description: poi?.description ?? '', address: poi?.address ?? '',
    visitorDescription: poi?.visitorDescription ?? '',
    latitude: poi ? String(poi.latitude) : '', longitude: poi ? String(poi.longitude) : '', category: poi?.category ?? 'architecture', sourceLanguage: poi?.sourceLanguage ?? 'vi',
    isPublished: poi?.isPublished ?? false, imageCredit: poi?.imageCredit ?? '', imageSourceUrl: poi?.imageSourceUrl ?? '', imageLicenseUrl: poi?.imageLicenseUrl ?? '' });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [matches, setMatches] = useState<AddressMatch[]>([]);
  const [locationNote, setLocationNote] = useState('');
  const lookupVersion = useRef(0);
  const requestRunning = useRef(false);
  const queuedLookup = useRef(false);
  const lastAddress = useRef(poi?.address.trim() ?? '');
  const [addressRevision, setAddressRevision] = useState(0);
  const locateRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    if (!addressRevision) return;
    const timer = window.setTimeout(() => void locateRef.current(), 1200);
    return () => window.clearTimeout(timer);
  }, [addressRevision]);
  useEffect(() => () => { lookupVersion.current++; queuedLookup.current = false; }, []);
  useEffect(() => { dialog.current?.showModal(); return () => dialog.current?.close(); }, []);
  useEffect(() => { if (!file) { setPreview(''); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  const set = (key: keyof typeof form, value: string | boolean) => {
    if (key === 'latitude' || key === 'longitude') { lookupVersion.current++; queuedLookup.current = false; lastAddress.current = form.address.trim(); setLocating(false); setMatches([]); setLocationNote('Đang dùng tọa độ bạn nhập.'); }
    setForm(previous => ({ ...previous, [key]: value }));
  };
  function chooseLocation(match: AddressMatch) {
    setForm(previous => ({ ...previous, latitude: String(match.latitude), longitude: String(match.longitude) }));
    setMatches([]); setLocationNote(`Đã lấy tọa độ: ${match.label}`);
  }
  async function locate() {
    const address = form.address.trim();
    if (saving || address === lastAddress.current) return;
    if (address.length < 5) { setLocationNote('Nhập đủ số nhà, đường và tỉnh/thành phố để tìm vị trí.'); return; }
    if (requestRunning.current) { queuedLookup.current = true; setLocating(true); setLocationNote('Đang chờ tra cứu địa chỉ mới nhất…'); return; }
    requestRunning.current = true;
    lastAddress.current = address;
    const version = ++lookupVersion.current;
    setLocating(true); setMatches([]); setLocationNote('Đang tìm tọa độ…');
    try {
      const result = await api<{ data: AddressMatch[] }>(`/geocode?q=${encodeURIComponent(address)}`);
      if (version !== lookupVersion.current) return;
      if (result.data.length === 1) chooseLocation(result.data[0]!);
      else { setMatches(result.data); setLocationNote(result.data.length ? 'Có nhiều kết quả. Chọn đúng vị trí bên dưới.' : 'Chưa tìm thấy vị trí khớp địa chỉ/số nhà này. Hãy kiểm tra địa chỉ hoặc nhập tọa độ bằng tay.'); }
    } catch (failure) { if (version === lookupVersion.current) { lastAddress.current = ''; setLocationNote(failure instanceof Error ? failure.message : 'Không tra cứu được địa chỉ.'); } }
    finally {
      requestRunning.current = false;
      if (version === lookupVersion.current) setLocating(false);
      if (queuedLookup.current) { queuedLookup.current = false; void locateRef.current(); }
    }
  }
  locateRef.current = locate;
  async function save(event: React.SubmitEvent) {
    event.preventDefault();
    if (locating || matches.length > 0) return;
    if (!form.latitude.trim() || !form.longitude.trim()) { setError('Hãy tìm vị trí hoặc nhập đầy đủ kinh độ, vĩ độ trước khi lưu.'); return; }
    setSaving(true); setError('');
    try {
      let image: { contentType: string; base64: string } | undefined;
      if (file) {
        if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5242880) throw new Error('Chọn ảnh JPG, PNG hoặc WebP không quá 5 MB.');
        const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Không đọc được ảnh.')); reader.readAsDataURL(file); });
        image = { contentType: file.type, base64: data.split(',')[1]! };
      }
      await api(poi ? `/pois/${poi.id}` : '/pois', { method: poi ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, latitude: Number(form.latitude), longitude: Number(form.longitude), updatedAt: poi?.updatedAt, image }) });
      onSaved();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Không thể lưu địa điểm.'); }
    finally { setSaving(false); }
  }
  return <dialog ref={dialog} className="editor" aria-labelledby="editor-title" onCancel={event => { event.preventDefault(); if (!saving) onClose(); }}>
    <form onSubmit={save}>
      <header className="editor-header"><div><span className="eyebrow">THÔNG TIN ĐỊA ĐIỂM</span><h2 id="editor-title">{poi ? 'Chỉnh sửa POI' : 'Thêm địa điểm mới'}</h2></div><button type="button" className="icon-button" aria-label="Đóng chỉnh sửa" disabled={saving} onClick={onClose}>×</button></header>
      <div className="editor-scroll">
        <div className="editor-section"><h3>01 <span>Thông tin cơ bản</span></h3>
          <label>Tên địa điểm<input required maxLength={200} value={form.name} onChange={event => { const name = event.target.value; setForm(previous => ({ ...previous, name, slug: !poi && (!previous.slug || previous.slug === slugify(previous.name)) ? slugify(name) : previous.slug })); }} placeholder="Ví dụ: Chợ Bến Thành" /></label>
          <label>Đường dẫn (slug)<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={160} value={form.slug} onChange={event => set('slug',event.target.value)} placeholder="cho-ben-thanh" /></label>
          <div className="form-grid"><label>Danh mục<select value={form.category} onChange={event => set('category',event.target.value)}>{Object.entries(categories).map(([value,name]) => <option value={value} key={value}>{name}</option>)}</select></label><label>Ngôn ngữ gốc<select value={form.sourceLanguage} onChange={event => set('sourceLanguage',event.target.value)}>{Object.entries(languageNames).map(([value,name]) => <option value={value} key={value}>{name}</option>)}</select></label></div>
          <label>Địa chỉ<input required maxLength={500} value={form.address} onBlur={() => void locate()} onChange={event => {
            const address = event.target.value;
            lookupVersion.current++; queuedLookup.current = false; lastAddress.current = ''; setAddressRevision(previous => previous + 1); setLocating(false); setMatches([]); setLocationNote('Địa chỉ đã đổi. Ngừng nhập khoảng 1 giây để tự lấy tọa độ mới.');
            setForm(previous => ({ ...previous, address, latitude: '', longitude: '' }));
          }} placeholder="Số nhà, tên đường, tỉnh/thành phố tại Việt Nam" /></label>
          <p className="field-note" role="status">{locationNote || 'Tọa độ sẽ được điền tự động; bạn vẫn có thể chỉnh lại bên dưới.'}</p>
          {matches.length > 0 && <div className="geocode-matches" aria-label="Chọn vị trí">{matches.map((match, index) => <button type="button" key={index} onClick={() => chooseLocation(match)}>{match.label}<small>{match.latitude}, {match.longitude}</small></button>)}</div>}
          <p className="field-note">Tra cứu: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></p>
          <div className="form-grid"><label>Vĩ độ<input required type="number" min={-90} max={90} step="any" value={form.latitude} onChange={event => set('latitude',event.target.value)} /></label><label>Kinh độ<input required type="number" min={-180} max={180} step="any" value={form.longitude} onChange={event => set('longitude',event.target.value)} /></label></div>
        </div>
        <div className="editor-section"><h3>02 <span>Giới thiệu & thuyết minh</span></h3>
          <label>Thông tin giới thiệu hiển thị cho khách<textarea maxLength={3000} rows={4} value={form.visitorDescription} onChange={event => set('visitorDescription',event.target.value)} placeholder="Giới thiệu ngắn về địa điểm, điểm nổi bật và lưu ý tham quan…" /></label>
          <p className="field-note">Nội dung này hiển thị trong thẻ địa điểm, tách riêng với bài đọc audio.</p>
          <label>Bài thuyết minh gốc (dùng cho audio)<textarea required maxLength={20000} rows={8} value={form.description} onChange={event => set('description',event.target.value)} placeholder="Viết câu chuyện và thông tin thuyết minh của địa điểm…" /></label><p className="field-note">Bài thuyết minh không hiện trên thẻ địa điểm. Sửa tên, bài thuyết minh hoặc ngôn ngữ gốc sẽ làm bản dịch và audio cũ cần được tạo lại.</p></div>
        <div className="editor-section"><h3>03 <span>Ảnh minh họa</span></h3>
          {(preview || poi?.imageUrl) && <img className="editor-photo" src={preview || `${poi?.imageUrl}?v=${encodeURIComponent(poi?.updatedAt ?? '')}`} alt="Ảnh minh họa địa điểm" />}
          <label className="file-input">Chọn ảnh mới<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const next = event.target.files?.[0]; if (next && (!['image/jpeg','image/png','image/webp'].includes(next.type) || next.size > 5242880)) { setError('Chọn ảnh JPG, PNG hoặc WebP không quá 5 MB.'); event.target.value = ''; return; } setFile(next ?? null); setError(''); }} /></label>
          <p className="field-note">JPG, PNG hoặc WebP · Tối đa 5 MB · Lưu trực tiếp vào database.</p>
          <label>Tác giả / ghi công ảnh<input required={!!file} maxLength={300} value={form.imageCredit} onChange={event => set('imageCredit',event.target.value)} placeholder="Tên tác giả · Giấy phép" /></label>
          <div className="form-grid"><label>Link nguồn ảnh<input type="url" maxLength={2048} value={form.imageSourceUrl} onChange={event => set('imageSourceUrl',event.target.value)} placeholder="https://…" /></label><label>Link giấy phép<input type="url" maxLength={2048} value={form.imageLicenseUrl} onChange={event => set('imageLicenseUrl',event.target.value)} placeholder="https://…" /></label></div>
        </div>
        <label className="publish-option"><input type="checkbox" checked={form.isPublished} onChange={event => set('isPublished',event.target.checked)} /><span><strong>Xuất bản lên bản đồ</strong><small>Tắt để giữ bản nháp, chưa hiển thị cho khách.</small></span></label>
        {error && <p className="error-banner" role="alert">{error}</p>}
      </div>
      <footer className="editor-footer"><button type="button" disabled={saving} onClick={onClose}>Hủy</button><button className="primary" disabled={saving || locating || matches.length > 0} type="submit">{saving ? 'Đang lưu…' : poi ? 'Lưu thay đổi' : 'Tạo địa điểm'}</button></footer>
    </form>
  </dialog>;
}
function slugify(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
