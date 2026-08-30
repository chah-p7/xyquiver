import { copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const outputDirectory = path.join(projectRoot, 'dist-pages');

await Promise.all([
  copyFile(
    path.join(outputDirectory, 'index.html'),
    path.join(outputDirectory, '404.html'),
  ),
  writeFile(path.join(outputDirectory, '.nojekyll'), ''),
]);
