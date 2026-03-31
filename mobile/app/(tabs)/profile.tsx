import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
  Alert,
  I18nManager,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { fetchSettings, updateSettings } from '../../lib/api';
import { clearRecentSearches } from '../../lib/storage';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../lib/constants';

I18nManager.forceRTL(true);

function ApiKeyField({
  label,
  value,
  masked,
  isValid,
  onChange,
}: {
  label: string;
  value: string;
  masked: string;
  isValid: boolean;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [show, setShow] = useState(false);

  return (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldHeader}>
        <View style={[styles.statusDot, { backgroundColor: isValid ? '#22C55E' : '#EF4444' }]} />
        <Text style={styles.fieldLabel}>{label}</Text>
      </View>
      {editing ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={value}
            onChangeText={onChange}
            placeholder="הכנס מפתח..."
            placeholderTextColor={COLORS.textSecondary}
            secureTextEntry={!show}
            autoCapitalize="none"
            autoCorrect={false}
            textAlign="right"
          />
          <Pressable onPress={() => setShow((v) => !v)} style={styles.eyeBtn}>
            <Text style={styles.eyeIcon}>{show ? '🙈' : '👁️'}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.maskedRow} onPress={() => setEditing(true)}>
          <Text style={styles.maskedText}>{masked || '(לא מוגדר)'}</Text>
          <Text style={styles.editIcon}>✏️</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    staleTime: 60 * 1000,
  });

  const [geminiKey, setGeminiKey] = useState('');
  const [serperKey, setSerperKey] = useState('');
  const [saved, setSaved] = useState(false);

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: () =>
      updateSettings({
        ...(geminiKey ? { geminiApiKey: geminiKey } : {}),
        ...(serperKey ? { serperApiKey: serperKey } : {}),
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: () => {
      Alert.alert('שגיאה', 'לא הצלחנו לשמור את המפתחות');
    },
  });

  const handleClearRecent = useCallback(() => {
    Alert.alert('מחיקת היסטוריה', 'למחוק את היסטוריית החיפושים?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          await clearRecentSearches();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>הגדרות</Text>

        {/* API Keys */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>מפתחות API</Text>
          {isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color={COLORS.primaryBlue} />
            </View>
          ) : (
            <>
              <ApiKeyField
                label="Gemini API Key"
                value={geminiKey}
                masked={settings?.geminiApiKey?.masked ?? ''}
                isValid={settings?.geminiApiKey?.valid ?? false}
                onChange={setGeminiKey}
              />
              <ApiKeyField
                label="Serper API Key"
                value={serperKey}
                masked={settings?.serperApiKey?.masked ?? ''}
                isValid={settings?.serperApiKey?.valid ?? false}
                onChange={setSerperKey}
              />
              {(geminiKey || serperKey) && (
                <Pressable
                  style={[styles.saveBtn, saved && styles.savedBtn]}
                  onPress={() => save()}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>{saved ? '✓ נשמר' : 'שמור מפתחות'}</Text>
                  )}
                </Pressable>
              )}
            </>
          )}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>כללי</Text>
          <Pressable style={styles.actionRow} onPress={handleClearRecent}>
            <Text style={styles.actionText}>מחק היסטוריית חיפוש</Text>
            <Text style={styles.actionIcon}>🗑️</Text>
          </Pressable>
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>אודות</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Cookit v1.2.0{'\n'}
              מחפש מתכונים מאתרים אמיתיים ברחבי האינטרנט, מחלץ ומתרגם לעברית.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  pageTitle: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: 20,
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: 12,
  },
  loading: { alignItems: 'center', padding: 20 },
  fieldContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 10,
    ...SHADOW.card,
  },
  fieldHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fieldLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1.5,
    borderColor: COLORS.primaryBlue,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'right',
  },
  eyeBtn: { padding: 6 },
  eyeIcon: { fontSize: 18 },
  maskedRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  maskedText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  editIcon: { fontSize: 16 },
  saveBtn: {
    backgroundColor: COLORS.primaryBlue,
    borderRadius: RADIUS.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...SHADOW.button,
  },
  savedBtn: { backgroundColor: '#22C55E' },
  saveBtnText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: '#FFF',
  },
  actionRow: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOW.card,
  },
  actionText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: COLORS.accentOrange,
  },
  actionIcon: { fontSize: 18 },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 16,
    ...SHADOW.card,
  },
  infoText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'right',
    lineHeight: 22,
  },
});
