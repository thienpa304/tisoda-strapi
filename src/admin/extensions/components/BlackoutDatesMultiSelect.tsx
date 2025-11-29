import React, { useState, useCallback } from 'react';
import { Box, Typography, Button, DatePicker, Flex } from '@strapi/design-system';
import { Plus, Trash, Cross } from '@strapi/icons';

interface DateRange {
  start: string | null;
  end: string | null;
}

interface BlackoutDatesMultiSelectProps {
  name: string;
  value?: DateRange[] | null;
  onChange: (e: { target: { name: string; value: DateRange[]; type: string } }) => void;
  attribute?: any;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  intlLabel?: any;
  description?: any;
  hint?: string;
}

export const BlackoutDatesMultiSelectInput = React.forwardRef<
  HTMLInputElement,
  BlackoutDatesMultiSelectProps
>((props, ref) => {
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
  } = props;

  const ranges: DateRange[] = Array.isArray(value) && value.length > 0 ? value : [];
  const [currentStart, setCurrentStart] = useState<string | null>(null);
  const [currentEnd, setCurrentEnd] = useState<string | null>(null);

  // Helper function to parse date string in local timezone
  // Create date at local noon to avoid timezone shift when DatePicker displays it
  const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    // Create date at local noon (12:00:00 local time) to avoid timezone issues
    // This ensures the date won't shift to previous day when displayed
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  };

  // Helper function to normalize date from DatePicker
  // DatePicker may return date with timezone issues, so we normalize it
  const normalizeDate = (date: Date): Date => {
    // Create a new date from local time components to avoid timezone issues
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    return new Date(year, month, day, 12, 0, 0, 0);
  };

  // Helper function to format date from DatePicker to YYYY-MM-DD string
  // Always use local time methods since DatePicker works with local dates
  const formatDateToString = (date: Date): string => {
    // Normalize the date first to avoid timezone issues
    const normalized = normalizeDate(date);
    const year = normalized.getFullYear();
    const month = String(normalized.getMonth() + 1).padStart(2, '0');
    const day = String(normalized.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = parseLocalDate(dateString);
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleAddRange = useCallback(() => {
    if (!currentStart) return;

    // If end date is provided, validate it
    if (currentEnd && new Date(currentStart) > new Date(currentEnd)) {
      return; // Invalid range
    }

    // If no end date, set end to null (single date)
    const newRanges = [...ranges, { start: currentStart, end: currentEnd || null }];
    onChange({
      target: {
        name,
        value: newRanges,
        type: 'json',
      },
    });
    setCurrentStart(null);
    setCurrentEnd(null);
  }, [currentStart, currentEnd, ranges, name, onChange]);

  const handleRemoveRange = useCallback(
    (index: number) => {
      const newRanges = ranges.filter((_, i) => i !== index);
      onChange({
        target: {
          name,
          value: newRanges,
          type: 'json',
        },
      });
    },
    [ranges, name, onChange],
  );

  const handleRemoveAll = useCallback(() => {
    onChange({
      target: {
        name,
        value: [],
        type: 'json',
      },
    });
  }, [name, onChange]);

  const canAdd = currentStart && (!currentEnd || new Date(currentStart) <= new Date(currentEnd));

  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center" paddingBottom={2}>
        <Typography variant="pi" fontWeight="bold">
          {intlLabel?.defaultMessage || 'Blackout dates'}
        </Typography>
        {ranges.length > 0 && (
          <Button
            variant="tertiary"
            size="S"
            startIcon={<Trash />}
            onClick={handleRemoveAll}
            disabled={disabled}
          >
            Remove all
          </Button>
        )}
      </Flex>

      <Typography variant="pi" textColor="neutral600" paddingBottom={3}>
        {description?.defaultMessage ||
          'The promotion would be inactive on the dates selected below:'}
      </Typography>

      <Box>
        <Flex gap={2} alignItems="flex-end" paddingBottom={3}>
          <Box flex="1">
            <Typography variant="pi" fontWeight="bold" paddingBottom={1}>
              Choose a date
            </Typography>
            <DatePicker
              onChange={(date: Date | undefined) => {
                if (date) {
                  setCurrentStart(formatDateToString(date));
                } else {
                  setCurrentStart(null);
                }
              }}
              value={currentStart ? parseLocalDate(currentStart) : undefined}
              disabled={disabled}
              clearLabel="Clear"
              onClear={() => setCurrentStart(null)}
            />
          </Box>
          <Typography variant="pi" textColor="neutral600" paddingBottom={2}>
            to (optional)
          </Typography>
          <Box flex="1">
            <Typography variant="pi" fontWeight="bold" paddingBottom={1}>
              Choose a date (optional)
            </Typography>
            <DatePicker
              onChange={(date: Date | undefined) => {
                if (date) {
                  setCurrentEnd(formatDateToString(date));
                } else {
                  setCurrentEnd(null);
                }
              }}
              value={currentEnd ? parseLocalDate(currentEnd) : undefined}
              disabled={disabled}
              clearLabel="Clear"
              onClear={() => setCurrentEnd(null)}
            />
          </Box>
          <Button
            variant="secondary"
            startIcon={<Plus />}
            onClick={handleAddRange}
            disabled={disabled || !canAdd}
          >
            Add more dates
          </Button>
        </Flex>

        {ranges.length > 0 && (
          <Box>
            <Typography variant="pi" fontWeight="bold" paddingBottom={2}>
              Selected range(s):
            </Typography>
            <Flex gap={2} wrap="wrap">
              {ranges.map((range, index) => (
                <Box
                  key={index}
                  padding={2}
                  background="neutral100"
                  borderRadius="4px"
                  borderColor="neutral200"
                  borderStyle="solid"
                  borderWidth="1px"
                >
                  <Flex alignItems="center" gap={2}>
                    <Typography variant="pi">
                      {range.end && range.end !== range.start
                        ? `${formatDate(range.start)} - ${formatDate(range.end)}`
                        : formatDate(range.start) || 'Invalid date'}
                    </Typography>
                    <Button
                      variant="tertiary"
                      size="S"
                      onClick={() => handleRemoveRange(index)}
                      disabled={disabled}
                      startIcon={<Cross />}
                    />
                  </Flex>
                </Box>
              ))}
            </Flex>
          </Box>
        )}
      </Box>

      {error && (
        <Typography variant="pi" textColor="danger600" paddingTop={2}>
          {error}
        </Typography>
      )}
      {hint && !error && (
        <Typography variant="pi" textColor="neutral600" paddingTop={2}>
          {hint}
        </Typography>
      )}
    </Box>
  );
});

BlackoutDatesMultiSelectInput.displayName = 'BlackoutDatesMultiSelectInput';
