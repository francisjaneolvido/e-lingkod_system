import fs from 'node:fs';
import { accounts } from '../../demo/fixtures/dataset.mjs';
import { guardedTarget, VERSION } from './config.mjs';

function csvFields(line) {
  const fields=[];let value='',quoted=false;
  for(let index=0;index<line.length;index++){
    const character=line[index];
    if(character==='"'){if(quoted&&line[index+1]==='"'){value+='"';index++;}else quoted=!quoted;}
    else if(character===','&&!quoted){fields.push(value);value='';}else value+=character;
  }
  if(quoted)throw Error('Malformed trusted demo identity CSV.');
  return [...fields,value];
}

export function assertDemoIdentityFixture(config, account, env=process.env) {
  const primary=config.primary?.database==='e_lingkod_bayan_demo';
  const target=guardedTarget(config.primary?.url?.href,primary?'primary':'restore');
  if(!primary&&(!/^e_lingkod_bayan_demo_restore_u[a-f0-9]{32}$/.test(target.database)||env.ELB_DEMO_SETUP_TEST_DATABASE!==target.database))
    throw Error('Demo identity seeding on a restore clone requires its exact generated test marker.');
  if(env.ELB_DEMO_MODE!==VERSION||new URL(env.DATABASE_URL).href!==target.url.href)throw Error('Demo identity fixture environment must match its dedicated demo target.');
  const known=accounts.find(value=>value.key===account?.key);
  const fields=['key','email','firstName','lastName','hasNoMiddleName','phoneNumber','role','group','scenario'];
  if(!known||!known.email.endsWith('@example.test')||fields.some(field=>known[field]!==account[field]))throw Error('Only exact known synthetic demo fixture identities may be classified as legacy.');
  const [header,...lines]=fs.readFileSync('demo/accounts.csv','utf8').trim().split(/\r?\n/).map(csvFields);
  const rows=lines.map(values=>Object.fromEntries(header.map((key,index)=>[key,values[index]]))).filter(row=>row.email===known.email);
  if(rows.length!==1||rows[0].displayName!==known.firstName+' '+known.lastName||rows[0].password!==known.password||rows[0].role!==known.role||rows[0].scenario!==known.group+':'+known.scenario)
    throw Error('Known synthetic identity must also match the maintained demo account CSV.');
  return target;
}

// Developer fixture operation only. No production auth hook or verification
// bypass flag calls this; ordinary signup still requires ID submission.
export async function seedDemoLegacyIdentity(config, prisma, account, env=process.env) {
  const target=assertDemoIdentityFixture(config,account,env);
  const [actual]=await prisma.$queryRawUnsafe('SELECT DATABASE() AS databaseName');
  if(actual?.databaseName!==target.database)throw Error('Demo fixture client does not match the guarded database.');
  const user=await prisma.user.findUniqueOrThrow({where:{email:account.email}});
  if(user.firstName!==account.firstName||user.lastName!==account.lastName||user.phoneNumber!==account.phoneNumber||user.hasNoMiddleName!==account.hasNoMiddleName||!['CITIZEN',account.role].includes(user.role)||user.emailVerified||user.identityVersion!==0||!['SUBMISSION_REQUIRED','LEGACY'].includes(user.identityStatus))
    throw Error('Existing account is not an untouched synthetic demo identity; no review history was changed.');
  if(await prisma.citizenIdentitySubmission.count({where:{userId:user.id}}))throw Error('Demo legacy seeding cannot replace identity documents or reviews.');
  if(user.identityStatus==='LEGACY')return user;
  const result=await prisma.user.updateMany({where:{id:user.id,email:account.email,role:user.role,identityStatus:'SUBMISSION_REQUIRED',identityVersion:0},data:{identityStatus:'LEGACY'}});
  if(result.count!==1)throw Error('Synthetic identity changed concurrently; refresh its demo checkpoint.');
  return prisma.user.findUniqueOrThrow({where:{id:user.id}});
}
