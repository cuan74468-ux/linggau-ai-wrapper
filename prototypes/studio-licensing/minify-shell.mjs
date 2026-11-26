// Build-only prototype. Preserves host key declaration, no dynamic evaluation,
// encoded executable payload, alternative transport, or credentials.
import {createRequire} from "node:module";
import {resolve,join} from "node:path";
import {readFile,writeFile} from "node:fs/promises";
import {Script} from "node:vm";
import {pathToFileURL} from "node:url";
const KEY='const apiKey = "";';
export async function minifyShell(html,minify){
 if(typeof html!=="string"||html.length>100000||typeof minify!=="function")throw Error("SHELL_INPUT_INVALID");
 const matches=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)];
 if(matches.length!==1||!matches[0][0].startsWith("<script>"))throw Error("SHELL_SCRIPT_CONTRACT");
 const source=matches[0][1],trimmed=source.trimStart();
 if(!trimmed.startsWith(KEY)||source.split(KEY).length!==2)throw Error("SHELL_HOST_KEY_CONTRACT");
 // No top-level mangling or compression: preserve bridge names and control flow.
 // Keep literal host declaration outside the minifier.
 const result=await minify(trimmed.slice(KEY.length),{compress:false,mangle:false,sourceMap:false,format:{comments:false,ascii_only:true,inline_script:true}});
 if(typeof result?.code!=="string"||!result.code||/<\/script/i.test(result.code)||/sourceMappingURL/.test(result.code))throw Error("SHELL_OUTPUT_INVALID");
 const script=KEY+"\n"+result.code;
 new Script(script); // syntax check only; never execute in build
 const output=html.slice(0,matches[0].index)+"<script>\n"+script+"\n</script>"+html.slice(matches[0].index+matches[0][0].length);
 if(output.length>=html.length)throw Error("SHELL_NOT_SMALLER");
 return output;
}
export function loadMinifier(){
 const prefix=process.env.STUDIO_MINIFIER_DIR;
 if(!prefix)throw Error("STUDIO_MINIFIER_DIR_REQUIRED");
 const require=createRequire(join(resolve(prefix),"package.json"));
 return require("terser").minify;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [input,output]=process.argv.slice(2);
 if(!input||!output||resolve(input)===resolve(output))throw Error("Use separate input and output paths");
 const original=await readFile(input,"utf8"),result=await minifyShell(original,loadMinifier());
 await writeFile(output,result,{flag:"wx"});
 console.log("SHELL_MINIFY_PASS",Buffer.byteLength(original),Buffer.byteLength(result),"CANDIDATE_ONLY_NOT_LICENSED");
}
