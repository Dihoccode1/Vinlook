import {useEffect,useRef,useState} from 'react';
import QRCode from 'qrcode';
import {api,type Poi} from './api';
import {default_public_url,qr_link} from './qr-link';

interface QrData {poi_id:string;qr_token:string;qr_path:string}
export function PoiQrDialog({poi,on_close}:{poi:Poi;on_close():void}){
  const dialog=useRef<HTMLDialogElement>(null);
  const [qr,set_qr]=useState<QrData|null>(null);
  const [base_url,set_base_url]=useState(()=>{try{return localStorage.getItem('vinlook.public_web_url')||default_public_url(window.location.origin,import.meta.env.VITE_PUBLIC_WEB_URL);}catch{return default_public_url(window.location.origin,import.meta.env.VITE_PUBLIC_WEB_URL);}});
  const [png,set_png]=useState('');const [link,set_link]=useState('');
  const [error,set_error]=useState('');const [notice,set_notice]=useState('');const [retry,set_retry]=useState(0);
  useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close();},[]);
  useEffect(()=>{
    const controller=new AbortController();set_error('');
    api<{data:QrData}>(`/pois/${encodeURIComponent(poi.id)}/qr`,{method:'POST',signal:controller.signal})
      .then(result=>{if(!controller.signal.aborted)set_qr(result.data);})
      .catch(failure=>{if(!controller.signal.aborted)set_error(failure instanceof Error?failure.message:'Không tạo được mã QR.');});
    return()=>controller.abort();
  },[poi.id,retry]);
  useEffect(()=>{
    let cancelled=false;set_png('');set_link('');set_notice('');if(!qr)return;
    let target:string;
    try{target=qr_link(base_url.trim(),qr.qr_token);}catch{set_error('Nhập địa chỉ web bản đồ hợp lệ, ví dụ https://vinlook.vn');return;}
    set_error('');set_link(target);
    QRCode.toDataURL(target,{width:1024,margin:4,errorCorrectionLevel:'M',color:{dark:'#153f32',light:'#ffffff'}})
      .then(data=>{if(!cancelled){set_png(data);try{localStorage.setItem('vinlook.public_web_url',base_url.trim());}catch{/* Optional browser preference. */}}})
      .catch(()=>{if(!cancelled)set_error('Không tạo được ảnh QR. Vui lòng thử lại.');});
    return()=>{cancelled=true;};
  },[qr,base_url]);
  const local_link=link&&['localhost','127.0.0.1','[::1]'].includes(new URL(link).hostname);
  async function copy_link(){
    try{if(!navigator.clipboard)throw Error('Unavailable');await navigator.clipboard.writeText(link);set_notice('Đã sao chép đường dẫn.');}
    catch{set_notice('Chưa sao chép được. Bạn có thể sao chép đường dẫn ở trên.');}
  }
  return <dialog ref={dialog} className="qr-dialog" aria-labelledby="qr-title" onCancel={on_close}>
    <header className="qr-head"><div><span className="eyebrow">MÃ QR ĐỊA ĐIỂM</span><h2 id="qr-title">Quét để khám phá</h2><p>{poi.name}</p><p className="qr-id-label">Mã POI: <strong>{poi.id}</strong></p></div><button type="button" onClick={on_close} aria-label="Đóng mã QR">×</button></header>
    <div className="qr-body">
      <div className="qr-preview">{png?<img src={png} alt={`Mã QR mở ${poi.name}`} width="260" height="260"/>:<p role="status">{error?'Chưa có ảnh QR':'Đang chuẩn bị QR…'}</p>}</div>
      <strong className="qr-poi-code">{poi.name}</strong>
      {!poi.is_published&&<p className="qr-note">Địa điểm đang là bản nháp. Khách chỉ mở được sau khi xuất bản.</p>}
      <label htmlFor="qr-base-url">Địa chỉ web bản đồ</label><input id="qr-base-url" type="url" value={base_url} onChange={event=>set_base_url(event.target.value)} placeholder="https://vinlook.vn"/>
      {local_link&&<p className="qr-note">Link local chỉ mở trên máy này. Để quét bằng điện thoại, nhập tên miền hoặc địa chỉ mạng mà điện thoại truy cập được.</p>}
      {link&&<a className="qr-target" href={link} target="_blank" rel="noreferrer">{link}</a>}
      <p className="qr-help">Mỗi địa điểm dùng một mã cố định. Tải ảnh để in và đặt tại điểm tham quan.</p>
      {error&&<p role="alert" className="qr-error">{error} <button onClick={()=>set_retry(value=>value+1)}>Thử lại</button></p>}
      {notice&&<p role="status">{notice}</p>}
    </div>
    <footer className="qr-footer"><button disabled={!png} onClick={()=>void copy_link()}>Sao chép link</button>{png?<a className="primary" href={png} download={`${poi.id}-QR.png`}>Tải ảnh QR</a>:<button disabled>Tải ảnh QR</button>}</footer>
  </dialog>;
}
