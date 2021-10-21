import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { Card, Intent, TextArea } from '@blueprintjs/core';
import { IConfiguration } from '../src';
import { useTemplateGeneration } from './useTemplateGeneration';

const Container = styled.div`
  display: flex;
  flex-direction: row;
`;
const TemplateInputContainer = styled(Card)`
  display: flex;
  flex-direction: column;
`;
const ErrorMessageContainer = styled.div`
  justify-content: center;
  align-items: center;
`;
const ResultContainer = styled(Card)`
  justify-content: center;
  align-items: center;
`;

function App(): JSX.Element {
  const [configString, configStringSetter] = useState<string>('{ "substitutions": {} }');
  const [template, templateSetter, result, errorMessage] = useTemplateGeneration(configString);
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
        <ErrorMessageContainer>{errorMessage}</ErrorMessageContainer>
      </TemplateInputContainer>
      <ResultContainer>{result}</ResultContainer>
    </Container>
  );
}

const domContainer = document.querySelector('#app');
ReactDOM.render(<App />, domContainer);
