import React, {useEffect, useRef, useState} from 'react';
import {
  Linking,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import {RNMediapipe} from '@thinksys/react-native-mediapipe';

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
  if (!magAB || !magCB) {
    return 180;
  }
  const cos = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  return (Math.acos(cos) * 180) / Math.PI;
};

export default function App() {
  const [landmarks, setLandmarks] = useState<PosePayload | null>(null);
  const [reps, setReps] = useState(0);
  const [cameraPermission, setCameraPermission] = useState<
    'checking' | 'granted' | 'denied' | 'never_ask_again'
  >(Platform.OS === 'android' ? 'checking' : 'granted');

  const hasLoggedOnce = useRef(false);
  const phaseRef = useRef<'up' | 'down'>('down');
  const angleEmaRef = useRef<number | null>(null);

  const processCurl = (payload: PosePayload) => {
    const pts = payload.worldLandmarks ?? payload.landmarks;
    if (!pts || pts.length <= IDX.LEFT_WRIST) {
      return;
    }

    const shoulder = pts[IDX.LEFT_SHOULDER];
    const elbow = pts[IDX.LEFT_ELBOW];
    const wrist = pts[IDX.LEFT_WRIST];

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
      if (Platform.OS !== 'android') {
        return;
      }
      await requestCameraPermission();
    };

    initPermission();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>MediaPipe Demo</Text>
      <Text style={styles.reps}>Reps: {reps}</Text>

      {cameraPermission === 'granted' ? (
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

            processCurl(data);
            setLandmarks(data);
          }}
        />
      ) : (
        <>
          <Text style={styles.debug}>
            {cameraPermission === 'checking'
              ? 'Checking camera permission...'
              : cameraPermission === 'never_ask_again'
              ? 'Camera permission blocked. Open settings and enable Camera.'
              : 'Camera permission required.'}
          </Text>
          <TouchableOpacity
            onPress={
              cameraPermission === 'never_ask_again'
                ? () => Linking.openSettings()
                : requestCameraPermission
            }
            style={styles.btn}>
            <Text style={styles.btnText}>
              {cameraPermission === 'never_ask_again'
                ? 'Open Settings'
                : 'Enable Camera'}
            </Text>
          </TouchableOpacity>
        </>
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
  reps: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  btn: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  debug: {
    color: '#555',
    fontSize: 11,
    paddingHorizontal: 16,
    fontFamily: 'monospace',
  },
});
