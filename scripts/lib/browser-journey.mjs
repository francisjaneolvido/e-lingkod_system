import fs from 'node:fs';
import path from 'node:path';
import {readCatalogue} from '../../demo/fixtures/credentials.mjs';

export function writePrivateBrowserJourney({source,accountsFile,output,root=process.cwd()}){
  const relative=path.relative(path.resolve(root),path.resolve(output));
  if(!path.isAbsolute(output)||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw Error('Browser credential output must be an absolute private path outside the repository.');
  const marker='const credentials = {}; // PRIVATE_CATALOGUE_INJECTION';
  if(source.split(marker).length!==2)throw Error('Unexpected browser journey template.');
  const emails=[...new Set([...source.matchAll(/demoPassword\(["']([^"']+)["']\)/g)].map(match=>match[1]))];
  if(!emails.length||emails.some(email=>!email.endsWith('@example.test')))throw Error('Only reserved synthetic fixture identities are supported.');
  const catalogue=readCatalogue(accountsFile),credentials={};
  for(const email of emails){const entry=catalogue.get(email);if(!entry)throw Error('Private catalogue is missing a journey account.');credentials[email]=entry.password;}
  const rendered=source.replace(marker,()=>'const credentials = '+JSON.stringify(credentials)+'; // PRIVATE: never commit or share this generated file');
  fs.writeFileSync(output,rendered,{flag:'wx',mode:0o600});
  return {accounts:emails.length};
}
