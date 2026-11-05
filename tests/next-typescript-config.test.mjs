import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {isolatedTypeScriptConfig} from '../scripts/lib/next-typescript-config.mjs';
const require=createRequire(import.meta.url);
const {writeConfigurationDefaults}=require('next/dist/lib/typescript/writeConfigurationDefaults.js');

test('isolated Next type configuration preserves the tracked config and strict options',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'elb-next-ts-'));
  try{
    const original=fs.readFileSync('tsconfig.json');fs.writeFileSync(path.join(root,'tsconfig.json'),original);
    for(const dir of ['src','.scratch/other','.scratch/test-next/types'])fs.mkdirSync(path.join(root,dir),{recursive:true});
    fs.writeFileSync(path.join(root,'src/example.ts'),'export const valid: number = 1;');
    fs.writeFileSync(path.join(root,'.scratch/other/private.ts'),'export const unwanted: number = "private evidence";');
    const validator=path.join(root,'.scratch/test-next/types/validator.ts');
    fs.writeFileSync(validator,'export const invalid: number = "generated validator sentinel";');
    const selected=isolatedTypeScriptConfig(root,'.scratch/test-next');
    await writeConfigurationDefaults(ts.version,path.join(root,selected),false,true,'.scratch/test-next',false,false);
    assert.deepEqual(fs.readFileSync(path.join(root,'tsconfig.json')),original,'Next must not rewrite the tracked root configuration');
    const config=ts.readConfigFile(path.join(root,selected),ts.sys.readFile);
    const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,root);
    assert.equal(parsed.options.strict,true);
    assert.deepEqual(parsed.options.paths,{'@/*':['./src/*']});
    assert.ok(parsed.fileNames.some(file=>path.resolve(file)===path.resolve(validator)),'isolated generated validators must participate in type checking');
    assert.ok(!parsed.fileNames.some(file=>path.resolve(file)===path.join(root,'.scratch/other/private.ts')),'other private evidence stays excluded');
    const diagnostics=ts.getPreEmitDiagnostics(ts.createProgram(parsed.fileNames,parsed.options));
    assert.ok(diagnostics.some(item=>item.file&&path.resolve(item.file.fileName)===path.resolve(validator)&&item.code===2322),'a real generated-validator type error must be detected');
    assert.ok(config.config.include.includes('.scratch/test-next/types/**/*.ts'));
    assert.ok(config.config.include.includes('.scratch/test-next/dev/types/**/*.ts'));
    assert.equal(isolatedTypeScriptConfig(root,'.next'),'tsconfig.json');
  }finally{
    assert.ok(path.resolve(root).startsWith(path.join(os.tmpdir(),'elb-next-ts-')));
    fs.rmSync(root,{recursive:true,force:true});
  }
});
