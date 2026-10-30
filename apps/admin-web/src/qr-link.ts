export function qr_link(base_url:string,qr_token:string){
  const url=new URL(base_url);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=='/'||!/^[a-f0-9]{32}$/.test(qr_token))throw Error('Nhập địa chỉ gốc của web bản đồ, ví dụ https://vinlook.vn');
  return new URL(`/qr/${qr_token}`,url).href;
}
export function default_public_url(origin:string,configured?:string){
  if(configured)return configured;
  const url=new URL(origin);
  if(url.port==='5174')url.port='5173';
  return url.origin;
}
