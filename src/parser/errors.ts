export class NoBigTitleInTemplateError extends Error {
  constructor() {
    super();
    this.message = `模板开头处没有大标题，请在文档开头使用 # 后加一空格然后带点儿文字作为大标题。`;
  }
}

export class NoTitleContentError extends Error {
  constructor() {
    super();
    this.message = `使用多个井号 # 后加一空格然后带点儿文字作为标题，标题不能为空。`;
  }
}

export class NoOutlineInTemplateError extends Error {
  constructor() {
    super();
    this.message = `模板中大标题后没有大纲，请在文档开头使用 # 后加一空格然后带点儿文字作为大标题，然后紧跟着一个用小标题名字拼成的大纲。`;
  }
}
