import fs from 'node:fs';
import {loadConfig} from './demo/config.mjs';
import {writePrivateBrowserJourney} from './lib/browser-journey.mjs';

const option=name=>process.argv.find(argument=>argument.startsWith('--'+name+'='))?.slice(name.length+3);
const journey=option('journey'),output=option('output');
const templates={demo:'tests/demo-browser.js',existing:'tests/hackathon-journeys.js'};
if(!templates[journey]||!output)throw Error('Supply --journey=demo|existing and --output=an-absolute-private-file outside the repository.');
const accountsFile=option('accounts-file')||loadConfig().accountsFile;
const result=writePrivateBrowserJourney({source:fs.readFileSync(templates[journey],'utf8'),accountsFile,output});
console.log(JSON.stringify({preparedPrivateJourney:true,accounts:result.accounts,credentialsPrinted:false,warning:'The generated file contains private credentials. Keep it outside Git and review packages.'}));
