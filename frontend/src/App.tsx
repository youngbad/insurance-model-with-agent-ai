import { useState, useEffect } from 'react';
import {
  Box, Container, Grid, Paper, Stepper, Step, StepLabel, StepButton,
  Typography, Chip, Divider, ThemeProvider, createTheme, CssBaseline,
  AppBar, Toolbar, IconButton, Tooltip,
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import RefreshIcon from '@mui/icons-material/Refresh';
import GeneralInfoForm from './components/form/GeneralInfoForm';
import HistoricalExperienceForm from './components/form/HistoricalExperienceForm';
import ExposureForm from './components/form/ExposureForm';
import DerivedMetricsPanel from './components/form/DerivedMetricsPanel';
import ChatPanel from './components/chat/ChatPanel';
import InsuranceDataGrid from './components/grid/InsuranceDataGrid';
import { useSession } from './hooks/useSession';
import { getInputData } from './services/api';
import type { InsuranceInput } from './types';

const theme = createTheme({
  palette: {
    primary: { main: '#1565c0' },
    secondary: { main: '#7b1fa2' },
    background: { default: '#f5f7fa' },
  },
  typography: {
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  components: {
    MuiCard: {
      styleOverrides: { root: { borderRadius: 12 } },
    },
    MuiPaper: {
      styleOverrides: { root: { borderRadius: 12 } },
    },
  },
});

const STEPS = [
  { label: 'General Info', description: 'Company details' },
  { label: 'Historical', description: 'Claims experience' },
  { label: 'Exposure', description: 'Risk exposure' },
  { label: 'Risk Score', description: 'AI analysis' },
];

function StepContent({ step }: { step: number }) {
  switch (step) {
    case 0: return <GeneralInfoForm />;
    case 1: return <HistoricalExperienceForm />;
    case 2: return <ExposureForm />;
    case 3: return <DerivedMetricsPanel />;
    default: return null;
  }
}

export default function App() {
  const [activeStep, setActiveStep] = useState(0);
  const { sessionId, riskScore } = useSession();
  const [gridData, setGridData] = useState<InsuranceInput | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const timer = setTimeout(() => {
      getInputData(sessionId)
        .then(setGridData)
        .catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [sessionId, riskScore]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* App Bar */}
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.main' }}>
          <Toolbar>
            <CalculateIcon sx={{ mr: 1 }} />
            <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>
              Insurance Risk & Pricing System
            </Typography>
            {sessionId && (
              <Chip
                label={`Session: ${sessionId.slice(0, 8)}...`}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
            )}
          </Toolbar>
        </AppBar>

        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
          <Grid container spacing={2} sx={{ height: 'calc(100vh - 80px)' }}>
            {/* Left: Form + Stepper */}
            <Grid item xs={12} md={7} lg={8}>
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
                {/* Stepper */}
                <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Stepper activeStep={activeStep} nonLinear>
                    {STEPS.map((step, index) => (
                      <Step key={step.label}>
                        <StepButton onClick={() => setActiveStep(index)}>
                          <StepLabel>
                            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                              <Typography variant="body2" fontWeight={activeStep === index ? 700 : 400}>
                                {step.label}
                              </Typography>
                            </Box>
                          </StepLabel>
                        </StepButton>
                      </Step>
                    ))}
                  </Stepper>
                </Paper>

                {/* Form Content */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    flex: 1,
                    overflowY: 'auto',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <StepContent step={activeStep} />

                  {/* Navigation */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Box
                      component="button"
                      onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
                      disabled={activeStep === 0}
                      style={{
                        cursor: activeStep === 0 ? 'default' : 'pointer',
                        opacity: activeStep === 0 ? 0.5 : 1,
                        padding: '8px 16px',
                        borderRadius: 6,
                        border: '1px solid #1565c0',
                        background: 'transparent',
                        color: '#1565c0',
                        fontFamily: 'inherit',
                      }}
                    >
                      ← Back
                    </Box>
                    <Box
                      component="button"
                      onClick={() => setActiveStep((s) => Math.min(STEPS.length - 1, s + 1))}
                      disabled={activeStep === STEPS.length - 1}
                      style={{
                        cursor: activeStep === STEPS.length - 1 ? 'default' : 'pointer',
                        opacity: activeStep === STEPS.length - 1 ? 0.5 : 1,
                        padding: '8px 16px',
                        borderRadius: 6,
                        border: 'none',
                        background: '#1565c0',
                        color: 'white',
                        fontFamily: 'inherit',
                      }}
                    >
                      Next →
                    </Box>
                  </Box>
                </Paper>

                {/* Data Grid */}
                {gridData && <InsuranceDataGrid data={gridData} />}
              </Box>
            </Grid>

            {/* Right: Chat Panel */}
            <Grid item xs={12} md={5} lg={4}>
              <Paper
                elevation={0}
                sx={{
                  height: { xs: 500, md: 'calc(100vh - 112px)' },
                  display: 'flex',
                  flexDirection: 'column',
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                }}
              >
                <ChatPanel />
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
