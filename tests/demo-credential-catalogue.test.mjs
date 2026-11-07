import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {readCatalogue, fixturePassword, requireDemoCredentials} from '../demo/fixtures/credentials.mjs';

test('demo credentials require a private catalogue and preserve CSV quoted values without logging them',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'elb-catalogue-'));const file=path.join(dir,'accounts.csv'),password=randomBytes(20).toString('base64')+',"x';
 try{fs.writeFileSync(file,'email,password,role\r\nuser@example.test,"'+password.replaceAll('"','""')+'",CITIZEN\r\n');const rows=readCatalogue(file);assert.equal(rows.get('user@example.test').password,password);assert.equal(fixturePassword('user@example.test',{DEMO_ACCOUNTS_FILE:file}),password);assert.equal(fixturePassword('user@example.test',{}),undefined);assert.throws(()=>requireDemoCredentials([{email:'user@example.test',role:'CITIZEN'}],{}),/DEMO_ACCOUNTS_FILE/);assert.throws(()=>fixturePassword('missing@example.test',{DEMO_ACCOUNTS_FILE:file}),/missing/i);}finally{fs.rmSync(dir,{recursive:true});}
});
test('catalogue rejects duplicate identities, missing columns, malformed CSV and mismatched roles',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'elb-catalogue-')),file=path.join(dir,'accounts.csv');try{
 for(const text of ['email,role\nx@example.test,CITIZEN\n','email,password\nx@example.test,a\nx@example.test,b\n','email,password\nx@example.test,"unterminated']){fs.writeFileSync(file,text);assert.throws(()=>readCatalogue(file));}
 fs.writeFileSync(file,'email,password,role\nx@example.test,"'+randomBytes(20).toString('hex')+'",ADMIN\n');assert.throws(()=>requireDemoCredentials([{email:'x@example.test',role:'STAFF'}],{DEMO_ACCOUNTS_FILE:file}),/role/i);
 }finally{fs.rmSync(dir,{recursive:true});}
});
