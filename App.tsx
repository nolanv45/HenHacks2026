import React, {useEffect, useRef, useState} from 'react';
import {
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {RNMediapipe, switchCamera} from '@thinksys/react-native-mediapipe';
import WorkoutPanel, {WorkoutOption} from './components/WorkoutPanel';
import HomeLanding from './components/HomeLanding';
import { WorkoutChoiceItem } from './components/WorkoutChoices';

/* Pt:
  Data structure representing single body landmark points in MediaPipe,
  with optional confidence scores
*/
type Pt = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  presence?: number;
};

/* PosePayload:
  Data structure for capturing the array of MediaPipe body landmarks rendered on the screen at a given frame
*/
type PosePayload = {
  landmarks?: Pt[];
  worldLandmarks?: Pt[];
};

/* WorkoutConfig:
  Data structure for each workout, where:
    - ID = rank/order of workouts
    - Label = name of workout
    - Points = MediaPipe landmark indices for calculating angles of each exercise
    - contractBelow = angle of contracted position for each workout
    - extendAbove = angle of extended position for each workout
    - goalReps = amount of reps user wants to achieve in workout session
*/
type WorkoutConfig = {
  id: number;
  label: string;
  points: [number, number, number];
  contractBelow: number;
  extendAbove: number;
  goalReps: number
};

/* WORKOUTS:
  Array of possible exercises for user, initialized as an array of WorkoutConfigs
*/
const WORKOUTS: WorkoutConfig[] = [
  {
    id: 0,
    label: 'Bicep Curl',
    points: [11, 13, 15],
    contractBelow: 55,
    extendAbove: 150,
    goalReps: 10
  },
  {
    id: 1,
    label: 'Shoulder Press',
    points: [11, 13, 15],
    contractBelow: 95,
    extendAbove: 160,
    goalReps: 10
  },
  {
    id: 2,
    label: 'Sit-up',
    points: [11, 23, 25],
    contractBelow: 80,
    extendAbove: 155,
    goalReps: 10
  },
  {
    id: 3,
    label: 'Squat',
    points: [23, 25, 27],
    contractBelow: 95,
    extendAbove: 160,
    goalReps: 10
  },
  {
    id: 4,
    label: 'Push-up',
    points: [11, 13, 15],
    contractBelow: 70,
    extendAbove: 150,
    goalReps: 10
  },
];


/*
  Main mathematical function where, given three landmark points, it:
    - Calculates the angle at the middle point b using dot product of vectors, forming two vectors ab and cb, representing different ligaments/limbs (i.e. arm and forearm for bicep curls)
    - Takes the arccos of their dot product divided by the product of their lengths (magnitudes).
*/
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

type Screen = 'landing' | 'workout' | 'summary';

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [activeWorkouts, setActiveWorkouts] = useState<WorkoutConfig[]>([]);

  const [landmarks, setLandmarks] = useState<PosePayload | null>(null);
  // repMap stores completed reps per workoutId so switching workouts preserves counts
  const [repMap, setRepMap] = useState<Record<number, number>>({});
  const [currentAngle, setCurrentAngle] = useState<number | null>(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(WORKOUTS[0].id);
  const [hasCameraPermission, setHasCameraPermission] = useState(
    Platform.OS !== 'android',
  );


  const phaseRef = useRef<'contracted' | 'extended' | null>(null);
  const angleEmaRef = useRef<number | null>(null);

  const selectedWorkout =
    activeWorkouts.find(w => w.id === selectedWorkoutId) ??
    activeWorkouts[0] ??
    WORKOUTS[0] ?? 
    null;
  
  if (!selectedWorkout) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.noWorkout}>No workout selected.</Text>
      </View>
    );
  }

  const selectedWorkoutOptions: WorkoutOption[] = activeWorkouts.map(w => ({
    id: w.id,
    label: w.label,
    goalReps: w.goalReps,
  }));

  const selectedWorkoutRef = useRef(selectedWorkout);

  useEffect(() => {
    selectedWorkoutRef.current = selectedWorkout;
  }, [selectedWorkout]);

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

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const onStartWorkout = (choices: WorkoutChoiceItem[]) => {
    // Build activeWorkouts from user choices, applying their chosen reps
    const resolved: WorkoutConfig[] = choices
      .map(choice => {
        const base = WORKOUTS.find(w => w.id === choice.workoutId);
        if (!base) return null;
        return {...base, goalReps: choice.reps};
      })
      .filter((w): w is WorkoutConfig => w !== null);

    setActiveWorkouts(resolved);

    // Default to first selected workout
    if (resolved.length > 0) {
      setSelectedWorkoutId(resolved[0].id);
      selectedWorkoutRef.current = resolved[0];
    }

    setRepMap({});
    setCurrentAngle(null);
    phaseRef.current = null;
    angleEmaRef.current = null;
    setScreen('workout');
  };

  const onSelectWorkout = (id: number) => {
    const next = activeWorkouts.find(w => w.id === id) ?? activeWorkouts[0];
    if (!next) return;
    selectedWorkoutRef.current = next;
    setSelectedWorkoutId(id);
    // do NOT reset repMap here — preserve reps when switching workouts
    setCurrentAngle(null);
    phaseRef.current = null;
    angleEmaRef.current = null;
  };

  const processWorkout = (payload: PosePayload) => {
    const workout = selectedWorkoutRef.current;
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

    // Require all three joints to be clearly visible in frame.
    // visibility < 0.5 means the joint is likely occluded or out of frame.
    // When any joint drops out, reset phase so no phantom rep is counted
    // when the user steps back in.
    const VISIBILITY_THRESHOLD = 0.6;
    const allVisible =
      (a.visibility ?? 1) >= VISIBILITY_THRESHOLD &&
      (b.visibility ?? 1) >= VISIBILITY_THRESHOLD &&
      (c.visibility ?? 1) >= VISIBILITY_THRESHOLD;

    if (!allVisible) {
      // reset tracking state so re-entry starts clean
      phaseRef.current = null;
      angleEmaRef.current = null;
      setCurrentAngle(null);
      return;
    }

    const rawAngle = angleABC(a, b, c);
    const alpha = 0.25;
    angleEmaRef.current =
      angleEmaRef.current == null
        ? rawAngle
        : alpha * rawAngle + (1 - alpha) * angleEmaRef.current;

    const angle = angleEmaRef.current ?? rawAngle;
    setCurrentAngle(angle);

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
      setRepMap(prev => ({
        ...prev,
        [selectedWorkoutRef.current.id]: (prev[selectedWorkoutRef.current.id] ?? 0) + 1,
      }));
    }
  };


  const finishWorkout = () => {
    setCurrentAngle(null);
    phaseRef.current = null;
    angleEmaRef.current = null;
    setScreen('summary');
  };

  const returnHome = () => {
    setRepMap({});
    setActiveWorkouts([]);
    setCurrentAngle(null);
    phaseRef.current = null;
    angleEmaRef.current = null;
    setScreen('landing');
  };

  if (screen === 'summary') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.summaryWrap}>
          <Text style={styles.summaryTitle}>Workout Complete!</Text>
          <Text style={styles.summarySubtitle}>Workout summary:</Text>

          <View style={styles.summaryList}>
            {activeWorkouts.map(w => {
              const done = repMap[w.id] ?? 0;
              const goal = w.goalReps;
              const achieved = done >= goal;
              return (
                <View key={w.id} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{w.label}</Text>
                  <Text style={[styles.summaryReps, achieved && styles.summaryRepsAchieved]}>
                    {done} / {goal}
                  </Text>
                  <Text style={styles.summaryCheck}>{achieved ? '✓' : '–'}</Text>
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.homeBtn}
            onPress={returnHome}
            activeOpacity={0.85}>
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      {screen === 'landing' ? (
        <HomeLanding
          cameraPermission={hasCameraPermission}
          onStartWorkout={onStartWorkout}
          requestCameraPermission={requestCameraPermission}
          workoutChoices={WORKOUTS}
        />
      ) : (
        <SafeAreaView style={styles.container}>

          {hasCameraPermission ? (
            <>
              <WorkoutPanel
                reps={repMap[selectedWorkoutId] ?? 0}
                angle={currentAngle}
                selectedWorkoutId={selectedWorkoutId}
                workouts={selectedWorkoutOptions}
                onSelectWorkout={onSelectWorkout}
              />
            <View style={styles.cameraWrap}>
              <RNMediapipe
                width={width}
                height={height / 1.5}
                face={false}
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
              </View>

              {/* Switch camera — top-right corner above the feed */}
              <TouchableOpacity
                style={styles.switchCameraBtn}
                onPress={() => switchCamera()}
                activeOpacity={0.8}>
                <Text style={styles.switchCameraBtnText}>⇄ Flip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.finishBtn}
                onPress={finishWorkout}
                activeOpacity={0.85}>
                <Text style={styles.finishBtnText}>✓  Finish Workout</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.permissionWrap}>
              <Text style={styles.permissionText}>
                Camera permission is required to track your workout.
              </Text>
              <Text
                style={styles.permissionLink}
                onPress={requestCameraPermission}>
                Enable Camera
              </Text>
            </View>
          )}
        </SafeAreaView>

      )}
    </>
  );
}

const {width, height} = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
  },
  summaryWrap: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    backgroundColor: '#0B0B0F',
  },
  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 6,
  },
  summarySubtitle: {
    color: '#A6ADBB',
    fontSize: 14,
    marginBottom: 24,
  },
  summaryList: {
    gap: 10,
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12131A',
    borderWidth: 1,
    borderColor: '#1E202B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  summaryLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  summaryReps: {
    color: '#A6ADBB',
    fontSize: 15,
    fontWeight: '700',
  },
  summaryRepsAchieved: {
    color: '#4ADE80',
  },
  summaryCheck: {
    color: '#4ADE80',
    fontSize: 16,
    fontWeight: '900',
    width: 20,
    textAlign: 'center',
  },
  homeBtn: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  homeBtnText: {
    color: '#0B0B0F',
    fontSize: 16,
    fontWeight: '900',
  },
  cameraWrap: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  permissionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  permissionText: {
    color: '#A6ADBB',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionLink: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  debug: {
    color: '#555',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  switchCameraBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    zIndex: 10,
  },
  switchCameraBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  finishBtn: {
    position: 'absolute',   // floats over the camera
    bottom: 32,
    left: 20,
    right: 20,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FF4C4C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
});