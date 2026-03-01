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
    contractBelow: 160,
    extendAbove: 95,
    goalReps: 10
  },
  {
    id: 5,
    label: 'Lateral raise',
    points: [23, 11, 13],
    contractBelow: 80,
    extendAbove: 20,
    goalReps: 10
  },
  {
    id: 6,
    label: 'Glute bridge',
    points: [11, 23, 25],
    contractBelow: 160,
    extendAbove: 120,
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

type Screen = 'home' | 'workout';

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [activeWorkouts, setActiveWorkouts] = useState<WorkoutConfig[]>([]);

  const [landmarks, setLandmarks] = useState<PosePayload | null>(null);
  const [reps, setReps] = useState(0);
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
    WORKOUTS[0];

  const selectedWorkoutOptions: WorkoutChoiceItem[] = activeWorkouts.map(w => ({
    key: w.label,
    workoutId: w.id,
    reps: w.goalReps,
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

    setReps(0);
    setCurrentAngle(null);
    phaseRef.current = null;
    angleEmaRef.current = null;
    setShowLanding(false);
  };

  const onSelectWorkout = (id: number) => {
    const next = activeWorkouts.find(w => w.id === id) ?? activeWorkouts[0];
    if (!next) return;
    selectedWorkoutRef.current = next;
    setSelectedWorkoutId(id);
    setReps(0);
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
      setReps(current => current + 1);
    }
  };


  return (
    <>
      {showLanding ? (
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
                reps={reps}
                angle={currentAngle}
                selectedWorkoutId={selectedWorkoutId}
                workouts={selectedWorkoutOptions}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
    alignItems: 'center',
    paddingTop: 16,
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
});