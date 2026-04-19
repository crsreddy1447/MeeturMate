import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function Filters() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [genders, setGenders] = useState(['male', 'female', 'other']);
  const [ageRange, setAgeRange] = useState([18, 55]);
  const [location, setLocation] = useState<'global' | 'country'>('global');

  const toggle = (g: string) => {
    setGenders(genders.includes(g) ? genders.filter((x) => x !== g) : [...genders, g]);
  };

  const genderIcons: Record<string, string> = { male: 'male', female: 'female', other: 'male-female' };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity testID="filter-back" onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color="#A0A0AB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Filters</Text>
        <TouchableOpacity testID="filter-reset" onPress={() => { setGenders(['male', 'female', 'other']); setAgeRange([18, 55]); setLocation('global'); }}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Gender */}
        <Text style={styles.sectionLabel}>SHOW ME</Text>
        <View style={styles.genderGrid}>
          {['male', 'female', 'other'].map((g) => {
            const active = genders.includes(g);
            return (
              <TouchableOpacity
                testID={`filter-gender-${g}`}
                key={g}
                style={[styles.genderCard, active && styles.genderCardActive]}
                onPress={() => toggle(g)}
                activeOpacity={0.7}
              >
                <Ionicons name={genderIcons[g] as any} size={24} color={active ? '#FF5F6D' : '#636370'} />
                <Text style={[styles.genderText, active && styles.genderTextActive]}>{g.charAt(0).toUpperCase() + g.slice(1)}</Text>
                {active && (
                  <View style={styles.genderCheck}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Age Range */}
        <Text style={styles.sectionLabel}>AGE RANGE</Text>
        <View style={styles.ageCard}>
          <View style={styles.ageRow}>
            <Text style={styles.ageValue}>{ageRange[0]}</Text>
            <View style={styles.ageDash} />
            <Text style={styles.ageValue}>{ageRange[1]}</Text>
          </View>
          <Text style={styles.ageHint}>years old</Text>
          {/* Age presets */}
          <View style={styles.agePresets}>
            {[[18, 25], [25, 35], [35, 50], [18, 100]].map(([min, max]) => {
              const active = ageRange[0] === min && ageRange[1] === max;
              return (
                <TouchableOpacity
                  key={`${min}-${max}`}
                  style={[styles.agePresetBtn, active && styles.agePresetActive]}
                  onPress={() => setAgeRange([min, max])}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.agePresetText, active && styles.agePresetTextActive]}>
                    {max === 100 ? 'Any' : `${min}-${max}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Location */}
        <Text style={styles.sectionLabel}>DISTANCE</Text>
        <TouchableOpacity
          style={[styles.locOption, location === 'global' && styles.locActive]}
          onPress={() => setLocation('global')}
          activeOpacity={0.7}
        >
          <View style={[styles.locIcon, location === 'global' && styles.locIconActive]}>
            <Ionicons name="globe-outline" size={20} color={location === 'global' ? '#FF5F6D' : '#636370'} />
          </View>
          <View style={styles.locMid}>
            <Text style={[styles.locText, location === 'global' && styles.locTextActive]}>Global</Text>
            <Text style={styles.locSub}>Show people worldwide</Text>
          </View>
          {location === 'global' && <View style={styles.radioActive} />}
          {location !== 'global' && <View style={styles.radio} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.locOption, location === 'country' && styles.locActive]}
          onPress={() => setLocation('country')}
          activeOpacity={0.7}
        >
          <View style={[styles.locIcon, location === 'country' && styles.locIconActive]}>
            <Ionicons name="location-outline" size={20} color={location === 'country' ? '#FF5F6D' : '#636370'} />
          </View>
          <View style={styles.locMid}>
            <Text style={[styles.locText, location === 'country' && styles.locTextActive]}>My Country</Text>
            <Text style={styles.locSub}>Only people nearby</Text>
          </View>
          {location === 'country' && <View style={styles.radioActive} />}
          {location !== 'country' && <View style={styles.radio} />}
        </TouchableOpacity>
      </ScrollView>

      {/* Apply Button */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity testID="filter-apply" style={styles.applyBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <LinearGradient colors={['#FF5F6D', '#FFC371']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.applyGradient}>
            <Text style={styles.applyText}>Apply Filters</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D12' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#1C1C24',
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1C1C24', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FDFDFD' },
  resetText: { fontSize: 14, fontWeight: '600', color: '#636370' },

  body: { flex: 1, padding: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: '#636370', marginBottom: 12, marginTop: 24 },

  genderGrid: { flexDirection: 'row', gap: 10 },
  genderCard: {
    flex: 1, alignItems: 'center', paddingVertical: 20,
    backgroundColor: '#1C1C24', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#2A2A35', position: 'relative',
  },
  genderCardActive: { borderColor: '#FF5F6D', backgroundColor: '#FF5F6D10' },
  genderText: { fontSize: 13, fontWeight: '600', color: '#636370', marginTop: 8 },
  genderTextActive: { color: '#FDFDFD' },
  genderCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#FF5F6D', alignItems: 'center', justifyContent: 'center',
  },

  ageCard: { backgroundColor: '#1C1C24', borderRadius: 20, padding: 24, alignItems: 'center' },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ageValue: { fontSize: 40, fontWeight: '800', color: '#FDFDFD' },
  ageDash: { width: 20, height: 3, backgroundColor: '#FF5F6D', borderRadius: 2 },
  ageHint: { fontSize: 14, color: '#636370', marginTop: 4, marginBottom: 16 },
  agePresets: { flexDirection: 'row', gap: 8 },
  agePresetBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999,
    backgroundColor: '#2A2A35',
  },
  agePresetActive: { backgroundColor: '#FF5F6D' },
  agePresetText: { fontSize: 13, fontWeight: '600', color: '#A0A0AB' },
  agePresetTextActive: { color: '#fff' },

  locOption: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1C1C24', padding: 16, borderRadius: 16, marginBottom: 8,
    borderWidth: 1.5, borderColor: '#2A2A35',
  },
  locActive: { borderColor: '#FF5F6D20', backgroundColor: '#FF5F6D08' },
  locIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#2A2A35', alignItems: 'center', justifyContent: 'center',
  },
  locIconActive: { backgroundColor: '#FF5F6D18' },
  locMid: { flex: 1, marginLeft: 12 },
  locText: { fontSize: 15, fontWeight: '600', color: '#A0A0AB' },
  locTextActive: { color: '#FDFDFD' },
  locSub: { fontSize: 12, color: '#636370', marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#3A3A45' },
  radioActive: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 6, borderColor: '#FF5F6D', backgroundColor: '#0D0D12',
  },

  footer: { paddingHorizontal: 20, paddingTop: 12 },
  applyBtn: { borderRadius: 9999, overflow: 'hidden' },
  applyGradient: { height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 9999 },
  applyText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
