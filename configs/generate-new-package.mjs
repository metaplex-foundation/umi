/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-console */
import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templateFolder = __dirname + '/new-package-template';
const packageName = process.argv[2];
const isPlugin = process.argv[3] && (process.argv[3] === '--plugin' || process.argv[3] === '-p');

if (!packageName) {
  error('Please provide a package name as an argument.');
}

const packageFolder = __dirname + `/../${isPlugin ? 'plugins' : 'packages' }/` + packageName;

fs.mkdirSync(packageFolder);
generateFilesRecursively(templateFolder, packageFolder);
success(`Package "${packageName}" generated successfully.`);

function generateFilesRecursively(
  templateFolder,
  packageFolder,
  currentPath = ''
) {
  const dirents = fs.readdirSync(templateFolder + currentPath, {
    withFileTypes: true,
  });

  dirents.forEach((dirent) => {
    const newPath = currentPath + '/' + dirent.name;
    const newPathWithoutStubExtension = newPath.replace(/\.stub$/, '');

    if (dirent.isDirectory()) {
      fs.mkdirSync(packageFolder + newPath);
      generateFilesRecursively(templateFolder, packageFolder, newPath);
    } else {
      let stub = fs.readFileSync(templateFolder + newPath, 'utf8');
      stub = stub.replace(/{{package-name}}/g, packageName);
      fs.writeFileSync(
        packageFolder + newPathWithoutStubExtension,
        stub,
        'utf8'
      );
    }
  });
}

function error(message) {
  console.error(chalk.bold.red(message));
  process.exit(1);
}

function success(message) {
  console.log(chalk.bold.green(message));
  process.exit(0);
}
