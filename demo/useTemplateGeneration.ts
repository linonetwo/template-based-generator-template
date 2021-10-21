import { useState, useEffect } from 'react';
import { useDebouncedFn } from 'beautiful-react-hooks';
import { VFile } from 'vfile';
import { reporter } from 'vfile-reporter';
import { IConfiguration, randomOutlineToArrayCompiler, templateFileToNLCSTNodes } from '../src';

export function useTemplateGeneration(config: IConfiguration) {
  const [template, templateSetter] = useState('');
  const [result, resultSetter] = useState<string[]>([]);
  const [errorMessage, errorMessageSetter] = useState('');
  const parseAndGenerateFromTemplate = useDebouncedFn((templateStringToParse: string): void => {
    const vFile = new VFile({ path: 'input.md', value: templateStringToParse });
    let newErrorMessage = '';
    try {
      const templateData = templateFileToNLCSTNodes(vFile);
      const newResult = randomOutlineToArrayCompiler(templateData, config);
      resultSetter(newResult);
    } catch (e) {
      newErrorMessage += (e as Error).message;
    }
    newErrorMessage += reporter(vFile);
    errorMessageSetter(newErrorMessage);
  }, 500);
  useEffect(() => {
    parseAndGenerateFromTemplate(template);
  }, [template]);

  return [template, templateSetter, result, errorMessage] as const;
}