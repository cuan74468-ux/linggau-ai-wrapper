// Candidate transport for Ngulik Studio scoped authorization.
// Not imported by the live app or shell. No API keys or persistent credentials.
const TOKEN=/^[a-f0-9]{64}$/;
const ACTIONS=new Set(["studioExchangeGrant","studioValidateSession","studioLogout"]);
const API=/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;
const ERRORS=new Set(["MAINTENANCE","UNAUTHORIZED","FORBIDDEN","RATE_LIMITED","VALIDATION"]);
function error(code){const e=Error(code);e.code=code;return e;}
export function createStudioLicenseClient({apiUrl,fetcher=globalThis.fetch,now=Date.now,requestId=()=>globalThis.crypto.randomUUID().replaceAll("-","")}={}){
 if(typeof apiUrl!=="string"||!API.test(apiUrl)||typeof fetcher!=="function")throw error("LICENSE_NOT_CONFIGURED");
 let token=null,expires=0,generation=0,working=false;
 function clear(){generation++;token=null;expires=0;}
 function active(){if(!token||expires<=now()){clear();return false;}return true;}
 async function request(action,payload={},bearer=""){
  if(!ACTIONS.has(action))throw error("LICENSE_ACTION_INVALID");
  const id=requestId();if(typeof id!=="string"||!/^[A-Za-z0-9_-]{16,80}$/.test(id))throw error("LICENSE_REQUEST_ID");
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
   const res=await fetcher(apiUrl,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,payload,token:bearer,request_id:id}),credentials:"omit",redirect:"follow",cache:"no-store",signal:controller.signal});
   if(!res.ok)throw error("LICENSE_NETWORK");
   // GAS may redirect to googleusercontent; reject unrelated final origins.
   const final=new URL(res.url||apiUrl);
   if(final.protocol!=="https:"||!["script.google.com","script.googleusercontent.com"].includes(final.hostname))throw error("LICENSE_NETWORK");
   const body=await res.text();if(body.length>16384)throw error("LICENSE_RESPONSE_INVALID");
   let parsed;try{parsed=JSON.parse(body);}catch{throw error("LICENSE_RESPONSE_INVALID");}
   if(parsed?.ok!==true){const code=parsed?.error?.code;throw error(ERRORS.has(code)?code:"LICENSE_RESPONSE_INVALID");}
   return parsed.data;
  }catch(e){throw error(ERRORS.has(e?.code)||["LICENSE_NETWORK","LICENSE_RESPONSE_INVALID"].includes(e?.code)?e.code:"LICENSE_NETWORK");}
  finally{clearTimeout(timer);}
 }
 async function signIn(code){
  if(typeof code!=="string"||!TOKEN.test(code))throw error("VALIDATION");
  if(working)throw error("LICENSE_BUSY");
  clear();working=true;const epoch=generation;
  try{
   const data=await request("studioExchangeGrant",{code});
   if(epoch!==generation)throw error("LICENSE_CANCELLED");
   if(!TOKEN.test(data?.token||"")||!Number.isSafeInteger(data.expires_at)||data.expires_at<=now()||data.expires_at>now()+1800000+30000)throw error("LICENSE_RESPONSE_INVALID");
   token=data.token;expires=data.expires_at;
   return await validateInternal(epoch);
  }catch(e){clear();throw e;}finally{working=false;}
 }
 async function validateInternal(epoch){
  if(!active())throw error("UNAUTHORIZED");
  const result=await request("studioValidateSession",{},token);
  if(epoch!==generation)throw error("LICENSE_CANCELLED");
  if(result?.active!==true||typeof result.member_id!=="string"||!/^M-[0-9]{1,12}$/.test(result.member_id)||!Number.isSafeInteger(result.expires_at)||result.expires_at!==expires||expires<=now())throw error("LICENSE_RESPONSE_INVALID");
  return {active:true,member_id:result.member_id,expires_at:expires};
 }
 async function validate(){
  if(working)throw error("LICENSE_BUSY");working=true;const epoch=generation;
  try{return await validateInternal(epoch);}catch(e){clear();throw e;}finally{working=false;}
 }
 async function signOut(){
  const old=token;clear();
  if(!old)return {success:true,serverConfirmed:false};
  try{const r=await request("studioLogout",{},old);return {success:true,serverConfirmed:r?.success===true};}
  catch{return {success:true,serverConfirmed:false};}
 }
 return Object.freeze({signIn,validate,signOut,clear,active});
}
