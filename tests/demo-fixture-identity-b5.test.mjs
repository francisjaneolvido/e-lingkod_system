import test from 'node:test';
import assert from 'node:assert/strict';
import {digest} from '../scripts/demo/database.mjs';
import {fixtureIdentity} from '../scripts/demo/fixture-identity.mjs';
test('B5 demo fixture identity accepts only proven LF/CRLF transport, never changed definitions',()=>{
 const old=[['a.mjs',Buffer.from('one\ntwo\n')],['b.csv',Buffer.from('a,b\r\n1,2\r\n')]];
 const current=[['a.mjs',Buffer.from('one\r\ntwo\r\n')],['b.csv',Buffer.from('a,b\n1,2\n')]];
 assert.equal(fixtureIdentity(current,digest(old)).proven,true);
 assert.equal(fixtureIdentity(current,digest(old.map(([n,b])=>[n,b.toString('utf8')])),'strings').proven,true);
 assert.equal(fixtureIdentity(current,digest(old)).canonical,fixtureIdentity(old).canonical);
 assert.equal(fixtureIdentity([['a.mjs',Buffer.from('manually changed')],current[1]],digest(old)).proven,false);
 assert.equal(fixtureIdentity([...current,['extra.json',Buffer.from('{}')]],digest(old)).proven,false);
});
