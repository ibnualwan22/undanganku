import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root=resolve(import.meta.dirname,'..');
for(const folder of ['src','server','scripts','api'])for(const file of readdirSync(resolve(root,folder))){
  if(!/\.(m?js)$/.test(file))continue;
  const result=spawnSync(process.execPath,['--check',resolve(root,folder,file)],{stdio:'inherit'});
  if(result.status!==0)process.exit(result.status||1);
}
console.log('Sintaks frontend, backend, dan skrip valid.');
