import { useState, useCallback } from 'react';
import {
  Box, TextField, InputAdornment, Tooltip, IconButton,
  CircularProgress, Typography, Button, Slider, Chip, FormLabel,
  FormGroup, FormControlLabel, Checkbox,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useSession } from '../../hooks/useSession';
import { getSuggestion } from '../../services/api';
import { RISK_CATEGORIES } from '../../types';

export default function ExposureForm() {
  const { sessionId, exposure, setExposure, saveSection, generalInfo } = useSession();
  const [loadingSuggest, setLoadingSuggest] = useState<string | null>(null);

  const handleChange = useCallback(
    (field: keyof typeof exposure, value: unknown) => {
      setExposure({ [field]: value });
    },
    [setExposure]
  );

  const handleSuggest = useCallback(
    async (field: string) => {
      if (!sessionId) return;
      setLoadingSuggest(field);
      try {
        const result = await getSuggestion(sessionId, field, {
          industry: generalInfo.industry,
          revenue: generalInfo.revenue,
        });
        if (result.suggested_value !== null && result.suggested_value !== undefined) {
          setExposure({ [field]: result.suggested_value });
        }
      } catch {}
      setLoadingSuggest(null);
    },
    [sessionId, generalInfo, setExposure]
  );

  const handleRiskCategoryToggle = useCallback(
    (cat: string) => {
      const current = exposure.risk_categories || [];
      const updated = current.includes(cat)
        ? current.filter((c) => c !== cat)
        : [...current, cat];
      setExposure({ risk_categories: updated });
    },
    [exposure.risk_categories, setExposure]
  );

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

  const complexityColor = (val: number) => {
    if (val <= 3) return 'success';
    if (val <= 6) return 'warning';
    return 'error';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6" color="primary" gutterBottom>
        Risk Exposure
      </Typography>

      {/* Assets Value */}
      <Box>
        <TextField
          fullWidth
          type="number"
          label="Total Assets Value"
          value={exposure.assets_value ?? ''}
          onChange={(e) => handleChange('assets_value', parseFloat(e.target.value))}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
            endAdornment: (
              <InputAdornment position="end">
                <SuggestButton field="assets_value" />
                <Tooltip title="Total insurable value of all physical assets including buildings, equipment, and inventory." arrow>
                  <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </Tooltip>
              </InputAdornment>
            ),
          }}
          inputProps={{ min: 0 }}
        />
      </Box>

      {/* Locations */}
      <Box>
        <TextField
          fullWidth
          type="number"
          label="Number of Locations"
          value={exposure.locations ?? ''}
          onChange={(e) => handleChange('locations', parseInt(e.target.value))}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <SuggestButton field="locations" />
                <Tooltip title="Number of distinct operating locations. More locations = broader geographic risk." arrow>
                  <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </Tooltip>
              </InputAdornment>
            ),
          }}
          inputProps={{ min: 1 }}
        />
      </Box>

      {/* Risk Categories */}
      <Box>
        <FormLabel component="legend" sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            Risk Categories
            <Tooltip title="Select all types of risk exposures present in your business operations." arrow>
              <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            </Tooltip>
          </Box>
        </FormLabel>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {RISK_CATEGORIES.map((cat) => {
            const selected = (exposure.risk_categories || []).includes(cat.value);
            return (
              <Chip
                key={cat.value}
                label={cat.label}
                onClick={() => handleRiskCategoryToggle(cat.value)}
                color={selected ? 'primary' : 'default'}
                variant={selected ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
            );
          })}
        </Box>
      </Box>

      {/* Operational Complexity Score */}
      <Box>
        <FormLabel component="legend" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            Operational Complexity Score: {' '}
            <Chip
              label={`${exposure.operational_complexity_score ?? 5}/10`}
              color={complexityColor(exposure.operational_complexity_score ?? 5) as 'success' | 'warning' | 'error'}
              size="small"
            />
            <Tooltip title="A 1-10 scale: 1=simple single-product, single-location; 10=complex multi-product, multi-national." arrow>
              <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            </Tooltip>
          </Box>
        </FormLabel>
        <Slider
          value={exposure.operational_complexity_score ?? 5}
          onChange={(_, v) => handleChange('operational_complexity_score', v as number)}
          min={1}
          max={10}
          step={0.5}
          marks={[
            { value: 1, label: '1 (Simple)' },
            { value: 5, label: '5 (Medium)' },
            { value: 10, label: '10 (Complex)' },
          ]}
          valueLabelDisplay="auto"
          color="primary"
          sx={{ mt: 1 }}
        />
      </Box>

      <Button
        variant="contained"
        color="primary"
        onClick={() => saveSection('exposure')}
        sx={{ alignSelf: 'flex-end' }}
      >
        Save & Calculate Risk
      </Button>
    </Box>
  );
}
