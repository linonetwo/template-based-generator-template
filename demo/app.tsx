import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { Card, Intent, TextArea } from '@blueprintjs/core';
import { useTemplateGeneration } from './useTemplateGeneration';

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
    flex: 1;
  }
  & textarea:first-child {
    display: flex;
    flex: 3;
  }
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
