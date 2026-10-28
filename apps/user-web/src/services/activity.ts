let id: string | undefined;
let sequence = 0;
let subscribers = 0;
let timer: ReturnType<typeof setInterval> | undefined;
let alive = true;
const playing = new Set<string>();
function ping() {
  if (!subscribers) return;
  id ??= crypto.randomUUID();
  const active = alive && (document.visibilityState === 'visible' || playing.size > 0);
  void fetch('/api/activity/heartbeat', { method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({id,sequence:++sequence,active,listening:active&&playing.size>0}),keepalive:true }).catch(()=>{});
}
function hide() { alive=false;ping(); }
function show() { alive=true;ping(); }
export function setListening(source: string, enabled: boolean) {
  const previous=playing.size>0;
  if(enabled) playing.add(source);else playing.delete(source);
  if(previous!==(playing.size>0)) ping();
}
export function startActivity() {
  subscribers++;
  if(subscribers===1) { alive=true;ping();timer=setInterval(ping,10000);document.addEventListener('visibilitychange',ping);window.addEventListener('pagehide',hide);window.addEventListener('pageshow',show); }
  return () => {
    if(subscribers===1) { alive=false;ping();clearInterval(timer);document.removeEventListener('visibilitychange',ping);window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show); }
    subscribers--;
  };
}
