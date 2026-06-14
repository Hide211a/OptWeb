import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TableBody, TableCell, TableHead, TableRow, Button, Dialog,
  DialogTitle, DialogContent, TextField, MenuItem, Chip, IconButton, Box,
  FormControlLabel, Checkbox, Typography,
} from '@mui/material';
import { ContentCard } from '../components/ui/ContentCard';
import { ScrollableTable } from '../components/ui/ScrollableTable';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { DirectorViewAlert } from '../components/ui/DirectorViewAlert';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { unitLabels, storageZoneLabels } from '../utils/labels';
import { useAuth } from '../context/AuthContext';
import { validateSku, suggestNextSku, skuHelperText, normalizeSku, CATEGORY_SKU_PREFIX } from '../utils/sku';
import { skuSx } from '../utils/themeHelpers';
import { hideOnMobile, hideOnXs } from '../utils/tableResponsive';
import type { Product, Unit, Category, StorageZone } from '../types';

const units: Unit[] = ['KG', 'L', 'PCS', 'PACK'];
const zones: StorageZone[] = ['DRY', 'COLD', 'FROZEN'];

export function ProductsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isDirector = user?.role === 'DIRECTOR';
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [inactiveOnly, setInactiveOnly] = useState(searchParams.get('inactiveOnly') === 'true');
  const [open, setOpen] = useState(false);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Product | null>(null);
  const [form, setForm] = useState({ sku: '', name: '', categoryId: '', unit: 'KG' as Unit, minStock: 0, shelfLifeDays: '', storageZone: 'DRY' as StorageZone });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setInactiveOnly(searchParams.get('inactiveOnly') === 'true');
  }, [searchParams]);

  const queryParams = isAdmin
    ? { search, ...(inactiveOnly ? { inactiveOnly: 'true' } : { activeOnly: 'true' }) }
    : { search, activeOnly: 'true' };

  const { data: products = [] } = useQuery({
    queryKey: ['products', queryParams],
    queryFn: async () => (await api.get<Product[]>('/products', { params: queryParams })).data,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get<Category[]>('/directories/categories')).data,
  });

  const save = useMutation({
    mutationFn: async () => {
      const category = categories.find((c) => c.id === form.categoryId);
      const skuErr = validateSku(form.sku, category?.name);
      if (skuErr) throw new Error(skuErr);
      const body = {
        ...form,
        sku: normalizeSku(form.sku),
        shelfLifeDays: form.shelfLifeDays ? Number(form.shelfLifeDays) : null,
        minStock: Number(form.minStock),
      };
      if (edit) return api.put(`/products/${edit.id}`, body);
      return api.post('/products', body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['workspace-admin'] });
      setOpen(false);
      setFormError('');
    },
    onError: (e) => setFormError(e instanceof Error ? e.message : 'Помилка'),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      setDeactivateId(null);
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['workspace-admin'] });
    },
  });

  const activate = useMutation({
    mutationFn: (id: string) => api.post(`/products/${id}/activate`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['workspace-admin'] });
    },
  });

  const openCreate = () => {
    setEdit(null);
    const categoryId = categories[0]?.id ?? '';
    const categoryName = categories.find((c) => c.id === categoryId)?.name;
    const prefix = categoryName ? CATEGORY_SKU_PREFIX[categoryName] : undefined;
    const suggestedSku = prefix ? suggestNextSku(prefix, products.map((p) => p.sku)) : '';
    setForm({ sku: suggestedSku, name: '', categoryId, unit: 'KG', minStock: 0, shelfLifeDays: '', storageZone: 'DRY' });
    setFormError('');
    setOpen(true);
  };

  const handleCategoryChange = (categoryId: string) => {
    const categoryName = categories.find((c) => c.id === categoryId)?.name;
    const prefix = categoryName ? CATEGORY_SKU_PREFIX[categoryName] : undefined;
    const nextSku = !edit && prefix ? suggestNextSku(prefix, products.map((p) => p.sku)) : form.sku;
    setForm({ ...form, categoryId, sku: nextSku });
  };

  const openEdit = (p: Product) => {
    setEdit(p);
    setForm({
      sku: p.sku, name: p.name, categoryId: p.categoryId, unit: p.unit,
      minStock: p.minStock, shelfLifeDays: p.shelfLifeDays?.toString() ?? '', storageZone: p.storageZone ?? 'DRY',
    });
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Товари"
        subtitle={
          isDirector
            ? 'Довідник товарів — перегляд для аналізу'
            : isAdmin
              ? 'Довідник продовольчих позицій — повне управління'
              : 'Довідник продовольчих позицій'
        }
        dark={isDirector}
        action={isAdmin && <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Додати</Button>}
      />
      {isDirector && <DirectorViewAlert>Режим перегляду — редагування недоступне.</DirectorViewAlert>}
      <Box mb={2} display="flex" gap={2} flexWrap="wrap" alignItems="center">
        <TextField size="small" label="Пошук" value={search} onChange={(e) => setSearch(e.target.value)} />
        {isAdmin && (
          <FormControlLabel
            control={<Checkbox checked={inactiveOnly} onChange={(e) => setInactiveOnly(e.target.checked)} />}
            label="Лише неактивні"
          />
        )}
      </Box>
      <ContentCard noPadding dark={isDirector}>
        <ScrollableTable minWidth={820} compactMinWidth={320}>
          <TableHead>
            <TableRow>
              <TableCell sx={hideOnXs}>SKU</TableCell>
              <TableCell>Назва</TableCell>
              <TableCell sx={hideOnMobile}>Категорія</TableCell>
              <TableCell sx={hideOnXs}>Од.</TableCell>
              <TableCell align="right">Залишок</TableCell>
              <TableCell align="right" sx={hideOnXs}>Мін.</TableCell>
              <TableCell sx={hideOnMobile}>Термін</TableCell>
              <TableCell sx={hideOnMobile}>Зона</TableCell>
              {isAdmin && <TableCell sx={hideOnXs}>Статус</TableCell>}
              {isAdmin && <TableCell align="right">Дії</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id} sx={{ opacity: p.isActive === false ? 0.55 : 1 }}>
                <TableCell sx={{ ...skuSx(isDirector), ...hideOnXs }}>{p.sku}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {p.name}
                  <Typography variant="caption" display="block" sx={{ ...skuSx(isDirector), display: { xs: 'block', sm: 'none' } }}>
                    {p.sku}
                  </Typography>
                </TableCell>
                <TableCell sx={hideOnMobile}>{p.category?.name}</TableCell>
                <TableCell sx={hideOnXs}>{unitLabels[p.unit]}</TableCell>
                <TableCell align="right">
                  <Chip label={p.stock ?? 0} size="small" color={(p.stock ?? 0) < p.minStock ? 'error' : 'default'} variant="outlined" />
                </TableCell>
                <TableCell align="right" sx={hideOnXs}>{p.minStock}</TableCell>
                <TableCell sx={hideOnMobile}>{p.shelfLifeDays ?? '—'}</TableCell>
                <TableCell sx={hideOnMobile}>{storageZoneLabels[p.storageZone ?? 'DRY']}</TableCell>
                {isAdmin && (
                  <TableCell>
                    <Chip
                      label={p.isActive === false ? 'Неактивний' : 'Активний'}
                      size="small"
                      color={p.isActive === false ? 'default' : 'success'}
                      variant="outlined"
                    />
                  </TableCell>
                )}
                {isAdmin && (
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton size="small" onClick={() => openEdit(p)} title="Редагувати">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {p.isActive !== false ? (
                      <IconButton size="small" color="warning" onClick={() => setDeactivateId(p.id)} title="Вимкнути">
                        <BlockIcon fontSize="small" />
                      </IconButton>
                    ) : (
                      <IconButton size="small" color="success" onClick={() => activate.mutate(p.id)} title="Увімкнути">
                        <CheckCircleOutlineIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </ScrollableTable>
      </ContentCard>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{edit ? 'Редагувати товар' : 'Новий товар'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="SKU"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
            disabled={!!edit}
            helperText={!edit ? skuHelperText(categories.find((c) => c.id === form.categoryId)?.name) : 'SKU не змінюється після створення'}
            error={!!formError && formError.includes('SKU')}
          />
          <TextField label="Назва" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField select label="Категорія" value={form.categoryId} onChange={(e) => handleCategoryChange(e.target.value)}>
            {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <TextField select label="Одиниця" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as Unit })}>
            {units.map((u) => <MenuItem key={u} value={u}>{unitLabels[u]}</MenuItem>)}
          </TextField>
          <TextField type="number" label="Мін. залишок" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} />
          <TextField type="number" label="Термін зберігання (днів)" value={form.shelfLifeDays} onChange={(e) => setForm({ ...form, shelfLifeDays: e.target.value })} />
          <TextField select label="Зона складу" value={form.storageZone} onChange={(e) => setForm({ ...form, storageZone: e.target.value as StorageZone })}>
            {zones.map((z) => <MenuItem key={z} value={z}>{storageZoneLabels[z]}</MenuItem>)}
          </TextField>
          {formError && <Typography color="error" variant="body2">{formError}</Typography>}
          <Button variant="contained" onClick={() => save.mutate()} disabled={save.isPending || !form.sku || !form.name}>
            Зберегти
          </Button>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deactivateId}
        title="Вимкнути товар?"
        message="Товар буде приховано з вибору в нових документах. Залишки на складі збережуться."
        confirmLabel="Вимкнути"
        confirmColor="warning"
        loading={deactivate.isPending}
        onConfirm={() => deactivateId && deactivate.mutate(deactivateId)}
        onClose={() => setDeactivateId(null)}
      />
    </>
  );
}
