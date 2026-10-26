import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('theme styles contain no cyclic custom-property self reference',()=>{
 for(const file of ['src/app/globals.css','src/styles/design-system.css','src/features/civic/civic.module.css','src/features/jobs/components/jobs-workspace.css']){
  assert.doesNotMatch(fs.readFileSync(file,'utf8'),/(--[\w-]+)\s*:\s*var\(\1\)/,'Invalid self-reference in '+file);
 }
});
test('opaque legacy control surfaces use theme-aware colors',()=>{
 for(const file of ['src/components/admin/admin-ui.css','src/features/civic/civic.module.css','src/features/jobs/components/jobs-workspace.css'])assert.doesNotMatch(fs.readFileSync(file,'utf8'),/background(?:-color)?\s*:\s*(?:white\b|rgba\(255,\s*255,\s*255,\s*\.9)/,'Unadapted control surface in '+file);
});
