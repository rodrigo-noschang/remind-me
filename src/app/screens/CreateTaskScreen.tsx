import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Alert,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { DateTime } from "luxon";

import { Header } from "@/app/components/Header";
import { Screen } from "@/app/components/Screen";
import { useTasks } from "@/app/providers/AppProviders";
import { colors, spacing } from "@/app/theme";
import type { TaskType } from "@/app/types";
import { getDeviceTimezone } from "@/domain/timezone/timezone";

export function CreateTaskScreen() {
  const { createTask } = useTasks();
  const today = useMemo(() => DateTime.local().toISODate() ?? "", []);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TaskType>("one_time");
  const [localDate, setLocalDate] = useState(today);
  const [localTime, setLocalTime] = useState("19:00");
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(today);
  const [reminderStartDay, setReminderStartDay] = useState("1");
  const [dueDay, setDueDay] = useState("10");
  const [isSaving, setIsSaving] = useState(false);

  async function handleCreate() {
    if (isSaving) {
      return;
    }

    if (!title.trim()) {
      Alert.alert("Titulo obrigatorio", "Informe um titulo para o lembrete.");
      return;
    }

    const normalizedTime = normalizeTime(localTime);
    if (!normalizedTime) {
      Alert.alert("Horario invalido", "Informe um horario entre 00:00 e 23:59.");
      return;
    }

    setIsSaving(true);

    try {
      await createTask({
        title,
        description,
        type,
        localDate,
        localTime: normalizedTime,
        dueDay: type === "recurring" ? Number(dueDay) : undefined,
        reminderStartDay: type === "recurring" ? Number(reminderStartDay) : undefined,
        reminderEndDay: type === "recurring" ? Number(dueDay) : undefined
      });

      setTitle("");
      setDescription("");
      Alert.alert("Lembrete criado", "O lembrete foi salvo neste dispositivo.");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Nao foi possivel salvar o lembrete agora.";

      Alert.alert("Erro ao salvar", message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Screen>
      <Header
        title="Novo lembrete"
        subtitle={`Timezone detectado: ${getDeviceTimezone()}`}
      />

      <View style={styles.segment}>
        <SegmentButton active={type === "one_time"} label="Pontual" onPress={() => setType("one_time")} />
        <SegmentButton active={type === "recurring"} label="Mensal" onPress={() => setType("recurring")} />
      </View>

      <Field label="Titulo">
        <TextInput
          onChangeText={setTitle}
          placeholder="Ex: Tirar o lixo"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          value={title}
        />
      </Field>

      <Field label="Descricao">
        <TextInput
          multiline
          onChangeText={setDescription}
          placeholder="Opcional"
          placeholderTextColor={colors.mutedText}
          style={[styles.input, styles.textarea]}
          value={description}
        />
      </Field>

      {type === "one_time" ? (
        <Field label="Data">
          <Pressable
            onPress={() => setCalendarVisible(true)}
            style={({ pressed }) => [styles.inputButton, pressed && styles.pressed]}
          >
            <Text style={styles.inputButtonText}>{formatDateLabel(localDate)}</Text>
          </Pressable>
        </Field>
      ) : (
        <View style={styles.row}>
          <Field label="Inicio">
            <TextInput
              keyboardType="number-pad"
              onChangeText={setReminderStartDay}
              placeholder="1"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              value={reminderStartDay}
            />
          </Field>
          <Field label="Vence">
            <TextInput
              keyboardType="number-pad"
              onChangeText={setDueDay}
              placeholder="10"
              placeholderTextColor={colors.mutedText}
              style={styles.input}
              value={dueDay}
            />
          </Field>
        </View>
      )}

      <Field label="Horario">
        <TimeWheelInput value={localTime} onChange={setLocalTime} />
      </Field>

      <Pressable
        disabled={isSaving}
        onPress={handleCreate}
        style={[styles.submit, isSaving && styles.submitDisabled]}
      >
        <Text style={styles.submitText}>{isSaving ? "Salvando..." : "Criar lembrete"}</Text>
      </Pressable>

      <CalendarModal
        selectedDate={localDate}
        visible={calendarVisible}
        visibleMonth={calendarMonth}
        onChangeMonth={setCalendarMonth}
        onClose={() => setCalendarVisible(false)}
        onSelectDate={(date) => {
          setLocalDate(date);
          setCalendarMonth(date);
          setCalendarVisible(false);
        }}
      />
    </Screen>
  );
}

type TimeWheelInputProps = {
  value: string;
  onChange: (value: string) => void;
};

const WHEEL_ITEM_HEIGHT = 44;
const WHEEL_VISIBLE_ITEMS = 5;
const WHEEL_VERTICAL_PADDING = WHEEL_ITEM_HEIGHT * Math.floor(WHEEL_VISIBLE_ITEMS / 2);
const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);

function TimeWheelInput({ value, onChange }: TimeWheelInputProps) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [draftHour, setDraftHour] = useState(0);
  const [draftMinute, setDraftMinute] = useState(0);
  const hourWheelRef = useRef<ScrollView>(null);
  const minuteWheelRef = useRef<ScrollView>(null);
  const parsedTime = parseTimeParts(value);

  const hourLabel = formatTwoDigits(parsedTime.hour);
  const minuteLabel = formatTwoDigits(parsedTime.minute);

  useEffect(() => {
    if (!pickerVisible) {
      return;
    }

    const timeout = setTimeout(() => {
      hourWheelRef.current?.scrollTo({ y: draftHour * WHEEL_ITEM_HEIGHT, animated: false });
      minuteWheelRef.current?.scrollTo({ y: draftMinute * WHEEL_ITEM_HEIGHT, animated: false });
    }, 0);

    return () => clearTimeout(timeout);
  }, [pickerVisible, draftHour, draftMinute]);

  function commitTime(hour: number, minute: number) {
    onChange(`${formatTwoDigits(clamp(hour, 0, 23))}:${formatTwoDigits(clamp(minute, 0, 59))}`);
  }

  function openPicker() {
    setDraftHour(parsedTime.hour);
    setDraftMinute(parsedTime.minute);
    setPickerVisible(true);
  }

  function confirmPicker() {
    commitTime(draftHour, draftMinute);
    setPickerVisible(false);
  }

  function handleWheelEnd(
    event: NativeSyntheticEvent<NativeScrollEvent>,
    maxValue: number,
    onSelect: (selectedValue: number) => void
  ) {
    const selectedValue = clamp(Math.round(event.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT), 0, maxValue);
    onSelect(selectedValue);
  }

  function handleWheelDragEnd(
    event: NativeSyntheticEvent<NativeScrollEvent>,
    maxValue: number,
    onSelect: (selectedValue: number) => void
  ) {
    const verticalVelocity = event.nativeEvent.velocity?.y ?? 0;

    if (Math.abs(verticalVelocity) < 0.1) {
      handleWheelEnd(event, maxValue, onSelect);
    }
  }

  return (
    <View style={styles.timePickerRoot}>
      <Pressable
        onPress={openPicker}
        style={({ pressed }) => [styles.inputButton, styles.timeInputButton, pressed && styles.pressed]}
      >
        <Text style={styles.timeInputText}>{hourLabel}</Text>
        <Text style={styles.timeInputSeparator}>:</Text>
        <Text style={styles.timeInputText}>{minuteLabel}</Text>
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
        transparent
        visible={pickerVisible}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timePickerModalPanel}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>Selecionar horario</Text>
              <Text style={styles.timePickerValue}>
                {formatTwoDigits(draftHour)}:{formatTwoDigits(draftMinute)}
              </Text>
            </View>

            <View style={styles.wheelRow}>
              <TimeWheel
                label="Hora"
                onMomentumScrollEnd={(event) => handleWheelEnd(event, 23, setDraftHour)}
                onScrollEndDrag={(event) => handleWheelDragEnd(event, 23, setDraftHour)}
                onSelect={setDraftHour}
                ref={hourWheelRef}
                selectedValue={draftHour}
                values={HOURS}
              />
              <TimeWheel
                label="Minuto"
                onMomentumScrollEnd={(event) => handleWheelEnd(event, 59, setDraftMinute)}
                onScrollEndDrag={(event) => handleWheelDragEnd(event, 59, setDraftMinute)}
                onSelect={setDraftMinute}
                ref={minuteWheelRef}
                selectedValue={draftMinute}
                values={MINUTES}
              />
            </View>

            <View style={styles.timePickerActions}>
              <Pressable
                onPress={() => setPickerVisible(false)}
                style={({ pressed }) => [styles.timePickerActionButton, pressed && styles.pressed]}
              >
                <Text style={styles.timePickerCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={confirmPicker}
                style={({ pressed }) => [
                  styles.timePickerActionButton,
                  styles.timePickerConfirmButton,
                  pressed && styles.pressed
                ]}
              >
                <Text style={styles.timePickerConfirmText}>Confirmar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type TimeWheelProps = {
  label: string;
  onMomentumScrollEnd: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onScrollEndDrag: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onSelect: (value: number) => void;
  selectedValue: number;
  values: number[];
};

const TimeWheel = forwardRef<ScrollView, TimeWheelProps>(function TimeWheel(
  { label, onMomentumScrollEnd, onScrollEndDrag, onSelect, selectedValue, values },
  ref
) {
  return (
    <View style={styles.wheelColumn}>
      <Text style={styles.wheelLabel}>{label}</Text>
      <View style={styles.wheelFrame}>
        <View pointerEvents="none" style={styles.wheelHighlight} />
        <ScrollView
          decelerationRate="fast"
          nestedScrollEnabled
          onMomentumScrollEnd={onMomentumScrollEnd}
          onScrollEndDrag={onScrollEndDrag}
          ref={ref}
          showsVerticalScrollIndicator={false}
          snapToInterval={WHEEL_ITEM_HEIGHT}
          style={styles.wheelScroll}
          contentContainerStyle={styles.wheelContent}
        >
          {values.map((item) => {
            const selected = item === selectedValue;

            return (
              <Pressable
                key={item}
                onPress={() => onSelect(item)}
                style={({ pressed }) => [styles.wheelItem, pressed && styles.pressed]}
              >
                <Text style={[styles.wheelItemText, selected && styles.wheelItemTextSelected]}>
                  {formatTwoDigits(item)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
});

type FieldProps = {
  label: string;
  children: ReactNode;
};

function Field({ label, children }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

type SegmentButtonProps = {
  active: boolean;
  label: string;
  onPress: () => void;
};

function SegmentButton({ active, label, onPress }: SegmentButtonProps) {
  return (
    <Pressable onPress={onPress} style={[styles.segmentButton, active && styles.segmentButtonActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

type CalendarModalProps = {
  selectedDate: string;
  visible: boolean;
  visibleMonth: string;
  onChangeMonth: (date: string) => void;
  onClose: () => void;
  onSelectDate: (date: string) => void;
};

function CalendarModal({
  selectedDate,
  visible,
  visibleMonth,
  onChangeMonth,
  onClose,
  onSelectDate
}: CalendarModalProps) {
  const month = DateTime.fromISO(visibleMonth).startOf("month");
  const selected = DateTime.fromISO(selectedDate);
  const days = getCalendarDays(month);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalOverlay}>
        <View style={styles.calendarPanel}>
          <View style={styles.calendarHeader}>
            <Pressable
              accessibilityLabel="Mes anterior"
              onPress={() => onChangeMonth(month.minus({ months: 1 }).toISODate() ?? visibleMonth)}
              style={({ pressed }) => [styles.calendarNavButton, pressed && styles.pressed]}
            >
              <Text style={styles.calendarNavText}>‹</Text>
            </Pressable>
            <Text style={styles.calendarTitle}>{formatMonthLabel(month)}</Text>
            <Pressable
              accessibilityLabel="Proximo mes"
              onPress={() => onChangeMonth(month.plus({ months: 1 }).toISODate() ?? visibleMonth)}
              style={({ pressed }) => [styles.calendarNavButton, pressed && styles.pressed]}
            >
              <Text style={styles.calendarNavText}>›</Text>
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {["D", "S", "T", "Q", "Q", "S", "S"].map((weekday, index) => (
              <Text key={`${weekday}-${index}`} style={styles.weekday}>
                {weekday}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {days.map((day) => {
              const isSelected = day.hasSame(selected, "day");
              const isCurrentMonth = day.hasSame(month, "month");

              return (
                <Pressable
                  key={day.toISODate()}
                  onPress={() => onSelectDate(day.toISODate() ?? selectedDate)}
                  style={({ pressed }) => [
                    styles.dayButton,
                    isSelected && styles.dayButtonSelected,
                    pressed && styles.pressed
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !isCurrentMonth && styles.dayTextMuted,
                      isSelected && styles.dayTextSelected
                    ]}
                  >
                    {day.day}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={onClose} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function getCalendarDays(month: DateTime) {
  const firstGridDay = month.minus({ days: month.weekday % 7 });

  return Array.from({ length: 42 }, (_, index) => firstGridDay.plus({ days: index }));
}

function formatDateLabel(date: string) {
  const parsedDate = DateTime.fromISO(date);
  return parsedDate.isValid ? parsedDate.toFormat("dd/LL/yyyy") : "Selecionar data";
}

function formatMonthLabel(date: DateTime) {
  return date.setLocale("pt-BR").toFormat("LLLL yyyy");
}

function normalizeTime(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length < 3 || digits.length > 4) {
    return null;
  }

  const padded = digits.padStart(4, "0");
  const hours = Number(padded.slice(0, 2));
  const minutes = Number(padded.slice(2));

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return `${padded.slice(0, 2)}:${padded.slice(2)}`;
}

function parseTimeParts(value: string) {
  const normalizedTime = normalizeTime(value) ?? "00:00";
  const [hour, minute] = normalizedTime.split(":").map(Number);

  return { hour, minute };
}

function clamp(value: number, minValue: number, maxValue: number) {
  return Math.min(Math.max(value, minValue), maxValue);
}

function formatTwoDigits(value: number) {
  return String(value).padStart(2, "0");
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    gap: spacing.sm
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700"
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  inputButton: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  inputButtonText: {
    color: colors.text,
    fontSize: 16
  },
  timePickerRoot: {
    gap: spacing.sm
  },
  timeInputButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3
  },
  timeInputText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    minWidth: 28,
    textAlign: "center"
  },
  timeInputSeparator: {
    color: colors.mutedText,
    fontSize: 18,
    fontWeight: "800"
  },
  timePickerModalPanel: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    gap: spacing.lg,
    maxWidth: 380,
    padding: spacing.lg,
    width: "100%"
  },
  timePickerHeader: {
    alignItems: "center",
    gap: spacing.xs
  },
  timePickerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center"
  },
  timePickerValue: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center"
  },
  timePickerActions: {
    flexDirection: "row",
    gap: spacing.md
  },
  timePickerActionButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  timePickerConfirmButton: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  timePickerCancelText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  timePickerConfirmText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "800"
  },
  wheelRow: {
    flexDirection: "row",
    gap: spacing.md
  },
  wheelColumn: {
    flex: 1,
    gap: spacing.xs
  },
  wheelLabel: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center"
  },
  wheelFrame: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ITEMS,
    overflow: "hidden"
  },
  wheelHighlight: {
    backgroundColor: colors.background,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: WHEEL_ITEM_HEIGHT,
    left: 0,
    position: "absolute",
    right: 0,
    top: WHEEL_VERTICAL_PADDING
  },
  wheelScroll: {
    flex: 1
  },
  wheelContent: {
    paddingVertical: WHEEL_VERTICAL_PADDING
  },
  wheelItem: {
    alignItems: "center",
    height: WHEEL_ITEM_HEIGHT,
    justifyContent: "center"
  },
  wheelItemText: {
    color: colors.mutedText,
    fontSize: 17,
    fontWeight: "700"
  },
  wheelItemTextSelected: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  },
  textarea: {
    minHeight: 92,
    textAlignVertical: "top"
  },
  row: {
    flexDirection: "row",
    gap: spacing.md
  },
  segment: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    padding: 4
  },
  segmentButton: {
    alignItems: "center",
    borderRadius: 6,
    flex: 1,
    minHeight: 44,
    justifyContent: "center"
  },
  segmentButtonActive: {
    backgroundColor: colors.accent
  },
  segmentText: {
    color: colors.mutedText,
    fontSize: 15,
    fontWeight: "700"
  },
  segmentTextActive: {
    color: colors.surface
  },
  submit: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 8,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  submitText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "800"
  },
  submitDisabled: {
    opacity: 0.64
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(32, 33, 36, 0.45)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.md
  },
  calendarPanel: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    gap: spacing.md,
    maxWidth: 380,
    padding: spacing.md,
    width: "100%"
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  calendarNavButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  calendarNavText: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 30
  },
  calendarTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  weekRow: {
    flexDirection: "row"
  },
  weekday: {
    color: colors.mutedText,
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center"
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  dayButton: {
    alignItems: "center",
    aspectRatio: 1,
    justifyContent: "center",
    width: "14.285%"
  },
  dayButtonSelected: {
    backgroundColor: colors.accent,
    borderRadius: 8
  },
  dayText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700"
  },
  dayTextMuted: {
    color: colors.mutedText
  },
  dayTextSelected: {
    color: colors.surface
  },
  cancelButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center"
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  pressed: {
    opacity: 0.72
  }
});
