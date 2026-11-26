// Intentionally limited Markdown: text and emphasis only. No HTML or active links.
export function renderChatBody(value,doc=globalThis.document){
 const body=doc.createElement("div");body.className="chat-body";
 const lines=String(value).split("\n");
 for(let i=0;i<lines.length;i++){
  if(i)body.append(doc.createTextNode("\n"));
  const line=lines[i],parts=line.split(/(\*\*[^*\n]+\*\*)/g);
  for(const p of parts){if(!p)continue;if(p.startsWith("**")&&p.endsWith("**")&&p.length>4){const strong=doc.createElement("strong");strong.textContent=p.slice(2,-2);body.append(strong);}else body.append(doc.createTextNode(p));}
 }
 return body;
}
