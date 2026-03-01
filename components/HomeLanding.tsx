import React from 'react';
import {Linking, StyleSheet, Text, TouchableOpacity, View} from 'react-native';


type HomeLandingProps = {
  cameraPermission: CameraPermission;
  onStartWorkout: () => void;
  requestCameraPermission: () => void;
  styles: any;
};

export default function HomeLanding({
  cameraPermission,
  onStartWorkout,
  requestCameraPermission,
  styles,
}: HomeLandingProps) {
  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back</Text>
        <Text style={styles.subGreeting}>Let’s get a workout in.</Text>
      </View>

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

        {cameraPermission !== 'granted' && (
          <View style={styles.notice}>

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
  );
}
