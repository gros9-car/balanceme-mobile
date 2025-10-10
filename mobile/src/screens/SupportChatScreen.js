import React, { useMemo, useState } from 'react';
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
  'Gracias por compartirlo. Estoy aqui para escucharte.',
  'Respira profundo unos segundos. Estoy contigo en esto.',
  'Lo que sientes es valido. Estoy aqui para acompañarte.',
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
      'Parece que cargas mucha presión. Quizá puedas hacer una pausa breve y relajar hombros y mandíbula. ¿Qué te ayudaría a liberar un poco de tensión hoy?',
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
  return `${template} ¿Deseas que pensemos en un pequeño paso a seguir?`;
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
  const [messages, setMessages] = useState([
    {
      id: 'intro',
      role: 'bot',
      text: `Hola, soy ${botName}. Gracias por acercarte. Cuéntame, ¿en qué te gustaría trabajar hoy?`,
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
      text: generateBotMessage(trimmed),
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
