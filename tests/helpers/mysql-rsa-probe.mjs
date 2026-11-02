// Read-only probe through the real application adapter. Never migrates or seeds.
import {loadServerTypescript} from './load-typescript.mjs';
const hook=loadServerTypescript();let prisma;
try{
 ({prisma}=await import('../../src/lib/prisma.ts'));
 const rows=await prisma.$queryRaw`SELECT 1 AS ok`;
 const result={ok:true,value:String(rows[0].ok)};
 if(process.env.ELB_MYSQL_RSA_TEST==='1')result.tlsCipher=(await prisma.$queryRawUnsafe("SHOW SESSION STATUS LIKE 'Ssl_cipher'"))[0].Value;
 console.log(JSON.stringify(result));
}catch(error){
 const codes=[];const seen=new Set();function visit(value){if(!value||typeof value!=='object'||seen.has(value))return;seen.add(value);for(const key of Object.getOwnPropertyNames(value)){const item=value[key];if(['errno','originalCode','code'].includes(key)&&['string','number'].includes(typeof item))codes.push(item);else if(item&&typeof item==='object')visit(item);}}visit(error);
 console.log(JSON.stringify({ok:false,codes,message:error.message.startsWith('MYSQL_RSA_PUBLIC_KEY_PATH')?error.message:'Database authentication/query failed (details withheld).'}));process.exitCode=1;
}finally{if(prisma)await prisma.$disconnect();hook.deregister();}
