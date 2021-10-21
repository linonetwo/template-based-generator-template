import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { Card, Intent, TextArea } from '@blueprintjs/core';
import { withTheme } from '@rjsf/core';
import { Theme as MaterialUITheme } from '@rjsf/material-ui';
import { useTemplateGeneration } from './useTemplateGeneration';
import { IConfiguration } from 'src';

const Form = withTheme(MaterialUITheme);

const Container = styled.div`
  display: flex;
  flex-direction: row;

  width: 100%;
  min-height: 90vh;
`;
const TemplateInputContainer = styled(Card)`
  display: flex;
  flex: 1;
  flex-direction: column;

  min-height: 100%;
  & textarea {
    display: flex;
    flex: 3;
  }
`;
const ConfigurationContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  & textarea {
    display: flex;
    flex: 1;
  }
`;
const ConfigJSONSchemaForm = styled(Form)`
  display: flex;
  flex: 1;
`;
const ErrorMessageContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;
const ResultContainer = styled(Card)`
  display: flex;
  flex: 1;
  justify-content: center;
  align-items: center;
`;

function App(): JSX.Element {
  const [configString, configStringSetter] = useState<string>('{ "substitutions": {} }');
  let configFormData: IConfiguration | undefined;
  try {
    configFormData = JSON.parse(configString) as IConfiguration;
  } catch {}
  const [rerender, template, templateSetter, result, configSchema, errorMessage] = useTemplateGeneration(configFormData);
  return (
    <Container>
      <TemplateInputContainer>
        <TextArea
          growVertically={true}
          large={true}
          intent={Intent.PRIMARY}
          fill={true}
          onChange={(event) => templateSetter(event.target.value)}
          value={template}
        />
        <ConfigurationContainer>
          {configSchema !== undefined && (
            <ConfigJSONSchemaForm
              formData={configFormData}
              schema={configSchema}
              onChange={(submitEvent) => {
                configStringSetter(JSON.stringify(submitEvent.formData));
              }}
              onSubmit={() => rerender()}
            />
          )}
          <TextArea
            growVertically={true}
            large={true}
            intent={Intent.PRIMARY}
            fill={true}
            onChange={(event) => {
              configStringSetter(event.target.value);
            }}
            value={configString}
          />
        </ConfigurationContainer>
        <ErrorMessageContainer>{errorMessage}</ErrorMessageContainer>
      </TemplateInputContainer>
      <ResultContainer>{result}</ResultContainer>
    </Container>
  );
}

const domContainer = document.querySelector('#app');
ReactDOM.render(<App />, domContainer);
