import preval from 'preval.macro';
import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { AnchorButton, Button, ButtonGroup, Card, Intent, Tab, Tabs, TextArea } from '@blueprintjs/core';
import { withTheme } from '@rjsf/core';
import { Theme as RJSFUITheme } from '@rjsf/fluent-ui';
import { pick } from 'lodash';
import { useLocalStorage } from 'beautiful-react-hooks';
import useQueryString from 'use-query-string';
import { useTemplateGeneration } from './useTemplateGeneration';
import { collectSlots, emptyConfigurationString, IConfiguration, templateFileToNLCSTNodes } from '../src';
import { templates } from '../src';
import { VFile } from 'vfile';
import { GenerationResult, ResultDisplayMode } from './result';
import GlobalStyle from './globalStyle';

const Form = withTheme(RJSFUITheme);
const homePageUrl = preval`
const fs = require('fs');
const path = require('path');
const projectFolder = path.resolve(__dirname, '..');
const packageFile = fs.readFileSync(path.resolve(projectFolder, 'package.json'), 'utf8');
module.exports = JSON.parse(packageFile).homepage;
` as string;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100%;
`;
const ContentContainer = styled.div`
  display: flex;
  flex: 1;
  margin-top: 10px;
  flex-direction: column;
  @media (min-width: 700px) {
    flex-direction: row;
  }
`;
const TemplateInputContainer = styled(Card)`
  display: flex;
  flex: 1;
  flex-direction: column;

  min-height: 100%;
  margin-right: 10px;
  & textarea {
    display: flex;
    max-height: 80vh;
    flex: 3;
  }
`;
const ConfigurationContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  margin-top: 10px;
  & textarea {
    display: flex;
    flex: 1 !important;
    margin-left: 10px;
  }
`;
const ConfigJSONSchemaForm = styled(Form)`
  display: flex;
  flex: 3;
`;
const ErrorMessageContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;
const ResultDisplayModeSelectContainer = styled.div`
  position: fixed;
  bottom: 10px;
  right: 10px;
  opacity: 0.5;
  &:active,
  &:hover,
  &:focus {
    opacity: 1;
  }
`;

function updateQuery(path: string) {
  window.history.pushState(null, document.title, path);
}

function App(): JSX.Element {
  const [configString, configStringSetter] = useState<string>(emptyConfigurationString);
  const queryString = useQueryString(window.location, updateQuery);
  const [templateTab, templateTabSetter] = useState<keyof typeof templates>('空白');
  const [resultDisplayMode, resultDisplayModeSetter] = useState<ResultDisplayMode>(ResultDisplayMode.paragraph);
  const [空白templateContent, 空白templateContentSetter] = useLocalStorage<string>('空白templateContent', templates['空白']);
  let configFormData: IConfiguration | undefined;
  try {
    configFormData = JSON.parse(configString) as IConfiguration;
  } catch {}
  const [rerender, template, templateSetter, result, configSchema, errorMessage, templateData] = useTemplateGeneration(configFormData, `${templateTab}.md`);
  useEffect(() => {
    templates['空白'] = 空白templateContent;
    const tabFromQueryString = queryString[0].tab as keyof typeof templates | undefined;
    if (tabFromQueryString) {
      templateTabSetter(tabFromQueryString);
      templateSetter(templates[tabFromQueryString]);
    } else {
      templateSetter(templates[templateTab]);
    }
    const configStringFromQueryString = queryString[0].conf as string | undefined;
    if (configStringFromQueryString) {
      try {
        JSON.parse(configStringFromQueryString);
        configStringSetter(configStringFromQueryString);
      } catch {}
    }
    const resultDisplayModeFromQueryString = queryString[0].mode;
    if (resultDisplayModeFromQueryString) {
      resultDisplayModeSetter(Number(resultDisplayModeFromQueryString));
    }
  }, []);

  const updateConfigString = useCallback(
    (nextConfigString: string) => {
      const parsedConfig = JSON.parse(nextConfigString);
      // if no error thrown
      configStringSetter(nextConfigString);
      let usedSlots: string[] = [];
      if (templateData !== undefined) {
        usedSlots = collectSlots(templateData);
      } else {
        const vFile = new VFile({ path: 'input.md', value: template });
        const templateDataTemp = templateFileToNLCSTNodes(vFile);
        usedSlots = collectSlots(templateDataTemp);
      }
      queryString[1]({ conf: JSON.stringify({ ...parsedConfig, sub: pick(parsedConfig.sub, usedSlots) }) });
    },
    [templateData, template, queryString],
  );

  const updateResultDisplayMode = useCallback(
    (nextResultDisplayMode: ResultDisplayMode) => {
      resultDisplayModeSetter(nextResultDisplayMode);
      queryString[1]({ mode: String(nextResultDisplayMode) });
    },
    [queryString],
  );

  const inputGroup = (
    <TemplateInputContainer>
      <Tabs
        id="Tabs"
        onChange={(nextTabName: keyof typeof templates) => {
          templateTabSetter(nextTabName);
          templateSetter(templates[nextTabName]);
          queryString[1]({ tab: nextTabName });
          // when opening readme, auto set display mode to markdown
          if (nextTabName.toLowerCase() === 'readme') {
            resultDisplayModeSetter(ResultDisplayMode.markdown);
          }
        }}
        selectedTabId={templateTab}>
        {Object.keys(templates).map((templateName) => (
          <Tab id={templateName} key={templateName} title={templateName} panel={<div />} />
        ))}
      </Tabs>
      <TextArea
        large={true}
        intent={Intent.PRIMARY}
        fill={true}
        onChange={(event) => {
          templateSetter(event.target.value);
          if (templateTab === '空白') {
            空白templateContentSetter(event.target.value);
          }
        }}
        value={template}
      />
      <ConfigurationContainer>
        {configSchema !== undefined && (
          <ConfigJSONSchemaForm
            formData={configFormData}
            schema={configSchema}
            onChange={(submitEvent) => {
              const nextConfigString = JSON.stringify(submitEvent.formData);
              updateConfigString(nextConfigString);
            }}
            onSubmit={() => rerender()}
          />
        )}
        <TextArea
          large={true}
          intent={Intent.PRIMARY}
          fill={true}
          onChange={(event) => {
            try {
              // prevent invalid input
              const nextConfigString = event.target.value;
              updateConfigString(nextConfigString);
            } catch {}
          }}
          value={configString}
        />
      </ConfigurationContainer>
      <ErrorMessageContainer>{errorMessage}</ErrorMessageContainer>
    </TemplateInputContainer>
  );

  return (
    <Container>
      <ContentContainer as="main">
        {resultDisplayMode !== ResultDisplayMode.share && inputGroup}
        <ResultDisplayModeSelectContainer>
          <ButtonGroup>
            <Button icon="share" onClick={() => updateResultDisplayMode(ResultDisplayMode.share)}>
              分享模式
            </Button>
            <Button icon="eye-on" onClick={() => updateResultDisplayMode(ResultDisplayMode.paragraph)}>
              编辑模式
            </Button>
            <Button icon="database" onClick={() => updateResultDisplayMode(ResultDisplayMode.card)}>
              元信息模式
            </Button>
            <Button icon="database" onClick={() => updateResultDisplayMode(ResultDisplayMode.markdown)}>
              MD
            </Button>
            <a href={homePageUrl} target="_blank">
              <Button icon="star">GitHub</Button>
            </a>
          </ButtonGroup>
        </ResultDisplayModeSelectContainer>
        <GenerationResult result={result} resultDisplayMode={resultDisplayMode} template={template} />
      </ContentContainer>
    </Container>
  );
}

const domContainer = document.querySelector('#app');
ReactDOM.render(
  <>
    <GlobalStyle />
    <App />
  </>,
  domContainer,
);
