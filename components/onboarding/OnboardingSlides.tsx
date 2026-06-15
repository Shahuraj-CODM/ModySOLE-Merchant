import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  Animated, FlatList, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

const { width, height } = Dimensions.get('window');
export const ONBOARDING_KEY = 'modysole_onboarding_done';

const SLIDES = [
  {
    id: '1',
    icon: 'cube-outline' as const,
    iconColor: Colors.gold,
    gradient: ['#1A1200', '#0A0800', '#000000'] as any,
    accentColor: Colors.gold,
    title: 'Build Your Perfect Sole',
    subtitle: "India's first modular footwear. Mix, match, and snap components together in seconds.",
    badge: '⚡ MODULAR',
  },
  {
    id: '2',
    icon: 'swap-horizontal-outline' as const,
    iconColor: '#A855F7',
    gradient: ['#0D0020', '#080010', '#000000'] as any,
    accentColor: '#A855F7',
    title: 'Swap in Under 3 Seconds',
    subtitle: 'Change your sole, base, or laces on the fly. One click in the 3D Customiser, done.',
    badge: '🔄 SNAP TECH',
  },
  {
    id: '3',
    icon: 'bag-handle-outline' as const,
    iconColor: '#22C55E',
    gradient: ['#001A0A', '#000D05', '#000000'] as any,
    accentColor: '#22C55E',
    title: 'Shop, Order & Track',
    subtitle: 'Browse the full catalog, order with one tap, and track your delivery in real-time.',
    badge: '📦 LIVE TRACKING',
  },
];

interface Props {
  onDone: () => void;
}

export default function OnboardingSlides({ onDone }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
      setActiveIndex(activeIndex + 1);
    }
  };

  const handleDone = async () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(async () => {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      onDone();
    });
  };

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={(s) => s.id}
        onMomentumScrollEnd={(e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item: slide }) => (
          <LinearGradient colors={slide.gradient} style={styles.slide}>
            {/* Background glow */}
            <View style={[styles.bgGlow, { backgroundColor: slide.accentColor + '08' }]} />

            {/* Badge */}
            <View style={[styles.badge, { borderColor: slide.accentColor + '40', backgroundColor: slide.accentColor + '15' }]}>
              <Text style={[styles.badgeText, { color: slide.accentColor }]}>{slide.badge}</Text>
            </View>

            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: slide.accentColor + '15', borderColor: slide.accentColor + '30' }]}>
              <Ionicons name={slide.icon} size={80} color={slide.accentColor} />
            </View>

            {/* Text */}
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
          </LinearGradient>
        )}
      />

      {/* Bottom controls */}
      <View style={styles.controls}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                flatListRef.current?.scrollToIndex({ index: i, animated: true });
                setActiveIndex(i);
              }}
            >
              <Animated.View style={[
                styles.dot,
                i === activeIndex && styles.dotActive,
                i === activeIndex && { backgroundColor: SLIDES[activeIndex].accentColor },
              ]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Skip / Next / Get Started */}
        <View style={styles.btnRow}>
          {!isLast ? (
            <>
              <TouchableOpacity style={styles.skipBtn} onPress={handleDone}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.nextBtn, { borderColor: SLIDES[activeIndex].accentColor }]} onPress={handleNext}>
                <Text style={[styles.nextText, { color: SLIDES[activeIndex].accentColor }]}>Next</Text>
                <Ionicons name="arrow-forward" size={16} color={SLIDES[activeIndex].accentColor} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.getStartedBtn} onPress={handleDone}>
              <LinearGradient colors={Colors.gradientGold} style={styles.getStartedGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.getStartedText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.black} />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  slide: { width, height, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 180 },
  bgGlow: { position: 'absolute', top: height * 0.1, width: 300, height: 300, borderRadius: 150, alignSelf: 'center' },
  badge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: BorderRadius.full, borderWidth: 1, marginBottom: 40 },
  badgeText: { fontFamily: Typography.fontBodyBold, fontSize: 11, letterSpacing: 2 },
  iconContainer: { width: 160, height: 160, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 40 },
  slideTitle: { fontFamily: Typography.fontHeadingBold, fontSize: 28, color: Colors.textPrimary, textAlign: 'center', lineHeight: 36, marginBottom: 16 },
  slideSubtitle: { fontFamily: Typography.fontBody, fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  controls: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.lg, paddingBottom: 50, gap: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.surface3 },
  dotActive: { width: 24 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skipBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  skipText: { fontFamily: Typography.fontBodyMedium, fontSize: Typography.base, color: Colors.textMuted },
  nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: BorderRadius.lg, borderWidth: 1 },
  nextText: { fontFamily: Typography.fontBodyBold, fontSize: Typography.base },
  getStartedBtn: { flex: 1, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  getStartedGrad: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  getStartedText: { fontFamily: Typography.fontBodyBold, fontSize: Typography.base, color: Colors.black },
});
