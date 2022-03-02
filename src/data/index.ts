/* eslint-disable @typescript-eslint/no-unsafe-call */
import preval from 'preval.macro';
// import { SetReturnType } from 'type-fest';

const importedFiles = preval`
const fs = require('fs');
const path = require('path');
const filesInTemplateFolder = fs.readdirSync(path.resolve(__dirname, 'templates'));
console.log('filesInTemplateFolder', filesInTemplateFolder);
const results = {};
for (const fileName of filesInTemplateFolder) {
  const filePath = path.resolve(__dirname, 'templates', fileName);
  console.log('loading file', filePath);
  try {
    results[fileName.split('.')[0]] = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    // readme.md found failed in the CI
    // Fix: [!] (plugin babel) Error: /home/runner/work/template-based-generator-template/template-based-generator-template/src/data/index.ts: preval.macro: ENOENT: no such file or directory, open '/home/runner/work/template-based-generator-template/template-based-generator-template/src/data/templates/README.md' Learn more: https://www.npmjs.com/package/preval.macro
    if (fileName.toLowerCase() === 'readme.md') {
      const fixedReadmePath = path.resolve(__dirname, '..', '..', fileName);
      results[fileName.split('.')[0]] = fs.readFileSync(fixedReadmePath, 'utf8');
    }
  }
}
module.exports = results` as Record<string, string>;

// const _ = _ as SetReturnType<typeof _, string>;

/**
 * 在下面的代码里注册模板，方便在生成器里使用
 */
export const templates = {
  空白: '',
  ...importedFiles,
};
