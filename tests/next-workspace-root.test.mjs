import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {registerHooks} from 'node:module';
import {loadServerTypescript} from './helpers/load-typescript.mjs';

test('Next uses the application directory as its explicit Turbopack root',async()=>{const compatibility=registerHooks({resolve(specifier,context,next){return next(specifier==='next/constants'?'next/constants.js':specifier,context);}});const hook=loadServerTypescript();try{const {default:configure}=await import('../next.config.ts');const result=await configure('phase-production-server');assert.equal(result.turbopack.root,process.cwd(),'A nested installation must not infer and borrow a parent workspace');assert.equal(path.isAbsolute(result.turbopack.root),true);}finally{hook.deregister();compatibility.deregister();}});
