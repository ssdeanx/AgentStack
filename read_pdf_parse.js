import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

try {
  const pkgPath = join(process.cwd(), 'node_modules', 'pdf-parse', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  console.log('Main:', pkg.main);

  const mainPath = join(process.cwd(), 'node_modules', 'pdf-parse', pkg.main);
  console.log('Main Path:', mainPath);

  // Try to find type definition
  // It might be in index.d.ts or similar
  const typesPath = pkg.types ?? pkg.typings;
  if (typesPath) {
      console.log('Types Path:', typesPath);
      console.log('Types Content:');
      console.log(readFileSync(join(process.cwd(), 'node_modules', 'pdf-parse', typesPath), 'utf8').slice(0, 500));
  } else {
      console.log('No types field in package.json');
      // Check if index.d.ts exists next to main
      const dtsPath = mainPath.replace(/\.js$/, '.d.ts');
      if (existsSync(dtsPath)) {
          console.log('Found d.ts:', dtsPath);
          console.log(readFileSync(dtsPath, 'utf8').slice(0, 500));
      } else {
          // Check @types/pdf-parse?
          console.log('Checking for @types/pdf-parse...');
          const typesPkgPath = join(process.cwd(), 'node_modules', '@types', 'pdf-parse', 'index.d.ts');
          if (existsSync(typesPkgPath)) {
               console.log('Found @types:', typesPkgPath);
               console.log(readFileSync(typesPkgPath, 'utf8'));
          }
      }
  }
} catch (e) { /* empty */ }
