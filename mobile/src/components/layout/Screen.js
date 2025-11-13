import styled from 'styled-components/native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const Screen = styled(SafeAreaView)`
  flex: 1;
  padding: 16px;
  background-color: #050816;
`;

export const Content = styled.View`
  flex: 1;
  justify-content: flex-start;
  align-items: stretch;
`;

export const Card = styled.View`
  width: 100%;
  max-width: 480px;
  align-self: center;
  padding: 16px;
  border-radius: 16px;
  background-color: #111827;
`;
