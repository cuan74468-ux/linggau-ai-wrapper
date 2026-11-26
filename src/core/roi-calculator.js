// Deterministic UMKM advertising calculator. No external calls, storage or AI.
export const ROI_TOOL=Object.freeze({id:"roi-calculator",title:"Kalkulator ROI, ROAS & BEP",category:"Copywriting, Strategi & Bisnis",description:"Hitung laba dan titik impas iklan dari angka usaha Anda."});
export function matchesRoi(query="",category="all"){
 return (category==="all"||category===ROI_TOOL.category)&&[ROI_TOOL.title,ROI_TOOL.description,"iklan hpp keuntungan kalkulator"].join(" ").toLocaleLowerCase("id").includes(query.trim().toLocaleLowerCase("id"));
}
function integer(value,min,max){
 if(typeof value==="string"){if(!/^\d{1,12}$/.test(value.trim()))throw Error("ROI_INVALID_INPUT");value=Number(value.trim());}
 if(!Number.isSafeInteger(value)||value<min||value>max)throw Error("ROI_INVALID_INPUT");
 return value;
}
export function calculateAds({price,cogs,extra=0,adSpend,orders}){
 price=integer(price,1,1000000000);cogs=integer(cogs,0,1000000000);extra=integer(extra,0,1000000000);adSpend=integer(adSpend,0,100000000000);orders=integer(orders,0,1000000);
 const unitCost=cogs+extra,margin=price-unitCost,revenue=price*orders,variableCosts=unitCost*orders,totalCost=variableCosts+adSpend,contribution=margin*orders,profit=contribution-adSpend;
 return Object.freeze({price,cogs,extra,adSpend,orders,unitCost,margin,revenue,variableCosts,totalCost,contribution,profit,
 marginPct:margin/price*100,roas:adSpend>0?revenue/adSpend:null,
 roi:totalCost>0?profit/totalCost*100:null,adReturn:adSpend>0?profit/adSpend*100:null,
 cpa:orders>0?adSpend/orders:null,bepOrders:margin>0?Math.ceil(adSpend/margin):null,
 bepRoas:margin>0?price/margin:null});
}
export const rupiah=value=>value===null?"—":new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(value);
const decimal=(value,suffix)=>value===null?"—":new Intl.NumberFormat("id-ID",{maximumFractionDigits:2}).format(value)+suffix;
export function adsReport(r){
 return [
 ["Omzet",rupiah(r.revenue)],["Total biaya variabel + iklan",rupiah(r.totalCost)],["Laba setelah iklan",rupiah(r.profit)],
 ["Margin per pesanan",rupiah(r.margin)],["Margin sebelum iklan",decimal(r.marginPct,"%")],["ROAS (omzet / iklan)",decimal(r.roas,"×")],
 ["ROI (laba / total biaya)",decimal(r.roi,"%")],["Laba / biaya iklan",decimal(r.adReturn,"%")],
 ["CPA (iklan / pesanan)",rupiah(r.cpa)],["Pesanan minimum untuk impas",r.bepOrders===null?"Tidak tercapai dengan margin ini":String(r.bepOrders)],
 ["ROAS impas",decimal(r.bepRoas,"×")]
 ];
}
