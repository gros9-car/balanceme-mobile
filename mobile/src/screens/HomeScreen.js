import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  const [userName] = useState('Usuario'); // Cambiar por el nombre real del usuario
  const [currentStreak] = useState(5); // Días consecutivos de registro
  const [lastMood] = useState('calm'); // Último estado de ánimo registrado

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getMoodEmoji = (mood) => {
    const moods = {
      happy: '😊',
      calm: '😌',
      sad: '😢',
      anxious: '😰',
      angry: '😠',
    };
    return moods[mood] || '😊';
  };

  const getPersonalizedTip = () => {
    const hour = new Date().getHours();
    
    if (hour < 9) {
      return 'Comienza tu día con 5 minutos de respiración consciente';
    } else if (hour >= 12 && hour < 15) {
      return 'Es mediodía, toma un momento para hacer una pausa y estirar tu cuerpo';
    } else if (hour >= 18) {
      return 'Reflexiona sobre tu día escribiendo en tu diario';
    }
    return 'Registra cómo te sientes en este momento';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="heart" size={24} color="#fff" />
          </View>
          <Text style={styles.appName}>BalanceMe</Text>
          <Text style={styles.tagline}>Tu espacio de bienestar</Text>
        </View>

        {/* Bienvenida personalizada */}
        <View style={styles.welcomeCard}>
          <Text style={styles.greeting}>{getGreeting()}, {userName}</Text>
          <Text style={styles.welcomeQuestion}>¿Cómo te sientes hoy?</Text>
          
          {/* Resumen rápido */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Ionicons name="flame" size={20} color="#f59e0b" />
              <Text style={styles.summaryNumber}>{currentStreak}</Text>
              <Text style={styles.summaryLabel}>días de racha</Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryItem}>
              <Text style={styles.summaryEmoji}>{getMoodEmoji(lastMood)}</Text>
              <Text style={styles.summaryLabel}>Último registro</Text>
            </View>
          </View>
        </View>

        {/* Acciones principales */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Acciones rápidas</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('MoodTracker')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#ddd6fe' }]}>
              <Ionicons name="happy-outline" size={28} color="#7c3aed" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Estado de ánimo</Text>
              <Text style={styles.actionDescription}>Registra cómo te sientes ahora</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Journal')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#bfdbfe' }]}>
              <Ionicons name="book-outline" size={28} color="#2563eb" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Diario</Text>
              <Text style={styles.actionDescription}>Escribe sobre tu día</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Breathing')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#bbf7d0' }]}>
              <Ionicons name="leaf-outline" size={28} color="#16a34a" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Meditación</Text>
              <Text style={styles.actionDescription}>Ejercicios de respiración</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Habits')}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: '#fecaca' }]}>
              <Ionicons name="checkbox-outline" size={28} color="#dc2626" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Hábitos</Text>
              <Text style={styles.actionDescription}>Seguimiento de objetivos</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Sugerencia personalizada del día */}
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb-outline" size={20} color="#f59e0b" />
            <Text style={styles.tipTitle}>Sugerencia para ti</Text>
          </View>
          <Text style={styles.tipText}>{getPersonalizedTip()}</Text>
        </View>

        {/* Recursos de emergencia */}
        <TouchableOpacity 
          style={styles.emergencyButton}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Crisis')}
        >
          <Ionicons name="alert-circle-outline" size={24} color="#dc2626" />
          <Text style={styles.emergencyText}>¿Necesitas ayuda inmediata?</Text>
          <Ionicons name="chevron-forward" size={20} color="#dc2626" />
        </TouchableOpacity>

        {/* Mensaje motivacional */}
        <Text style={styles.motivationalText}>
          "Cada pequeño paso cuenta en tu camino hacia el bienestar"
        </Text>
      </ScrollView>

      {/* Botón flotante para registro rápido */}
      <TouchableOpacity 
        style={styles.floatingButton}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('QuickMood')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#8b5cf6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#6b7280',
  },
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  greeting: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 4,
  },
  welcomeQuestion: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 20,
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 4,
  },
  summaryEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  actionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  tipCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginLeft: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  emergencyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#dc2626',
    marginLeft: 8,
    marginRight: 8,
    flex: 1,
  },
  motivationalText: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});