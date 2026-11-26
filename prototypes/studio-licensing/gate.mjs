// Official UI lifecycle prototype, NOT a server security boundary.
export function createStudioGate({client,mount,onState=()=>{},now=Date.now,schedule=setTimeout,cancel=clearTimeout,pollMs=60000}){
 if(!client||typeof mount!=="function"||!Number.isFinite(pollMs)||pollMs<1000||pollMs>60000)throw Error("GATE_CONFIG_INVALID");
 let epoch=0,busy=false,closed=false,life=null,handle=null,expiry=0,poll=null,deadline=null,member=null;
 function notify(phase,message=""){onState({phase,message,member_id:phase==="active"?member:null});}
 function reset(){
  epoch++;if(poll!==null)cancel(poll);if(deadline!==null)cancel(deadline);
  poll=deadline=null;life?.abort();life=null;const old=handle;handle=null;expiry=0;member=null;
  try{old?.unmount?.();}catch{/* detached workspace still removed by UI */}
 }
 function lock(message){reset();client.clear();notify("locked",message);}
 function expiryTimer(id){deadline=schedule(()=>{if(id===epoch)lock("Sesi berakhir. Ambil kode masuk baru.");},Math.max(0,expiry-now()));}
 function next(id){poll=schedule(()=>{void verify(id);},pollMs);}
 async function verify(id){
  if(id!==epoch||closed)return;
  if(now()>=expiry){lock("Sesi berakhir. Ambil kode masuk baru.");return;}
  try{const r=await client.validate();if(id!==epoch||closed)return;if(!r?.active||r.member_id!==member||r.expires_at!==expiry||now()>=expiry)throw Error("INVALID_SESSION");next(id);}
  catch{if(id===epoch&&!closed)lock("Akses tidak dapat diverifikasi. Masuk kembali.");}
 }
 async function signIn(code){
  if(closed||busy||life)return false;
  busy=true;reset();const id=epoch;notify("pending","Memeriksa kode akses…");
  try{
   const r=await client.signIn(code);if(id!==epoch||closed)return false;
   if(!r?.active||!Number.isFinite(r.expires_at)||r.expires_at<=now())throw Error("INVALID_SESSION");
   member=r.member_id;expiry=r.expires_at;life=new AbortController();const signal=life.signal;expiryTimer(id);
   const mounted=await mount({member_id:member,signal});
   if(id!==epoch||closed||signal.aborted){try{mounted?.unmount?.();}catch{}return false;}
   if(!mounted||typeof mounted.unmount!=="function")throw Error("MOUNT_HANDLE_REQUIRED");
   handle=mounted;if(now()>=expiry)throw Error("INVALID_SESSION");
   notify("active");next(id);return true;
  }catch{if(id===epoch&&!closed)lock("Tidak dapat masuk. Pastikan kode masih berlaku dan akses aktif.");return false;}
  finally{busy=false;}
 }
 async function signOut(){
  if(closed)return;
  reset();notify("pending","Mengakhiri sesi…");
  const id=epoch;const wasBusy=busy;busy=true;
  let confirmed=false;try{confirmed=(await client.signOut())?.serverConfirmed===true;}catch{client.clear();}
  finally{busy=wasBusy&&busy; if(id===epoch&&!closed)notify("locked",confirmed?"Anda telah keluar.":"Akses lokal ditutup. Sesi server belum terkonfirmasi berakhir.");}
 }
 function dispose(){if(closed)return;closed=true;reset();client.clear();notify("closed");}
 notify("locked");return Object.freeze({signIn,signOut,dispose});
}
