import { spawnSync } from 'node:child_process';
// Each interruption scenario gets its own migrated disposable database. Never
// targets the ordinary database and never invokes the opt-in apply command.
for(const scenario of ['before','after']){
  const result=spawnSync(process.execPath,['scripts/verify-census-records.mjs','tests/hackathon-import.test.mjs'],{env:{...process.env,ELB_FIXTURE_RECOVERY_CASE:scenario},stdio:'inherit',windowsHide:true});
  if(result.status!==0){process.exitCode=result.status??1;break;}
}
