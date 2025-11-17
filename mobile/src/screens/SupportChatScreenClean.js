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
    .replace(/([a-z])\1{1,}/g, '$1');

const levenshtein = (a, b) => {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
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

// ---------------- Intents y flujos guiados para la app ----------------
const appIntents = [
  {
    id: 'about_app',
    keywords: [
      'que es balanceme',
      'que es la app',
      'para que sirve la app',
      'como funciona balanceme',
      'balancito',
    ],
  },
  {
    id: 'create_goal',
    keywords: [
      'crear meta',
      'nueva meta',
      'nuevo habito',
      'nuevo hábito',
      'objetivo',
      'configurar meta',
    ],
  },
  {
    id: 'log_mood',
    keywords: [
      'registrar animo',
      'registrar ánimo',
      'estado de animo',
      'estado de ánimo',
      'como me siento',
      'diario emocional',
    ],
  },
  {
    id: 'view_report',
    keywords: [
      'ver reporte',
      'reporte semanal',
      'resumen',
      'estadisticas',
      'estadísticas',
      'grafico',
      'gráfico',
    ],
  },
  {
    id: 'notifications',
    keywords: [
      'recordatorio',
      'notificacion',
      'notificación',
      'alarma',
      'avisos',
    ],
  },
  {
    id: 'profile',
    keywords: [
      'perfil',
      'cuenta',
      'cerrar sesion',
      'cerrar sesión',
      'tema oscuro',
      'modo oscuro',
      'modo claro',
      'configuracion',
      'configuración',
    ],
  },
];

const flows = {
  create_goal: {
    start: 'askType',
    nodes: {
      askType: {
        text:
          'Perfecto, te ayudo a crear una meta. ¿Qué tipo de meta quieres crear? (por ejemplo: "hábito diario", "meta puntual" o "meta semanal")',
        options: [
          {
            label: 'Hábito diario',
            next: 'habitDaily',
            keywords: ['habito', 'hábito', 'diario'],
          },
          {
            label: 'Meta puntual',
            next: 'singleGoal',
            keywords: ['puntual', 'una vez'],
          },
          {
            label: 'Meta semanal',
            next: 'weekly',
            keywords: ['semanal', 'semana'],
          },
        ],
      },
      habitDaily: {
        text:
          'Para crear un hábito diario:\n1) Ve a la sección "Metas".\n2) Toca el botón "Nueva meta".\n3) Elige el tipo "Hábito diario".\n4) Define nombre, frecuencia y horario.\n\nCuando termines, podrás marcar el hábito como completado cada día desde la misma pantalla.',
        options: [],
      },
      singleGoal: {
        text:
          'Para crear una meta puntual:\n1) Ve a "Metas".\n2) Toca "Nueva meta".\n3) Selecciona "Meta puntual".\n4) Define qué quieres lograr y una fecha límite.\n\nAsí BalanceMe podrá recordarte y mostrar tu avance.',
        options: [],
      },
      weekly: {
        text:
          'Para crear una meta semanal:\n1) Entra a "Metas".\n2) Pulsa "Nueva meta".\n3) Elige "Meta semanal".\n4) Indica cuántos días a la semana quieres cumplirla.\n\nTus reportes reflejarán cuántas veces la cumpliste cada semana.',
        options: [],
      },
    },
  },
  log_mood: {
    start: 'explain',
    nodes: {
      explain: {
        text:
          'Para registrar tu estado de ánimo:\n1) Ve a la sección "Ánimo" o "Diario".\n2) Elige el emoji o etiqueta que mejor te represente.\n3) (Opcional) Escribe una nota breve sobre lo que te pasó.\n\nAsí podrás ver cómo cambias con el tiempo en los reportes.',
        options: [],
      },
    },
  },
  view_report: {
    start: 'explain',
    nodes: {
      explain: {
        text:
          'Para ver tus reportes:\n1) Ve a la pestaña "Progreso" o "Reportes".\n2) Elige el rango de fechas (por ejemplo, esta semana).\n3) Revisa el gráfico de ánimo, hábitos cumplidos y metas avanzadas.\n\nSi quieres, dime qué quieres entender y te explico el gráfico.',
        options: [],
      },
    },
  },
};

// ---------------- Message generator ----------------
const createMessageGenerator = () => {
  let currentFlowId = null;
  let currentNodeId = null;

  const findIntent = (textNorm) => {
    for (const intent of appIntents) {
      if (fuzzy(textNorm, intent.keywords)) return intent.id;
    }
    return null;
  };

  const replyForIntent = (intentId) => {
    switch (intentId) {
      case 'about_app':
        return (
          'BalanceMe es una app para cuidar tu bienestar emocional.\n' +
          'Con ella puedes:\n' +
          '• Registrar cómo te sientes día a día.\n' +
          '• Crear metas y hábitos saludables.\n' +
          '• Ver reportes con tu progreso.\n\n' +
          'Puedo guiarte para crear una meta, registrar tu ánimo o revisar tus reportes. ¿Qué te gustaría hacer?'
        );
      case 'notifications':
        return (
          'Para configurar recordatorios:\n' +
          '1) Ve a la sección de "Configuración" o "Perfil".\n' +
          '2) Entra a "Notificaciones" o "Recordatorios".\n' +
          '3) Activa las alertas y ajusta horarios según tus metas.\n\n' +
          'Así BalanceMe te avisará cuando sea momento de registrar tu ánimo o tus hábitos.'
        );
      case 'profile':
        return (
          'Desde tu perfil puedes:\n' +
          '• Cambiar entre modo claro y oscuro.\n' +
          '• Cerrar sesión.\n' +
          '• Revisar datos de tu cuenta.\n\n' +
          'Solo entra a "Perfil" desde el menú principal y ajusta lo que necesites.'
        );
      default:
        return null;
    }
  };

  const buildFlowReply = (node) => {
    if (!node) {
      return 'Hubo un problema al guiar el flujo. Intenta de nuevo, por favor.';
    }
    if (!node.options || node.options.length === 0) {
      return node.text;
    }
    const optsText = node.options.map((o) => `• ${o.label}`).join('\n');
    return `${node.text}\n\nOpciones:\n${optsText}`;
  };

  const startFlow = (flowId) => {
    currentFlowId = flowId;
    currentNodeId = flows[flowId].start;
    const node = flows[flowId].nodes[currentNodeId];
    return buildFlowReply(node);
  };

  const advanceFlow = (textNorm) => {
    if (!currentFlowId || !currentNodeId) return null;
    const flow = flows[currentFlowId];
    const node = flow.nodes[currentNodeId];
    if (!node || !node.options || node.options.length === 0) {
      currentFlowId = null;
      currentNodeId = null;
      return null;
    }

    for (const opt of node.options) {
      const kws = opt.keywords && opt.keywords.length ? opt.keywords : [opt.label];
      if (fuzzy(textNorm, kws)) {
        currentNodeId = opt.next;
        const nextNode = flow.nodes[currentNodeId];
        const reply = buildFlowReply(nextNode);
        if (!nextNode.options || nextNode.options.length === 0) {
          currentFlowId = null;
          currentNodeId = null;
        }
        return reply;
      }
    }

    return (
      'No me quedó claro qué opción elegiste.\n' +
      'Puedes responder, por ejemplo, "hábito diario", "meta puntual" o "meta semanal".'
    );
  };

  const fallback = () =>
    'Puedo ayudarte con:\n' +
    '• Crear una meta u hábito\n' +
    '• Registrar tu estado de ánimo\n' +
    '• Ver tus reportes\n' +
    '• Configurar notificaciones\n\n' +
    'Escríbeme algo como: "quiero crear una meta" o "cómo registro mi ánimo".';

  return (input) => {
    const textNorm = norm(input);
    if (!textNorm) {
      return 'Cuéntame qué quieres hacer en la app y te guío paso a paso.';
    }

    // Si ya estamos en un flujo, intentamos avanzar
    if (currentFlowId && currentNodeId) {
      const flowReply = advanceFlow(textNorm);
      if (flowReply) return flowReply;
    }

    // Detectar nuevo intent
    const intentId = findIntent(textNorm);

    if (intentId === 'create_goal') {
      return startFlow('create_goal');
    }
    if (intentId === 'log_mood') {
      return startFlow('log_mood');
    }
    if (intentId === 'view_report') {
      return startFlow('view_report');
    }

    const direct = replyForIntent(intentId);
    if (direct) return direct;

    // Fallback genérico
    return fallback();
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

  const generateRef = useRef(createMessageGenerator());
  const [messages, setMessages] = useState([
    {
      id: 'intro',
      role: 'bot',
      text: `Hola, soy ${botName}. Puedo guiarte para usar BalanceMe: crear metas, registrar tu ánimo o ver tus reportes. ¿Qué te gustaría hacer?`,
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
