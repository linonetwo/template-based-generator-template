import { u } from 'unist-builder';
import { cloneDeep, get, random } from 'lodash';
import { Paragraph, Sentence, TextNode, Word } from 'nlcst-types';
import { visit } from 'unist-util-visit';
import { Root, toString } from 'nlcst-to-string';
import { ITemplateData } from 'src/parser';
import { EmptyTemplateTextError, NoResourceForOutlineError, NoValueForSlotError } from './errors';

export interface IConfiguration {
  substitutions?: Record<string, string>;
}

/**
 * Paragraph > Sentence > Word > Text
 *
 * Paragraph：大纲每行生成的结果；
 * Sentence：模板库里的内容单位，每个对应模板里一个自然段
 * Word-Text：具体的模板内容，每个对应模板里一行
 */
export function randomOutlineCompiler(template: ITemplateData, config: IConfiguration): string {
  const paragraphs = template.outline.map((outlineLine) => {
    // 根据大纲获取随机素材
    const dataPath = outlineLine.split('：').join('.');
    const paragraph = get(template.resources, dataPath);
    if (paragraph?.type !== 'ParagraphNode') {
      throw new NoResourceForOutlineError(outlineLine);
    }
    // 开始随机化素材内容
    const randomizedParagraph = u('ParagraphNode', { children: [] as Sentence[] });
    randomizedParagraph.children = (paragraph as Paragraph).children.map((sentence) => {
      if (sentence?.type !== 'SentenceNode' || (sentence as Sentence).children.length === 0) {
        throw new EmptyTemplateTextError(outlineLine);
      }
      // 随机挑选自然段里的某一行内容，即 Sentence 里的一个 Word，并对树做转换，
      const originalSentence = sentence as Sentence;
      const randomizedSentence = u('SentenceNode', { children: [] as Word[] });
      const randomWordIndex = random(originalSentence.children.length - 1);
      // 执行模板替换，需要先 cloneDeep 原先的叶子节点，不然模板内容替换操作会影响原有模板
      const randomWord = cloneDeep(originalSentence.children[randomWordIndex]) as Word;
      randomizedSentence.children.push(randomWord);
      return randomizedSentence;
    });
    return randomizedParagraph;
  });

  const article = u('RootNode', { children: paragraphs }) as Root;
  // 把具体内容填入槽中
  visit(article, 'TextNode', (textNode: TextNode) => {
    // 看看是否需要替换槽位
    if (typeof textNode.slot === 'string') {
      const actuarialValueForSlot = config.substitutions?.[textNode.slot];
      if (actuarialValueForSlot === undefined) {
        throw new NoValueForSlotError(textNode.slot);
      }
      textNode.value = actuarialValueForSlot;
      delete textNode.slot;
    }
  });

  // 成文
  return toString(article);
}
