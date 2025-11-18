import {
  Box,
  MultiSelect,
  MultiSelectOption,
  Typography,
} from '@strapi/design-system'
import React, { useMemo } from 'react'

interface MultiSelectInputProps {
  name: string
  value?: string[] | null
  onChange: (e: {target: {name: string; value: string[]; type: string}}) => void
  attribute?: any
  disabled?: boolean
  error?: string
  required?: boolean
  intlLabel?: any
  description?: any
  hint?: string
}

interface Option {
  value: string
  label: string
}

export const MultiSelectInput = React.forwardRef<
  HTMLInputElement,
  MultiSelectInputProps
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
    attribute,
  } = props
  const selectedValues = Array.isArray(value) ? value : []

  // Read options from attribute.enum
  const options = useMemo<Option[]>(() => {
    if (attribute?.enum && Array.isArray(attribute.enum)) {
      return attribute.enum.map((val: string) => ({
        value: val,
        label: val,
      }))
    }
    // Fallback: try to read from attribute.options.enum
    if (attribute?.options?.enum && Array.isArray(attribute.options.enum)) {
      return attribute.options.enum.map((val: string) => ({
        value: val,
        label: val,
      }))
    }
    return []
  }, [attribute?.enum, attribute?.options?.enum])

  const handleChange = (newValues: string[]) => {
    onChange({
      target: {
        name,
        value: newValues,
        type: 'json',
      },
    })
  }

  const placeholder = attribute?.options?.placeholder || 'Select options'
  const selectedCount = selectedValues.length
  const customizeContent =
    selectedCount > 0
      ? `${selectedCount} option${selectedCount > 1 ? 's' : ''} selected`
      : placeholder
  return (
    <Box>
      <Typography variant="pi" fontWeight="bold" paddingBottom={1}>
        {attribute?.name || intlLabel?.defaultMessage || intlLabel}
        {required && <Typography textColor="danger600">*</Typography>}
      </Typography>
      {error && (
        <Typography variant="pi" textColor="danger600" paddingBottom={1}>
          {error}
        </Typography>
      )}
      <MultiSelect
        name={name}
        placeholder={placeholder}
        value={selectedValues}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        customizeContent={() => customizeContent}
      >
        {options.map((option) => (
          <MultiSelectOption key={option.value} value={option.value}>
            {option.label}
          </MultiSelectOption>
        ))}
      </MultiSelect>
      {(hint || description?.defaultMessage) && (
        <Typography variant="pi" textColor="neutral600" paddingTop={1}>
          {hint || description?.defaultMessage}
        </Typography>
      )}
    </Box>
  )
})

MultiSelectInput.displayName = 'MultiSelectInput'
