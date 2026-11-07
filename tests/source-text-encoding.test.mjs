import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
test('application text is strict UTF-8 for the Next compiler',()=>{
 const decoder=new TextDecoder('utf-8',{fatal:true}),invalid=[];
 function visit(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
  const file=path.join(folder,entry.name);
  if(entry.isDirectory()){if(entry.name!=='generated')visit(file);}
  else if(/\.(?:[cm]?[jt]sx?|css|json)$/.test(entry.name)){try{decoder.decode(fs.readFileSync(file));}catch{invalid.push(file);}}
 }}
 visit('src');assert.deepEqual(invalid,[],'A Windows code-page byte can compile in tsc but fail Next route compilation. Save source as UTF-8.');
});
