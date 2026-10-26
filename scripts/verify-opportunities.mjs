import {spawnSync} from 'node:child_process';
// The migration postcondition fixture deliberately models an empty pre-DDL
// receipt table; give it a separate disposable database from mutation tests.
for(const files of [
 ['tests/employment-opportunities-b5.test.mjs','tests/employment-opportunities-db-b5.test.mjs','tests/demo-fixture-identity-b5.test.mjs','tests/demo-vacancy-recovery-b5.test.mjs'],
 ['tests/opportunity-notice-locks-b5.test.mjs','tests/vacancy-request-b5.test.mjs'],
 ['tests/demo-opportunity-upgrade-b5.test.mjs'],
]){
 const result=spawnSync(process.execPath,['scripts/verify-census-records.mjs',...files],{env:process.env,stdio:'inherit',windowsHide:true});
 if(result.status!==0){process.exitCode=result.status??1;break;}
}
