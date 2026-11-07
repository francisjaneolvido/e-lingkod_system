import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
export function syntheticCatalogue(accounts){const directory=fs.mkdtempSync(path.join(os.tmpdir(),'elb-unit-catalogue-')),file=path.join(directory,'accounts.csv'),before=process.env.DEMO_ACCOUNTS_FILE,quote=value=>'"'+String(value).replaceAll('"','""')+'"';fs.writeFileSync(file,['displayName,email,password,role,scenario',...accounts.map(a=>[a.firstName+' '+a.lastName,a.email,randomBytes(20).toString('hex')+'Aa1!',a.role,a.group+':'+a.scenario].map(quote).join(','))].join('\n')+'\n');process.env.DEMO_ACCOUNTS_FILE=file;return {file,cleanup(){if(before===undefined)delete process.env.DEMO_ACCOUNTS_FILE;else process.env.DEMO_ACCOUNTS_FILE=before;fs.rmSync(directory,{recursive:true});}};}
