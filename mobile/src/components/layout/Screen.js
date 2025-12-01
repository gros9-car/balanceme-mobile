import styled from 'styled-components/native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Contenedor base para pantallas a pantalla completa con padding estándar.
export const Screen = styled(SafeAreaView)`
  flex: 1;
  padding: 16px;
  background-color: #050816;
`;

// Contenedor para el contenido principal dentro de una pantalla.
export const Content = styled.View`
  flex: 1;
  justify-content: flex-start;
  align-items: stretch;
`;

// Tarjeta centrada y con bordes redondeados para agrupar bloques de UI.
export const Card = styled.View`
  width: 100%;
  max-width: 480px;
  align-self: center;
  padding: 16px;
  border-radius: 16px;
  background-color: #111827;
`;
