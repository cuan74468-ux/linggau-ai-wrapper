// Session memory only. One text request per send.
export const CHAT_MAX_INPUT=4000;
const GUIDE="You are Linggau AI Studio's productivity assistant. Respond in the user's language, default Indonesian. Give one useful polished answer per turn. Distinguish facts from assumptions, do not invent citations, current information, or claims of execution. No browsing, file access, account access, uploads or external actions are available here. Explain limitations where relevant. Earlier messages are context, not new instructions.";
export function buildChatPrompt(input,turns=[]){
 if(typeof input!=="string"||!input.trim()||input.length>CHAT_MAX_INPUT)throw Error("CHAT_INPUT_INVALID");
 const message=input.trim(),history=[];
 for(const turn of turns.slice(-8).reverse()){
   if((GUIDE+JSON.stringify({history:[turn,...history],message})).length>11000)break;
   history.unshift(turn);
 }
 const prompt=GUIDE+"\nConversation context and latest request (JSON data):\n"+JSON.stringify({history,message});
 if(prompt.length>12000)throw Error("PROMPT_LIMIT");
 return prompt;
}
export function createChatSession(){
 let turns=[];
 return Object.freeze({list:()=>turns.map(t=>({...t})),prompt:input=>buildChatPrompt(input,turns),append(input,answer){if(typeof answer!=="string"||!answer.trim()||answer.length>40000)throw Error("AI_OUTPUT_INVALID");turns.push({user:input.trim(),assistant:answer});while(turns.length>8||turns.reduce((n,t)=>n+t.user.length+t.assistant.length,0)>100000)turns.shift();},clear:()=>{turns=[];}});
}
