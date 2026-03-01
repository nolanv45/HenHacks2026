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
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

export type WorkoutOption = {
  id: number;
  label: string;
  goalReps: number;
  goalSets: number;
};

type WorkoutPanelProps = {
  reps: number;
  angle: number | null;
  selectedWorkoutId: number;
  workouts: WorkoutOption[];
  onSelectWorkout: (id: number) => void;
};

export default function WorkoutPanel({
  reps,
  angle,
  selectedWorkoutId,
  workouts,
  onSelectWorkout,
}: WorkoutPanelProps) {
  // safe lookup — never use array index directly
  const current = workouts.find(w => w.id === selectedWorkoutId) ?? workouts[0] ?? null;

  if (!current) {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.reps}>No workout selected.</Text>
      </View>
    );
  }

  const totalGoalReps = current.goalSets * current.goalReps;
  const clampedReps = Math.min(reps, totalGoalReps);
  const completedSets = Math.floor(clampedReps / current.goalReps);
  const isWorkoutComplete = clampedReps >= totalGoalReps;
  const currentSet = isWorkoutComplete
    ? current.goalSets
    : Math.min(completedSets + 1, current.goalSets);
  const repsIntoSet = isWorkoutComplete
    ? current.goalReps
    : (clampedReps % current.goalReps);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{current.label}</Text>
      <Text style={styles.reps}>
        {reps} / {totalGoalReps} reps
      </Text>
      <Text style={styles.angle}>Set {currentSet} / {current.goalSets}</Text>
      <Text style={styles.angle}>Reps this set: {repsIntoSet} / {current.goalReps}</Text>
      <Text style={styles.angle}>
        Angle: {angle == null ? '--' : `${Math.round(angle)}°`}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {workouts.map(workout => {
          const selected = selectedWorkoutId === workout.id;

          return (
            <TouchableOpacity
              key={workout.id}
              onPress={() => onSelectWorkout(workout.id)}
              style={[styles.chip, selected && styles.chipSelected]}>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {workout.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#12131A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E202B',
    width: '100%',
  },
  label: {
    color: '#A6ADBB',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  reps: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
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
