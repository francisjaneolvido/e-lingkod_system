import {digest} from './database.mjs';
export function fixtureIdentity(files,prior,representation='buffers'){
 const identity=list=>digest(list.map(([name,bytes])=>[name,representation==='strings'?bytes.toString('utf8'):bytes]));
 const canonicalFiles=files.map(([name,bytes])=>[name,Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'))]);
 const canonical=identity(canonicalFiles);
 if(!prior||prior===canonical||prior===identity(files))return {canonical,proven:true,previous:prior};
 // A bounded preimage proof for the previous raw-byte fingerprint. It permits
 // only whole-file LF/CRLF transport and preserves file names/content/order.
 // No new or edited fixture is adopted merely because its version label matches.
 if(files.length>12)return {canonical,proven:false};
 for(let mask=0;mask<2**files.length;mask++){
  const variant=canonicalFiles.map(([name,bytes],i)=>[name,mask&(1<<i)?Buffer.from(bytes.toString('utf8').replace(/\n/g,'\r\n')):bytes]);
  if(identity(variant)===prior)return {canonical,proven:true};
 }
 return {canonical,proven:false};
}
