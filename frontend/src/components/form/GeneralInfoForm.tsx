import { useState, useCallback } from 'react';
import {
  Box, TextField, MenuItem, InputAdornment, Tooltip, IconButton,
  CircularProgress, Chip, Typography, Button,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useSession } from '../../hooks/useSession';
import { getSuggestion, validateField } from '../../services/api';
import { INDUSTRIES, COUNTRIES } from '../../types';

const fieldTooltips: Record<string, string> = {
  company_name: 'The legal name of the company being insured.',
  industry: 'Primary business sector. Directly impacts risk scoring and premium rates.',
  country: 'Country of primary operations. Affects natural disaster exposure.',
  revenue: 'Annual gross revenue in USD. Used to determine policy limits.',
  num_employees: 'Total headcount. Affects workers compensation premium.',
};

export default function GeneralInfoForm() {
  const { sessionId, generalInfo, setGeneralInfo, saveSection } = useSession();
  const [loadingSuggest, setLoadingSuggest] = useState<string | null>(null);
  const [validations, setValidations] = useState<Record<string, { message: string; severity: string }>>({});

  const handleChange = useCallback(
    (field: keyof typeof generalInfo, value: string | number) => {
      setGeneralInfo({ [field]: value });
    },
    [setGeneralInfo]
  );

  const handleBlur = useCallback(
    async (field: string, value: unknown) => {
      if (!value) return;
      try {
        const result = await validateField(field, value);
        setValidations((prev) => ({
          ...prev,
          [field]: { message: result.message, severity: result.severity },
        }));
      } catch {}
    },
    []
  );

  const handleSuggest = useCallback(
    async (field: string) => {
      if (!sessionId) return;
      setLoadingSuggest(field);
      try {
        const result = await getSuggestion(sessionId, field, {
          industry: generalInfo.industry,
          country: generalInfo.country,
        });
        if (result.suggested_value !== null && result.suggested_value !== undefined) {
          setGeneralInfo({ [field]: result.suggested_value as string | number });
        }
      } catch {}
      setLoadingSuggest(null);
    },
    [sessionId, generalInfo, setGeneralInfo]
  );

  const ValidationIcon = ({ field }: { field: string }) => {
    const v = validations[field];
    if (!v) return null;
    if (v.severity === 'error') return <WarningAmberIcon color="error" fontSize="small" />;
    if (v.severity === 'warning') return <WarningAmberIcon color="warning" fontSize="small" />;
    return <CheckCircleOutlineIcon color="success" fontSize="small" />;
  };

  const ValidationMsg = ({ field }: { field: string }) => {
    const v = validations[field];
    if (!v) return null;
    const color = v.severity === 'error' ? 'error' : v.severity === 'warning' ? 'warning.main' : 'success.main';
    return <Typography variant="caption" color={color}>{v.message}</Typography>;
  };

  const SuggestButton = ({ field }: { field: string }) => (
    <Tooltip title={`AI suggest value for ${field}`}>
      <span>
        <IconButton
          size="small"
          onClick={() => handleSuggest(field)}
          disabled={loadingSuggest === field}
        >
          {loadingSuggest === field ? (
            <CircularProgress size={16} />
          ) : (
            <AutoFixHighIcon fontSize="small" color="primary" />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );

  const FieldTooltip = ({ field }: { field: string }) => (
    <Tooltip title={fieldTooltips[field] || ''} arrow placement="top">
      <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', cursor: 'help' }} />
    </Tooltip>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6" color="primary" gutterBottom>
        Company Information
      </Typography>

      {/* Company Name */}
      <Box>
        <TextField
          fullWidth
          label="Company Name"
          value={generalInfo.company_name || ''}
          onChange={(e) => handleChange('company_name', e.target.value)}
          onBlur={(e) => handleBlur('company_name', e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <ValidationIcon field="company_name" />
                <FieldTooltip field="company_name" />
              </InputAdornment>
            ),
          }}
        />
        <ValidationMsg field="company_name" />
      </Box>

      {/* Industry */}
      <Box>
        <TextField
          fullWidth
          select
          label="Industry"
          value={generalInfo.industry || ''}
          onChange={(e) => handleChange('industry', e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end" sx={{ mr: 3 }}>
                <FieldTooltip field="industry" />
              </InputAdornment>
            ),
          }}
        >
          {INDUSTRIES.map((ind) => (
            <MenuItem key={ind} value={ind}>{ind}</MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Country */}
      <Box>
        <TextField
          fullWidth
          select
          label="Country of Operations"
          value={generalInfo.country || ''}
          onChange={(e) => handleChange('country', e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end" sx={{ mr: 3 }}>
                <FieldTooltip field="country" />
              </InputAdornment>
            ),
          }}
        >
          {COUNTRIES.map((c) => (
            <MenuItem key={c} value={c}>{c}</MenuItem>
          ))}
        </TextField>
      </Box>

      {/* Revenue */}
      <Box>
        <TextField
          fullWidth
          type="number"
          label="Annual Revenue"
          value={generalInfo.revenue || ''}
          onChange={(e) => handleChange('revenue', parseFloat(e.target.value))}
          onBlur={(e) => handleBlur('revenue', parseFloat(e.target.value))}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
            endAdornment: (
              <InputAdornment position="end">
                <ValidationIcon field="revenue" />
                <SuggestButton field="revenue" />
                <FieldTooltip field="revenue" />
              </InputAdornment>
            ),
          }}
          inputProps={{ min: 0 }}
        />
        <ValidationMsg field="revenue" />
      </Box>

      {/* Number of Employees */}
      <Box>
        <TextField
          fullWidth
          type="number"
          label="Number of Employees"
          value={generalInfo.num_employees || ''}
          onChange={(e) => handleChange('num_employees', parseInt(e.target.value))}
          onBlur={(e) => handleBlur('num_employees', parseInt(e.target.value))}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <ValidationIcon field="num_employees" />
                <SuggestButton field="num_employees" />
                <FieldTooltip field="num_employees" />
              </InputAdornment>
            ),
          }}
          inputProps={{ min: 1 }}
        />
        <ValidationMsg field="num_employees" />
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {generalInfo.industry && (
          <Chip label={generalInfo.industry} color="primary" variant="outlined" size="small" />
        )}
        {generalInfo.country && (
          <Chip label={generalInfo.country} color="secondary" variant="outlined" size="small" />
        )}
      </Box>

      <Button
        variant="contained"
        color="primary"
        onClick={() => saveSection('general_info')}
        sx={{ alignSelf: 'flex-end' }}
      >
        Save & Continue
      </Button>
    </Box>
  );
}
