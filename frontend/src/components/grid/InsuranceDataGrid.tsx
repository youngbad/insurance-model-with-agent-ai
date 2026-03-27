import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import type { ColDef } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-material.css';
import type { InsuranceInput } from '../../types';

interface Props {
  data: InsuranceInput | null;
}

interface RowData {
  section: string;
  field: string;
  value: string | number | null;
  unit: string;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return v.toLocaleString();
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

export default function InsuranceDataGrid({ data }: Props) {
  const rowData = useMemo<RowData[]>(() => {
    if (!data) return [];
    return [
      // General Info
      { section: 'General', field: 'Company Name', value: data.general_info.company_name || '—', unit: '' },
      { section: 'General', field: 'Industry', value: data.general_info.industry || '—', unit: '' },
      { section: 'General', field: 'Country', value: data.general_info.country || '—', unit: '' },
      { section: 'General', field: 'Revenue', value: data.general_info.revenue ?? null, unit: 'USD' },
      { section: 'General', field: 'Employees', value: data.general_info.num_employees ?? null, unit: '' },

      // Historical
      { section: 'History', field: 'Past Claims Count', value: data.historical_experience.past_claims_count ?? null, unit: '' },
      { section: 'History', field: 'Total Claim Value', value: data.historical_experience.total_claim_value ?? null, unit: 'USD' },
      { section: 'History', field: 'Loss Ratio', value: data.historical_experience.loss_ratio ?? null, unit: '' },
      { section: 'History', field: 'Claim Frequency', value: data.historical_experience.claim_frequency ?? null, unit: '/yr' },

      // Exposure
      { section: 'Exposure', field: 'Assets Value', value: data.exposure.assets_value ?? null, unit: 'USD' },
      { section: 'Exposure', field: 'Locations', value: data.exposure.locations ?? null, unit: '' },
      { section: 'Exposure', field: 'Risk Categories', value: (data.exposure.risk_categories || []).join(', ') || '—', unit: '' },
      { section: 'Exposure', field: 'Operational Complexity', value: data.exposure.operational_complexity_score ?? null, unit: '/10' },

      // Derived
      ...(data.derived_metrics ? [
        { section: 'Derived', field: 'Risk Score', value: data.derived_metrics.risk_score, unit: '/100' },
        { section: 'Derived', field: 'Suggested Premium', value: data.derived_metrics.suggested_premium, unit: 'USD/yr' },
      ] : []),
    ];
  }, [data]);

  const columnDefs = useMemo<ColDef[]>(() => [
    {
      field: 'section',
      headerName: 'Section',
      width: 110,
      rowGroup: true,
      hide: true,
    },
    {
      field: 'field',
      headerName: 'Field',
      flex: 1,
      cellStyle: { fontWeight: 500 } as Record<string, string | number>,
    },
    {
      field: 'value',
      headerName: 'Value',
      flex: 1,
      valueFormatter: ({ value }: { value: unknown }) => formatValue(value),
    },
    {
      field: 'unit',
      headerName: 'Unit',
      width: 80,
      cellStyle: { color: '#888', fontSize: '0.85em' } as Record<string, string | number>,
    },
  ], []);

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent sx={{ pb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Structured Data View (AG Grid)
        </Typography>
      </CardContent>
      <Box
        className="ag-theme-material"
        sx={{ height: 380, width: '100%' }}
      >
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          groupDisplayType="groupRows"
          rowGroupPanelShow="never"
          defaultColDef={{ sortable: true, resizable: true }}
          animateRows
          suppressCellFocus
        />
      </Box>
    </Card>
  );
}
