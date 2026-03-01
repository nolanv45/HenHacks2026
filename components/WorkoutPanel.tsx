/**
 * WorkoutPanel.tsx
 *
 * Displays the live workout HUD during an active session.
 * Shows the current rep count, the live joint angle being tracked,
 * and a horizontally scrollable row of workout selector chips.
 *
 * This is a pure presentational component as it holds no state of its own.
 * All values are passed in from App.tsx and all interactions fire callbacks
 * back up to the parent.
 */
import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {WorkoutChoiceItem} from './WorkoutChoices';

export type WorkoutOption = {
  id: number;
  label: string;
};

type WorkoutPanelProps = {
  reps: number;
  angle: number | null;
  selectedWorkoutId: number;
  workouts: WorkoutChoiceItem[];
  onSelectWorkout: (id: number) => void;
};

export default function WorkoutPanel({
  reps,
  angle,
  selectedWorkoutId,
  workouts,
  onSelectWorkout,
}: WorkoutPanelProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.reps}>Reps: {reps}/{workouts[selectedWorkoutId].reps}</Text>
      <Text style={styles.angle}>
        Angle: {angle == null ? '--' : `${Math.round(angle)}°`}
      </Text>

      <View style={styles.row}>
        {workouts.map(workout => {
          const selected = selectedWorkoutId === workout.workoutId;

          return (
            <TouchableOpacity
              key={workout.workoutId}
              onPress={() => onSelectWorkout(workout.workoutId)}
              style={[styles.chip, selected && styles.chipSelected]}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {workout.key}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}


/**
 * Styles for WorkoutPanel.
 *
 * chipSelected only changes the border color (white vs dark) to indicate
 * the active workout — the chip background stays the same. If the design
 * evolves, a background fill on selection might improve visibility.
 */
const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 8,
  },
  reps: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  angle: {
    color: '#ddd',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  chip: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    borderColor: '#fff',
  },
  chipText: {
    color: '#bbb',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#fff',
  },
});
