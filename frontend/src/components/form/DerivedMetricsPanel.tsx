import { useEffect, useState } from 'react';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip,
  Card, CardContent, LinearProgress, Divider, Grid,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useSession } from '../../hooks/useSession';
import RiskScoreChart from '../charts/RiskScoreChart';
import WhatIfTable from '../charts/WhatIfTable';

export default function DerivedMetricsPanel() {
  const { sessionId, riskScore, refreshRiskScore, isLoadingRisk } = useSession();
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async () => {
    setError(null);
    try {
      await refreshRiskScore();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to calculate risk score');
    }
  };

  const getRiskLevel = (score: number) => {
    if (score < 35) return { label: 'Low Risk', color: 'success' as const };
    if (score < 55) return { label: 'Moderate Risk', color: 'warning' as const };
    if (score < 75) return { label: 'High Risk', color: 'error' as const };
    return { label: 'Very High Risk', color: 'error' as const };
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6" color="primary" gutterBottom>
        Derived Metrics & Risk Analysis
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      <Button
        variant="contained"
        color="primary"
        size="large"
        onClick={handleCalculate}
        disabled={isLoadingRisk || !sessionId}
        startIcon={isLoadingRisk ? <CircularProgress size={20} color="inherit" /> : <TrendingUpIcon />}
      >
        {isLoadingRisk ? 'Calculating...' : 'Calculate Risk Score'}
      </Button>

      {riskScore && (
        <>
          {/* Main Metrics */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="overline" color="text.secondary">Risk Score</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                    <Typography variant="h2" color="primary" fontWeight="bold">
                      {riskScore.risk_score.toFixed(1)}
                    </Typography>
                    <Box>
                      <Typography variant="caption" color="text.secondary">/100</Typography>
                      <br />
                      <Chip
                        label={getRiskLevel(riskScore.risk_score).label}
                        color={getRiskLevel(riskScore.risk_score).color}
                        size="small"
                      />
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={riskScore.risk_score}
                    color={getRiskLevel(riskScore.risk_score).color}
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="overline" color="text.secondary">Suggested Annual Premium</Typography>
                  <Typography variant="h2" color="secondary" fontWeight="bold" sx={{ mt: 1 }}>
                    ${riskScore.suggested_premium.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Estimated annual insurance premium
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Risk Score Chart */}
          <RiskScoreChart riskScore={riskScore} />

          {/* Risk Factors */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Risk Factors
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {riskScore.risk_factors.map((factor, idx) => (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Chip
                      label={factor.severity}
                      color={factor.severity === 'high' ? 'error' : factor.severity === 'medium' ? 'warning' : 'success'}
                      size="small"
                      sx={{ minWidth: 70 }}
                    />
                    <Box>
                      <Typography variant="body2" fontWeight="medium">{factor.factor}: {factor.value}</Typography>
                      <Typography variant="caption" color="text.secondary">{factor.description}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* AI Explanation */}
          <Card variant="outlined" sx={{ bgcolor: 'primary.50' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                AI Risk Explanation
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.8 }}>
                {riskScore.risk_explanation}
              </Typography>
            </CardContent>
          </Card>

          {/* What-If Scenarios */}
          {riskScore.what_if_scenarios && riskScore.what_if_scenarios.length > 0 && (
            <WhatIfTable scenarios={riskScore.what_if_scenarios} baseScore={riskScore.risk_score} basePremium={riskScore.suggested_premium} />
          )}
        </>
      )}
    </Box>
  );
}
