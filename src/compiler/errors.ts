export class NoResourceForOutlineError extends Error {
  constructor(outlineName: string) {
    super();
    this.message = `所用的大纲节点没有对应的模板定义： ${outlineName}`;
  }
}

export class EmptyTemplateTextError extends Error {
  constructor(outlineName: string) {
    super();
    this.message = `所用的模板内容没有实际的内容定义： ${outlineName}`;
  }
}

export class NoValueForSlotError extends Error {
  constructor(slotName: string) {
    super();
    this.message = `没有为模板槽位提供所需的替换值： ${slotName}`;
  }
}
