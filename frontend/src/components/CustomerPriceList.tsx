import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  TableBody, TableCell, TableHead, TableRow, TextField, Button, Typography, Alert,
} from '@mui/material';
import api from '../api/client';
import { ContentCard } from './ui/ContentCard';
import { ScrollableTable } from './ui/ScrollableTable';
import { unitLabels } from '../utils/labels';
import { skuSx } from '../utils/themeHelpers';
import type { Product } from '../types';

type PriceRow = {
  productId: string;
  product: Product;
  unitPrice: number;
};

export function CustomerPriceList({
  customerId,
  canEdit,
  dark = false,
}: {
  customerId: string;
  canEdit: boolean;
  dark?: boolean;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string>>({});

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'price-list'],
    queryFn: async () => (await api.get<Product[]>('/products', { params: { activeOnly: true } })).data,
  });

  const { data: prices = [], isLoading } = useQuery({
    queryKey: ['customer-prices', customerId],
    queryFn: async () => (await api.get<PriceRow[]>('/directories/customers/' + customerId + '/prices')).data,
    enabled: !!customerId,
  });

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const p of prices) {
      map[p.productId] = String(p.unitPrice);
    }
    setDraft(map);
  }, [prices]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = products
        .filter((p) => draft[p.id] && Number(draft[p.id]) > 0)
        .map((p) => ({ productId: p.id, unitPrice: Number(draft[p.id]) }));
      return api.put(`/directories/customers/${customerId}/prices`, { prices: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-prices', customerId] });
    },
  });

  const setPrice = (productId: string, value: string) => {
    setDraft((prev) => ({ ...prev, [productId]: value }));
  };

  return (
    <ContentCard
      title="Прайс-лист B2B"
      sx={{ mb: 2.5 }}
      dark={dark}
      action={
        canEdit && (
          <Button size="small" variant="contained" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Збереження…' : 'Зберегти ціни'}
          </Button>
        )
      }
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, px: dark ? 0 : undefined }}>
        Індивідуальні оптові ціни для цього клієнта. При створенні реалізації ціни підставляються автоматично.
      </Typography>

      {save.isSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>Прайс-лист збережено</Alert>
      )}

      {isLoading ? (
        <Typography color="text.secondary" py={2}>Завантаження…</Typography>
      ) : (
        <ScrollableTable minWidth={640}>
          <TableHead>
            <TableRow>
              <TableCell>Товар</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Од.</TableCell>
              <TableCell align="right">Ціна (грн)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                <TableCell sx={skuSx(dark)}>{p.sku}</TableCell>
                <TableCell>{unitLabels[p.unit]}</TableCell>
                <TableCell align="right">
                  {canEdit ? (
                    <TextField
                      type="number"
                      size="small"
                      value={draft[p.id] ?? ''}
                      onChange={(e) => setPrice(p.id, e.target.value)}
                      placeholder="—"
                      sx={{ width: 110 }}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  ) : (
                    draft[p.id] ? Number(draft[p.id]).toFixed(2) : '—'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </ScrollableTable>
      )}
    </ContentCard>
  );
}
