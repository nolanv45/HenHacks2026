import React, {useEffect, useRef, useState} from 'react';
import {
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
} from 'react-native';
import {RNMediapipe} from '@thinksys/react-native-mediapipe';
import WorkoutPanel, {WorkoutOption} from './components/WorkoutPanel';

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
];

const angleABC = (a: Pt, b: Pt, c: Pt) => {
  const ab = {x: a.x - b.x, y: a.y - b.y};
  const cb = {x: c.x - b.x, y: c.y - b.y};
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.hypot(ab.x, ab.y);
  const magCB = Math.hypot(cb.x, cb.y);
  if (!magAB || !magCB) {
    return 180;
  }
  const cos = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  return (Math.acos(cos) * 180) / Math.PI;
};

export default function App() {
  const [landmarks, setLandmarks] = useState<PosePayload | null>(null);
  const [reps, setReps] = useState(0);
  const [currentAngle, setCurrentAngle] = useState<number | null>(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(WORKOUTS[0].id);
  const [hasCameraPermission, setHasCameraPermission] = useState(
    Platform.OS !== 'android',
  );

  const hasLoggedOnce = useRef(false);
  const phaseRef = useRef<'contracted' | 'extended' | null>(null);
  const angleEmaRef = useRef<number | null>(null);

  const selectedWorkout =
    WORKOUTS.find(workout => workout.id === selectedWorkoutId) ?? WORKOUTS[0];
  const workoutOptions: WorkoutOption[] = WORKOUTS.map(workout => ({
    id: workout.id,
    label: workout.label,
  }));

  const onSelectWorkout = (id: string) => {
    setSelectedWorkoutId(id);
    setReps(0);
    setCurrentAngle(null);
    phaseRef.current = null;
    angleEmaRef.current = null;
  };

  const processWorkout = (payload: PosePayload) => {
    const pts = payload.worldLandmarks ?? payload.landmarks;
    if (!pts || pts.length <= selectedWorkout.points[2]) {
      return;
    }

    const [aIndex, bIndex, cIndex] = selectedWorkout.points;
    const shoulder = pts[aIndex];
    const elbow = pts[bIndex];
    const wrist = pts[cIndex];

    if (!shoulder || !elbow || !wrist) {
      return;
    }

    const confident = [shoulder, elbow, wrist].every(
      point => (point.visibility ?? 1) > 0.5 && (point.presence ?? 1) > 0.5,
    );
    if (!confident) {
      return;
    }

    const rawAngle = angleABC(shoulder, elbow, wrist);
    const alpha = 0.25;
    angleEmaRef.current =
      angleEmaRef.current == null
        ? rawAngle
        : alpha * rawAngle + (1 - alpha) * angleEmaRef.current;

    const angle = angleEmaRef.current ?? rawAngle;
    setCurrentAngle(angle);

    if (phaseRef.current == null) {
      phaseRef.current =
        angle > selectedWorkout.extendAbove ? 'extended' : 'contracted';
      return;
    }

    if (
      phaseRef.current === 'extended' &&
      angle < selectedWorkout.contractBelow
    ) {
      phaseRef.current = 'contracted';
    } else if (
      phaseRef.current === 'contracted' &&
      angle > selectedWorkout.extendAbove
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

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>MediaPipe Demo</Text>

      <WorkoutPanel
        reps={reps}
        angle={currentAngle}
        selectedWorkoutId={selectedWorkoutId}
        workouts={workoutOptions}
        onSelectWorkout={onSelectWorkout}
      />

      {hasCameraPermission ? (
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

            if (!hasLoggedOnce.current) {
              hasLoggedOnce.current = true;
              console.log('Body Landmark Data:', JSON.stringify(data, null, 2));
            }

            processWorkout(data);
            setLandmarks(data);
          }}
        />
      ) : (
        <Text style={styles.debug}>Camera permission is required.</Text>
      )}

      {landmarks && (
        <Text style={styles.debug} numberOfLines={3}>
          {JSON.stringify(landmarks).slice(0, 120)}...
        </Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    paddingTop: 20,
    gap: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
  },
  debug: {
    color: '#555',
    fontSize: 11,
    paddingHorizontal: 16,
    fontFamily: 'monospace',
  },
});
