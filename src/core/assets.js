// Session-only bounded result store. No browser persistence or network.
export function createAssetStore({maxItems=10,maxChars=32*1024*1024}={}){
  let assets=[], next=0;
  const weight=a=>a.kind==="image"?a.base64.length:a.text.length;
  return Object.freeze({
    add(result, featureId, parents=[]){
      const a=Object.freeze({...result,id:"asset-"+(++next),featureId,parents:Object.freeze([...parents]),createdAt:new Date().toISOString()});
      if(weight(a)>maxChars) throw new Error("ASSET_TOO_LARGE");
      assets.unshift(a);
      while(assets.length>maxItems||assets.reduce((s,x)=>s+weight(x),0)>maxChars) assets.pop();
      return a;
    },
    list:()=>[...assets], get:id=>assets.find(a=>a.id===id),
    remove:id=>{assets=assets.filter(a=>a.id!==id);},
    clear:()=>{assets=[];}
  });
}
