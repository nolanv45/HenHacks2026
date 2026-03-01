/**
 * HomeLanding.tsx
 *
 * The entry screen displayed before the user starts a workout session.
 * Renders a greeting, a "Start Workout" hero card, and conditionally
 * shows camera permission UI and the WorkoutChoices planner.
 */

import React, {useEffect, useState } from 'react';
import {Linking, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import WorkoutChoices, {makeDefaultWorkoutChoices, WorkoutChoiceItem} from './WorkoutChoices';



type WorkoutConfig = {id: number; label: string; points: [number, number, number]; extendAbove: number; contractBelow: number, goalReps: number};

// Local redefinition of the same WorkoutConfig that already lives in App.tsx

type HomeLandingProps = {
  cameraPermission: boolean;
  onStartWorkout: (choices: WorkoutChoiceItem[]) => void;
  requestCameraPermission: () => void;
  workoutChoices: WorkoutConfig[];
};

export default function HomeLanding({
  cameraPermission,
  onStartWorkout,
  requestCameraPermission,
  workoutChoices,
}: HomeLandingProps) {
  const [choices, setChoices] = useState<WorkoutChoiceItem[]>([]);
  const canStart = choices.length > 0;


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
          onPress={() => onStartWorkout(choices)}
          style={canStart ? styles.startBtn : styles.startBtnDisabled}
          disabled={!canStart}
          activeOpacity={0.85}>
      
        </TouchableOpacity>

        <WorkoutChoices
          workouts={workoutChoices}
          value={choices}
          onChange={setChoices}
        />
       

       

        {!cameraPermission && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>Camera permission required.</Text>
            <TouchableOpacity
              onPress={requestCameraPermission}
              style={styles.secondaryBtn}
              activeOpacity={0.9}>
              <Text style={styles.secondaryBtnText}>Enable Camera</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={{flex: 1}} />
    </View>
  );
}
const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#0B0B0F',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  header: {marginBottom: 18},
  greeting: {color: '#FFFFFF', fontSize: 26, fontWeight: '800'},
  subGreeting: {marginTop: 4, color: '#A6ADBB', fontSize: 14},
  heroCard: {
    backgroundColor: '#12131A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E202B',
  },
  heroTitle: {color: '#FFFFFF', fontSize: 18, fontWeight: '800'},
  heroSubtitle: {marginTop: 6, color: '#A6ADBB', fontSize: 13, lineHeight: 18},
  startBtn: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startBtnDisabled: {
    marginTop: 16,
    backgroundColor: '#2A2C35',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#0B0B0F',
    fontWeight: '900',
    fontSize: 16,
  },
  startBtnTextDisabled: {
    color: '#6E7688',
    fontWeight: '900',
    fontSize: 16,
  },
  notice: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#1E202B',
    gap: 8,
  },
  noticeText: {color: '#FFA657', fontSize: 13, fontWeight: '700'},
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#2A2C35',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryBtnText: {color: '#FFFFFF', fontWeight: '600'},
  footerHint: {color: '#6E7688', fontSize: 12, textAlign: 'center'},
});