import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { Card, Intent, Tab, Tabs, TextArea } from '@blueprintjs/core';
import { withTheme } from '@rjsf/core';
import { Theme as MaterialUITheme } from '@rjsf/material-ui';
import { useLocalStorage } from 'beautiful-react-hooks';
import { useTemplateGeneration } from './useTemplateGeneration';
import { emptyConfigurationString, IConfiguration } from '../src';
import { templates } from '../src';
import { ResultLine } from './result';

const Form = withTheme(MaterialUITheme);

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 90vh;
`;
const ContentContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1;
  margin-top: 10px;
`;
const TemplateInputContainer = styled(Card)`
  display: flex;
  flex: 1;
  flex-direction: column;

  min-height: 100%;
  margin-right: 10px;
  & textarea {
    display: flex;
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
const ResultContainer = styled(Card)`
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
`;

function App(): JSX.Element {
  const [configString, configStringSetter] = useState<string>(emptyConfigurationString);
  const [templateTab, templateTabSetter] = useState<keyof typeof templates>('空白');
  const [空白templateContent, 空白templateContentSetter] = useLocalStorage<string>('空白templateContent', templates['空白']);
  const [defaultConfigString, defaultConfigStringSetter] = useLocalStorage<string>('defaultConfigString', emptyConfigurationString);
  let configFormData: IConfiguration | undefined;
  try {
    configFormData = JSON.parse(configString) as IConfiguration;
  } catch {}
  const [rerender, template, templateSetter, result, configSchema, errorMessage] = useTemplateGeneration(configFormData);
  useEffect(() => {
    templates['空白'] = 空白templateContent;
    templateSetter(templates[templateTab]);
    configStringSetter(defaultConfigString);
  }, []);
  return (
    <Container>
      <ContentContainer>
        <TemplateInputContainer>
          <Tabs
            id="Tabs"
            onChange={(nextTabName: keyof typeof templates) => {
              templateTabSetter(nextTabName);
              templateSetter(templates[nextTabName]);
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
                  configStringSetter(nextConfigString);
                  defaultConfigStringSetter(nextConfigString);
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
                  JSON.parse(nextConfigString);
                  // if no error thrown
                  configStringSetter(nextConfigString);
                  defaultConfigStringSetter(nextConfigString);
                } catch {}
              }}
              value={configString}
            />
          </ConfigurationContainer>
          <ErrorMessageContainer>{errorMessage}</ErrorMessageContainer>
        </TemplateInputContainer>
        <ResultContainer>
          {result.map((outputLine, index) => (
            <ResultLine key={index} outputLine={outputLine} />
          ))}
        </ResultContainer>
      </ContentContainer>
    </Container>
  );
}

const domContainer = document.querySelector('#app');
ReactDOM.render(<App />, domContainer);
