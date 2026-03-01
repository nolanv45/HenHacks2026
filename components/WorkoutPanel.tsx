import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';

export type WorkoutOption = {
  id: string;
  label: string;
};

type WorkoutPanelProps = {
  reps: number;
  angle: number | null;
  selectedWorkoutId: string;
  workouts: WorkoutOption[];
  onSelectWorkout: (id: string) => void;
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
      <Text style={styles.reps}>Reps: {reps}</Text>
      <Text style={styles.angle}>
        Angle: {angle == null ? '--' : `${Math.round(angle)}°`}
      </Text>

      <View style={styles.row}>
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
      </View>
    </View>
  );
}

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
