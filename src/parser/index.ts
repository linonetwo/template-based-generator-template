import { get, set } from 'lodash';
import { VFile } from 'vfile';
import { TextNode, Sentence, Paragraph, Word } from 'nlcst-types';
import { fromMarkdown } from 'mdast-util-from-markdown';
import type { Content } from 'mdast-util-from-markdown/lib';
import { u } from 'unist-builder';
import { NoOutlineInTemplateError, NoBigTitleInTemplateError, NoTitleContentError, BadTextBetweenTitleError, NoTextBetweenTitleError } from './errors';

/**
 * 模板资源的树状结构
 * ```json
 * {
 *    "做得好的": {
 *      "项目·起": Paragraph<Sentence[]> // [["在项目发展早期", "{{xxx}}"], ["3333"]]
 *    }
 * }
 * ```
 */
export type ITemplateResource = Record<string, Paragraph | undefined | ITemplateResourceValue>;
interface ITemplateResourceValue extends ITemplateResource {}

export interface ITemplateData {
  /**
   * 使用模板内容的大纲，每一行相当于对指定标题的引用。可以有多个大纲，生成时将随机抽取一个大纲来生成，然后从引用的标题里随机抽取文本。
   */
  outlines?: string[][];
  resources: ITemplateResource;
  title: string;
}

/**
 * 通过认真领会精神，把一个包含学习资料的字符串变为 UNIST（此处为 NLCST）节点，并保留待填入具体内容的槽，成为一个模板 CST
 * @param templateFile 将会在里面加入一些报错信息，可以通过 vfile-reporter 读取
 *
 * // TODO: Word 节点按定义应该是词级别，但是因为我们将大段模板文本看做整体（模因位点），故本次直接在 Word 里面带上含有大段文本的 Text，把 Word 当 Phrase 来看待。未来应该完全使用带词性标注的词级节点，并在使用侧增加利用方法
 */
export function templateFileToNLCSTNodes(templateFile: VFile): ITemplateData {
  // 我们使用的 Markdown 的标题结构是标准 Markdown 的子集，因此可以用 UNIST 社区提供的 MDAST 工具提取出所有信息
  const mdastInstance = fromMarkdown(templateFile.value);
  // 先进行一些预发检测
  if (mdastInstance.children[0]?.type !== 'heading' || mdastInstance.children[0]?.depth !== 1) {
    templateFile.message(new NoBigTitleInTemplateError(), { line: 0, column: 0 });
  }
  // 用状态机和栈把它搞成树
  /** 保存之前经过的标题 */
  const titleStack = [];
  let currentHeadingDepth = 0;
  /** 我们从模板中提取出的所有信息 */
  const templateData: ITemplateData = {
    outlines: [],
    resources: {},
    title: templateFile.basename ?? '',
  };

  for (let mdNodeIndex = 0; mdNodeIndex < mdastInstance.children.length; mdNodeIndex += 1) {
    const currentMDASTNode = mdastInstance.children[mdNodeIndex];
    const nextMDASTNode = mdastInstance.children[mdNodeIndex + 1] as Content | undefined;
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
        currentHeadingDepth = currentMDASTNode.depth;
        // 处理大标题
        if (currentMDASTNode.depth === 1) {
          if (typeof titleTextValue === 'string' && titleTextValue.length > 0) {
            templateData.title = titleTextValue;
          }
          // 大标题的下几个段落节点即是大纲节点
          let foundOutlineNode = false;
          for (let outlineNodeDetectorIndex = mdNodeIndex + 1; outlineNodeDetectorIndex < mdastInstance.children.length; outlineNodeDetectorIndex += 1) {
            const nextOutlineNode = mdastInstance.children[outlineNodeDetectorIndex];
            if (nextOutlineNode?.type === 'paragraph') {
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
                foundOutlineNode = true;
                // 移动当前指针，这样解析完标题节点之后，我们的指针就跳过了大纲区域
                mdNodeIndex += 1;
                if (templateData.outlines === undefined) {
                  templateData.outlines = [];
                }
                const outlineLines = outlineTextNode.value
                  .split('\n')
                  // 去掉被注释掉的大纲节点
                  .filter((line) => !line.startsWith('//'));
                templateData.outlines.push(outlineLines);
              }
            } else {
              // 遇到下一个标题时，跳出。此处默认我们要不就是 Heading 要不就是 Paragraph
              break;
            }
          }
          if (!foundOutlineNode) {
            templateFile.message(new NoOutlineInTemplateError(), nextMDASTNode?.position ?? currentMDASTNode.position);
          }
          break;
        } else {
          // 仅对于二级以上标题建栈，因为二级以上标题才算是开始构建模板内容树
          titleStack.push(titleTextValue);
          // 判断一下现在是不是根节点了，根节点意味着后面没有更深层次的标题了
          let rootNodeDetectorPassingText = false;
          for (let rootNodeDetectorIndex = mdNodeIndex; rootNodeDetectorIndex < mdastInstance.children.length; rootNodeDetectorIndex += 1) {
            const rootNodeDetectorCurrentMDASTNode = mdastInstance.children[rootNodeDetectorIndex];
            // 只会有两种情况：文本或标题，如果是标题则判断一下，文本就都正常，不过要注意检测一下没有两个不同级标题先高后低夹着文本的情况，这个是不允许的
            if (rootNodeDetectorCurrentMDASTNode.type === 'text') {
              rootNodeDetectorPassingText = true;
            } else if (rootNodeDetectorCurrentMDASTNode.type === 'heading') {
              // 找到了同级节点或上级节点，说明本节点正常结束了，结束检测
              if (rootNodeDetectorPassingText && rootNodeDetectorCurrentMDASTNode.depth === currentMDASTNode.depth) {
                templateFile.message(new NoTextBetweenTitleError(), rootNodeDetectorCurrentMDASTNode.position);
              }
              if (rootNodeDetectorCurrentMDASTNode.depth >= currentMDASTNode.depth) {
                break;
              }
              // 标题先高后低夹着文本，直接报错
              if (rootNodeDetectorPassingText && rootNodeDetectorCurrentMDASTNode.depth < currentMDASTNode.depth) {
                templateFile.fail(new BadTextBetweenTitleError(), rootNodeDetectorCurrentMDASTNode.position);
              }
            } else {
              // 带上了其他奇奇怪怪的 Markdown 语法，报个错
              templateFile.fail(new BadTextBetweenTitleError(), rootNodeDetectorCurrentMDASTNode.position);
            }
          }
          break;
        }
      }
      case 'paragraph': {
        // 到达了根节点，准备往资源库里塞数据，构建一下数据路径
        const resourcesDataPath = titleStack.join('.');
        // 如果下一个节点是标题，这个标题要不就是和之前同级，要不就是更高级的（depth 更小的）（不会是更低级的（depth 更大的），上面的检测保证了），说明要出栈了
        const nextHeadingNode = nextMDASTNode;
        if (nextHeadingNode?.type === 'heading') {
          for (let popTime = 0; popTime < currentHeadingDepth - nextHeadingNode.depth + 1; popTime += 1) {
            titleStack.pop();
          }
        }
        // 一个 Paragraph 里只会有一个 TextNode
        const paragraphTextNode = currentMDASTNode.children[0];
        if (paragraphTextNode?.type !== 'text' || paragraphTextNode.value.length === 0) {
          templateFile.fail(new BadTextBetweenTitleError(), paragraphTextNode.position);
        }
        // 我们往 Paragraph 里塞 Sentence（每个自然段是一个 Sentence，因为它们最后就只是生成一句话），一个 Sentence 里会有多个 Word，每个就是一行文本，我们将一行文本看做是一个模因，所以称为 Word 也算合理。一行文本经过分词之后，每一个语素就用 Text 和 Symbol 来承装吧。当然，一个核心理由是，MDAST 里缺少 Sentence 这个级别的概念。
        // 我们取出字符串内容，并去掉空行和空白
        const textValueLines = paragraphTextNode.value.split('\n');
        const unistWordMemeNodes: Word[] = textValueLines.map((line) => {
          // 把模板变成 UNIST 节点
          const memeFragmentNodes: TextNode[] = line
            .split(/({{[^{}]+}})/g)
            .flatMap((memePart) => memePart.split(/(\[\[[^[\]]+]])/g))
            .map((memePart) =>
              u('TextNode', {
                value: memePart,
                // 如果是{{正面工作}}这样的节点，则标注为待填的槽（slot 是我们自定义的元信息），等待之后替换为具体内容
                slot: /({{[^{}]+}})/.test(memePart) ? memePart.replace(/[{}]/g, '') : undefined,
                // 如果是[[目标感>1;目标感+1]]这样的节点，则标注为元信息表，等待之后提取
                metadata: /(\[\[[^[\]]+]])/.test(memePart) ? memePart.replace(/[[\]]/g, '').split(/[,，]/g) : undefined,
              }),
            );
          return u('WordNode', { children: memeFragmentNodes });
        });
        const unistSentenceNode: Sentence = u('SentenceNode', { children: unistWordMemeNodes });
        // 塞数据了
        const previousParagraphNode = get(templateData.resources, resourcesDataPath) ?? u('ParagraphNode', { children: [] as Sentence[] });
        if (!Array.isArray(previousParagraphNode.children)) {
          throw new TypeError(`程序逻辑漏洞：previousParagraphNode.children is not an Array： ${JSON.stringify(previousParagraphNode)}`);
        }
        previousParagraphNode.children.push(unistSentenceNode);
        set(templateData.resources, resourcesDataPath, previousParagraphNode);
      }
    }
  }
  return templateData;
}
