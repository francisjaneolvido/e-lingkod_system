import {accounts} from '../../demo/fixtures/dataset.mjs';
import {requireDemoCredentials} from '../../demo/fixtures/credentials.mjs';

// Separate, explicit fixture operation. Does not modify production signup or
// relax review. Only newly owned reserved-domain accounts from this import are
// legacy fixtures; existing accounts/documents are never adopted or approved.
export async function seedImportedLegacy({prisma,db,account,state,baseline}){
 requireDemoCredentials(accounts);const known=accounts.find(a=>a.key===account.key),owned=state.completed['register:'+account.key];
 const fields=['email','firstName','lastName','phoneNumber','hasNoMiddleName','role','group','scenario'];
 if(!known||fields.some(field=>known[field]!==account[field])||!account.email.endsWith('@example.test')||state.collisions.includes(account.key)||!owned?.id)throw Error('Legacy fixture requires a newly owned synthetic registration.');
 if((baseline.user||[]).some(row=>JSON.parse(row).id===owned.id))throw Error('Cannot classify a pre-existing identity as a demo fixture.');
 const [target]=await db.query('SELECT DATABASE() databaseName,@@port portNumber');const configured=new URL(process.env.DATABASE_URL||'mysql://invalid/invalid');
 if(configured.protocol!=='mysql:'||!['127.0.0.1','localhost','[::1]'].includes(configured.hostname)||target.databaseName!==configured.pathname.slice(1)||Number(target.portNumber)!==Number(configured.port||3306)||!(target.databaseName==='e_lingkod_bayan'||(/^elb_b3_test_[a-f0-9]{32}$/.test(target.databaseName)&&process.env.ELB_B3_TEST_DATABASE===target.databaseName)))throw Error('Imported identity target mismatch.');
 const [client]=await prisma.$queryRawUnsafe('SELECT DATABASE() databaseName,@@port portNumber');if(client.databaseName!==target.databaseName||Number(client.portNumber)!==Number(target.portNumber))throw Error('Fixture Prisma client target mismatch.');
 const user=await prisma.user.findUniqueOrThrow({where:{id:owned.id}});
 if(user.email!==account.email||user.firstName!==account.firstName||user.lastName!==account.lastName||user.role!=='CITIZEN'||user.emailVerified||user.identityVersion!==0||!['SUBMISSION_REQUIRED','LEGACY'].includes(user.identityStatus)||await prisma.citizenIdentitySubmission.count({where:{userId:user.id}}))throw Error('Imported fixture is not an untouched new synthetic identity.');
 if(user.identityStatus==='LEGACY')return {id:user.id,classification:'LEGACY'};
 const changed=await prisma.user.updateMany({where:{id:user.id,role:'CITIZEN',identityStatus:'SUBMISSION_REQUIRED',identityVersion:0},data:{identityStatus:'LEGACY'}});if(changed.count!==1)throw Error('Fixture identity changed concurrently.');return {id:user.id,classification:'LEGACY'};
}
