import {
  Box, Typography, Card, CardContent, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip,
} from '@mui/material';
import type { WhatIfScenario } from '../../types';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

interface Props {
  scenarios: WhatIfScenario[];
  baseScore: number;
  basePremium: number;
}

export default function WhatIfTable({ scenarios, baseScore, basePremium }: Props) {
  const ChangeCell = ({ change, prefix = '' }: { change: number; prefix?: string }) => {
    const isPositive = change > 0;
    const isNeutral = change === 0;
    const color = isNeutral ? 'default' : isPositive ? 'error' : 'success';
    const Icon = isNeutral ? TrendingFlatIcon : isPositive ? TrendingUpIcon : TrendingDownIcon;
    const text = isPositive ? `+${prefix}${Math.abs(change).toLocaleString()}` : `${prefix}${change.toLocaleString()}`;
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Icon fontSize="small" color={color === 'default' ? 'action' : color} />
        <Typography variant="body2" color={`${color}.main`} fontWeight="medium">
          {text}
        </Typography>
      </Box>
    );
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          What-If Scenarios
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          How would changes to your inputs affect your risk score and premium?
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Scenario</TableCell>
                <TableCell align="center">New Risk Score</TableCell>
                <TableCell align="center">Score Change</TableCell>
                <TableCell align="center">New Premium</TableCell>
                <TableCell align="center">Premium Change</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Baseline row */}
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell><strong>Current (Baseline)</strong></TableCell>
                <TableCell align="center"><strong>{baseScore.toFixed(1)}</strong></TableCell>
                <TableCell align="center">—</TableCell>
                <TableCell align="center"><strong>${basePremium.toLocaleString()}</strong></TableCell>
                <TableCell align="center">—</TableCell>
              </TableRow>
              {scenarios.map((s, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>{s.label}</TableCell>
                  <TableCell align="center">{s.risk_score.toFixed(1)}</TableCell>
                  <TableCell align="center">
                    <ChangeCell change={s.score_change} />
                  </TableCell>
                  <TableCell align="center">${s.suggested_premium.toLocaleString()}</TableCell>
                  <TableCell align="center">
                    <ChangeCell change={s.premium_change} prefix="$" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
