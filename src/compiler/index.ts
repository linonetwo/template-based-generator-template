import { u } from 'unist-builder';
import { cloneDeep, compact, get, random, sample } from 'lodash';
import { Paragraph, Sentence, TextNode, Word } from 'nlcst-types';
import { visit } from 'unist-util-visit';
import { Root, Content, toString } from 'nlcst-to-string';
import { ITemplateData } from 'src/parser';
import { EmptyTemplateTextError, NoResourceForOutlineError, NoValueForSlotError } from './errors';
import type { JSONSchema7 } from 'json-schema';

export interface IConfiguration {
  sub?: Record<string, string>;
}
export const emptyConfigurationString = '{ "sub": {} }';

/**
 * 从模板里定义的多个大纲里随机抽取一个出来用
 */
export function getRandomOutline(outlines: ITemplateData['outlines'] | undefined): string[] {
  return sample((outlines ?? []).filter((outline) => outline.length > 0)) ?? [];
}

/**
 * 将解析出的模板结构化数据转换为 NLCST Root 节点
 * Paragraph > Sentence > Word > Text
 *
 * Paragraph：大纲每行生成的结果；
 * Sentence：模板库里的内容单位，每个对应模板里一个自然段
 * Word-Text：具体的模板内容，每个对应模板里一行
 */
export function getRandomArticle(template: ITemplateData, config: IConfiguration): Root {
  const paragraphs = getRandomOutline(template.outlines).map((outlineLine) => {
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
  return article;
}

/**
 * 收集模板数据中的槽位信息
 */
export function collectSlots(template: ITemplateData): string[] {
  const slots = new Set<string>();
  template.outlines?.forEach((outline) =>
    outline.forEach((outlineLine) => {
      // 根据大纲获取随机素材
      const dataPath = outlineLine.split('：').join('.');
      const paragraph = get(template.resources, dataPath);
      // 把具体内容填入槽中
      if (paragraph !== undefined && paragraph.type === 'ParagraphNode') {
        visit(paragraph as Paragraph, 'TextNode', (textNode: TextNode) => {
          // 看看是否需要替换槽位
          if (typeof textNode.slot === 'string') {
            slots.add(textNode.slot);
          }
        });
      }
    }),
  );
  return [...slots.keys()];
}

/**
 * 为 UI 制作待填参数表单
 */
export function getConfigSchemaFromTemplate(templateData: ITemplateData): JSONSchema7 {
  const slots = collectSlots(templateData);
  const configSchemaBase: JSONSchema7 = {
    title: '模板参数',
    description: '生成流程所需的参数',
    type: 'object',
    required: [],
    properties: {
      sub: {
        title: '模板槽位',
        description: '填入{{槽位}}中的内容',
        type: 'object',
        required: [],
        properties: {},
      },
    },
  };
  for (const slot of slots) {
    (configSchemaBase.properties!.sub as JSONSchema7).properties![slot] = {
      type: 'string',
      title: slot,
    };
  }
  return configSchemaBase;
}

/**
 * 替换 NLCST Root 节点中的所有 Text 节点中的模板槽位
 */
export function replaceSlotValues(article: Root, config: IConfiguration): void {
  // 把具体内容填入槽中
  visit(article, 'TextNode', (textNode: TextNode) => {
    // 看看是否需要替换槽位
    if (typeof textNode.slot === 'string') {
      const actuarialValueForSlot = config.sub?.[textNode.slot];
      if (actuarialValueForSlot === undefined) {
        throw new NoValueForSlotError(textNode.slot);
      }
      textNode.value = actuarialValueForSlot;
      delete textNode.slot;
    }
  });
}

/**
 * 提取 NLCST Root 节点中的所有 Text 节点中的元信息，放到其上级 Word 中
 */
export function extractMetadataValues(article: Root, config: IConfiguration): void {
  // 把元信息移除
  visit(article, 'WordNode', (wordNode: Word) => {
    if (Array.isArray(wordNode.children)) {
      wordNode.children.forEach((textNode) => {
        if (Array.isArray(textNode.metadata)) {
          // 如果不慎存在多个元信息语法，则最后一个会覆盖之前的
          wordNode.data = { ...wordNode.data, metadata: textNode.metadata };
        }
      });
    }
  });
}
/**
 * 删除 NLCST Root 节点中的所有 Text 节点中的元信息
 */
export function removeMetadataValues(article: Root, config: IConfiguration): void {
  // 把元信息移除
  visit(article, 'TextNode', (textNode: TextNode) => {
    if (Array.isArray(textNode.metadata)) {
      textNode.value = '';
      delete textNode.metadata;
    }
  });
}

/**
 * 将结构化的模板数据变成字符串
 */
export function randomOutlineToStringCompiler(template: ITemplateData, config: IConfiguration): string {
  const article = getRandomArticle(template, config);
  replaceSlotValues(article, config);
  removeMetadataValues(article, config);
  // 成文
  return toString(article);
}

/**
 * 将结构化的模板数据变成根据 Word 拆分的字符串的数组，也就是模板里的一行对应数组里的一个字符串
 */
export function randomOutlineToArrayCompiler(template: ITemplateData, config: IConfiguration): string[] {
  const article = getRandomArticle(template, config);
  replaceSlotValues(article, config);
  removeMetadataValues(article, config);
  // 获取 Word 列表
  const words = article.children.flatMap((paragraph) => (paragraph as Paragraph).children.flatMap((sentence) => (sentence as Sentence).children)) as Content[];
  return words.map((word) => toString(word));
}

export interface IOutputWIthMetadata<T extends unknown[]> {
  metadata: T | undefined;
  value: string;
}
/**
 * 将结构化的模板数据变成根据 Word 拆分的字符串的数组，也就是模板里的一行对应数组里的一个字符串，而且带上元信息
 */
export function randomOutlineToArrayWithMetadataCompiler<T extends unknown[]>(template: ITemplateData, config: IConfiguration): Array<IOutputWIthMetadata<T>> {
  const article = getRandomArticle(template, config);
  replaceSlotValues(article, config);
  extractMetadataValues(article, config);
  removeMetadataValues(article, config);
  // 获取 Word 列表
  const wordsWithMetadata = article.children.flatMap((paragraph) =>
    (paragraph as Paragraph).children.flatMap((sentence) =>
      (sentence as Sentence).children.map((word) => {
        return [word, word?.data?.metadata as T | undefined];
      }),
    ),
  ) as Array<[Content, T]>;
  return wordsWithMetadata.map((wordWithMetadata) => ({ value: toString(wordWithMetadata[0]), metadata: wordWithMetadata[1] }));
}
