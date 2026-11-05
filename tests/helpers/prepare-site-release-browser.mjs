import fs from 'node:fs';
import path from 'node:path';
import {loadServerTypescript} from './load-typescript.mjs';
const target=new URL(process.env.DATABASE_URL||'mysql://invalid/invalid');
if(process.env.ELB_SITE_RELEASE_TEST_DATABASE!=='true'||!/^\/elb_site_release_test_[a-f0-9]{32}$/.test(target.pathname)||!['localhost','127.0.0.1'].includes(target.hostname))throw Error('Browser fixtures require guarded local disposable schema.');
loadServerTypescript();
const {prisma}=await import('../../src/lib/prisma.ts');
const {auth}=await import('../../src/lib/auth.ts');
try {
  for(const [label,role,status] of [['pending','CITIZEN','SUBMISSION_REQUIRED'],['legacy','CITIZEN','LEGACY'],['admin','ADMIN','SUBMISSION_REQUIRED'],['staff','STAFF','SUBMISSION_REQUIRED']]){
    const email='browser.'+label+'@example.test';
    await auth.api.signUpEmail({body:{email,password:'Site-browser-2026!',firstName:'Synthetic',lastName:'Browser',hasNoMiddleName:true,phoneNumber:'+639001234567'}});
    const user=await prisma.user.update({where:{email},data:{role,identityStatus:status,department:role==='STAFF'?'MDRRMO':null}});
    if(role==='STAFF')for(const module of ['REPORTS','SERVICES','PROJECTS'])await prisma.staffPermission.create({data:{userId:user.id,module}});
  }
  // Image is generated inside the test, never a real ID or source asset.
  const {default:sharp}=await import('sharp');
  const image=await sharp({create:{width:600,height:400,channels:3,background:'#ccddee'}}).png().toBuffer();
  const scratch=path.resolve('.scratch/site-release');fs.mkdirSync(scratch,{recursive:true});fs.writeFileSync(path.join(scratch,'synthetic-browser-id.png'),image);
  fs.writeFileSync(path.join(scratch,'browser-context.json'),JSON.stringify({origin:process.env.BETTER_AUTH_URL,capture:process.env.PASSWORD_RESET_CAPTURE_DIR,database:target.pathname.slice(1)},null,2));
  console.log('Prepared synthetic browser role fixtures and ID in ignored scratch.');
}finally{await prisma.$disconnect();}
