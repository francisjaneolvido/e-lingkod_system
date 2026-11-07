import fs from 'node:fs';

// Account definitions are public synthetic metadata. Passwords come only from
// the separately supplied catalogue; no fallback password is distributed.
export function readCatalogue(file) {
 if(!file||fs.statSync(file).size>1024*1024)throw Error('Private demo catalogue is missing or exceeds1MiB.');
 const text=fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'');const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else if(!quoted&&field)throw Error('Malformed private demo CSV.');else quoted=!quoted;}
 else if(c===','&&!quoted){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field='';}else field+=c;}
 if(quoted)throw Error('Malformed private demo CSV.');if(field||row.length){row.push(field);rows.push(row);}
 const header=rows.shift()||[];if(!header.includes('email')||!header.includes('password')||new Set(header).size!==header.length)throw Error('Private demo CSV requires unique email and password columns.');
 if(rows.length>2000)throw Error('Private demo CSV has too many accounts.');const result=new Map();for(const values of rows){if(values.length!==header.length)throw Error('Malformed private demo CSV row.');const value=Object.fromEntries(header.map((key,i)=>[key,values[i]]));if(!value.email||!value.password||result.has(value.email))throw Error('Private demo CSV has missing or duplicate account credentials.');result.set(value.email,value);}return result;
}
export function fixturePassword(email,env=process.env){if(!env.DEMO_ACCOUNTS_FILE)return undefined;const value=readCatalogue(env.DEMO_ACCOUNTS_FILE).get(email);if(!value)throw Error('An expected synthetic account is missing from the private catalogue.');return value.password;}
export function requireDemoCredentials(accounts,env=process.env){if(!env.DEMO_ACCOUNTS_FILE)throw Error('Set DEMO_ACCOUNTS_FILE to the private accounts.csv supplied by Yesel.');const rows=readCatalogue(env.DEMO_ACCOUNTS_FILE);for(const account of accounts){const row=rows.get(account.email);if(!row||!account.email.endsWith('@example.test'))throw Error('Private catalogue does not match the supported synthetic dataset.');if(row.role&&row.role!==account.role)throw Error('Private catalogue role does not match synthetic metadata.');if(row.password.length<8||row.password.length>128)throw Error('Private catalogue password does not meet the supported policy.');}return rows;}
