/* Almaha Holidays app — service worker: app shell cache + /_blob/<id> files from Firestore via the page */
const V="almaha-v48";
const SHELL=["./","index.html","config.js","manifest.json","./icon-192.png","./icon-512.png","./badge-96.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).catch(()=>{}));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==V&&k!=="almaha-blobs")await caches.delete(k);await self.clients.claim()})())});
async function askPage(id,clientId){
  let list=[];const c=clientId&&await self.clients.get(clientId);if(c)list.push(c);
  list=list.concat(await self.clients.matchAll({type:"window"}));
  for(const cl of list){try{const r=await new Promise((res,rej)=>{const ch=new MessageChannel();const t=setTimeout(()=>rej("timeout"),45000);ch.port1.onmessage=m=>{clearTimeout(t);res(m.data)};cl.postMessage({t:"blob",id},[ch.port2])});if(r&&r.ok)return r.blob}catch{}}
  return null;
}
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(u.origin===location.origin&&u.pathname.includes("/_blob/")){
    const id=u.pathname.split("/_blob/")[1];
    e.respondWith((async()=>{const cache=await caches.open("almaha-blobs");const hit=await cache.match(id);if(hit)return hit;
      const b=await askPage(id,e.clientId||e.resultingClientId);if(!b)return new Response("Not found",{status:404});
      const r=new Response(b,{headers:{"Content-Type":b.type||"application/octet-stream"}});cache.put(id,r.clone());return r})());
    return}
  if(e.request.method!=="GET"||u.origin!==location.origin)return;
  // network first for the app shell so updates arrive; cache as offline fallback
  // always revalidate the app files with the server so updates show up right away
  const fresh=e.request.mode==="navigate"?fetch(u.href,{cache:"no-cache",credentials:"same-origin"}):fetch(new Request(e.request,{cache:"no-cache"}));
  e.respondWith(fresh.then(r=>{if(r.ok){const cp=r.clone();caches.open(V).then(c=>c.put(e.request,cp))}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match("index.html"))));
});

/* tapping a system notification opens the app on the right page */
self.addEventListener("notificationclick",e=>{e.notification.close();const go=(e.notification.data&&e.notification.data.go)||"";
  e.waitUntil((async()=>{const all=await self.clients.matchAll({type:"window",includeUncontrolled:true});for(const c of all){if("focus" in c){await c.focus();if(go)c.navigate?c.navigate(c.url.split("#")[0]+go).catch(()=>{}):0;return}}await self.clients.openWindow("./"+(go||""))})())});
