import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(import.meta.url);
const output=path.join(root,'src/generated/prisma');
const stamp=path.join(output,'.generation.json');

function expectedGeneration(){
  const schema=fs.readFileSync(path.join(root,'prisma/schema.prisma'),'utf8');
  const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
  // Production startup with a completed build need not install the Prisma CLI.
  const versions=[lock.packages['node_modules/prisma'].version,require('@prisma/client/package.json').version];
  if(versions[1]!==lock.packages['node_modules/@prisma/client'].version)throw new Error('Installed Prisma Client differs from the lockfile; reinstall dependencies.');
  const fingerprint=createHash('sha256').update(schema).update(JSON.stringify(versions)).digest('hex');
  const files=['client.ts','browser.ts','enums.ts','models.ts','commonInputTypes.ts',
    'internal/class.ts','internal/prismaNamespace.ts','internal/prismaNamespaceBrowser.ts',
    ...Array.from(schema.matchAll(/^\s*model\s+(\w+)\s*\{/gm),match=>'models/'+match[1]+'.ts')];
  return {fingerprint,files};
}

export function generatePrismaClient(){
  // generate reads configuration/schema and writes code; it never migrates or
  // queries the configured database. Run the repository-pinned CLI directly.
  const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
  if(require('prisma/package.json').version!==lock.packages['node_modules/prisma'].version)throw new Error('Installed Prisma CLI differs from the lockfile; reinstall dependencies.');
  const result=spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'generate'],
    {cwd:root,env:process.env,stdio:'inherit',windowsHide:true});
  if(result.error||result.status!==0)throw new Error('Prisma Client generation failed; database state was not changed.');
  const expected=expectedGeneration();
  if(!expected.files.every(file=>fs.existsSync(path.join(output,file))))throw new Error('Prisma Client generation is incomplete.');
  fs.writeFileSync(stamp,JSON.stringify(expected,null,2)+'\n');
}

export function ensurePrismaClient(){
  const expected=expectedGeneration();
  let recorded;
  try{recorded=JSON.parse(fs.readFileSync(stamp,'utf8'));}
  catch(error){if(error.code!=='ENOENT'&&!(error instanceof SyntaxError))throw error;}
  if(recorded?.fingerprint!==expected.fingerprint||!expected.files.every(file=>fs.existsSync(path.join(output,file))))generatePrismaClient();
}
