import React, { useState, useEffect, useMemo } from 'react';
import { MultiSelect, MultiSelectOption, Box, Typography } from '@strapi/design-system';
import { useFetchClient } from '@strapi/strapi/admin';

interface ServiceSelectInputProps {
  name: string;
  value?: string;
  onChange: (e: { target: { name: string; value: string; type?: string } }) => void;
  attribute?: any;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  intlLabel?: any;
  description?: any;
  hint?: string;
}

export const ServiceSelectInput = React.forwardRef<HTMLInputElement, ServiceSelectInputProps>((props, ref) => {
  const {
    name,
    value = '',
    onChange,
    disabled,
    required,
    error,
    hint,
    intlLabel,
    description,
    attribute,
  } = props;
  const { get } = useFetchClient();
  const [services, setServices] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Read autoSelectAll option from attribute (default: true for backward compatibility)
  const autoSelectAll = useMemo(() => {
    return attribute?.options?.autoSelectAll !== false;
  }, [attribute?.options?.autoSelectAll]);

  useEffect(() => {
    // Try to get place document ID from URL
    // URL format: /content-manager/collection-types/api::place.place/{documentId}
    const pathParts = window.location.pathname.split('/');
    const placeTypeIndex = pathParts.indexOf('api::place.place');
    
    if (placeTypeIndex !== -1 && pathParts[placeTypeIndex + 1]) {
      const documentId = pathParts[placeTypeIndex + 1];
      
        get(`/content-manager/collection-types/api::place.place/${documentId}`)
          .then((res: any) => {
            const placeData = res.data?.data || res.data;
            const placeServices = placeData?.services || [];
            
            const serviceOptions = placeServices.map((s: any) => ({
              id: String(s.id),
              name: s.service_name || s.service_code || `Service ${s.id}`,
            }));
            
            setServices(serviceOptions);
            setLoading(false);
            
            // Auto-select all services if field is empty and autoSelectAll is enabled
            if (!value && serviceOptions.length > 0 && autoSelectAll) {
              const allServiceIds = serviceOptions.map((s: { id: string; name: string }) => s.id);
              onChange({
                target: {
                  name,
                  value: allServiceIds.join(', '),
                  type: 'text',
                },
              });
            }
          })
        .catch((err) => {
          console.error('Failed to fetch place services:', err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [get]);

  // Parse current value to array of IDs
  const selectedIds = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  const handleChange = (newValues: string[]) => {
    onChange({
      target: {
        name,
        value: newValues.join(', '),
        type: 'text',
      },
    });
  };

  if (loading) {
    return (
      <Box>
        <MultiSelect
          disabled
          placeholder="Loading services..."
          value={[]}
          onChange={() => {}}
        />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Typography variant="pi" textColor="danger600" paddingBottom={1}>
          {error}
        </Typography>
      )}
      <MultiSelect
        name={name}
        placeholder={services.length > 0 ? "Select services" : "No services available"}
        value={selectedIds}
        onChange={handleChange}
        disabled={disabled || services.length === 0}
        required={required}
        customizeContent={() => 
          selectedIds.length > 0 
            ? `${selectedIds.length} service${selectedIds.length > 1 ? 's' : ''} selected` 
            : 'Select services'
        }
      >
        {services.map((service) => (
          <MultiSelectOption key={service.id} value={service.id}>
            {service.name}
          </MultiSelectOption>
        ))}
      </MultiSelect>
      {services.length === 0 && !loading && (
        <Typography variant="pi" textColor="neutral600" paddingTop={1}>
          {window.location.pathname.includes('api::place.place') 
            ? 'Please add services to this place first'
            : 'No services available. Please add services to places first.'}
        </Typography>
      )}
      {(hint || description?.defaultMessage) && (
        <Typography variant="pi" textColor="neutral600" paddingTop={1}>
          {hint || description?.defaultMessage}
        </Typography>
      )}
    </Box>
  );
});

ServiceSelectInput.displayName = 'ServiceSelectInput';

