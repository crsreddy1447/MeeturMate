import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Dimensions, Modal, TextInput, Platform, KeyboardAvoidingView, Switch } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const SCREEN_WIDTH = Dimensions.get('window').width;
const isWeb = Platform.OS === 'web';

const CONNECTION_TYPES = [
  { key: 'friendship', label: 'Friendship', icon: 'people-outline' as const, color: '#34C759' },
  { key: 'dating', label: 'Dating', icon: 'heart-outline' as const, color: '#FF5F6D' },
  { key: 'emotional', label: 'Emotional', icon: 'chatbubble-ellipses-outline' as const, color: '#5F7FFF' },
  { key: 'social', label: 'Social', icon: 'globe-outline' as const, color: '#FFC371' },
  { key: 'lifestyle', label: 'Lifestyle', icon: 'cafe-outline' as const, color: '#A855F7' },
];

const INTEREST_OPTIONS = [
  'Travel', 'Music', 'Fitness', 'Food', 'Movies', 'Reading', 'Gaming',
  'Photography', 'Art', 'Sports', 'Cooking', 'Dancing', 'Yoga', 'Hiking',
  'Tech', 'Fashion', 'Pets', 'Nature', 'Nightlife', 'Meditation',
];

const ORIENTATION_OPTIONS = [
  { key: 'straight', label: 'Straight', icon: 'male-female-outline' as const },
  { key: 'gay', label: 'Gay', icon: 'male-outline' as const },
  { key: 'lesbian', label: 'Lesbian', icon: 'female-outline' as const },
  { key: 'bisexual', label: 'Bisexual', icon: 'transgender-outline' as const },
  { key: 'open', label: 'Open to All', icon: 'heart-circle-outline' as const },
];

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser } = useAuthStore();
  const [linkModal, setLinkModal] = useState<{ visible: boolean; platform: 'whatsapp' | 'facebook' | 'linkedin' | null }>({ visible: false, platform: null });
  const [linkValue, setLinkValue] = useState('');
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', age: '', bio: '', location: '' });
  const [privacyLoading, setPrivacyLoading] = useState(false);

  const privacySettings = user?.privacy_settings || {
    blur_photo: false, hide_online_status: false, anonymous_browsing: false,
    disappearing_messages: false, read_receipts: true,
  };

  const togglePrivacy = async (key: string, value: boolean) => {
    setPrivacyLoading(true);
    try {
      const token = useAuthStore.getState().token;
      const updated = { ...privacySettings, [key]: value };
      await axios.put(`${BACKEND_URL}/api/privacy/update`, updated, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Update local user state
      if (user) {
        useAuthStore.getState().setUser({ ...user, privacy_settings: updated });
      }
    } catch {
      const msg = 'Failed to update privacy setting.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    } finally {
      setPrivacyLoading(false);
    }
  };

  const toggleConnectionType = async (type: string) => {
    const current = user?.connection_types || [];
    const updated = current.includes(type) ? current.filter((t: string) => t !== type) : [...current, type];
    try {
      await updateUser({ connection_types: updated });
    } catch {}
  };

  const toggleInterest = async (interest: string) => {
    const current = user?.interests || [];
    const lower = interest.toLowerCase();
    const updated = current.includes(lower) ? current.filter((i: string) => i !== lower) : [...current, lower];
    try {
      await updateUser({ interests: updated });
    } catch {}
  };

  const setOrientation = async (orientation: string) => {
    try {
      await updateUser({ orientation });
    } catch {}
  };

  const socialConfig = {
    whatsapp: { icon: 'logo-whatsapp' as const, label: 'WhatsApp', color: '#25D366', placeholder: 'Phone number (e.g. +1234567890)' },
    facebook: { icon: 'logo-facebook' as const, label: 'Facebook', color: '#1877F2', placeholder: 'Facebook profile URL' },
    linkedin: { icon: 'logo-linkedin' as const, label: 'LinkedIn', color: '#0A66C2', placeholder: 'LinkedIn profile URL' },
  };

  const openLinkModal = (platform: 'whatsapp' | 'facebook' | 'linkedin') => {
    setLinkValue(user?.social_links?.[platform] || '');
    setLinkModal({ visible: true, platform });
  };

  const saveSocialLink = async () => {
    if (!linkModal.platform) return;
    try {
      const current = user?.social_links || {};
      const val = linkValue.trim();
      await updateUser({ social_links: { ...current, [linkModal.platform]: val || null } });
      setLinkModal({ visible: false, platform: null });
      setLinkValue('');
    } catch {
      Alert.alert('Error', 'Failed to save. Try again.');
    }
  };

  const unlinkAccount = (platform: 'whatsapp' | 'facebook' | 'linkedin') => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove ${socialConfig[platform].label}?`)) {
        const current = user?.social_links || {};
        updateUser({ social_links: { ...current, [platform]: null } });
      }
      return;
    }
    Alert.alert('Unlink', `Remove ${socialConfig[platform].label}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const current = user?.social_links || {};
        await updateUser({ social_links: { ...current, [platform]: null } });
      }},
    ]);
  };

  const openEditProfile = () => {
    setEditForm({
      name: user?.name || '',
      age: String(user?.age || ''),
      bio: user?.bio || '',
      location: user?.location || '',
    });
    setEditModal(true);
  };

  const saveProfile = async () => {
    try {
      const data: any = {};
      if (editForm.name.trim()) data.name = editForm.name.trim();
      if (editForm.age.trim()) data.age = parseInt(editForm.age.trim(), 10);
      if (editForm.bio !== undefined) data.bio = editForm.bio.trim();
      if (editForm.location !== undefined) data.location = editForm.location.trim();
      await updateUser(data);
      setEditModal(false);
    } catch {
      if (Platform.OS === 'web') { window.alert('Failed to update profile.'); }
      else { Alert.alert('Error', 'Failed to update profile.'); }
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) {
        await logout();
        router.replace('/login');
      }
      return;
    }
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  };

  const daysLeft = () => {
    if (!user?.subscription_end) return 0;
    return Math.max(0, Math.ceil((new Date(user.subscription_end).getTime() - Date.now()) / 86400000));
  };

  return (
    <ScrollView style={[styles.container]} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Profile hero with gradient backdrop */}
      <LinearGradient colors={['#FF5F6D', '#FF8A5C', '#FFC371']} style={[styles.heroGradient, { paddingTop: insets.top + 20 }]}>
        <View style={styles.heroContent}>
          <View style={styles.avatarWrap}>
            {user?.photo ? (
              <Image source={{ uri: user.photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarLetter}>{user?.name?.charAt(0)?.toUpperCase()}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarBtn} activeOpacity={0.8}>
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.heroName}>{user?.name}, {user?.age}</Text>
          {user?.location && (
            <View style={styles.heroLocRow}>
              <Ionicons name="location-sharp" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.heroLoc}>{user.location}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Status pills */}
      <View style={styles.pillRow}>
        {!user?.is_premium && (
          <View style={styles.trialPill}>
            <Ionicons name="time-outline" size={14} color="#E5B05C" />
            <Text style={styles.trialText}>{daysLeft()} days left</Text>
          </View>
        )}
        {user?.is_premium && (
          <View style={[styles.trialPill, { borderColor: '#E5B05C33' }]}>
            <Ionicons name="diamond" size={14} color="#E5B05C" />
            <Text style={styles.trialText}>Premium</Text>
          </View>
        )}
        {user?.is_verified && (
          <View style={[styles.trialPill, { borderColor: '#34C75933' }]}>
            <Ionicons name="checkmark-circle" size={14} color="#34C759" />
            <Text style={[styles.trialText, { color: '#34C759' }]}>Verified</Text>
          </View>
        )}
        <View style={styles.trialPill}>
          <Ionicons name="heart" size={14} color="#FF5F6D" />
          <Text style={styles.trialText}>{user?.email}</Text>
        </View>
        {(user?.super_likes_remaining ?? 0) > 0 && (
          <View style={[styles.trialPill, { borderColor: '#5F7FFF33' }]}>
            <Ionicons name="star" size={14} color="#5F7FFF" />
            <Text style={[styles.trialText, { color: '#5F7FFF' }]}>{user?.super_likes_remaining} Super Likes</Text>
          </View>
        )}
        {(user?.coins ?? 0) > 0 && (
          <View style={[styles.trialPill, { borderColor: '#E5B05C33' }]}>
            <Ionicons name="diamond" size={14} color="#E5B05C" />
            <Text style={[styles.trialText, { color: '#E5B05C' }]}>{user?.coins} Coins</Text>
          </View>
        )}
      </View>

      {/* About section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ABOUT YOU</Text>
        <View style={styles.infoCard}>
          <InfoRow icon="calendar-outline" label="Age" value={String(user?.age || '')} />
          <View style={styles.divider} />
          <InfoRow icon="male-female-outline" label="Gender" value={user?.gender || ''} />
          <View style={styles.divider} />
          <InfoRow icon="location-outline" label="Location" value={user?.location || 'Not set'} />
          {user?.bio && (
            <>
              <View style={styles.divider} />
              <InfoRow icon="document-text-outline" label="Bio" value={user.bio} />
            </>
          )}
        </View>
      </View>

      {/* Premium upsell */}
      {!user?.is_premium && (
        <View style={styles.section}>
          <LinearGradient
            colors={['#1C1C24', '#1E1A28']}
            style={styles.premiumCard}
          >
            <View style={styles.premiumBadge}>
              <LinearGradient colors={['#E5B05C', '#C8943D']} style={styles.premiumBadgeInner}>
                <Ionicons name="diamond" size={24} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.premiumTitle}>Go Premium</Text>
            <Text style={styles.premiumSub}>Unlock the full MeeturMate experience</Text>
            <View style={styles.featureList}>
              <Feature text="Unlimited conversations" />
              <Feature text="See who liked you" />
              <Feature text="Advanced filters" />
              <Feature text="Verification badge" />
            </View>
            <TouchableOpacity testID="upgrade-btn" style={styles.upgradeBtn} activeOpacity={0.8} onPress={() => router.push('/subscription')}>
              <LinearGradient colors={['#E5B05C', '#D4A44B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.upgradeGradient}>
                <Text style={styles.upgradeBtnText}>Upgrade Now</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.freeNote}>Free plan: Chat with up to 2 people</Text>
          </LinearGradient>
        </View>
      )}

      {/* Verification & Referral Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity testID="qa-verify" style={styles.qaCard} onPress={() => router.push('/verification')} activeOpacity={0.8}>
            <View style={[styles.qaIcon, { backgroundColor: '#34C75918' }]}>
              <Ionicons name="shield-checkmark" size={22} color="#34C759" />
            </View>
            <Text style={styles.qaLabel}>Verify</Text>
            <Text style={styles.qaStatus}>{user?.verification_status === 'verified' ? 'Done' : user?.verification_status === 'pending' ? 'Pending' : 'Go'}</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="qa-referral" style={styles.qaCard} onPress={() => router.push('/referral')} activeOpacity={0.8}>
            <View style={[styles.qaIcon, { backgroundColor: '#FF5F6D18' }]}>
              <Ionicons name="gift" size={22} color="#FF5F6D" />
            </View>
            <Text style={styles.qaLabel}>Refer</Text>
            <Text style={styles.qaStatus}>{user?.referral_count || 0} friends</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="qa-coins" style={styles.qaCard} onPress={() => router.push('/referral')} activeOpacity={0.8}>
            <View style={[styles.qaIcon, { backgroundColor: '#E5B05C18' }]}>
              <Ionicons name="diamond" size={22} color="#E5B05C" />
            </View>
            <Text style={styles.qaLabel}>Coins</Text>
            <Text style={styles.qaStatus}>{user?.coins || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Orientation */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ORIENTATION</Text>
        <View style={styles.infoCard}>
          <View style={styles.chipContainer}>
            {ORIENTATION_OPTIONS.map(opt => {
              const selected = (user?.orientation || 'straight') === opt.key;
              return (
                <TouchableOpacity key={opt.key} onPress={() => setOrientation(opt.key)}
                  style={[styles.chip, selected && styles.chipSelected]}>
                  <Ionicons name={opt.icon} size={16} color={selected ? '#fff' : (isWeb ? '#65676B' : '#A0A0AB')} />
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Connection Types */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>LOOKING FOR</Text>
        <View style={styles.infoCard}>
          <View style={styles.chipContainer}>
            {CONNECTION_TYPES.map(ct => {
              const selected = (user?.connection_types || []).includes(ct.key);
              return (
                <TouchableOpacity key={ct.key} onPress={() => toggleConnectionType(ct.key)}
                  style={[styles.chip, selected && { backgroundColor: ct.color, borderColor: ct.color }]}>
                  <Ionicons name={ct.icon} size={16} color={selected ? '#fff' : (isWeb ? '#65676B' : '#A0A0AB')} />
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{ct.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Interests */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>INTERESTS</Text>
        <View style={styles.infoCard}>
          <View style={styles.chipContainer}>
            {INTEREST_OPTIONS.map(interest => {
              const selected = (user?.interests || []).includes(interest.toLowerCase());
              return (
                <TouchableOpacity key={interest} onPress={() => toggleInterest(interest)}
                  style={[styles.chip, selected && { backgroundColor: '#FF5F6D', borderColor: '#FF5F6D' }]}>
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{interest}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Privacy Dashboard */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>PRIVACY DASHBOARD</Text>
        <View style={styles.infoCard}>
          <PrivacyToggle icon="eye-off-outline" label="Blur My Photo"
            description="Others see a blurred version of your photo"
            value={privacySettings.blur_photo}
            onToggle={(v) => togglePrivacy('blur_photo', v)} />
          <View style={styles.divider} />
          <PrivacyToggle icon="eye-outline" label="Hide Online Status"
            description="Don't show when you're active"
            value={privacySettings.hide_online_status}
            onToggle={(v) => togglePrivacy('hide_online_status', v)} />
          <View style={styles.divider} />
          <PrivacyToggle icon="glasses-outline" label="Anonymous Browsing"
            description="Browse profiles without being seen"
            value={privacySettings.anonymous_browsing}
            onToggle={(v) => togglePrivacy('anonymous_browsing', v)} />
          <View style={styles.divider} />
          <PrivacyToggle icon="timer-outline" label="Disappearing Messages"
            description="Messages auto-delete after 5 minutes"
            value={privacySettings.disappearing_messages}
            onToggle={(v) => togglePrivacy('disappearing_messages', v)} />
          <View style={styles.divider} />
          <PrivacyToggle icon="checkmark-done-outline" label="Read Receipts"
            description="Let others see when you've read messages"
            value={privacySettings.read_receipts}
            onToggle={(v) => togglePrivacy('read_receipts', v)} />
        </View>
      </View>

      {/* Linked Accounts */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>LINKED ACCOUNTS</Text>
        <View style={styles.infoCard}>
          {(['whatsapp', 'facebook', 'linkedin'] as const).map((platform, idx) => {
            const cfg = socialConfig[platform];
            const linked = user?.social_links?.[platform];
            return (
              <React.Fragment key={platform}>
                {idx > 0 && <View style={styles.divider} />}
                <View style={styles.socialRow}>
                  <View style={[styles.socialIconWrap, { backgroundColor: cfg.color + '18' }]}>
                    <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                  </View>
                  <View style={styles.socialInfo}>
                    <Text style={styles.socialName}>{cfg.label}</Text>
                    <Text style={styles.socialStatus} numberOfLines={1}>
                      {linked || 'Not linked'}
                    </Text>
                  </View>
                  {linked ? (
                    <View style={styles.socialActions}>
                      <TouchableOpacity onPress={() => openLinkModal(platform)} style={styles.socialEditBtn}>
                        <Ionicons name="pencil" size={14} color="#A0A0AB" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => unlinkAccount(platform)} style={styles.socialUnlinkBtn}>
                        <Ionicons name="close-circle" size={18} color="#FF4458" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => openLinkModal(platform)} style={styles.linkBtn}>
                      <LinearGradient colors={[cfg.color, cfg.color + 'CC']} style={styles.linkBtnGrad}>
                        <Text style={styles.linkBtnText}>Link</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              </React.Fragment>
            );
          })}
        </View>
      </View>

      {/* Link Modal */}
      <Modal visible={linkModal.visible} transparent animationType="slide" onRequestClose={() => setLinkModal({ visible: false, platform: null })}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {linkModal.platform && (
              <>
                <View style={styles.modalHandle} />
                <View style={styles.modalHeader}>
                  <Ionicons name={socialConfig[linkModal.platform].icon} size={28} color={socialConfig[linkModal.platform].color} />
                  <Text style={styles.modalTitle}>
                    {user?.social_links?.[linkModal.platform] ? 'Edit' : 'Link'} {socialConfig[linkModal.platform].label}
                  </Text>
                </View>
                <TextInput
                  style={styles.modalInput}
                  placeholder={socialConfig[linkModal.platform].placeholder}
                  placeholderTextColor="#636370"
                  value={linkValue}
                  onChangeText={setLinkValue}
                  autoFocus
                  autoCapitalize="none"
                  keyboardType={linkModal.platform === 'whatsapp' ? 'phone-pad' : 'url'}
                />
                <TouchableOpacity onPress={saveSocialLink} style={styles.modalSaveBtn} activeOpacity={0.8}>
                  <LinearGradient colors={['#FF5F6D', '#FF8A5C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalSaveGrad}>
                    <Text style={styles.modalSaveTxt}>Save</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setLinkModal({ visible: false, platform: null })} style={styles.modalCancelBtn}>
                  <Text style={styles.modalCancelTxt}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <View style={styles.editSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.editTitle}>Edit Profile</Text>

              <Text style={styles.editLabel}>Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.name}
                onChangeText={(t) => setEditForm(f => ({ ...f, name: t }))}
                placeholder="Your name"
                placeholderTextColor="#636370"
              />

              <Text style={styles.editLabel}>Age</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.age}
                onChangeText={(t) => setEditForm(f => ({ ...f, age: t }))}
                placeholder="Age"
                placeholderTextColor="#636370"
                keyboardType="number-pad"
              />

              <Text style={styles.editLabel}>Bio</Text>
              <TextInput
                style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                value={editForm.bio}
                onChangeText={(t) => setEditForm(f => ({ ...f, bio: t }))}
                placeholder="Tell us about yourself..."
                placeholderTextColor="#636370"
                multiline
              />

              <Text style={styles.editLabel}>Location</Text>
              <TextInput
                style={styles.modalInput}
                value={editForm.location}
                onChangeText={(t) => setEditForm(f => ({ ...f, location: t }))}
                placeholder="City, Country"
                placeholderTextColor="#636370"
              />

              <TouchableOpacity onPress={saveProfile} style={styles.modalSaveBtn} activeOpacity={0.8}>
                <LinearGradient colors={['#FF5F6D', '#FF8A5C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalSaveGrad}>
                  <Text style={styles.modalSaveTxt}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditModal(false)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SETTINGS</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="create-outline" label="Edit Profile" onPress={openEditProfile} />
          <MenuItem icon="notifications-outline" label="Notifications" />
          <MenuItem icon="shield-checkmark-outline" label="Privacy & Safety" />
          <MenuItem icon="help-circle-outline" label="Help & Support" />
        </View>
      </View>

      <TouchableOpacity testID="logout-btn" style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color="#FF4458" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>MeeturMate v1.0.0</Text>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={18} color="#FF5F6D" />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name="checkmark-circle" size={18} color="#34C759" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function MenuItem({ icon, label, onPress }: { icon: any; label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity testID={`menu-${label}`} style={styles.menuItem} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.menuIconWrap}>
        <Ionicons name={icon} size={20} color="#FDFDFD" />
      </View>
      <Text style={styles.menuText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#636370" />
    </TouchableOpacity>
  );
}

function PrivacyToggle({ icon, label, description, value, onToggle }: {
  icon: any; label: string; description: string; value: boolean; onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.privacyRow}>
      <View style={styles.privacyIconWrap}>
        <Ionicons name={icon} size={18} color={isWeb ? '#1877F2' : '#FF5F6D'} />
      </View>
      <View style={styles.privacyInfo}>
        <Text style={styles.privacyLabel}>{label}</Text>
        <Text style={styles.privacyDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: isWeb ? '#CED0D4' : '#2A2A35', true: isWeb ? '#1877F2' : '#FF5F6D' }}
        thumbColor={value ? '#fff' : (isWeb ? '#fff' : '#A0A0AB')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: isWeb ? '#F0F2F5' : '#0D0D12' },

  heroGradient: {
    paddingBottom: 32, borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    ...(isWeb ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : {}),
  },
  heroContent: { alignItems: 'center' },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)' },
  avatarFallback: { backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 44, fontWeight: '900', color: '#fff' },
  editAvatarBtn: {
    position: 'absolute', bottom: 4, right: 4,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: isWeb ? '#1877F2' : '#FF5F6D', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: isWeb ? '#FFFFFF' : '#0D0D12',
  },
  heroName: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 4 },
  heroLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroLoc: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 24 },
  trialPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: isWeb ? '#E4E6EB' : '#1C1C24', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 9999, borderWidth: 1, borderColor: isWeb ? '#CED0D4' : '#2A2A35',
  },
  trialText: { fontSize: 12, fontWeight: '600', color: isWeb ? '#65676B' : '#A0A0AB' },

  quickActionsRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  qaCard: {
    flex: 1, alignItems: 'center', paddingVertical: 16,
    backgroundColor: isWeb ? '#FFFFFF' : '#1C1C24', borderRadius: 16,
    ...(isWeb ? { borderWidth: 1, borderColor: '#E4E6EB' } : {}),
  },
  qaIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  qaLabel: { fontSize: 13, fontWeight: '700', color: isWeb ? '#1C1E21' : '#FDFDFD' },
  qaStatus: { fontSize: 11, color: '#636370', marginTop: 2, fontWeight: '600' },

  section: { paddingHorizontal: 20, marginTop: 8, marginBottom: 8, ...(isWeb ? { maxWidth: 680, alignSelf: 'center' as any, width: '100%' as any } : {}) },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: isWeb ? '#65676B' : '#636370', marginBottom: 12 },

  infoCard: { backgroundColor: isWeb ? '#FFFFFF' : '#1C1C24', borderRadius: 20, padding: 4, ...(isWeb ? { borderWidth: 1, borderColor: '#E4E6EB' } : {}) },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  infoIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: isWeb ? '#E7F3FF' : '#FF5F6D18', alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { flex: 1, fontSize: 15, color: isWeb ? '#65676B' : '#A0A0AB', marginLeft: 12 },
  infoValue: { fontSize: 15, fontWeight: '600', color: isWeb ? '#1C1E21' : '#FDFDFD', maxWidth: '40%' },
  divider: { height: 1, backgroundColor: isWeb ? '#E4E6EB' : '#2A2A35', marginHorizontal: 16 },

  premiumCard: { borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 1.5, borderColor: '#E5B05C22', ...(isWeb ? { backgroundColor: '#FFFFFF', borderColor: '#E4E6EB' } : {}) },
  premiumBadge: { marginBottom: 12 },
  premiumBadgeInner: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  premiumTitle: { fontSize: 22, fontWeight: '800', color: isWeb ? '#1C1E21' : '#FDFDFD', marginBottom: 4 },
  premiumSub: { fontSize: 14, color: isWeb ? '#65676B' : '#636370', marginBottom: 20 },
  featureList: { width: '100%', gap: 12, marginBottom: 24 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, color: isWeb ? '#65676B' : '#A0A0AB' },
  upgradeBtn: { width: '100%', borderRadius: 9999, overflow: 'hidden', marginBottom: 10 },
  upgradeGradient: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 9999 },
  upgradeBtnText: { fontSize: 16, fontWeight: '800', color: '#0D0D12' },
  freeNote: { fontSize: 12, color: isWeb ? '#65676B' : '#636370' },

  menuGroup: { gap: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: isWeb ? '#FFFFFF' : '#1C1C24', padding: 14, borderRadius: 16, ...(isWeb ? { borderWidth: 1, borderColor: '#E4E6EB' } : {}) },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: isWeb ? '#E4E6EB' : '#2A2A35', alignItems: 'center', justifyContent: 'center',
  },
  menuText: { flex: 1, fontSize: 15, color: isWeb ? '#1C1E21' : '#FDFDFD', marginLeft: 12, fontWeight: '500' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, marginHorizontal: 20, marginTop: 8,
    borderRadius: 16, borderWidth: 1, borderColor: isWeb ? '#FFB8C0' : '#FF445820',
    ...(isWeb ? { backgroundColor: '#FFFFFF', maxWidth: 680, alignSelf: 'center' as any, width: '100%' as any } : {}),
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#FF4458' },
  version: { fontSize: 12, color: isWeb ? '#65676B' : '#636370', textAlign: 'center', paddingVertical: 20 },

  socialRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  socialIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  socialInfo: { flex: 1, marginLeft: 12 },
  socialName: { fontSize: 15, fontWeight: '600', color: isWeb ? '#1C1E21' : '#FDFDFD' },
  socialStatus: { fontSize: 12, color: isWeb ? '#65676B' : '#636370', marginTop: 1 },
  socialActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  socialEditBtn: { padding: 4 },
  socialUnlinkBtn: { padding: 2 },
  linkBtn: { borderRadius: 9999, overflow: 'hidden' },
  linkBtnGrad: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 9999 },
  linkBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: isWeb ? 'center' : 'flex-end', alignItems: isWeb ? 'center' : 'stretch' },
  modalSheet: {
    backgroundColor: isWeb ? '#FFFFFF' : '#1C1C24', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40,
    ...(isWeb ? { borderRadius: 16, width: 480, maxWidth: '90%' } : {}),
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: isWeb ? '#CED0D4' : '#3A3A45', alignSelf: 'center', marginBottom: 20, ...(isWeb ? { display: 'none' } : {}) },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: isWeb ? '#1C1E21' : '#FDFDFD' },
  modalInput: {
    backgroundColor: isWeb ? '#F0F2F5' : '#0D0D12', borderRadius: 16, padding: 16,
    fontSize: 15, color: isWeb ? '#1C1E21' : '#FDFDFD', borderWidth: 1, borderColor: isWeb ? '#CED0D4' : '#2A2A35',
    marginBottom: 16,
  },
  modalSaveBtn: { borderRadius: 9999, overflow: 'hidden', marginBottom: 10 },
  modalSaveGrad: { height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 9999 },
  modalSaveTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
  modalCancelBtn: { alignItems: 'center', paddingVertical: 12 },
  modalCancelTxt: { fontSize: 15, color: isWeb ? '#65676B' : '#636370', fontWeight: '600' },

  editSheet: {
    backgroundColor: isWeb ? '#FFFFFF' : '#1C1C24', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, maxHeight: '90%',
    ...(isWeb ? { borderRadius: 16, width: 480, maxWidth: '90%' } : {}),
  },
  editTitle: { fontSize: 22, fontWeight: '800', color: isWeb ? '#1C1E21' : '#FDFDFD', marginBottom: 20, textAlign: 'center' },
  editLabel: { fontSize: 13, fontWeight: '700', color: isWeb ? '#65676B' : '#A0A0AB', marginBottom: 6, marginLeft: 4 },

  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999,
    borderWidth: 1.5, borderColor: isWeb ? '#CED0D4' : '#2A2A35',
    backgroundColor: isWeb ? '#F0F2F5' : '#0D0D12',
  },
  chipSelected: { backgroundColor: isWeb ? '#1877F2' : '#FF5F6D', borderColor: isWeb ? '#1877F2' : '#FF5F6D' },
  chipText: { fontSize: 13, fontWeight: '600', color: isWeb ? '#65676B' : '#A0A0AB' },
  chipTextSelected: { color: '#fff' },

  privacyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  privacyIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: isWeb ? '#E7F3FF' : '#FF5F6D18', alignItems: 'center', justifyContent: 'center',
  },
  privacyInfo: { flex: 1, marginLeft: 12 },
  privacyLabel: { fontSize: 15, fontWeight: '600', color: isWeb ? '#1C1E21' : '#FDFDFD' },
  privacyDesc: { fontSize: 12, color: isWeb ? '#65676B' : '#636370', marginTop: 2 },
});
