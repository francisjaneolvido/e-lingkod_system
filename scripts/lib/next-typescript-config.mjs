import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';

// Next adds exact distDir type globs. A separate root-relative config keeps
// isolated verification output from changing the tracked editor configuration.
export function isolatedTypeScriptConfig(projectDir,distDir) {
  if(distDir==='.next')return 'tsconfig.json';
  const ts=createRequire(import.meta.url)('typescript');
  const root=path.resolve(projectDir);
  const input=ts.readConfigFile(path.join(root,'tsconfig.json'),ts.sys.readFile);
  if(input.error)throw new Error('Cannot read the tracked TypeScript configuration.');
  const baseline=ts.parseJsonConfigFileContent(input.config,ts.sys,root);
  if(baseline.errors.some(error=>error.code!==18003))throw new Error('Cannot resolve the tracked TypeScript configuration.');
  const key=createHash('sha256').update(distDir).digest('hex').slice(0,16);
  const name='.tsconfig.next-'+key+'.json';
  // Resolve source selection with the root exclusions first. Include only the
  // selected build's generated types afterward; a broad .scratch exclusion
  // would silently remove them, while broad source globs would admit evidence.
  const files=baseline.fileNames.map(file=>path.relative(root,file).split(path.sep).join('/'))
    .filter(file=>!file.startsWith('.next/'));
  const config={extends:'./tsconfig.json',files,
    include:[distDir+'/types/**/*.ts',distDir+'/dev/types/**/*.ts'],exclude:['node_modules'],
    compilerOptions:{tsBuildInfoFile:path.resolve(root,distDir,'tsconfig.tsbuildinfo')}};
  const text=JSON.stringify(config,null,2)+'\n';
  const target=path.join(root,name);
  if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==text)fs.writeFileSync(target,text);
  return name;
}
