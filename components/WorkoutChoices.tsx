import React, {useMemo, useState} from 'react';
import {ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';

export type WeightUnit = 'lbs' | 'kg';

export type WorkoutConfig = {
  id: number;
  label: string;
  points: [number, number, number];
  extendAbove: number;
  contractBelow: number;
  goalReps: number;
  goalSets: number;
};

export type WorkoutChoiceItem = {
  key: string;
  workoutId: number;
  reps: number;
  sets: number;
};

type NumberField = 'reps' | 'sets';

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
  sets: workout.goalSets ?? 3,
});

export const makeDefaultWorkoutChoices = (
  workouts: WorkoutConfig[],
): WorkoutChoiceItem[] => {
  if (!workouts || workouts.length === 0) {
    return [];
  }
  return [makeDefaultWorkoutChoiceItem(workouts[0])];
};

export default function WorkoutChoices({workouts, value, onChange}: Props) {
  const [editingWorkoutId, setEditingWorkoutId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<NumberField | null>(null);
  const [editingText, setEditingText] = useState('');

  const selectedIds = useMemo(() => new Set(value.map(v => v.workoutId)), [value]);

  const getChoice = (workoutId: number) => value.find(item => item.workoutId === workoutId);

  const toggleWorkout = (workout: WorkoutConfig) => {
    const isSelected = selectedIds.has(workout.id);
    if (isSelected) {
      if (editingWorkoutId === workout.id) {
        setEditingWorkoutId(null);
        setEditingField(null);
        setEditingText('');
      }
      onChange(value.filter(item => item.workoutId !== workout.id));
      return;
    }
    onChange([...value, makeDefaultWorkoutChoiceItem(workout)]);
  };

  const updateChoiceNumber = (workout: WorkoutConfig, field: NumberField, text: string) => {
    const digits = text.replace(/[^\d]/g, '');
    if (!digits) {
      return;
    }

    const parsed = parseInt(digits, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    if (!selectedIds.has(workout.id)) {
      onChange([...value, {...makeDefaultWorkoutChoiceItem(workout), [field]: parsed}]);
      return;
    }

    onChange(value.map(item => (item.workoutId === workout.id ? {...item, [field]: parsed} : item)));
  };

  const onNumberFocus = (workout: WorkoutConfig, field: NumberField, currentValue: number) => {
    if (!selectedIds.has(workout.id)) {
      return;
    }

    setEditingWorkoutId(workout.id);
    setEditingField(field);
    setEditingText(String(currentValue));
  };

  const onNumberChange = (workout: WorkoutConfig, field: NumberField, text: string) => {
    const maxLength = field === 'sets' ? 2 : 3;
    const digitsOnly = text.replace(/[^\d]/g, '').slice(0, maxLength);
    setEditingText(digitsOnly);
    if (digitsOnly) {
      updateChoiceNumber(workout, field, digitsOnly);
    }
  };

  const onNumberBlur = (workout: WorkoutConfig, field: NumberField, currentValue: number) => {
    if (editingWorkoutId !== workout.id || editingField !== field) {
      return;
    }

    const defaultValue = field === 'reps' ? workout.goalReps ?? 10 : workout.goalSets ?? 3;
    const fallbackValue = currentValue > 0 ? currentValue : defaultValue;

    if (!editingText) {
      updateChoiceNumber(workout, field, String(fallbackValue));
    } else {
      const normalized = parseInt(editingText, 10);
      if (Number.isFinite(normalized) && normalized > 0) {
        updateChoiceNumber(workout, field, String(normalized));
      } else {
        updateChoiceNumber(workout, field, String(fallbackValue));
      }
    }

    setEditingWorkoutId(null);
    setEditingField(null);
    setEditingText('');
  };

  return (
    <ScrollView>
      <View style={styles.wrap}>
        <Text style={styles.title}>Select workouts</Text>
        {workouts.map(workout => {
          const selected = selectedIds.has(workout.id);
          const currentChoice = getChoice(workout.id);
          const currentReps = currentChoice?.reps ?? workout.goalReps ?? 10;
          const currentSets = currentChoice?.sets ?? workout.goalSets ?? 3;

          const displayReps =
            editingWorkoutId === workout.id && editingField === 'reps'
              ? editingText
              : String(currentReps);
          const displaySets =
            editingWorkoutId === workout.id && editingField === 'sets'
              ? editingText
              : String(currentSets);

          return (
            <View key={workout.id} style={styles.row}>
              <TouchableOpacity
                onPress={() => toggleWorkout(workout)}
                style={[styles.item, selected && styles.itemSelected]}
                activeOpacity={0.9}>
                <Text style={[styles.itemText, selected && styles.itemTextSelected]}>
                  {selected ? '✓  ' : ''}
                  {workout.label}
                </Text>
              </TouchableOpacity>

              <View style={styles.repsWrap}>
                <TextInput
                  style={[styles.repsInput, !selected && styles.repsInputDisabled]}
                  value={displayReps}
                  onFocus={() => onNumberFocus(workout, 'reps', currentReps)}
                  onChangeText={text => onNumberChange(workout, 'reps', text)}
                  onBlur={() => onNumberBlur(workout, 'reps', currentReps)}
                  keyboardType="number-pad"
                  editable={selected}
                  maxLength={3}
                  placeholderTextColor="#8A92A3"
                />
                <Text style={styles.repsLabel}>reps</Text>
              </View>

              <View style={styles.repsWrap}>
                <TextInput
                  style={[styles.repsInput, !selected && styles.repsInputDisabled]}
                  value={displaySets}
                  onFocus={() => onNumberFocus(workout, 'sets', currentSets)}
                  onChangeText={text => onNumberChange(workout, 'sets', text)}
                  onBlur={() => onNumberBlur(workout, 'sets', currentSets)}
                  keyboardType="number-pad"
                  editable={selected}
                  maxLength={2}
                  placeholderTextColor="#8A92A3"
                />
                <Text style={styles.repsLabel}>sets</Text>
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