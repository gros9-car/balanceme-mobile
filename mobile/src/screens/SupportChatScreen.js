import React, { useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';

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

// Determina la respuesta empática del bot según palabras clave o plantillas aleatorias.
const generateBotMessage = (input) => {
  const text = input.trim().toLowerCase();
  if (!text) {
    return 'Estoy aquí para conversar cuando lo necesites.';
  }

  const match = keywordResponses.find((profile) => profile.keywords.some((keyword) => text.includes(keyword)));
  if (match) {
    return match.reply;
  }

  const template = supportiveTemplates[Math.floor(Math.random() * supportiveTemplates.length)];
  return `${template} ¿�Deseas que pensemos en un pequeño paso a seguir?`;
};

// Generador mejorado: detección de area corporal + anti-repetición (ASCII-seguro)
const createMessageGenerator2 = () => {
  let templateIndex = 0;
  let lastReply = '';

  const norm = (s) =>
    removeAccents(
      (s || '')
        .toLowerCase()
        .replace(/[^a-z\s]/gi, ' ')
        .replace(/\s+/g, ' ')
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

  // Categorías emocionales con múltiples variantes (para evitar repeticiones)
  const moodCategories = [
    {
      name: 'ansiedad',
      keywords: ['ansiedad', 'ansioso', 'ansiosa', 'angustia', 'nervioso', 'nerviosa', 'preocupado', 'preocupada'],
      replies: [
        'La ansiedad puede sentirse abrumadora. Probemos 3 respiraciones 4-4-6 ahora mismo.',
        'Te acompaño. Observa 5 cosas que ves, 4 que tocas y 3 sonidos.',
        'Pausa breve: hombros abajo y mandíbula suelta. ¿Cuál es el pensamiento más insistente?',
      ],
    },
    {
      name: 'estres',
      keywords: ['estres', 'estresado', 'estresada', 'presion', 'agotado', 'agotada', 'saturado', 'saturada'],
      replies: [
        'Parece mucha presión. Elige una tarea pequeña de 2 minutos y empecemos.',
        'Tomemos agua y 30s de respiración. ¿Qué puedes delegar o posponer hoy?',
        'Priorizamos: una cosa importante y una fácil. ¿Con cuál vas primero?',
      ],
    },
    {
      name: 'tristeza',
      keywords: ['triste', 'tristeza', 'bajon', 'bajon', 'deprim', 'llorar', 'solo', 'sola'],
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

  // Stopwords simples y helper para eco breve del contenido del usuario
  const stopWords = new Set(['yo','me','mi','mis','con','de','del','la','el','los','las','y','o','a','en','un','una','que','por','para','muy','mucho','tengo','siento','estoy','es','esta','esto','esa','ese','hoy','ahora']);
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

    // 2) Categorías emocionales con variantes
    const mood = moodCategories.find((c) => fuzzy(text, c.keywords));
    if (mood) {
      let reply = chooseVariant(mood.replies, lastReply);
      const echo = buildEcho(text);
      if (echo) reply = `${reply} ${echo}`.trim();
      lastReply = reply;
      remember(reply);
      return reply;
    }

    // 3) Tabla legada como respaldo
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
    const reply = `${base} ¿�Deseas que pensemos en un pequeno paso a seguir?`;
    lastReply = reply;
    remember(reply);
    return reply;
  };
};
// ---- Mejora de coincidencia y anti-repetición ----
// Normaliza texto y aplica coincidencia difusa para tolerar faltas de ortografía.
const removeAccents = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const normalize = (s) =>
  removeAccents(
    (s || '')
      .toLowerCase()
      .replace(/[^a-záéíóúñü\s]/gi, ' ')
      .replace(/\s+/g, ' ')
  )
    .trim()
    .replace(/([a-zñ])\1{1,}/g, '$1');

const levenshtein = (a, b) => {
  if (a === b) return 0;
  const m = a.length, n = b.length;
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

// Versión limpia de normalización y fuzzy para evitar problemas de codificación
const normalizeClean = (s) =>
  removeAccents(
    (s || '')
      .toLowerCase()
      .replace(/[^a-záéíóúñü\s]/gi, ' ')
      .replace(/\s+/g, ' ')
  )
    .trim()
    .replace(/([a-zñ])\1{1,}/g, '$1');

const fuzzyIncludesClean = (text, keywords) => {
  const tnorm = normalizeClean(text);
  const tokens = tnorm.split(/\s+/).filter(Boolean);
  for (const kw of keywords) {
    const nk = normalizeClean(kw);
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

// Plantillas con acentos correctos
const supportiveTemplatesClean = [
  'Gracias por compartirlo. Estoy aquí para escucharte.',
  'Respira profundo unos segundos. Estoy contigo en esto.',
  'Lo que sientes es válido. Estoy aquí para acompañarte.',
];

// Crea un generador de mensajes con memoria para evitar repeticiones.
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

    const base = supportiveTemplates[(templateIndex++) % supportiveTemplates.length];
    const reply = `${base} ¿�Deseas que pensemos en un pequeño paso a seguir?`;
    lastReply = reply;
    return reply;
  };
};

// Renderiza una burbuja de mensaje adaptada al remitente actual.
const MessageBubble = ({ item, colors }) => {
  const isUser = item.role === 'user';
  const bubbleStyle = isUser ? styles.userBubble : [styles.botBubble, { backgroundColor: colors.muted }];
  const textColor = isUser ? colors.primaryContrast : colors.text;

  return (
    <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowBot]}>
      {!isUser ? (
        <View style={[styles.avatar, { backgroundColor: colors.primary + '22' }]}>
          <Ionicons name="heart" size={16} color={colors.primary} />
        </View>
      ) : null}
      <View style={[bubbleStyle, isUser && { backgroundColor: colors.primary }]}>
        <Text style={[styles.messageAuthor, { color: textColor }]}>{isUser ? 'Tú' : botName}</Text>
        <Text style={[styles.messageText, { color: textColor }]}>{item.text}</Text>
      </View>
      {isUser ? (
        <View style={[styles.avatar, { backgroundColor: colors.primary + '22' }]}>
          <Ionicons name="person" size={16} color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
};

// Chat de apoyo anónimo que simula respuestas empáticas instantáneas.
export default function SupportChatScreen({ navigation }) {
  const { colors } = useTheme();
  // Generador con memoria (rotación de plantillas y anti-repetición)
  const generateBotMessageRef = useRef(createMessageGenerator2());
  const [messages, setMessages] = useState([
    {
      id: 'intro',
      role: 'bot',
      text: `Hola, soy ${botName}. Gracias por acercarte. Cuéntame, ¿En qué te gustaría trabajar hoy?`,
    },
  ]);
  const [draft, setDraft] = useState('');

  // Agrega el mensaje del usuario y la respuesta generada del bot.
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <View style={[styles.header, { borderBottomColor: colors.muted }]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
            <Text style={[styles.backText, { color: colors.text }]}>Volver</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{botName}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.subText }]}>Tu compañero de apoyo emocional</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContainer}
          renderItem={(info) => <MessageBubble item={info.item} colors={colors} />}
        />

        <View style={[styles.composer, { borderColor: colors.muted }]}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Comparte lo que sientes ahora..."
            placeholderTextColor={colors.subText}
            style={[styles.input, { color: colors.text }]}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: colors.primary }]}
            onPress={handleSend}
            activeOpacity={0.85}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  headerSpacer: {
    width: 32,
  },
  messagesContainer: {
    padding: 20,
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
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  messageAuthor: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
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

