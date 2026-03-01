import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
} from 'react-native';
import {RNMediapipe} from '@thinksys/react-native-mediapipe';
import WorkoutPanel, {WorkoutOption} from './components/WorkoutPanel';
import HomeLanding from './components/HomeLanding';

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

type WorkoutConfig = {
  id: string;
  label: string;
  points: [number, number, number];
  contractBelow: number;
  extendAbove: number;
};

const WORKOUTS: WorkoutConfig[] = [
  {
    id: 'curl',
    label: 'Bicep Curl',
    points: [11, 13, 15],
    contractBelow: 55,
    extendAbove: 150,
  },
  {
    id: 'press',
    label: 'Shoulder Press',
    points: [11, 13, 15],
    contractBelow: 95,
    extendAbove: 160,
  },
  {
    id: 'situp',
    label: 'Sit-up',
    points: [11, 23, 25],
    contractBelow: 80,
    extendAbove: 155,
  },
  {
    id: 'squat',
    label: 'Squat',
    points: [23, 25, 27],
    contractBelow: 80,
    extendAbove: 155,
  },
];

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
  const [currentAngle, setCurrentAngle] = useState<number | null>(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(WORKOUTS[0].id);
  const [hasCameraPermission, setHasCameraPermission] = useState(
    Platform.OS !== 'android',
  );


  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') {
      setHasCameraPermission(true);
      return true;
    }

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    const granted = result === PermissionsAndroid.RESULTS.GRANTED;
    setHasCameraPermission(granted);
    return granted;
  };

  const phaseRef = useRef<'contracted' | 'extended' | null>(null);
  const angleEmaRef = useRef<number | null>(null);
  const [showLanding, setShowLanding] = useState(true);

  const selectedWorkout =
    WORKOUTS.find(workout => workout.id === selectedWorkoutId) ?? WORKOUTS[0];
  const workoutOptions: WorkoutOption[] = WORKOUTS.map(workout => ({
    id: workout.id,
    label: workout.label,
  }));

  const selectedWorkoutRef = useRef(selectedWorkout);
  useEffect(() => {
    selectedWorkoutRef.current = selectedWorkout;
  }, [selectedWorkout]);

  const onSelectWorkout = (id: string) => {
    const next = WORKOUTS.find(w => w.id === id) ?? WORKOUTS[0];
    selectedWorkoutRef.current = next;
    setSelectedWorkoutId(id);
    setReps(0);
    setCurrentAngle(null);
    phaseRef.current = null;
    angleEmaRef.current = null;
  };

  const processWorkout = (payload: PosePayload) => {
    const workout = selectedWorkoutRef.current
    const pts = payload.worldLandmarks ?? payload.landmarks;
    if (!pts || pts.length <= workout.points[2]) {
      return;
    }

    const [aIndex, bIndex, cIndex] = workout.points;
    const a = pts[aIndex];
    const b = pts[bIndex];
    const c = pts[cIndex];

    if (!a || !b || !c) {
      return;
    }

    const confident = [a, b, c].every(
      point => (point.visibility ?? 1) > 0.5 && (point.presence ?? 1) > 0.5,
    );

    setTrackingQuality(confident ? 'good' : 'low');
    if (!confident) return;

    const rawAngle = angleABC(a, b, c);
    const alpha = 0.25;
    angleEmaRef.current =
      angleEmaRef.current == null
        ? rawAngle
        : alpha * rawAngle + (1 - alpha) * angleEmaRef.current;

    const angle = angleEmaRef.current ?? rawAngle;
    setCurrentAngle(angle);

    const onStartWorkout = () => {
      setShowLanding(false);
    }

    if (phaseRef.current == null) {
      phaseRef.current =
        angle > workout.extendAbove ? 'extended' : 'contracted';
      return;
    }

    if (
      phaseRef.current === 'extended' &&
      angle < workout.contractBelow
    ) {
      phaseRef.current = 'contracted';
    } else if (
      phaseRef.current === 'contracted' &&
      angle > workout.extendAbove
    ) {
      phaseRef.current = 'extended';
      setReps(current => current + 1);
    }
  };

  useEffect(() => {
    const askPermission = async () => {
      if (Platform.OS !== 'android') {
        return;
      }

      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      setHasCameraPermission(result === PermissionsAndroid.RESULTS.GRANTED);
    };

    askPermission();
  }, []);

  const onStartWorkout = () => {
    setShowLanding(false);
  };

  return (
    <>
      {showLanding ? (
        <HomeLanding
          cameraPermission={hasCameraPermission}
          onStartWorkout={onStartWorkout}
          requestCameraPermission={requestCameraPermission}
          styles={styles}
        />
      ) : (
        <SafeAreaView style={styles.container}>
          <Text style={styles.title}>MediaPipe Demo</Text>

          {hasCameraPermission ? (
            <>
              <WorkoutPanel
                reps={reps}
                angle={currentAngle}
                selectedWorkoutId={selectedWorkoutId}
                workouts={workoutOptions}
                onSelectWorkout={onSelectWorkout}
              />
              <RNMediapipe
                width={300}
                height={300}
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

                  processWorkout(data);
                  setLandmarks(data);
                }}
              />
            </>
          ) : (
            <Text style={styles.debug}>Camera permission is required.</Text>
          )}
          {landmarks && (
            <Text style={styles.debug} numberOfLines={3}>
              {JSON.stringify(landmarks).slice(0, 120)}...
            </Text>
          )}
        </SafeAreaView>
      )}
    </>
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
  debug: {
    color: '#555',
    fontSize: 11,
    fontFamily: 'monospace',
  },
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
