import { useState, useCallback } from 'react';
import {
  Box, TextField, InputAdornment, Tooltip, IconButton,
  CircularProgress, Typography, Button, Alert,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useSession } from '../../hooks/useSession';
import { getSuggestion, validateField } from '../../services/api';

const fieldTooltips: Record<string, string> = {
  past_claims_count: 'Total number of insurance claims filed in the past 3 years.',
  total_claim_value: 'Aggregate dollar amount of all claims paid or reserved in the past 3 years.',
  loss_ratio: 'Ratio of losses to earned premium (0–2). E.g., 0.65 = 65%. Key profitability indicator.',
  claim_frequency: 'Average number of claims per year. High frequency indicates systemic risk issues.',
};

export default function HistoricalExperienceForm() {
  const { sessionId, historicalExperience, setHistoricalExperience, saveSection, generalInfo } = useSession();
  const [loadingSuggest, setLoadingSuggest] = useState<string | null>(null);
  const [validations, setValidations] = useState<Record<string, { message: string; severity: string }>>({});

  const handleChange = useCallback(
    (field: keyof typeof historicalExperience, value: number) => {
      setHistoricalExperience({ [field]: value });
    },
    [setHistoricalExperience]
  );

  const handleBlur = useCallback(
    async (field: string, value: unknown) => {
      if (value === '' || value === undefined || value === null) return;
      try {
        const result = await validateField(field, value, { industry: generalInfo.industry });
        setValidations((prev) => ({
          ...prev,
          [field]: { message: result.message, severity: result.severity },
        }));
      } catch {}
    },
    [generalInfo.industry]
  );

  const handleSuggest = useCallback(
    async (field: string) => {
      if (!sessionId) return;
      setLoadingSuggest(field);
      try {
        const result = await getSuggestion(sessionId, field, {
          industry: generalInfo.industry,
        });
        if (result.suggested_value !== null && result.suggested_value !== undefined) {
          setHistoricalExperience({ [field]: result.suggested_value as number });
        }
      } catch {}
      setLoadingSuggest(null);
    },
    [sessionId, generalInfo, setHistoricalExperience]
  );

  const ValidationChip = ({ field }: { field: string }) => {
    const v = validations[field];
    if (!v) return null;
    return (
      <Alert severity={v.severity === 'error' ? 'error' : v.severity === 'warning' ? 'warning' : 'success'} sx={{ py: 0, px: 1, mt: 0.5 }}>
        <Typography variant="caption">{v.message}</Typography>
      </Alert>
    );
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
        Historical Claims Experience
      </Typography>

      {/* Past Claims Count */}
      <Box>
        <TextField
          fullWidth
          type="number"
          label="Past Claims Count (last 3 years)"
          value={historicalExperience.past_claims_count ?? ''}
          onChange={(e) => handleChange('past_claims_count', parseInt(e.target.value))}
          onBlur={(e) => handleBlur('past_claims_count', parseInt(e.target.value))}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <SuggestButton field="past_claims_count" />
                <FieldTooltip field="past_claims_count" />
              </InputAdornment>
            ),
          }}
          inputProps={{ min: 0 }}
        />
        <ValidationChip field="past_claims_count" />
      </Box>

      {/* Total Claim Value */}
      <Box>
        <TextField
          fullWidth
          type="number"
          label="Total Claim Value (last 3 years)"
          value={historicalExperience.total_claim_value ?? ''}
          onChange={(e) => handleChange('total_claim_value', parseFloat(e.target.value))}
          onBlur={(e) => handleBlur('total_claim_value', parseFloat(e.target.value))}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
            endAdornment: (
              <InputAdornment position="end">
                <SuggestButton field="total_claim_value" />
                <FieldTooltip field="total_claim_value" />
              </InputAdornment>
            ),
          }}
          inputProps={{ min: 0 }}
        />
      </Box>

      {/* Loss Ratio */}
      <Box>
        <TextField
          fullWidth
          type="number"
          label="Loss Ratio"
          value={historicalExperience.loss_ratio ?? ''}
          onChange={(e) => handleChange('loss_ratio', parseFloat(e.target.value))}
          onBlur={(e) => handleBlur('loss_ratio', parseFloat(e.target.value))}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <SuggestButton field="loss_ratio" />
                <FieldTooltip field="loss_ratio" />
              </InputAdornment>
            ),
          }}
          inputProps={{ min: 0, max: 10, step: 0.01 }}
          helperText="0.65 = 65% loss ratio. Industry average: 0.55–0.70"
        />
        <ValidationChip field="loss_ratio" />
      </Box>

      {/* Claim Frequency */}
      <Box>
        <TextField
          fullWidth
          type="number"
          label="Claim Frequency (per year)"
          value={historicalExperience.claim_frequency ?? ''}
          onChange={(e) => handleChange('claim_frequency', parseFloat(e.target.value))}
          onBlur={(e) => handleBlur('claim_frequency', parseFloat(e.target.value))}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <SuggestButton field="claim_frequency" />
                <FieldTooltip field="claim_frequency" />
              </InputAdornment>
            ),
          }}
          inputProps={{ min: 0, step: 0.1 }}
          helperText="Average number of claims filed per year"
        />
        <ValidationChip field="claim_frequency" />
      </Box>

      <Button
        variant="contained"
        color="primary"
        onClick={() => saveSection('historical_experience')}
        sx={{ alignSelf: 'flex-end' }}
      >
        Save & Continue
      </Button>
    </Box>
  );
}
