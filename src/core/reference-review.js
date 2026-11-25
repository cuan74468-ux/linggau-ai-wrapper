// User-controlled acceptance gate. No biometric recognition, second AI call, or persistence.
export function needsReferenceReview(feature){return feature.engine==="image-to-image"&&feature.slots.length>0;}
export function createReferenceReview(feature,result,sources){
 if(!needsReferenceReview(feature)||result?.kind!=="image"||!Array.isArray(sources)||sources.length!==feature.slots.length||sources.some(s=>!s))throw Error("REFERENCE_REVIEW_INVALID");
 let state="pending";
 return Object.freeze({
  state:()=>state,
  accept(){if(state!=="pending")throw Error("REFERENCE_REVIEW_CLOSED");state="accepted";return {...result,referenceReview:"user-accepted"};},
  reject(){if(state!=="pending")throw Error("REFERENCE_REVIEW_CLOSED");state="rejected";}
 });
}
