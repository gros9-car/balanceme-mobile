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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';

const botName = 'Balancito';

// ---------------- NLP helpers ----------------
const removeAccents = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const norm = (s) =>
  removeAccents((s || '')
    .toLowerCase()
    .replace(/[^a-z\s]/gi, ' ')
    .replace(/\s+/g, ' '))
    .trim()
    .replace(/([a-z])\1{1,}/g, '$1');

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

// ---------------- Knowledge & responses ----------------
const templates = [
  'Gracias por compartirlo. Estoy aqui para escucharte.',
  'Respira profundo unos segundos. Estoy contigo en esto.',
  'Lo que sientes es valido. Estoy aqui para acompanarte.',
];

const bodyAreas = [
  {
    area: 'hombros',
    keywords: ['hombro', 'hombros', 'trapecio', 'trapecios', 'espalda alta'],
    reply:
      'Noto que mencionas tension en los hombros. Probemos ahora: 1) 3 respiraciones 4-4-6; 2) encoge hombros a las orejas 5s y suelta (x3); 3) inclina la cabeza a cada lado 15s. Quieres guia de 30s?',
  },
  {
    area: 'cuello',
    keywords: ['cuello', 'nuca', 'cervical'],
    reply:
      'Parece que hay tension en el cuello. Propongo: 1) barbilla al pecho 10s; 2) mira a la derecha e izquierda 10s; 3) oreja a hombro 15s por lado. Lo hacemos ahora?',
  },
  {
    area: 'espalda',
    keywords: ['espalda', 'lumbares', 'lumbar', 'dorsal'],
    reply:
      'Para la espalda: 1) postura neutra y 3 respiraciones profundas; 2) gato-vaca suave 5 repeticiones; 3) abraza tus rodillas 15s si es comodo. Te sirve intentarlo?',
  },
  {
    area: 'mandibula',
    keywords: ['mandibula', 'apretar dientes', 'bruxismo'],
    reply:
      'La mandibula cargada es comun con la tension. Prueba: separa suavemente los dientes; masajea cerca de las orejas 20s; respira 4-4-6 tres veces. Quieres mas ideas?',
  },
];

const moodCategories = [
  {
    name: 'ansiedad',
    keywords: ['ansiedad', 'ansioso', 'ansiosa', 'angustia', 'nervioso', 'nerviosa', 'preocupado', 'preocupada'],
    replies: [
      'La ansiedad puede sentirse abrumadora. Probemos 3 respiraciones 4-4-6 ahora mismo.',
      'Te acompano. Observa 5 cosas que ves, 4 que tocas y 3 sonidos.',
      'Pausa breve: hombros abajo y mandibula suelta. Cual es el pensamiento mas insistente?',
    ],
  },
  {
    name: 'estres',
    keywords: ['estres', 'estresado', 'estresada', 'presion', 'agotado', 'agotada', 'saturado', 'saturada'],
    replies: [
      'Parece mucha presion. Elige una tarea pequena de 2 minutos y empecemos.',
      'Tomemos agua y 30s de respiracion. Que puedes delegar o posponer hoy?',
      'Priorizamos: una cosa importante y una facil. Con cual vas primero?',
    ],
  },
  {
    name: 'tristeza',
    keywords: ['triste', 'tristeza', 'bajon', 'deprim', 'llorar', 'solo', 'sola'],
    replies: [
      'Siento que te sientas asi. Nombrarlo ya es un paso. Que podria darte un poco de alivio ahora?',
      'Gracias por compartirlo. Te gustaria escribir tres frases sobre lo que sientes?',
      'Valido lo que sientes. Hay alguien o algo que te de consuelo?',
    ],
  },
  {
    name: 'enojo',
    keywords: ['enojo', 'molesto', 'molesta', 'furioso', 'furiosa', 'rabia', 'ira'],
    replies: [
      'El enojo es senal de limites. Movamos el cuerpo 30s antes de responder. Que lo detono?',
      'Tiene sentido que lo sientas. Quieres escribir un borrador sin enviarlo?',
      'Respiremos y aclaremos limites: que necesitas pedir o proteger?',
    ],
  },
  {
    name: 'positivo',
    keywords: ['bien', 'contento', 'contenta', 'agradecido', 'agradecida', 'feliz', 'alegre'],
    replies: [
      'Que bueno! Celebremos ese momento. Que lo hizo posible?',
      'Excelente. Que habito pequeno ayuda a sostener esa sensacion?',
      'Genial. Como puedes repetir lo que funciono hoy?',
    ],
  },
];

const intents = {
  crisis: ['suicid', 'autoles', 'hacerme dano', 'hacerme daño', 'no quiero vivir', 'quitarme la vida'],
  panic: ['ataque de panico', 'ataque de panico', 'hipervent', 'no puedo respirar'],
  breathing_guide: ['respirar', 'respiracion', 'respiración', 'guiame a respirar', 'ayudame a respirar', 'ayudame a respirar'],
  stretch_guide: ['estirar', 'estiramiento', 'alongar', 'descontracturar', 'estirar hombros', 'estirar cuello'],
  ask_steps: ['como hago', 'como puedo', 'que puedo hacer', 'pasos', 'guia', 'guia', 'ayudame', 'ayudame'],
  tips: ['tips', 'consejos', 'ideas', 'recomendaciones'],
  plan: ['plan', 'rutina', 'propuesta', 'agenda'],
  resources: ['psicolog', 'terapia', 'profesional', 'hablar con alguien', 'ayuda profesional'],
};

const parseIntent = (t) => {
  const hit = (arr) => arr.some((k) => fuzzy(t, [k]));
  if (hit(intents.crisis)) return { type: 'crisis' };
  if (hit(intents.panic)) return { type: 'panic' };
  if (hit(intents.breathing_guide)) return { type: 'breathing_guide' };
  if (hit(intents.stretch_guide)) return { type: 'stretch_guide' };
  if (hit(intents.plan)) return { type: 'plan' };
  if (hit(intents.tips)) return { type: 'tips' };
  if (hit(intents.resources)) return { type: 'resources' };
  if (hit(intents.ask_steps)) return { type: 'ask_steps' };

  const m = t.match(/(\d+)\s*(s|seg|min|mins|minuto|minutos|segundo|segundos)/);
  const durationSec = m ? (m[2].startsWith('s') ? parseInt(m[1], 10) : parseInt(m[1], 10) * 60) : undefined;
  return { type: 'none', durationSec };
};

// ---------------- Message generator ----------------
const createMessageGenerator = () => {
  let templateIndex = 0;
  let lastReply = '';
  const recent = [];
  const remember = (reply) => {
    recent.push(reply);
    if (recent.length > 4) recent.shift();
  };
  const chooseVariant = (arr) => {
    if (!arr || arr.length === 0) return '';
    let choice = arr[Math.floor(Math.random() * arr.length)];
    let guard = 0;
    while (arr.length > 1 && (recent.includes(choice) || choice === lastReply) && guard < 8) {
      choice = arr[(templateIndex++) % arr.length];
      guard++;
    }
    return choice;
  };
  const stopWords = new Set(['yo','me','mi','mis','con','de','del','la','el','los','las','y','o','a','en','un','una','que','por','para','muy','mucho','tengo','siento','estoy','es','esta','esto','esa','ese','hoy','ahora']);
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

    const nlu = parseIntent(text);

    // Seguridad
    if (nlu.type === 'crisis') {
      const reply = 'Siento que estes pasando por esto. Tu seguridad importa. Si estas en peligro o piensas hacerte dano, contacta emergencias o alguien de confianza ahora mismo. Puedo quedarme contigo y respirar juntos.';
      lastReply = reply; remember(reply); return reply;
    }
    if (nlu.type === 'panic' || nlu.type === 'breathing_guide') {
      const secs = nlu.durationSec && nlu.durationSec >= 20 ? nlu.durationSec : 60;
      const reply = `Hagamos respiracion 4-4-6 durante ${secs}s: inhala 4s, sosten 4s y exhala 6s. Mano en pecho y otra en abdomen. Dime si quieres otra ronda o grounding.`;
      lastReply = reply; remember(reply); return reply;
    }

    // Area corporal
    const area = bodyAreas.find((a) => fuzzy(text, a.keywords));
    if (area) {
      let reply = area.reply;
      if (reply === lastReply || recent.includes(reply)) {
        reply = `${reply} Estoy contigo.`;
      }
      lastReply = reply; remember(reply); return reply;
    }

    // Estirar / plan / tips / recursos
    if (nlu.type === 'stretch_guide') {
      const reply = 'Soltemos tension: 1) hombros a orejas 5s y suelta (x3); 2) oreja a hombro 15s por lado; 3) barbilla al pecho 10s. Como se siente?';
      lastReply = reply; remember(reply); return reply;
    }
    if (nlu.type === 'plan') {
      const reply = 'Plan breve: ahora 1) respirar 60s; luego 2) una tarea de 2 minutos; despues 3) un vaso de agua y check-in. Te parece?';
      lastReply = reply; remember(reply); return reply;
    }
    if (nlu.type === 'tips' || nlu.type === 'ask_steps') {
      const reply = 'Puedo ayudarte con: 1) Respirar 4-4-6 (1 min) 2) Estirar hombros/cuello (30s) 3) Grounding 5-4-3-2-1. Dime "respirar", "estirar" o "grounding".';
      lastReply = reply; remember(reply); return reply;
    }
    if (nlu.type === 'resources') {
      const reply = 'Buscar apoyo es valiente. Habla con alguien de confianza o con un profesional de salud mental. Si quieres, pensamos juntos como dar el primer paso.';
      lastReply = reply; remember(reply); return reply;
    }

    // Emocion/mood
    const mood = moodCategories.find((c) => fuzzy(text, c.keywords));
    if (mood) {
      let reply = chooseVariant(mood.replies);
      const echo = buildEcho(text);
      if (echo) reply = `${reply} ${echo}`.trim();
      lastReply = reply; remember(reply); return reply;
    }

    // Plantilla de apoyo rotando sin repetir recientes
    let base = templates[(templateIndex++) % templates.length];
    let guard = 0;
    while (guard < templates.length + 2 && (recent.includes(base) || base === lastReply)) {
      base = templates[(templateIndex++) % templates.length];
      guard++;
    }
    const reply = `${base} Deseas que pensemos en un pequeno paso a seguir?`;
    lastReply = reply; remember(reply); return reply;
  };
};

// ---------------- UI ----------------
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
        <Text style={[styles.messageAuthor, { color: textColor }]}>{isUser ? 'Tu' : botName}</Text>
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

export default function SupportChatScreenClean({ navigation }) {
  const { colors } = useTheme();
  const generateRef = useRef(createMessageGenerator());
  const [messages, setMessages] = useState([
    {
      id: 'intro',
      role: 'bot',
      text: `Hola, soy ${botName}. Gracias por acercarte. Cuentame, en que te gustaria trabajar hoy?`,
    },
  ]);
  const [draft, setDraft] = useState('');

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;

    const userMessage = { id: `user-${Date.now()}`, role: 'user', text: trimmed };
    const botMessage = {
      id: `bot-${Date.now()}`,
      role: 'bot',
      text: generateRef.current(trimmed),
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
        <View style={[styles.header, { borderBottomColor: colors.muted }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
            <Text style={[styles.backText, { color: colors.text }]}>Volver</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{botName}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.subText }]}>Tu companero de apoyo emocional</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContainer}
          renderItem={(info) => <MessageBubble item={info.item} colors={colors} />}
        />

        <View style={[styles.composer, { borderColor: colors.muted }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Comparte lo que sientes ahora..."
            placeholderTextColor={colors.subText}
            style={[styles.input, { color: colors.text }]}
            multiline
          />
          <TouchableOpacity style={[styles.sendButton, { backgroundColor: colors.primary }]} onPress={handleSend} activeOpacity={0.85}>
            <Ionicons name="send" size={18} color={colors.primaryContrast} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { fontSize: 14, fontWeight: '500' },
  headerTitleBlock: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, fontWeight: '500' },
  headerSpacer: { width: 32 },
  messagesContainer: { padding: 20, gap: 12 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowBot: { justifyContent: 'flex-start' },
  avatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  userBubble: { maxWidth: '75%', padding: 12, borderRadius: 16, borderBottomRightRadius: 4 },
  botBubble: { maxWidth: '75%', padding: 12, borderRadius: 16, borderBottomLeftRadius: 4 },
  messageAuthor: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  messageText: { fontSize: 14, lineHeight: 20 },
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
  sendButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});

