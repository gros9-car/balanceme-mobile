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

const supportiveTemplates = [
  'Gracias por compartirlo. Estoy aquí para escucharte.',
  'Respira profundo unos segundos. Estoy contigo en esto.',
  'Lo que sientes es válido. Estoy aquí para acompañarte.',
];

const keywordResponses = [
  {
    keywords: ['ansiedad', 'ansioso', 'ansiosa', 'angustiado', 'angustiada', 'nervioso', 'nerviosa'],
    reply:
      'La ansiedad puede ser muy intensa. Intenta inhalar contando hasta cuatro, sostener cuatro segundos y exhalar lentamente. Cuéntame qué pensamientos te acompañan ahora mismo.',
  },
  {
    keywords: ['estres', 'estresado', 'estresada', 'agotado', 'agotada', 'presion'],
    reply:
      'Parece que cargas mucha presión. Quizás puedas hacer una pausa breve y relajar hombros y mandíbula. ¿Qué te ayudaría a liberar un poco de tensión hoy?',
  },
  {
    keywords: ['triste', 'deprim', 'llorar', 'solo', 'sola', 'malo'],
    reply:
      'Siento que te sientas así. A veces nombrar lo que sentimos alivia un poco. ¿Hay alguien o algo que te dé consuelo? Estoy aquí para apoyarte.',
  },
  {
    keywords: ['enojo', 'molesto', 'furioso', 'rabia'],
    reply:
      'El enojo es una señal importante. Tal vez podrías canalizarlo a través de movimiento o escribir lo que piensas antes de actuar. ¿Quieres contarme qué lo provocó?',
  },
  {
    keywords: ['bien', 'contento', 'contenta', 'agradecido', 'agradecida', 'feliz'],
    reply:
      '¡Me alegra escuchar eso! Celebra ese momento y piensa en cómo puedes mantener esa sensación. ¿Qué hizo que tu día fuera mejor?',
  },
];

// ---- Utils de normalización y fuzzy (JS puro) ----
const removeAccents = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalize = (s) =>
  removeAccents(
    (s || '')
      .toLowerCase()
      .replace(/[^a-záéíóúñü\s]/gi, ' ')
      .replace(/\s+/g, ' '),
  )
    .trim()
    .replace(/([a-zñ])\1{1,}/g, '$1');

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

const fuzzyIncludes = (text, keywords) => {
  const tnorm = normalize(text);
  const tokens = tnorm.split(/\s+/).filter(Boolean);
  for (const kw of keywords) {
    const nk = normalize(kw);
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

const supportiveTemplatesClean = [
  'Gracias por compartirlo. Estoy aquí para escucharte.',
  'Respira profundo unos segundos. Estoy contigo en esto.',
  'Lo que sientes es válido. Estoy aquí para acompañarte.',
];

// ====== GENERADOR AVANZADO createMessageGenerator2 (JS limpio) ======
const createMessageGenerator2 = () => {
  let templateIndex = 0;
  let lastReply = '';

  const norm = (s) =>
    removeAccents(
      (s || '')
        .toLowerCase()
        .replace(/[^a-z\s]/gi, ' ')
        .replace(/\s+/g, ' '),
    )
      .trim()
      .replace(/([a-z])\1{1,}/g, '$1');

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

  const templates = [
    'Gracias por compartirlo. Estoy aqui para escucharte.',
    'Respira profundo unos segundos. Estoy contigo en esto.',
    'Lo que sientes es valido. Estoy aqui para acompanarte.',
  ];

  const followUps = [' Estoy contigo.', ' Aqui para ti.', ' Te leo.'];

  const bodyAreas = [
    {
      area: 'hombros',
      keywords: ['hombro', 'hombros', 'trapecio', 'trapecios', 'espalda alta'],
      reply:
        'Noto que mencionas tension en los hombros. Probemos ahora: 3 respiraciones 4-4-6; encoge hombros a las orejas 5s y suelta (x3); inclina la cabeza a cada lado 15s. ¿Quieres guia de 30s?',
    },
    {
      area: 'cuello',
      keywords: ['cuello', 'nuca', 'cervical'],
      reply:
        'Parece que hay tension en el cuello. Propongo: barbilla al pecho 10s; mira a la derecha e izquierda 10s; oreja a hombro 15s por lado. ¿Lo hacemos ahora?',
    },
    {
      area: 'espalda',
      keywords: ['espalda', 'lumbares', 'lumbar', 'dorsal'],
      reply:
        'Para la espalda: postura neutra y 3 respiraciones profundas; gato-vaca suave 5 repeticiones; abraza tus rodillas 15s si es comodo. ¿Te sirve intentarlo?',
    },
    {
      area: 'mandibula',
      keywords: ['mandibula', 'apretar dientes', 'bruxismo'],
      reply:
        'La mandibula cargada es comun con la tension. Prueba: separa suavemente los dientes; masajea cerca de las orejas 20s; respira 4-4-6 tres veces. ¿Quieres mas ideas?',
    },
  ];

  const moodCategories = [
    {
      name: 'ansiedad',
      keywords: [
        'ansiedad',
        'ansioso',
        'ansiosa',
        'angustia',
        'nervioso',
        'nerviosa',
        'preocupado',
        'preocupada',
      ],
      replies: [
        'La ansiedad puede sentirse abrumadora. Probemos 3 respiraciones 4-4-6 ahora mismo.',
        'Te acompaño. Observa 5 cosas que ves, 4 que tocas y 3 sonidos.',
        'Pausa breve: hombros abajo y mandíbula suelta. ¿Cuál es el pensamiento más insistente?',
      ],
    },
    {
      name: 'estres',
      keywords: [
        'estres',
        'estresado',
        'estresada',
        'presion',
        'agotado',
        'agotada',
        'saturado',
        'saturada',
      ],
      replies: [
        'Parece mucha presión. Elige una tarea pequeña de 2 minutos y empecemos.',
        'Tomemos agua y 30s de respiración. ¿Qué puedes delegar o posponer hoy?',
        'Priorizamos: una cosa importante y una fácil. ¿Con cuál vas primero?',
      ],
    },
    {
      name: 'tristeza',
      keywords: ['triste', 'tristeza', 'bajon', 'deprim', 'llorar', 'solo', 'sola'],
      replies: [
        'Siento que te sientas así. Nombrarlo ya es un paso. ¿Qué podría darte un poco de alivio ahora?',
        'Gracias por compartirlo. ¿Te gustaría escribir tres frases sobre lo que sientes?',
        'Valido lo que sientes. ¿Hay alguien o algo que te dé consuelo?',
      ],
    },
    {
      name: 'enojo',
      keywords: ['enojo', 'molesto', 'molesta', 'furioso', 'furiosa', 'rabia', 'ira'],
      replies: [
        'El enojo es señal de límites. Movamos el cuerpo 30s antes de responder. ¿Qué lo detonó?',
        'Tiene sentido que lo sientas. ¿Quieres escribir un borrador sin enviarlo?',
        'Respiremos y aclaremos límites: ¿qué necesitas pedir o proteger?',
      ],
    },
    {
      name: 'positivo',
      keywords: ['bien', 'contento', 'contenta', 'agradecido', 'agradecida', 'feliz', 'alegre'],
      replies: [
        '¡Qué bueno! Celebremos ese momento. ¿Qué lo hizo posible?',
        'Excelente. ¿Qué hábito pequeño ayuda a sostener esa sensación?',
        'Genial. ¿Cómo puedes repetir lo que funcionó hoy?',
      ],
    },
  ];

  const stopWords = new Set([
    'yo',
    'me',
    'mi',
    'mis',
    'con',
    'de',
    'del',
    'la',
    'el',
    'los',
    'las',
    'y',
    'o',
    'a',
    'en',
    'un',
    'una',
    'que',
    'por',
    'para',
    'muy',
    'mucho',
    'tengo',
    'siento',
    'estoy',
    'es',
    'esta',
    'esto',
    'esa',
    'ese',
    'hoy',
    'ahora',
  ]);

  const recent = [];

  const remember = (reply) => {
    recent.push(reply);
    if (recent.length > 4) recent.shift();
  };

  const chooseVariant = (arr, last) => {
    if (!arr || arr.length === 0) return '';
    const blacklist = new Set(recent);
    let choice = arr[Math.floor(Math.random() * arr.length)];
    let guard = 0;
    while (arr.length > 1 && (choice === last || blacklist.has(choice)) && guard < 8) {
      const i = (templateIndex++) % arr.length;
      choice = arr[i];
      guard++;
    }
    return choice;
  };

  const buildEcho = (raw) => {
    const tokens = norm(raw).split(/\s+/).filter(Boolean);
    const terms = [];
    for (const t of tokens) {
      if (t.length >= 4 && !stopWords.has(t) && !terms.includes(t)) terms.push(t);
      if (terms.length >= 2) break;
    }
    if (terms.length === 0) return '';
    if (terms.length === 1) return `Te leo: mencionas ${terms[0]}.`;
    return `Te leo: mencionas ${terms[0]} y ${terms[1]}.`;
  };

  return (input) => {
    const text = norm(input);
    if (!text) return 'Estoy aqui para conversar cuando lo necesites.';

    const area = bodyAreas.find((a) => fuzzy(text, a.keywords));
    if (area) {
      let reply = area.reply;
      if (reply === lastReply) {
        const extra = followUps[(templateIndex++) % followUps.length];
        reply = `${reply} ${extra}`.trim();
      }
      lastReply = reply;
      remember(reply);
      return reply;
    }

    const mood = moodCategories.find((c) => fuzzy(text, c.keywords));
    if (mood) {
      let reply = chooseVariant(mood.replies, lastReply);
      const echo = buildEcho(text);
      if (echo) reply = `${reply} ${echo}`.trim();
      lastReply = reply;
      remember(reply);
      return reply;
    }

    const match = keywordResponses.find((p) => fuzzy(text, p.keywords));
    if (match) {
      let reply = match.reply || '';
      if (reply === lastReply) {
        const extra = followUps[(templateIndex++) % followUps.length];
        reply = `${reply}${extra}`.trim();
      }
      lastReply = reply;
      return reply;
    }

    const base = templates[(templateIndex++) % templates.length];
    const reply = `${base} ¿Deseas que pensemos en un pequeno paso a seguir?`;
    lastReply = reply;
    remember(reply);
    return reply;
  };
};

// ===== GENERADOR SIMPLE (fallback, por si lo quieres usar en otro lado) =====
const createMessageGenerator = () => {
  let templateIndex = 0;
  let lastReply = '';
  const followUps = [' Estoy contigo.', ' Aquí para ti.', ' Te leo.'];

  return (input) => {
    const text = normalize(input);
    if (!text) return 'Estoy aquí para conversar cuando lo necesites.';

    const match = keywordResponses.find((p) => fuzzyIncludes(text, p.keywords));
    if (match) {
      let reply = match.reply || '';
      if (reply === lastReply) {
        const extra = followUps[(templateIndex++) % followUps.length];
        reply = `${reply}${extra}`.trim();
      }
      lastReply = reply;
      return reply;
    }

    const base = supportiveTemplatesClean[(templateIndex++) % supportiveTemplatesClean.length];
    const reply = `${base} ¿Deseas que pensemos en un pequeño paso a seguir?`;
    lastReply = reply;
    return reply;
  };
};

// ===== HOOK DE RESPONSIVIDAD PARA ESTE CHAT =====
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

// Renderiza una burbuja de mensaje adaptada al remitente actual.
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
            {
              color: textColor,
              fontSize: baseFont,
              lineHeight: baseFont * 1.45,
            },
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

// Chat de apoyo anónimo que simula respuestas empáticas instantáneas.
export default function SupportChatScreen({ navigation }) {
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

  const generateBotMessageRef = useRef(createMessageGenerator2());
  const [messages, setMessages] = useState([
    {
      id: 'intro',
      role: 'bot',
      text: `Hola, soy ${botName}. Gracias por acercarte. Cuéntame, ¿en qué te gustaría trabajar hoy?`,
    },
  ]);
  const [draft, setDraft] = useState('');

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const botMessage = {
      id: `bot-${Date.now()}`,
      role: 'bot',
      text: generateBotMessageRef.current(trimmed),
    };

    setMessages((prev) => [...prev, userMessage, botMessage]);
    setDraft('');
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
            subtitle="Tu compañero de apoyo emocional"
          />
        </View>

        {/* MENSAJES RESPONSIVOS */}
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
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
            placeholder="Comparte lo que sientes ahora..."
            placeholderTextColor={colors.subText}
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
            multiline
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
  container: {
    flex: 1,
  },
  messagesContainer: {
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowBot: {
    justifyContent: 'flex-start',
  },
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
  messageAuthor: {
    marginBottom: 4,
  },
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
