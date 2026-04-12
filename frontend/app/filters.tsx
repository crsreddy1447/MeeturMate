import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Filters() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [genders, setGenders] = useState(['male', 'female', 'other']);

  const toggle = (g: string) => {
    setGenders(genders.includes(g) ? genders.filter((x) => x !== g) : [...genders, g]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity testID="filter-back" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color="#FDFDFD" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Filters</Text>
        <TouchableOpacity testID="filter-apply" onPress={() => router.back()}>
          <Text style={styles.applyText}>Apply</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body}>
        <Text style={styles.sectionLabel}>GENDER</Text>
        <View style={styles.pills}>
          {['male', 'female', 'other'].map((g) => (
            <TouchableOpacity testID={`filter-gender-${g}`} key={g} style={[styles.pill, genders.includes(g) && styles.pillActive]} onPress={() => toggle(g)}>
              <Text style={[styles.pillText, genders.includes(g) && styles.pillTextActive]}>{g.charAt(0).toUpperCase() + g.slice(1)}</Text>
              {genders.includes(g) && <Ionicons name="checkmark" size={18} color="#FF5F6D" />}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>AGE RANGE</Text>
        <View style={styles.rangeCard}>
          <Text style={styles.rangeValue}>18 - 100 years</Text>
        </View>

        <Text style={styles.sectionLabel}>LOCATION</Text>
        <TouchableOpacity style={styles.locOption} activeOpacity={0.7}>
          <Ionicons name="globe-outline" size={22} color="#FDFDFD" />
          <Text style={styles.locText}>Global</Text>
          <View style={styles.activeDot} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.locOption} activeOpacity={0.7}>
          <Ionicons name="location-outline" size={22} color="#A0A0AB" />
          <Text style={[styles.locText, { color: '#A0A0AB' }]}>My Country</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D12' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1C1C24' },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FDFDFD' },
  applyText: { fontSize: 16, fontWeight: '700', color: '#FF5F6D' },
  body: { padding: 24 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#636370', marginBottom: 12, marginTop: 24 },
  pills: { gap: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1C1C24', padding: 18, borderRadius: 16, borderWidth: 1.5, borderColor: '#32323D' },
  pillActive: { borderColor: '#FF5F6D', backgroundColor: '#1C1420' },
  pillText: { fontSize: 16, color: '#A0A0AB', fontWeight: '500' },
  pillTextActive: { color: '#FDFDFD', fontWeight: '600' },
  rangeCard: { backgroundColor: '#1C1C24', padding: 24, borderRadius: 16, alignItems: 'center' },
  rangeValue: { fontSize: 22, fontWeight: '700', color: '#FDFDFD' },
  locOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C24', padding: 18, borderRadius: 16, marginBottom: 10, gap: 12 },
  locText: { flex: 1, fontSize: 16, color: '#FDFDFD', fontWeight: '500' },
  activeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#34C759' },
});
