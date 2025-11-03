import React, { useMemo } from 'react';
import { MultiSelect, MultiSelectOption, Box, Typography } from '@strapi/design-system';

interface TimeSlotMultiSelectProps {
  name: string;
  value?: string[] | null;
  onChange: (e: { target: { name: string; value: string[]; type: string } }) => void;
  attribute?: any;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  intlLabel?: any;
  description?: any;
  hint?: string;
}

// Generate time slots based on options
const generateTimeSlots = (interval = 15, startHour = 0, endHour = 23) => {
  const slots = [];
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const hourStr = hour.toString().padStart(2, '0');
      const minStr = minute.toString().padStart(2, '0');
      const timeValue = `${hourStr}:${minStr}`;
      slots.push({
        value: timeValue,
        label: timeValue,
      });
    }
  }
  return slots;
};

export const TimeSlotMultiSelectInput = React.forwardRef<HTMLInputElement, TimeSlotMultiSelectProps>((props, ref) => {
  const {
    name,
    value = [],
    onChange,
    disabled,
    required,
    error,
    hint,
    intlLabel,
    description,
    attribute,
  } = props;

  const selectedValues = Array.isArray(value) ? value : [];
  
  // Read options from attribute
  const interval = attribute?.options?.interval || 15;
  const startHour = attribute?.options?.startHour || 0;
  const endHour = attribute?.options?.endHour || 23;
  
  // Generate time slots dynamically based on options
  const TIME_SLOTS = useMemo(
    () => generateTimeSlots(interval, startHour, endHour),
    [interval, startHour, endHour]
  );

  const handleChange = (newValues: string[]) => {
    onChange({
      target: {
        name,
        value: newValues,
        type: 'json',
      },
    });
  };

  return (
    <Box>
      {error && (
        <Typography variant="pi" textColor="danger600" paddingBottom={1}>
          {error}
        </Typography>
      )}
      <MultiSelect
        name={name}
        placeholder="Select time slots"
        value={selectedValues}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        customizeContent={() => 
          selectedValues.length > 0 
            ? `${selectedValues.length} time slot${selectedValues.length > 1 ? 's' : ''} selected` 
            : 'Select time slots'
        }
      >
        {TIME_SLOTS.map((slot) => (
          <MultiSelectOption key={slot.value} value={slot.value}>
            {slot.label}
          </MultiSelectOption>
        ))}
      </MultiSelect>
      {(hint || description?.defaultMessage) && (
        <Typography variant="pi" textColor="neutral600" paddingTop={1}>
          {hint || description?.defaultMessage}
        </Typography>
      )}
    </Box>
  );
});

TimeSlotMultiSelectInput.displayName = 'TimeSlotMultiSelectInput';

