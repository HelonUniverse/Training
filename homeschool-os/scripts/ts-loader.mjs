// Minimal TypeScript loader: these modules are type-annotated JS with no
// emit-affecting features, so stripping types is enough and avoids adding a
// build step to a script that exists to read one file.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
export async function load(url, context, nextLoad) {
  if (!url.endsWith('.ts')) return nextLoad(url, context);
  const source = readFileSync(fileURLToPath(url), 'utf8');
  const out = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: fileURLToPath(url),
  });
  return { format: 'module', shortCircuit: true, source: out.outputText };
}
export async function resolve(specifier, context, nextResolve) {
  try { return await nextResolve(specifier, context); }
  catch (e) {
    if (context.parentURL && /\.ts$/.test(context.parentURL) && specifier.startsWith('.')) {
      return nextResolve(specifier + '.ts', context);
    }
    throw e;
  }
}
