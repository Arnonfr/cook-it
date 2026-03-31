import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { COLORS, FONTS } from '../lib/constants';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🍳</Text>
      <Text style={styles.text}>העמוד לא נמצא</Text>
      <Link href="/" style={styles.link}>
        <Text style={styles.linkText}>חזור לדף הבית</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  icon: { fontSize: 52 },
  text: { fontFamily: FONTS.semiBold, fontSize: 18, color: COLORS.textPrimary, marginTop: 14, textAlign: 'center' },
  link: { marginTop: 16 },
  linkText: { fontFamily: FONTS.medium, fontSize: 15, color: COLORS.primaryBlue },
});
