import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';

const botName = 'Balancito';

// ---------------- NLP helpers ----------------
const removeAccents = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const norm = (s) =>
  removeAccents(
    (s || '')
      .toLowerCase()
      .replace(/[^a-z\s]/gi, ' ')
      .replace(/\s+/g, ' '),
  )
    .trim()
    // comprime repeticiones de letras ("holaaa" -> "hola")
    .replace(/([a-z])\1{1,}/g, '$1');

const levenshtein = (a, b) => {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j += 1) dp[j] = j;
  for (let i = 1; i <= m; i += 1) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[n];
};

const fuzzy = (text, keywords) => {
  const tnorm = norm(text);
  const tokens = tnorm.split(/\s+/).filter(Boolean);
  for (const kw of keywords) {
    const nk = norm(kw);
    if (!nk) continue;
    if (tnorm.includes(nk)) return true;
    for (const t of tokens) {
      const dist = levenshtein(t, nk);
      const threshold = nk.length <= 5 ? 1 : 2;
      if (dist <= threshold) return true;
    }
  }
  return false;
};

// ---------------- Sugerencias guiadas para Balancito ----------------
// Sugerencias pensadas para acompañar el registro diario de ánimo,
// hábitos y diario personal dentro de la app (no son terapia).
const MOOD_SUGGESTIONS = [
  'Piensa en un momento de hoy que haya cambiado tu estado de ánimo de forma clara. ¿Qué ocurrió?',
  'Describe una situación que te haya dado energía hoy, aunque haya sido algo pequeño.',
  'Recuerda un momento incómodo del día y anota qué emoción predominó en ti.',
  'Identifica qué hizo que tu día se sintiera más ligero o más pesado de lo normal.',
  'Piensa en la última vez que te reíste hoy. ¿Qué estabas haciendo y con quién estabas?',
  'Anota una situación que te haya generado tensión y cómo reaccionó tu cuerpo.',
  'Piensa si hoy te sentiste más hacia la calma o hacia el estrés. ¿Qué factores influyeron?',
  'Escribe qué emoción te acompaña justo ahora y qué crees que la está alimentando.',
  'Recuerda un momento en que te sentiste orgulloso de ti hoy, aunque haya sido por algo pequeño.',
  'Piensa en una decisión que tomaste hoy y cómo afectó tu estado de ánimo.',
  '¿Hubo algo que te sorprendiera hoy de forma positiva o negativa? Describe esa emoción.',
  'Anota qué te ayudó a regularte cuando te sentiste sobrepasado o molesto.',
  'Piensa en alguien que influyó en tu estado de ánimo hoy. ¿De qué forma lo hizo?',
  'Escribe qué te habría ayudado a sentirte un poco mejor en el momento más difícil del día.',
  'Haz un breve balance: si tu día fuera una película, ¿cómo describirías su tono emocional?',
  'Elige una sola palabra para resumir tu día y explica por qué la escogiste.',
  'Piensa si hoy hubo un momento de calma. ¿Dónde estabas y qué estabas haciendo?',
  'Anota qué cosas te quitaron energía hoy y cuáles te la devolvieron.',
  'Describe cómo te sentiste al despertar y cómo te sientes ahora. ¿Qué cambió en el camino?',
  'Identifica una emoción que quieras ver un poco más presente mañana.',
];

const HABIT_SUGGESTIONS = [
  'Elige un solo hábito pequeño para hoy (por ejemplo, tomar un vaso de agua extra o estirarte 5 minutos).',
  'Revisa qué hábito se te ha hecho más fácil mantener y piensa por qué funciona para ti.',
  'Identifica un hábito que te cueste y anota qué podrías hacer para que sea más sencillo (menos tiempo, otro horario, etc.).',
  'Piensa en un momento del día donde ya tengas una rutina y agrega ahí un hábito pequeño.',
  'Anota un hábito que hoy no cumpliste y qué obstáculo principal apareció.',
  'Registra un hábito que te haga sentir más descansado, no solo más productivo.',
  'Elige un hábito de autocuidado que puedas hacer en menos de 5 minutos y márcalo hoy.',
  'Revisa si hay hábitos que estás marcando solo por inercia y ajusta la lista para que tenga sentido para ti.',
  'Piensa en un hábito que quieras retomar esta semana y define el día exacto para intentarlo de nuevo.',
  'Anota qué hábito te ayudó más a estabilizar tu ánimo en los últimos días.',
  'Identifica un hábito que quieras hacer con menos frecuencia y actualiza tus expectativas para que sean más realistas.',
  'Registra un hábito relacionado con movimiento suave (caminar, estirarte, respirar) y pruébalo hoy.',
  'Añade un hábito relacionado con tu descanso nocturno (desconectar pantallas, rutina antes de dormir).',
  'Piensa en un hábito que te acerque a alguien importante para ti (enviar un mensaje, llamar, compartir algo).',
  'Elige un hábito que puedas hacer incluso en un día difícil y márcalo como tu “mínimo viable”.',
  'Revisa tus hábitos de los últimos días y detecta si hay algún patrón entre ellos y tu estado de ánimo.',
  'Anota un hábito que quieras pausar por ahora porque no te está ayudando como pensabas.',
  'Piensa en un hábito que te recuerde cuidar tu cuerpo (alimentación, hidratación, descanso).',
  'Registra un pequeño hábito de orden o limpieza que te ayude a sentir tu entorno más liviano.',
  'Define un hábito para mañana que sea tan simple que te resulte casi imposible no hacerlo.',
];

const JOURNAL_SUGGESTIONS = [
  'Escribe tres cosas que hayan ocurrido hoy y que quieras recordar dentro de un año.',
  'Describe un momento en el que te hayas sentido acompañado o comprendido recientemente.',
  'Anota algo que te haya frustrado hoy y qué te hubiera gustado poder decir en ese momento.',
  'Escribe sobre una situación donde mostraste más paciencia de la que pensabas que tenías.',
  'Haz una lista de tres cosas por las que te sientas agradecido hoy, incluso si son muy pequeñas.',
  'Cuenta una historia breve de tu día como si se la narraras a una persona de confianza.',
  'Anota un logro de esta semana que quizás hayas pasado por alto.',
  'Escribe qué te gustaría que tu “yo del futuro” recuerde sobre la persona que eres hoy.',
  'Reflexiona sobre una decisión reciente: ¿qué aprendiste de ella, haya salido bien o mal?',
  'Describe un lugar donde te sientas seguro y qué detalles lo hacen especial.',
  'Escribe sobre una emoción que tiendes a evitar y qué la hace difícil de mirar.',
  'Anota una conversación que haya sido importante para ti en los últimos días.',
  'Haz una carta breve a alguien (no tienes que enviarla) contándole cómo te has sentido últimamente.',
  'Escribe qué fue lo más difícil de esta semana y qué te ayudó a seguir adelante.',
  'Imagina que hoy fue un capítulo de un libro sobre tu vida. ¿Cómo se titularía ese capítulo?',
  'Describe un momento en el que te hayas sentido orgulloso de tu propia forma de reaccionar.',
  'Anota algo que estés esperando con ganas, aunque aún falte tiempo para que ocurra.',
  'Escribe sobre una pequeña rutina que te ayude a terminar el día con más calma.',
  'Piensa en alguien que haya sido importante en tu historia y escribe un recuerdo que tengas con esa persona.',
  'Haz una lista de aprendizajes que te haya dejado el último mes, aunque hayan surgido de situaciones difíciles.',
];

const SUGGESTION_POOLS = {
  mood: MOOD_SUGGESTIONS,
  habit: HABIT_SUGGESTIONS,
  journal: JOURNAL_SUGGESTIONS,
};

// Devuelve una sugerencia aleatoria y un nuevo estado de
// "últimas sugerencias" evitando repetir las últimas N.
const getRandomSuggestion = (type, recentByType, windowSize = 4) => {
  const pool = SUGGESTION_POOLS[type] || [];
  if (!pool.length) {
    return { suggestion: null, nextRecentByType: recentByType };
  }

  const recentForType = recentByType[type] || [];
  const forbidden = recentForType.slice(-windowSize);
  const candidates = pool.filter((s) => !forbidden.includes(s));
  const base = candidates.length ? candidates : pool;
  const suggestion = base[Math.floor(Math.random() * base.length)];
  const updatedForType = [...forbidden, suggestion].slice(-windowSize);

  return {
    suggestion,
    nextRecentByType: {
      ...recentByType,
      [type]: updatedForType,
    },
  };
};

// ---------------- Intents para la app ----------------
const appIntents = [
  {
    id: 'help',
    keywords: [
      'ayuda',
      'como usar la app',
      'como usar balanceme',
      'funcionalidades',
      'que puedo hacer',
      'comandos',
      'menu de ayuda',
    ],
  },
  {
    id: 'mood',
    keywords: [
      'animo',
      'estado de animo',
      'registrar animo',
      'registrar estado de animo',
      'como registro mi animo',
      'registro de animo',
      'emocion',
      'emociones',
    ],
  },
  {
    id: 'mood_locked',
    keywords: [
      'no puedo registrar mi animo',
      'no puedo registrar animo',
      'no me deja registrar animo',
      'no puedo registrar mi emocion',
      'no puedo registrar emocion',
      'por que no puedo registrar mi emocion',
      'por que no puedo registrar mi animo',
    ],
  },
  {
    id: 'habits',
    keywords: [
      'habitos',
      'mis habitos',
      'habito diario',
      'habitos diarios',
      'registrar habitos',
      'registro de habitos',
    ],
  },
  {
    id: 'journal',
    keywords: [
      'diario',
      'diario personal',
      'diario emocional',
      'escribir diario',
      'escribir en el diario',
      'nota personal',
    ],
  },
  {
    id: 'notifications',
    keywords: [
      'recordatorio',
      'recordatorios',
      'notificacion',
      'notificaciones',
      'configurar notificaciones',
      'configurar recordatorios',
      'recordatorios de habitos',
      'recordatorios de emociones',
      'no me aparecen los recordatorios',
      'no me llegan las notificaciones',
      'no recibo recordatorios',
    ],
  },
  {
    id: 'about_app',
    keywords: [
      'que es balanceme',
      'que es la app',
      'para que sirve la app',
      'sobre balanceme',
      'conocenos',
      'conocernos',
      'balancito',
    ],
  },
];

// ---------------- Message generator ----------------
const createMessageGenerator = (options = {}) => {
  const { getSuggestion } = options || {};

  const findIntent = (textNorm) => {
    for (const intent of appIntents) {
      if (fuzzy(textNorm, intent.keywords)) return intent.id;
    }
    return null;
  };

  // Construye un bloque de texto con 1–2 sugerencias según el tipo.
  const buildSuggestionSection = (type, count = 2) => {
    if (!getSuggestion) return '';
    const items = [];
    const used = new Set();
    for (let i = 0; i < count; i += 1) {
      const suggestion = getSuggestion(type);
      if (!suggestion || used.has(suggestion)) continue;
      used.add(suggestion);
      items.push(`- ${suggestion}`);
    }
    if (!items.length) return '';
    return '\n\nAlgunas ideas para empezar:\n' + items.join('\n');
  };

  const helpMessage =
    'Puedo ayudarte con BalanceMe (solo con la app, no ofrezco terapia):\n' +
    '- Registrar tu estado de ánimo diario\n' +
    '- Registrar y revisar tus hábitos\n' +
    '- Escribir en tu diario emocional\n' +
    '- Configurar los recordatorios en Ajustes\n\n' +
    'Prueba escribiendo uno de estos comandos: "ánimo", "hábitos", "diario", "recordatorios" o "ayuda".';

  const replyForIntent = (intentId, textNorm) => {
    switch (intentId) {
      case 'help':
        return (
          'Soy Balancito, el asistente de producto de BalanceMe.\n\n' +
          'Puedo guiarte para usar la app, por ejemplo:\n' +
          '- Cómo registrar tu estado de ánimo\n' +
          '- Cómo registrar o revisar tus hábitos\n' +
          '- Cómo escribir en tu diario personal\n' +
          '- Cómo funcionan los recordatorios\n\n' +
          'Comandos útiles:\n' +
          '- "animo" → registrar tu estado de ánimo\n' +
          '- "habitos" → gestionar tus hábitos diarios\n' +
          '- "diario" → escribir en tu diario personal\n' +
          '- "recordatorios" → activar o revisar notificaciones\n' +
          '- "ayuda" → volver a ver esta lista'
        );
      case 'mood':
        return (
          'Para registrar tu estado de ánimo diario:\n' +
          '1) Desde la pantalla de inicio toca la tarjeta "Registrar ánimo".\n' +
          '2) Elige hasta tres emojis que describan cómo te sientes.\n' +
          '3) Opcional: escribe una nota breve sobre lo que está pasando.\n' +
          '4) Pulsa "Guardar estado" para registrar el día.\n\n' +
          'Solo puedes registrar tu ánimo una vez cada 24 horas. ' +
          'Si ya registraste hoy, verás un mensaje indicando cuánto falta para el próximo registro. ' +
          'Si tienes activado "Recordatorios de emociones" en Configuración → Notificaciones, la app te avisará cuando vuelva a estar disponible.'
        ) + buildSuggestionSection('mood', 2);
      case 'mood_locked':
        return (
          'Es normal que a veces no puedas registrar tu emoción de inmediato.\n\n' +
          'BalanceMe permite un registro de ánimo cada 24 horas para que tengas un momento claro al día. ' +
          'Cuando ya registraste tu estado de ánimo, la pantalla muestra un texto indicando cuánto falta para el próximo registro y el botón de guardar se desactiva.\n\n' +
          'Cuando el contador llegue a 0, podrás volver a registrar. Si quieres, activa "Recordatorios de emociones" en Configuración → Notificaciones para que la app te avise cuando se vuelva a habilitar.'
        );
      case 'habits':
        return (
          'Para registrar o revisar tus hábitos diarios:\n' +
          '1) Desde la pantalla de inicio entra a "Hábitos diarios".\n' +
          '2) Marca los hábitos que realizaste hoy o escribe uno nuevo en la caja de texto.\n' +
          '3) Pulsa el botón de guardar para registrar la entrada del día.\n\n' +
          'El registro de hábitos también se desbloquea cada 24 horas. ' +
          'Si ya guardaste tus hábitos, verás un mensaje con el tiempo restante para el próximo registro. ' +
          'Con "Recordatorios de hábitos" activo en Configuración → Notificaciones, recibirás un aviso cuando puedas registrar de nuevo.'
        ) + buildSuggestionSection('habit', 2);
      case 'journal':
        return (
          'Para escribir en tu diario personal:\n' +
          '1) Desde la pantalla de inicio entra a "Diario personal" (Diario emocional).\n' +
          '2) Escribe lo que quieras registrar sobre tu día o sobre cómo te sientes.\n' +
          '3) Añade al menos una etiqueta emocional para clasificar la entrada.\n' +
          '4) Pulsa "Guardar" para que se sume a tu meta mensual de entradas.\n\n' +
          'La idea es que tengas al menos un momento al día para escribir, de forma simple y sostenible.'
        ) + buildSuggestionSection('journal', 2);
      case 'notifications': {
        const isMissing =
          textNorm.includes('no me aparecen') ||
          textNorm.includes('no recibo') ||
          textNorm.includes('no me llegan');
        if (isMissing) {
          return (
            'Si no te están llegando los recordatorios, revisa lo siguiente:\n' +
            '1) Entra a la pantalla "Configuración" dentro de BalanceMe.\n' +
            '2) En la sección "Notificaciones", activa:\n' +
            '   - "Recordatorios de emociones".\n' +
            '   - "Recordatorios de hábitos" (si quieres usarlos).\n' +
            '3) Comprueba en los ajustes del sistema (Android / iOS) que las notificaciones estén permitidas para BalanceMe.\n' +
            '4) Recuerda que los recordatorios se programan cuando guardas un registro de ánimo o de hábitos; ' +
            'si hace mucho que no registras nada, puede que no haya un recordatorio pendiente.\n\n' +
            'Si después de esto sigues sin ver avisos, intenta cerrar y volver a abrir la app para refrescar los recordatorios.'
          );
        }
        return (
          'Así funcionan los recordatorios en BalanceMe:\n\n' +
          '1) Abre la pantalla "Configuración" desde el menú de la app.\n' +
          '2) En la sección "Notificaciones" verás dos interruptores:\n' +
          '   - "Recordatorios de emociones": te avisa cuando vuelva a estar disponible "Registrar ánimo".\n' +
          '   - "Recordatorios de hábitos": te avisa cuando puedas registrar tus hábitos otra vez.\n' +
          '3) Cada vez que guardas un registro, la app calcula el próximo momento disponible (24 horas después) y programa un recordatorio local para ese momento.\n\n' +
          'Si el sistema tiene las notificaciones desactivadas para BalanceMe, la app no podrá mostrarte los avisos aunque estos interruptores estén encendidos.'
        );
      }
      case 'about_app':
        return (
          'BalanceMe es una app para organizar tu cuidado emocional del día a día.\n\n' +
          'Dentro de la app puedes:\n' +
          '- Registrar cómo te sientes con "Registrar ánimo".\n' +
          '- Llevar tus "Hábitos diarios" de autocuidado.\n' +
          '- Escribir en tu "Diario personal".\n' +
          '- Ver resúmenes en la sección de Progreso y configurar recordatorios.\n\n' +
          'Yo, Balancito, solo te ayudo a usar BalanceMe y a entender sus pantallas. No reemplazo a un profesional de la salud mental.'
        );
      default:
        return null;
    }
  };

  return (input) => {
    const textNorm = norm(input);
    if (!textNorm) {
      return (
        'Cuéntame con qué parte de BalanceMe necesitas ayuda.\n' +
        'Por ejemplo: "ánimo", "hábitos", "diario", "recordatorios" o "ayuda".'
      );
    }

    const intentId = findIntent(textNorm);
    const reply = replyForIntent(intentId, textNorm);
    if (reply) return reply;

    // Fallback genérico orientado a producto
    return helpMessage;
  };
};

// ---------------- Responsividad ----------------
const useResponsiveSupportChat = () => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isSmall = width < 360;
  const isTablet = width >= 768;

  const horizontalPadding = Math.max(16, Math.min(24, width * 0.05));
  const maxContentWidth = Math.min(900, width * 0.95);

  const baseFont = isSmall ? 13 : 14;
  const headerTitleFont = isSmall ? 18 : 20;
  const headerSubtitleFont = isSmall ? 11 : 12;

  const bubbleMaxWidth = isTablet ? '60%' : '75%';
  const composerVerticalPadding = isSmall ? 10 : 16;
  const inputMinHeight = 44;
  const inputMaxHeight = Math.max(100, height * 0.22);

  const keyboardVerticalOffset = Platform.select({
    ios: insets.top + 60,
    android: 0,
    default: 0,
  });

  return {
    isSmall,
    horizontalPadding,
    maxContentWidth,
    baseFont,
    headerTitleFont,
    headerSubtitleFont,
    bubbleMaxWidth,
    composerVerticalPadding,
    inputMinHeight,
    inputMaxHeight,
    keyboardVerticalOffset,
    safeTop: insets.top,
    safeBottom: insets.bottom,
  };
};

// ---------------- UI ----------------
const MessageBubble = ({ item, colors, bubbleMaxWidth, baseFont }) => {
  const isUser = item.role === 'user';
  const bubbleBase = isUser ? styles.userBubble : styles.botBubble;
  const bubbleStyle = [
    bubbleBase,
    {
      maxWidth: bubbleMaxWidth,
      padding: baseFont,
      backgroundColor: isUser ? colors.primary : colors.muted,
    },
  ];
  const textColor = isUser ? colors.primaryContrast : colors.text;

  return (
    <View
      style={[
        styles.messageRow,
        isUser ? styles.messageRowUser : styles.messageRowBot,
      ]}
    >
      {!isUser ? (
        <View
          style={[styles.avatar, { backgroundColor: colors.primary + '22' }]}
        >
          <Ionicons name="heart" size={16} color={colors.primary} />
        </View>
      ) : null}
      <View style={bubbleStyle}>
        <Text
          style={[
            styles.messageAuthor,
            { color: textColor, fontSize: baseFont - 2 },
          ]}
        >
          {isUser ? 'Tú' : botName}
        </Text>
        <Text
          style={[
            styles.messageText,
            { color: textColor, fontSize: baseFont, lineHeight: baseFont * 1.45 },
          ]}
        >
          {item.text}
        </Text>
      </View>
      {isUser ? (
        <View
          style={[styles.avatar, { backgroundColor: colors.primary + '22' }]}
        >
          <Ionicons name="person" size={16} color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
};

/**
 * Pantalla de chat de soporte asistido por bot.
 * Simula una conversación guiada con "Balancito" para acompañar
 * al usuario con respuestas empáticas y recursos de ayuda.
 */
export default function SupportChatScreenClean({ navigation }) {
  const { colors } = useTheme();
  const {
    isSmall,
    horizontalPadding,
    maxContentWidth,
    baseFont,
    headerTitleFont,
    headerSubtitleFont,
    bubbleMaxWidth,
    composerVerticalPadding,
    inputMinHeight,
    inputMaxHeight,
    keyboardVerticalOffset,
    safeTop,
    safeBottom,
  } = useResponsiveSupportChat();

  // Estado para evitar repetir siempre las mismas sugerencias.
  const [recentSuggestions, setRecentSuggestions] = useState({
    mood: [],
    habit: [],
    journal: [],
  });

  // Ref que siempre apunta a la función más reciente que gestiona sugerencias.
  const getSuggestionRef = useRef(() => null);
  getSuggestionRef.current = (type) => {
    const { suggestion, nextRecentByType } = getRandomSuggestion(
      type,
      recentSuggestions,
    );
    if (!suggestion) return null;
    setRecentSuggestions(nextRecentByType);
    return suggestion;
  };

  const generateRef = useRef(null);
  if (!generateRef.current) {
    generateRef.current = createMessageGenerator({
      getSuggestion: (type) => getSuggestionRef.current(type),
    });
  }

  const [messages, setMessages] = useState([
    {
      id: 'intro',
      role: 'bot',
      text:
        'Hola, soy Balancito 😊.\n\n' +
        'Soy el asistente de BalanceMe y puedo ayudarte a usar la app (solo temas de la app, no doy consejos terapéuticos).\n\n' +
        'Prueba escribiendo uno de estos comandos:\n' +
        '- "animo" → para ver cómo registrar tu estado de ánimo\n' +
        '- "habitos" → para gestionar tus hábitos diarios\n' +
        '- "diario" → para escribir en tu diario personal\n' +
        '- "recordatorios" → para configurar o entender las notificaciones\n' +
        '- "ayuda" → para ver todo lo que puedo hacer',
    },
  ]);
  const [draft, setDraft] = useState('');

  // ref para autoscroll
  const listRef = useRef(null);

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    const botMessage = {
      id: `bot-${Date.now()}`,
      role: 'bot',
      text: generateRef.current(trimmed),
    };

    setMessages((prev) => [...prev, userMessage, botMessage]);
    setDraft('');

    setTimeout(scrollToBottom, 50);
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: safeTop,
          paddingBottom: safeBottom,
        },
      ]}
    >
      <StatusBar
        barStyle={colors.statusBarStyle}
        backgroundColor={colors.background}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <View
          style={{
            paddingHorizontal: horizontalPadding,
            paddingVertical: isSmall ? 12 : 16,
          }}
        >
          <PageHeader
            title={botName}
            subtitle="Asistente de BalanceMe"
            titleStyle={{ fontSize: headerTitleFont }}
            subtitleStyle={{ fontSize: headerSubtitleFont }}
          />
        </View>

        <View
          style={[
            styles.quickActionsRow,
            {
              paddingHorizontal: horizontalPadding,
              width: '100%',
              maxWidth: maxContentWidth,
              alignSelf: 'center',
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.quickActionButton, { borderColor: colors.muted }]}
            onPress={() => navigation?.navigate?.('AboutBalanceMe')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={colors.primary}
            />
            <Text
              style={[styles.quickActionText, { color: colors.primary }]}
            >
              Conócenos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionButton, { borderColor: colors.muted }]}
            onPress={() => navigation?.navigate?.('TermsAndConditions')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="document-text-outline"
              size={16}
              color={colors.primary}
            />
            <Text
              style={[styles.quickActionText, { color: colors.primary }]}
            >
              Términos y Condiciones
            </Text>
          </TouchableOpacity>
        </View>

        {/* MENSAJES RESPONSIVOS + AUTOSCROLL */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
          contentContainerStyle={[
            styles.messagesContainer,
            {
              paddingHorizontal: horizontalPadding,
              paddingTop: horizontalPadding,
              paddingBottom: horizontalPadding / 2,
              width: '100%',
              maxWidth: maxContentWidth,
              alignSelf: 'center',
            },
          ]}
          renderItem={({ item }) => (
            <MessageBubble
              item={item}
              colors={colors}
              bubbleMaxWidth={bubbleMaxWidth}
              baseFont={baseFont}
            />
          )}
        />

        {/* COMPOSER RESPONSIVO */}
        <View
          style={[
            styles.composer,
            {
              borderTopColor: colors.muted,
              paddingHorizontal: horizontalPadding,
              paddingVertical: composerVerticalPadding,
            },
          ]}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Cuéntame qué quieres hacer en BalanceMe..."
            placeholderTextColor={colors.subText}
            multiline
            style={[
              styles.input,
              {
                color: colors.text,
                minHeight: inputMinHeight,
                maxHeight: inputMaxHeight,
                paddingHorizontal: isSmall ? 12 : 16,
                paddingVertical: isSmall ? 8 : 10,
                fontSize: baseFont,
              },
            ]}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: colors.primary,
                opacity: draft.trim() ? 1 : 0.6,
              },
            ]}
            onPress={handleSend}
            activeOpacity={0.85}
            disabled={!draft.trim()}
          >
            <Ionicons name="send" size={18} color={colors.primaryContrast} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  messagesContainer: {
    gap: 12,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowBot: { justifyContent: 'flex-start' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userBubble: {
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  messageAuthor: { marginBottom: 4 },
  messageText: {},
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export { MOOD_SUGGESTIONS, HABIT_SUGGESTIONS, JOURNAL_SUGGESTIONS };
