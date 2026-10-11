const fs=require('node:fs');
const root=__dirname;
const source=['engine.ts','fonts-data.ts','controller.ts'].map(f=>fs.readFileSync(root+'/'+f,'utf8')).join('\n').replaceAll('__SCAFFOLD_RELAUNCH__','open');
fs.writeFileSync(root+'/code.ts',source);
const ts=require('typescript');
fs.writeFileSync(root+'/code.js',ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.None}}).outputText);
