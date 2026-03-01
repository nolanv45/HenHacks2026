import React, {useMemo} from 'react';
import {StyleSheet, Text, TouchableOpacity, View, TextInput} from 'react-native';

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
  if (!workouts.length) return [];
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
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: '#12131A',
    borderWidth: 1,
    borderColor: '#1E202B',
    padding: 16,
    gap: 12,
  },
  headerRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
  title: {color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: -0.2},
  subtitle: {marginTop: 6, color: '#A6ADBB', fontSize: 12, fontWeight: '700'},
  addBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  addBtnDisabled: {backgroundColor: '#2A2C35'},
  addBtnText: {color: '#0B0B0F', fontSize: 13, fontWeight: '900'},
  addBtnTextDisabled: {color: '#A6ADBB'},
  empty: {paddingVertical: 10},
  emptyText: {color: '#A6ADBB', fontSize: 12, lineHeight: 18},
  list: {gap: 12},
  card: {
    borderRadius: 16,
    backgroundColor: '#0F1016',
    borderWidth: 1,
    borderColor: '#1E202B',
    padding: 12,
    gap: 10,
  },
  cardTopRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10},
  workoutChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#1B1C22',
    borderWidth: 1,
    borderColor: '#2A2C35',
  },
  workoutChipText: {color: '#FFFFFF', fontSize: 13, fontWeight: '900'},
  workoutChipHint: {marginTop: 4, color: '#A6ADBB', fontSize: 11, fontWeight: '700'},
  orderCol: {gap: 8},
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B1C22',
    borderWidth: 1,
    borderColor: '#2A2C35',
  },
  iconBtnDisabled: {opacity: 0.45},
  iconBtnText: {color: '#FFFFFF', fontSize: 14, fontWeight: '900'},
  controlsRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  controlBlock: {flex: 1, gap: 8},
  controlLabel: {color: '#A6ADBB', fontSize: 11, fontWeight: '800'},
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    height: 40,
    borderRadius: 14,
    paddingHorizontal: 10,
    backgroundColor: '#12131A',
    borderWidth: 1,
    borderColor: '#1E202B',
  },
  stepBtn: {
    width: 34,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B1C22',
    borderWidth: 1,
    borderColor: '#2A2C35',
  },
  stepBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '900'},
  stepValue: {color: '#FFFFFF', fontSize: 14, fontWeight: '900', minWidth: 22, textAlign: 'center'},
  weightRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  unitPills: {flexDirection: 'row', alignItems: 'center', gap: 8},
  unitPill: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B1C22',
    borderWidth: 1,
    borderColor: '#2A2C35',
  },
  unitPillSelected: {backgroundColor: '#FFFFFF'},
  unitPillText: {color: '#FFFFFF', fontSize: 12, fontWeight: '900'},
  unitPillTextSelected: {color: '#0B0B0F'},
  removeBtn: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B1C22',
    borderWidth: 1,
    borderColor: '#2A2C35',
  },
  removeBtnText: {color: '#FFA657', fontSize: 12, fontWeight: '900'},
});