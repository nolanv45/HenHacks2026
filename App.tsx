import React, {useEffect, useMemo, useState} from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {Camera, useCameraDevice} from 'react-native-vision-camera';
import {DataTypes, ObjectType, OpenCV} from 'react-native-fast-opencv';

function App(): React.JSX.Element {
  const [permission, setPermission] = useState<
    'granted' | 'denied' | 'pending'
  >('pending');
  const [cvResult, setCvResult] = useState<string>('Not tested yet');
  const device = useCameraDevice('back');

  useEffect(() => {
    const requestPermission = async () => {
      const status = await Camera.requestCameraPermission();
      setPermission(status === 'granted' ? 'granted' : 'denied');
    };

    requestPermission().catch(() => {
      setPermission('denied');
    });
  }, []);

  const statusText = useMemo(() => {
    if (permission === 'pending') {
      return 'Requesting camera permission...';
    }
    if (permission === 'denied') {
      return 'Camera permission denied. Enable it in app settings.';
    }
    return 'Camera ready. OpenCV bridge installed.';
  }, [permission]);

  const runOpenCvSanityCheck = () => {
    try {
      const src = OpenCV.createObject(
        ObjectType.Mat,
        2,
        2,
        DataTypes.CV_8U,
        [0, 127, 200, 255],
      );
      const dst = OpenCV.createObject(ObjectType.Mat, 2, 2, DataTypes.CV_8U);
      OpenCV.invoke('bitwise_not', src, dst);
      const out = OpenCV.matToBuffer(dst, 'uint8');
      setCvResult(`OpenCV OK: [${Array.from(out.buffer).join(', ')}]`);
      OpenCV.clearBuffers();
    } catch (error) {
      setCvResult(`OpenCV error: ${(error as Error).message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#10131a" />
      <View style={styles.header}>
        <Text style={styles.title}>HenHacks Mobile CV</Text>
        <Text style={styles.subtitle}>{statusText}</Text>
      </View>

      <View style={styles.cameraWrapper}>
        {permission === 'granted' && device != null ? (
          <Camera style={StyleSheet.absoluteFill} device={device} isActive />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              Camera preview will appear here
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={runOpenCvSanityCheck}>
          <Text style={styles.buttonLabel}>Run OpenCV Sanity Check</Text>
        </TouchableOpacity>
        <Text style={styles.cvResult}>{cvResult}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10131a',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    color: '#f4f7ff',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 6,
    color: '#c5d1e8',
    fontSize: 14,
  },
  cameraWrapper: {
    margin: 16,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1b2230',
    flex: 1,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#8f9ab1',
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    gap: 10,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#2962ff',
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  cvResult: {
    color: '#d7e1f6',
    fontSize: 13,
  },
});

export default App;
