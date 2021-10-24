import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  body {
    height: 100vh;
    min-height: 100vh;
    #app {
      height: 100%;
      width: 100%;
    }
  }
`;

export default GlobalStyle;
