import { ms, spacing } from './responsive';

/**
 * Objeto de tema base utilizado en componentes compartidos
 * (colores, radios, espaciados y tamaños de texto).
 */
export const theme = {
  color: {
    bg: '#0B0B0F',
    card: '#14141A',
    text: '#E7E7EE',
    mut: '#A1A1AA',
    pri: '#7C3AED',
    acc: '#22D3EE',
    ok: '#22C55E',
    warn: '#F59E0B',
    err: '#EF4444',
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 24 },
  space: spacing,
  text: {
    h1: { fontSize: ms(28), fontWeight: '700' as const },
    h2: { fontSize: ms(22), fontWeight: '700' as const },
    h3: { fontSize: ms(18), fontWeight: '600' as const },
    p: { fontSize: ms(16), fontWeight: '400' as const },
    sm: { fontSize: ms(14), fontWeight: '400' as const },
  },
};

export type Theme = typeof theme;
