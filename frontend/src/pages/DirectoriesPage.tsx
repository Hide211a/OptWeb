import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tabs, Tab, TableBody, TableCell, TableHead, TableRow,
  Button, TextField, Dialog, DialogTitle, DialogContent, Chip, IconButton, Tooltip, Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { ContentCard } from '../components/ui/ContentCard';
import { ScrollableTable } from '../components/ui/ScrollableTable';
import { ConfirmDialog } from '../components/ConfirmDialog';

type FieldDef = { key: string; label: string; type?: 'email' };

const categoryFields: FieldDef[] = [{ key: 'name', label: 'Назва категорії' }];

const supplierFields: FieldDef[] = [
  { key: 'name', label: 'Назва' },
  { key: 'phone', label: 'Телефон' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'address', label: 'Адреса' },
];

const customerFields: FieldDef[] = [
  { key: 'name', label: 'Назва' },
  { key: 'phone', label: 'Телефон' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'edrpou', label: 'ЄДРПОУ' },
  { key: 'address', label: 'Адреса' },
];

type DialogState = {
  type: 'categories' | 'suppliers' | 'customers';
  id?: string;
  values: Record<string, string>;
};

export function DirectoriesPage() {
  const [tab, setTab] = useState(0);
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [deleteId, setDeleteId] = useState<{ type: string; id: string; name: string } | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/directories/categories')).data,
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get('/directories/suppliers')).data,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await api.get('/directories/customers')).data,
  });

  const invalidate = (type: string) => {
    const key = type === 'categories' ? 'categories' : type;
    qc.invalidateQueries({ queryKey: [key] });
    qc.invalidateQueries({ queryKey: ['workspace-admin'] });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!dialog) return;
      const { type, id, values } = dialog;
      const path = `/directories/${type}`;
      if (id) return api.put(`${path}/${id}`, values);
      return api.post(path, values);
    },
    onSuccess: () => {
      if (dialog) invalidate(dialog.type);
      setDialog(null);
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!deleteId) return;
      if (deleteId.type === 'categories') {
        return api.delete(`/directories/categories/${deleteId.id}`);
      }
      return api.put(`/directories/${deleteId.type}/${deleteId.id}`, { isActive: false });
    },
    onSuccess: () => {
      if (deleteId) invalidate(deleteId.type);
      setDeleteId(null);
    },
  });

  const reactivate = useMutation({
    mutationFn: ({ type, id }: { type: string; id: string }) =>
      api.put(`/directories/${type}/${id}`, { isActive: true }),
    onSuccess: (_, vars) => invalidate(vars.type),
  });

  const fieldsFor = (type: DialogState['type']) => {
    if (type === 'categories') return categoryFields;
    if (type === 'suppliers') return supplierFields;
    return customerFields;
  };

  const emptyValues = (type: DialogState['type']) =>
    Object.fromEntries(fieldsFor(type).map((f) => [f.key, '']));

  return (
    <>
      <PageHeader title="Довідники" subtitle="Категорії, постачальники, оптові клієнти" />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable" scrollButtons="auto">
        <Tab label="Категорії" />
        <Tab label="Постачальники" />
        <Tab label="Клієнти" />
      </Tabs>

      {tab === 0 && (
        <DirTable
          title="Категорії товарів"
          rows={categories}
          columns={[{ key: 'name', label: 'Назва' }]}
          onAdd={() => setDialog({ type: 'categories', values: emptyValues('categories') })}
          onEdit={(r) => setDialog({ type: 'categories', id: r.id, values: { name: String(r.name) } })}
          onDelete={(r) => setDeleteId({ type: 'categories', id: r.id, name: String(r.name) })}
          canDelete
        />
      )}
      {tab === 1 && (
        <DirTable
          title="Постачальники"
          rows={suppliers}
          columns={[
            { key: 'name', label: 'Назва' },
            { key: 'phone', label: 'Телефон' },
            { key: 'email', label: 'Email' },
          ]}
          onAdd={() => setDialog({ type: 'suppliers', values: emptyValues('suppliers') })}
          onEdit={(r) => setDialog({
            type: 'suppliers',
            id: r.id,
            values: {
              name: String(r.name),
              phone: String(r.phone ?? ''),
              email: String(r.email ?? ''),
              address: String(r.address ?? ''),
            },
          })}
          onDeactivate={(r) => setDeleteId({ type: 'suppliers', id: r.id, name: String(r.name) })}
          onReactivate={(r) => reactivate.mutate({ type: 'suppliers', id: r.id })}
        />
      )}
      {tab === 2 && (
        <DirTable
          title="Оптові клієнти"
          rows={customers}
          columns={[
            { key: 'name', label: 'Назва' },
            { key: 'phone', label: 'Телефон' },
            { key: 'edrpou', label: 'ЄДРПОУ' },
          ]}
          onAdd={() => setDialog({ type: 'customers', values: emptyValues('customers') })}
          onEdit={(r) => setDialog({
            type: 'customers',
            id: r.id,
            values: {
              name: String(r.name),
              phone: String(r.phone ?? ''),
              email: String(r.email ?? ''),
              edrpou: String(r.edrpou ?? ''),
              address: String(r.address ?? ''),
            },
          })}
          onDeactivate={(r) => setDeleteId({ type: 'customers', id: r.id, name: String(r.name) })}
          onReactivate={(r) => reactivate.mutate({ type: 'customers', id: r.id })}
        />
      )}

      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog?.id ? 'Редагування' : 'Новий запис'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {dialog && fieldsFor(dialog.type).map((f) => (
            <TextField
              key={f.key}
              label={f.label}
              type={f.type ?? 'text'}
              value={dialog.values[f.key] ?? ''}
              onChange={(e) => setDialog({ ...dialog, values: { ...dialog.values, [f.key]: e.target.value } })}
            />
          ))}
          {save.error && (
            <Typography color="error" variant="body2">
              {save.error instanceof Error ? save.error.message : 'Помилка'}
            </Typography>
          )}
          <Button variant="contained" onClick={() => save.mutate()} disabled={save.isPending}>
            Зберегти
          </Button>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        title={deleteId?.type === 'categories' ? 'Видалити категорію?' : 'Деактивувати запис?'}
        message={
          deleteId?.type === 'categories'
            ? `Категорію «${deleteId?.name}» буде видалено. Неможливо, якщо є повʼязані товари.`
            : `«${deleteId?.name}» буде приховано зі списків вибору в документах.`
        }
        confirmLabel={deleteId?.type === 'categories' ? 'Видалити' : 'Деактивувати'}
        confirmColor="error"
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
        onClose={() => setDeleteId(null)}
      />
    </>
  );
}

function DirTable({
  title,
  rows,
  columns,
  onAdd,
  onEdit,
  onDelete,
  onDeactivate,
  onReactivate,
  canDelete,
}: {
  title: string;
  rows: Array<Record<string, string | boolean> & { id: string }>;
  columns: { key: string; label: string }[];
  onAdd: () => void;
  onEdit: (row: Record<string, string | boolean> & { id: string }) => void;
  onDelete?: (row: Record<string, string | boolean> & { id: string }) => void;
  onDeactivate?: (row: Record<string, string | boolean> & { id: string }) => void;
  onReactivate?: (row: Record<string, string | boolean> & { id: string }) => void;
  canDelete?: boolean;
}) {
  return (
    <ContentCard
      title={title}
      action={<Button variant="outlined" size="small" onClick={onAdd}>Додати</Button>}
      noPadding
    >
      <ScrollableTable minWidth={600} compactMinWidth={320}>
        <TableHead>
          <TableRow>
            {columns.map((c) => <TableCell key={c.key}>{c.label}</TableCell>)}
            <TableCell>Статус</TableCell>
            <TableCell align="right">Дії</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => {
            const active = r.isActive !== false;
            return (
              <TableRow key={r.id} sx={{ opacity: active ? 1 : 0.55 }}>
                {columns.map((c) => <TableCell key={c.key}>{String(r[c.key] ?? '—')}</TableCell>)}
                <TableCell>
                  <Chip
                    label={active ? 'Активний' : 'Неактивний'}
                    size="small"
                    color={active ? 'success' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => onEdit(r)}>Ред.</Button>
                  {active && canDelete && onDelete && (
                    <Tooltip title="Видалити">
                      <IconButton size="small" color="error" onClick={() => onDelete(r)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {active && onDeactivate && (
                    <Button size="small" color="warning" onClick={() => onDeactivate(r)}>
                      Вимк.
                    </Button>
                  )}
                  {!active && onReactivate && (
                    <Button size="small" color="success" onClick={() => onReactivate(r)}>
                      Увімк.
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </ScrollableTable>
    </ContentCard>
  );
}
