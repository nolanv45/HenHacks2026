import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Linking,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {RNMediapipe, switchCamera} from '@thinksys/react-native-mediapipe';

type Pt = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  presence?: number;
};

type PosePayload = {
  landmarks?: Pt[];
  worldLandmarks?: Pt[];
};

const IDX = {
  LEFT_SHOULDER: 11,
  LEFT_ELBOW: 13,
  LEFT_WRIST: 15,
} as const;

const angleABC = (a: Pt, b: Pt, c: Pt) => {
  const ab = {x: a.x - b.x, y: a.y - b.y};
  const cb = {x: c.x - b.x, y: c.y - b.y};
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.hypot(ab.x, ab.y);
  const magCB = Math.hypot(cb.x, cb.y);
  if (!magAB || !magCB) return 180;
  const cos = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  return (Math.acos(cos) * 180) / Math.PI;
};

type Screen = 'home' | 'workout';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  // ---- Rep counting state (kept from your original) ----
  const [landmarks, setLandmarks] = useState<PosePayload | null>(null);
  const [reps, setReps] = useState(0);

  // Camera permission
  const [cameraPermission, setCameraPermission] = useState<
    'checking' | 'granted' | 'denied' | 'never_ask_again'
  >(Platform.OS === 'android' ? 'checking' : 'granted');

  const hasLoggedOnce = useRef(false);
  const phaseRef = useRef<'up' | 'down'>('down');
  const angleEmaRef = useRef<number | null>(null);

  // Optional: simple quality indicator (for UI)
  const [trackingQuality, setTrackingQuality] = useState<
    'unknown' | 'good' | 'low'
  >('unknown');

  const processCurl = (payload: PosePayload) => {
    const pts = payload.worldLandmarks ?? payload.landmarks;
    if (!pts || pts.length <= IDX.LEFT_WRIST) return;

    const shoulder = pts[IDX.LEFT_SHOULDER];
    const elbow = pts[IDX.LEFT_ELBOW];
    const wrist = pts[IDX.LEFT_WRIST];
    if (!shoulder || !elbow || !wrist) return;

    const confident = [shoulder, elbow, wrist].every(
      p => (p.visibility ?? 1) > 0.5 && (p.presence ?? 1) > 0.5,
    );

    setTrackingQuality(confident ? 'good' : 'low');
    if (!confident) return;

    const rawAngle = angleABC(shoulder, elbow, wrist);
    const alpha = 0.25;
    angleEmaRef.current =
      angleEmaRef.current == null
        ? rawAngle
        : alpha * rawAngle + (1 - alpha) * angleEmaRef.current;

    const angle = angleEmaRef.current;
    const UP = 55;
    const DOWN = 150;

    if (phaseRef.current === 'down' && angle < UP) {
      phaseRef.current = 'up';
    } else if (phaseRef.current === 'up' && angle > DOWN) {
      phaseRef.current = 'down';
      setReps(current => current + 1);
    }
  };

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') {
      setCameraPermission('granted');
      return;
    }

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );

    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      setCameraPermission('granted');
    } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      setCameraPermission('never_ask_again');
    } else {
      setCameraPermission('denied');
    }
  };

  useEffect(() => {
    const initPermission = async () => {
      if (Platform.OS !== 'android') return;

      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );

      if (hasPermission) {
        setCameraPermission('granted');
        return;
      }

      await requestCameraPermission();
    };

    initPermission();
  }, []);

  const permissionCopy = useMemo(() => {
    if (cameraPermission === 'checking') return 'Checking camera permission...';
    if (cameraPermission === 'never_ask_again')
      return 'Camera permission is blocked. Enable it in settings to start counting reps.';
    return 'Camera access is required to count reps.';
  }, [cameraPermission]);

  const onFlip = () => switchCamera();

  const onStartWorkout = async () => {
    // If permission isn't granted, handle it before navigating
    if (cameraPermission !== 'granted') {
      if (cameraPermission === 'never_ask_again') {
        Linking.openSettings();
        return;
      }
      await requestCameraPermission();
      return;
    }

    // Reset workout session state (optional but nice)
    setReps(0);
    setLandmarks(null);
    phaseRef.current = 'down';
    angleEmaRef.current = null;
    setTrackingQuality('unknown');

    setScreen('workout');
  };

  // ---- UI ----
  return (
    <SafeAreaView style={styles.safe}>
      {screen === 'home' ? (
        <View style={styles.page}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.subGreeting}>Let’s get a workout in.</Text>
          </View>

          {/* Hero card */}
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Start Workout</Text>
            <Text style={styles.heroSubtitle}>
              Open the camera and start counting reps in real time.
            </Text>

            <TouchableOpacity
              onPress={onStartWorkout}
              style={styles.primaryBtn}
              activeOpacity={0.9}>
              <Text style={styles.primaryBtnText}>Start</Text>
            </TouchableOpacity>

            {/* Permission hint */}
            {cameraPermission !== 'granted' && (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>{permissionCopy}</Text>

                <TouchableOpacity
                  onPress={
                    cameraPermission === 'never_ask_again'
                      ? () => Linking.openSettings()
                      : requestCameraPermission
                  }
                  style={styles.secondaryBtn}
                  activeOpacity={0.9}>
                  <Text style={styles.secondaryBtnText}>
                    {cameraPermission === 'never_ask_again'
                      ? 'Open Settings'
                      : 'Enable Camera'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Minimal stats row (looks premium without clutter) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today</Text>
            <View style={styles.row}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Workouts</Text>
                <Text style={styles.statValue}>0</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Streak</Text>
                <Text style={styles.statValue}>0</Text>
              </View>
            </View>
          </View>

          <View style={{flex: 1}} />
          <Text style={styles.footerHint}>
            Tip: Stand back so your whole arm is visible.
          </Text>
        </View>
      ) : (
        <View style={styles.workoutPage}>
          {/* Top bar */}
          <View style={styles.workoutTopBar}>
            <TouchableOpacity
              onPress={() => setScreen('home')}
              style={styles.topPill}
              activeOpacity={0.85}>
              <Text style={styles.topPillText}>Home</Text>
            </TouchableOpacity>

            <View style={styles.topStatus}>
              <Text style={styles.topStatusLabel}>Tracking</Text>
              <Text
                style={[
                  styles.topStatusValue,
                  trackingQuality === 'good'
                    ? styles.good
                    : trackingQuality === 'low'
                      ? styles.low
                      : styles.unknown,
                ]}>
                {trackingQuality === 'good'
                  ? 'Good'
                  : trackingQuality === 'low'
                    ? 'Low'
                    : '…'}
              </Text>
            </View>
          </View>

          {/* Counter card */}
          <View style={styles.counterCard}>
            <Text style={styles.counterLabel}>Reps</Text>
            <Text style={styles.counterValue}>{reps}</Text>

            <View style={styles.counterActions}>
              <TouchableOpacity
                onPress={() => {
                  setReps(0);
                  phaseRef.current = 'down';
                  angleEmaRef.current = null;
                }}
                style={styles.secondaryBtnWide}
                activeOpacity={0.9}>
                <Text style={styles.secondaryBtnText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onFlip}
                style={styles.secondaryBtnWide}
                activeOpacity={0.9}>
                <Text style={styles.secondaryBtnText}>Switch Camera</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Camera */}
          {cameraPermission === 'granted' ? (
            <View style={styles.cameraWrap}>
              <RNMediapipe
                width={340}
                height={420}
                face={true}
                leftArm={true}
                rightArm={true}
                leftWrist={true}
                rightWrist={true}
                torso={true}
                leftLeg={true}
                rightLeg={true}
                leftAnkle={true}
                rightAnkle={true}
                onLandmark={raw => {
                  const data: PosePayload =
                    typeof raw === 'string' ? JSON.parse(raw) : (raw as PosePayload);

                  // Keep your one-time debug log (disabled by default)
                  if (!hasLoggedOnce.current) {
                    hasLoggedOnce.current = true;
                    // console.log('Body Landmark Data:', JSON.stringify(data, null, 2));
                  }

                  processCurl(data);
                  setLandmarks(data);
                }}
              />
            </View>
          ) : (
            <View style={styles.permissionBlock}>
              <Text style={styles.permissionTitle}>Camera needed</Text>
              <Text style={styles.permissionText}>{permissionCopy}</Text>
              <TouchableOpacity
                onPress={
                  cameraPermission === 'never_ask_again'
                    ? () => Linking.openSettings()
                    : requestCameraPermission
                }
                style={styles.primaryBtn}
                activeOpacity={0.9}>
                <Text style={styles.primaryBtnText}>
                  {cameraPermission === 'never_ask_again'
                    ? 'Open Settings'
                    : 'Enable Camera'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tiny dev preview (optional) */}
          {__DEV__ && landmarks && (
            <Text style={styles.devHint} numberOfLines={2}>
              {JSON.stringify(landmarks).slice(0, 110)}…
            </Text>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const SPACING = 16;
const RADIUS = 18;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0B0B0F',
  },

  // HOME
  page: {
    flex: 1,
    paddingHorizontal: SPACING,
    paddingTop: 10,
  },
  header: {
    marginTop: 6,
    marginBottom: 14,
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subGreeting: {
    marginTop: 6,
    color: '#A6ADBB',
    fontSize: 15,
  },
  heroCard: {
    borderRadius: RADIUS,
    backgroundColor: '#12131A',
    borderWidth: 1,
    borderColor: '#1E202B',
    padding: SPACING,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    marginTop: 8,
    color: '#A6ADBB',
    fontSize: 14,
    lineHeight: 20,
  },
  primaryBtn: {
    marginTop: 14,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  primaryBtnText: {
    color: '#0B0B0F',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  notice: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#1E202B',
    gap: 10,
  },
  noticeText: {
    color: '#A6ADBB',
    fontSize: 13,
    lineHeight: 18,
  },
  secondaryBtn: {
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B1C22',
    borderWidth: 1,
    borderColor: '#2A2C35',
  },
  secondaryBtnWide: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B1C22',
    borderWidth: 1,
    borderColor: '#2A2C35',
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  section: {
    marginTop: 18,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#12131A',
    borderWidth: 1,
    borderColor: '#1E202B',
    padding: 14,
  },
  statLabel: {
    color: '#A6ADBB',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  footerHint: {
    color: '#6E7688',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },

  // WORKOUT
  workoutPage: {
    flex: 1,
    paddingHorizontal: SPACING,
    paddingTop: 10,
  },
  workoutTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  topPill: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#1B1C22',
    borderWidth: 1,
    borderColor: '#2A2C35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  topStatus: {
    alignItems: 'flex-end',
  },
  topStatusLabel: {
    color: '#A6ADBB',
    fontSize: 11,
    fontWeight: '700',
  },
  topStatusValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '900',
  },
  good: {color: '#7EE787'},
  low: {color: '#FFA657'},
  unknown: {color: '#A6ADBB'},

  counterCard: {
    borderRadius: RADIUS,
    backgroundColor: '#12131A',
    borderWidth: 1,
    borderColor: '#1E202B',
    padding: SPACING,
    marginBottom: 14,
  },
  counterLabel: {
    color: '#A6ADBB',
    fontSize: 12,
    fontWeight: '800',
  },
  counterValue: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  counterActions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 12,
  },

  cameraWrap: {
    flex: 1,
    borderRadius: RADIUS,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E202B',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },

  permissionBlock: {
    flex: 1,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: '#1E202B',
    backgroundColor: '#12131A',
    padding: SPACING,
    justifyContent: 'center',
    gap: 10,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  permissionText: {
    color: '#A6ADBB',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },

  devHint: {
    marginTop: 10,
    color: '#6E7688',
    fontSize: 11,
    fontFamily: 'monospace',
  },
});