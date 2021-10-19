import { compact, trim } from 'lodash';
import { VFile } from 'vfile';
import { reporter } from 'vfile-reporter';
import { TextNode, Sentence, Paragraph, Word } from 'nlcst-types';
import { fromMarkdown } from 'mdast-util-from-markdown';
import u from 'unist-builder';
import { NoOutlineInTemplateError, NoBigTitleInTemplateError, NoTitleContentError } from './errors';

/**
 * 模板资源的树状结构
 * ```json
 * {
 *    "做得好的": {
 *      "项目·起": [["在项目发展早期"], ["3333"]]
 *    }
 * }
 * ```
 */
export type ITemplateResource = Record<string, Paragraph | ITemplateResourceValue>;
interface ITemplateResourceValue extends ITemplateResource {}

export interface ITemplateData {
  outline: string[];
  resources: ITemplateResource;
  title: string;
}

/**
 * 通过认真领会精神，把一个包含学习资料的字符串变为 UNIST（此处为 NLCST）节点，并保留待填入具体内容的槽，成为一个模板 CST
 * @param
 * @param templateFilePath debug用的模板文件地址，在模板有语法错误时提供定位信息，可以编造一个文件地址
 *
 * // TODO: Word 节点按定义应该是词级别，但是因为我们将大段模板文本看做整体（模因位点），故本次直接在 Word 里面带上含有大段文本的 Text，把 Word 当 Phrase 来看待。未来应该完全使用带词性标注的词级节点，并在使用侧增加利用方法
 */
export function templateStringToNLCSTNodes(templateFile: VFile): [ITemplateData, VFile] {
  // 我们使用的 Markdown 的标题结构是标准 Markdown 的子集，因此可以用 UNIST 社区提供的 MDAST 工具提取出所有信息
  const mdastInstance = fromMarkdown(templateFile.value);
  // 先进行一些预发检测
  if (mdastInstance.children[0]?.type !== 'heading' || mdastInstance.children[0]?.depth !== 1) {
    templateFile.message(new NoBigTitleInTemplateError(), { line: 0, column: 0 });
  }
  // 用状态机和栈把它搞成树
  /** 保存之前经过的标题 */
  const titleStack = [];
  /** 我们从模板中提取出的所有信息 */
  const templateData: ITemplateData = {
    outline: [],
    resources: {},
    title: templateFile.basename ?? '',
  };

  for (let mdNodeIndex = 0; mdNodeIndex < mdastInstance.children.length; mdNodeIndex += 1) {
    const currentMDASTNode = mdastInstance.children[mdNodeIndex];
    switch (currentMDASTNode.type) {
      case 'heading': {
        // 首先标题得有内容，言之有物
        let titleTextValue = '';
        const titleTextNode = currentMDASTNode.children[0];
        if (titleTextNode?.type === 'text' && titleTextNode.value.length > 0) {
          titleTextValue = titleTextNode.value;
        } else {
          templateFile.message(new NoTitleContentError(), currentMDASTNode.position);
        }
        // 处理大标题
        if (currentMDASTNode.depth === 1) {
          if (typeof titleTextValue === 'string' && titleTextValue.length > 0) {
            templateData.title = titleTextValue;
          }
          // 大标题的下一个节点即是大纲节点
          const nextOutlineNode = mdastInstance.children[mdNodeIndex + 1];
          if (nextOutlineNode.type === 'paragraph') {
            /**
             * ```json
             * children: [
                {
                  type: 'text',
                  value: '做得好的：项目·起\n做得好的：项目·承\n做得好的：项目·转\n做得好的：项目·合',
                  position: [Object]
                }
              ]
              ```
             */
            const outlineTextNode = nextOutlineNode.children[0];
            if (outlineTextNode?.type === 'text') {
              templateData.outline = outlineTextNode.value.split('\n');
              break;
            }
          }
          templateFile.message(new NoOutlineInTemplateError(), nextOutlineNode.position);
          break;
        } else {
          // 仅对于二级以上标题建栈，因为二级以上标题才算是开始构建模板内容树
          titleStack.push(titleTextValue);
        }
      }
    }
  }

  // 取出字符串内容，并去掉空行和空白
  // const unistWordNodes: Word[] = lines.map((line) => {
  //   // 把模板变成 UNIST 节点
  //   const leafTemplateFragmentNodes = line.split(/({{正面工作}}|{{负面工作}})/g).map((value) => ({
  //     type: 'TextNode',
  //     value,
  //     // 如果是{{正面工作}}这样的节点，则标注为待填的槽（slot 是我们自定义的元信息），等待之后替换为具体内容
  //     slot: value === '{{正面工作}}' || value === '{{负面工作}}' ? value : undefined,
  //   }));
  //   return { type: 'WordNode', children: leafTemplateFragmentNodes };
  // });
  // const sentenceUnistNode = u('SentenceNode', { children: unistWordNodes });
  return [templateData, templateFile];
}
