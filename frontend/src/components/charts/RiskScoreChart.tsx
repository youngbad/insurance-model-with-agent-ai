import { Box, Typography, Card, CardContent } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import type { RiskScoreResponse } from '../../types';

interface Props {
  riskScore: RiskScoreResponse;
}

export default function RiskScoreChart({ riskScore }: Props) {
  const gaugeData = [
    {
      name: 'Risk Score',
      value: riskScore.risk_score,
      fill: riskScore.risk_score < 35 ? '#4caf50' : riskScore.risk_score < 55 ? '#ff9800' : riskScore.risk_score < 75 ? '#f44336' : '#b71c1c',
    },
  ];

  const factorData = riskScore.risk_factors.map((f) => ({
    name: f.factor,
    value: f.value,
    severity: f.severity,
  }));

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Risk Score Visualization
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* Gauge Chart */}
          <Box sx={{ width: 220, height: 200 }}>
            <Typography variant="caption" align="center" display="block" color="text.secondary">
              Overall Risk Score
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="70%"
                innerRadius="60%"
                outerRadius="100%"
                startAngle={180}
                endAngle={0}
                data={gaugeData}
              >
                <PolarAngleAxis
                  type="number"
                  domain={[0, 100]}
                  angleAxisId={0}
                  tick={false}
                />
                <RadialBar
                  dataKey="value"
                  cornerRadius={6}
                  background={{ fill: '#e0e0e0' }}
                />
                <text x="50%" y="70%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 28, fontWeight: 'bold', fill: gaugeData[0].fill }}>
                  {riskScore.risk_score.toFixed(1)}
                </text>
                <text x="50%" y="85%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 12, fill: '#666' }}>
                  / 100
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
          </Box>

          {/* What-If Bar Chart */}
          {riskScore.what_if_scenarios && riskScore.what_if_scenarios.length > 0 && (
            <Box sx={{ flex: 1, minWidth: 280, height: 200 }}>
              <Typography variant="caption" align="center" display="block" color="text.secondary">
                What-If Premium Comparison
              </Typography>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { label: 'Current', premium: riskScore.suggested_premium },
                    ...riskScore.what_if_scenarios.map((s) => ({
                      label: s.label.split(' ').slice(0, 2).join(' '),
                      premium: s.suggested_premium,
                    })),
                  ]}
                  margin={{ top: 5, right: 10, left: 10, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" angle={-20} textAnchor="end" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Premium']} />
                  <Bar dataKey="premium" fill="#1976d2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
