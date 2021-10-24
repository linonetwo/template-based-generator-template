/* eslint-disable @typescript-eslint/no-unsafe-call */
import preval from 'preval.macro';
// import { SetReturnType } from 'type-fest';

const importedFiles = preval`
const fs = require('fs');
const path = require('path');
const filesInTemplateFolder = fs.readdirSync(path.resolve(__dirname, 'templates'));
const results = {};
for (const fileName of filesInTemplateFolder) {
  results[fileName.split('.')[0]] = fs.readFileSync(path.resolve(__dirname, 'templates', fileName), 'utf8');
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
