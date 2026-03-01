import React, {useMemo} from 'react';
import {StyleSheet, Text, TouchableOpacity, View, TextInput, ScrollView} from 'react-native';

export type WeightUnit = 'lbs' | 'kg';

// The setup necessary for all the workouts in the app
// id allows incrementation of the workouts (goal reps reached)
// label is simply the name of the exercise, whereas points is the
// three angle points for the rep counting algorithm
// as far as extendAbove and contractBelow, these are the thresholds for the angles to count as a rep
// goalReps is the target number of reps for the workout, which can be used to give feedback to the user

export type WorkoutConfig = {
  id: number;
  label: string;
  points: [number, number, number];
  extendAbove: number;
  contractBelow: number;
  goalReps: number;
};

export type WorkoutChoiceItem = {
  key: string;
  workoutId: number;
  reps: number;
};

type Props = {
  workouts: WorkoutConfig[];
  value: WorkoutChoiceItem[];
  onChange: (next: WorkoutChoiceItem[]) => void;
  title?: string;
};

export const makeDefaultWorkoutChoiceItem = (
  workout: WorkoutConfig,
): WorkoutChoiceItem => ({
  key: `item-${workout.id}`,
  workoutId: workout.id,
  reps: workout.goalReps ?? 10,
});

export const makeDefaultWorkoutChoices = (
  workouts: WorkoutConfig[],
): WorkoutChoiceItem[] => {
  if (!workouts || workouts.length === 0) return [];
  return [makeDefaultWorkoutChoiceItem(workouts[0])];
};

export default function WorkoutChoices({workouts, value, onChange}: Props) {
  const selectedIds = useMemo(
    () => new Set(value.map(v => v.workoutId)),
    [value],
  );

  const getChoice = (workoutId: number) =>
    value.find(item => item.workoutId === workoutId);

  const toggleWorkout = (workout: WorkoutConfig) => {
    const isSelected = selectedIds.has(workout.id);
    if (isSelected) {
      onChange(value.filter(item => item.workoutId !== workout.id));
      return;
    }
    onChange([...value, makeDefaultWorkoutChoiceItem(workout)]);
  };

  const updateReps = (workout: WorkoutConfig, text: string) => {
    const parsed = parseInt(text.replace(/[^\d]/g, ''), 10);
    const reps = Number.isFinite(parsed) && parsed > 0 ? parsed : workout.goalReps ?? 10;

    if (!selectedIds.has(workout.id)) {
      onChange([...value, {...makeDefaultWorkoutChoiceItem(workout), reps}]);
      return;
    }

    onChange(
      value.map(item =>
        item.workoutId === workout.id ? {...item, reps} : item,
      ),
    );
  };


  return (
    <ScrollView>
    <View style={styles.wrap}>
      <Text style={styles.title}>Select workouts</Text>
      {workouts.map(workout => {
        const selected = selectedIds.has(workout.id);
        const currentReps = getChoice(workout.id)?.reps ?? workout.goalReps ?? 10;

        return (
          <View key={workout.id} style={styles.row}>
            <TouchableOpacity
              onPress={() => toggleWorkout(workout)}
              style={[styles.item, selected && styles.itemSelected]}
              activeOpacity={0.9}>
              <Text style={[styles.itemText, selected && styles.itemTextSelected]}>
                {selected ? '✓  ' : ''}{workout.label}
              </Text>
            </TouchableOpacity>

            <View style={styles.repsWrap}>
              <TextInput
                style={[styles.repsInput, !selected && styles.repsInputDisabled]}
                value={String(currentReps)}
                onChangeText={text => updateReps(workout, text)}
                keyboardType="number-pad"
                editable={selected}
                maxLength={3}
                placeholderTextColor="#8A92A3"
              />
              <Text style={styles.repsLabel}>reps</Text>
            </View>
          </View>
        );
      })}
    </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#12131A',
    borderWidth: 1,
    borderColor: '#1E202B',
    gap: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',      // chip and input side by side
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    flex: 1,                   // takes remaining space
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2A2C35',
    backgroundColor: '#1B1C22',
  },
  chipSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: '#0B0B0F',
  },
  repsWrap: {
    alignItems: 'center',
    gap: 2,
  },
  repsInput: {
    width: 52,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2C35',
    backgroundColor: '#0F1117',
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
  repsInputDisabled: {
    opacity: 0.35,
  },
  repsLabel: {
    color: '#A6ADBB',
    fontSize: 10,
    fontWeight: '700',
  },
});