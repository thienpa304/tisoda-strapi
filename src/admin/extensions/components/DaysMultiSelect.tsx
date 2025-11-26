import React, { useMemo } from 'react';
import { MultiSelect, MultiSelectOption, Box, Typography } from '@strapi/design-system';

interface DaysMultiSelectProps {
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

interface DayOption {
  value: string;
  label: string;
}

const DEFAULT_DAYS_OPTIONS: DayOption[] = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

export const DaysMultiSelectInput = React.forwardRef<HTMLInputElement, DaysMultiSelectProps>(
  (props, ref) => {
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

    // Read options from attribute (allow custom days if provided)
    const DAYS_OPTIONS = useMemo<DayOption[]>(() => {
      if (attribute?.options?.days && Array.isArray(attribute.options.days)) {
        return attribute.options.days as DayOption[];
      }
      return DEFAULT_DAYS_OPTIONS;
    }, [attribute?.options?.days]);

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
          placeholder="Select days"
          value={selectedValues}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          customizeContent={() =>
            selectedValues.length > 0
              ? `${selectedValues.length} day${selectedValues.length > 1 ? 's' : ''} selected`
              : 'Select days'
          }
        >
          {DAYS_OPTIONS.map((day) => (
            <MultiSelectOption key={day.value} value={day.value}>
              {day.label}
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
  },
);

DaysMultiSelectInput.displayName = 'DaysMultiSelectInput';
