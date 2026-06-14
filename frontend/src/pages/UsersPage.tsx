import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TableBody, TableCell, TableHead, TableRow, Button, Dialog,
  DialogTitle, DialogContent, TextField, MenuItem, Chip, IconButton, Tooltip, Switch, FormControlLabel, Typography,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { ContentCard } from '../components/ui/ContentCard';
import { ScrollableTable } from '../components/ui/ScrollableTable';
import { roleLabels } from '../utils/labels';
import { hideOnXs } from '../utils/tableResponsive';
import { useAuth } from '../context/AuthContext';
import type { User, Role } from '../types';

type UserRow = User & { isActive: boolean; createdAt?: string };

const emptyForm = { email: '', password: '', fullName: '', role: 'MANAGER' as Role, isActive: true };

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [newPassword, setNewPassword] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<UserRow[]>('/users')).data,
  });

  const save = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        email: form.email,
        fullName: form.fullName,
        role: form.role,
        isActive: form.isActive,
      };
      if (newPassword) body.password = newPassword;
      if (editId) return api.put(`/users/${editId}`, body);
      if (!form.password) throw new Error('Пароль обовʼязковий для нового користувача');
      return api.post('/users', { ...body, password: form.password });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['workspace-admin'] });
      closeDialog();
    },
  });

  const closeDialog = () => {
    setOpen(false);
    setEditId(null);
    setForm(emptyForm);
    setNewPassword('');
  };

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setNewPassword('');
    setOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditId(u.id);
    setForm({
      email: u.email,
      password: '',
      fullName: u.fullName,
      role: u.role,
      isActive: u.isActive,
    });
    setNewPassword('');
    setOpen(true);
  };

  const isSelf = editId === currentUser?.id;

  return (
    <>
      <PageHeader
        title="Команда"
        subtitle="Облікові записи працівників та розмежування прав"
        action={<Button variant="contained" onClick={openCreate}>Додати користувача</Button>}
      />
      <ContentCard noPadding>
        <ScrollableTable minWidth={680} compactMinWidth={300}>
          <TableHead>
            <TableRow>
              <TableCell>ПІБ</TableCell>
              <TableCell sx={hideOnXs}>Email</TableCell>
              <TableCell>Роль</TableCell>
              <TableCell sx={hideOnXs}>Статус</TableCell>
              <TableCell align="right">Дії</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>
                  {u.fullName}
                  <Typography variant="caption" display="block" sx={{ display: { xs: 'block', sm: 'none' }, color: 'text.secondary' }}>
                    {u.email}
                  </Typography>
                </TableCell>
                <TableCell sx={hideOnXs}>{u.email}</TableCell>
                <TableCell>
                  <Chip label={roleLabels[u.role]} size="small" variant="outlined" />
                </TableCell>
                <TableCell sx={hideOnXs}>
                  <Chip
                    label={u.isActive ? 'Активний' : 'Неактивний'}
                    size="small"
                    color={u.isActive ? 'success' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Редагувати">
                    <IconButton size="small" onClick={() => openEdit(u)}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </ScrollableTable>
      </ContentCard>

      <Dialog open={open} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Редагування користувача' : 'Новий користувач'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="ПІБ" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          {!editId && (
            <TextField
              label="Пароль"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              helperText="Мінімум 6 символів"
            />
          )}
          {editId && (
            <TextField
              label="Новий пароль"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="Залиште порожнім, якщо не змінюєте"
            />
          )}
          <TextField
            select
            label="Роль"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            disabled={isSelf}
          >
            {Object.entries(roleLabels).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Switch
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                disabled={isSelf}
              />
            }
            label="Активний обліковий запис"
          />
          {isSelf && (
            <Typography variant="caption" color="text.secondary">
              Власний акаунт: не можна змінити роль або деактивувати себе.
            </Typography>
          )}
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
    </>
  );
}
