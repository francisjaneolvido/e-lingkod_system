import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {compile} from '@tailwindcss/node';
import {Scanner} from '@tailwindcss/oxide';

test('Tailwind scans application source instead of build outputs and maintenance evidence',async()=>{
  const stylesheet=path.resolve('src/app/globals.css');
  const compiler=await compile(fs.readFileSync(stylesheet,'utf8'),{base:path.dirname(stylesheet),onDependency(){}});
  assert.ok(compiler.root&&compiler.root!=='none');
  assert.equal(path.resolve(compiler.root.base,compiler.root.pattern),path.resolve('src'));
  const scanner=new Scanner({sources:[{base:path.resolve(compiler.root.base,compiler.root.pattern),pattern:'**/*',negated:false},...compiler.sources]});
  const candidates=scanner.scan();
  assert.ok(scanner.files.length>100);
  assert.ok(scanner.files.every(file=>path.relative(path.resolve('src'),file).split(path.sep)[0]!=='..'));
  assert.ok(candidates.includes('inline-flex'));
  assert.ok(compiler.build(candidates).includes('.inline-flex'));
});
