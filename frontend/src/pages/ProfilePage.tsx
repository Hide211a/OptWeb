import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { ContentCard } from '../components/ui/ContentCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { roleLabels } from '../utils/labels';

export function ProfilePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 6) throw new Error('Новий пароль — мінімум 6 символів');
      if (newPassword !== confirmPassword) throw new Error('Паролі не збігаються');
      await api.post('/auth/change-password', { currentPassword, newPassword }, { skipToast: true });
    },
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Пароль успішно змінено', 'success');
    },
    onError: (e) => {
      showToast(e instanceof Error ? e.message : 'Помилка', 'error');
    },
  });

  if (!user) return null;

  return (
    <>
      <PageHeader
        title="Мій профіль"
        subtitle="Обліковий запис та безпека"
      />

      <ContentCard title="Дані користувача" sx={{ mb: 2, maxWidth: 480 }}>
        <Stack spacing={1}>
          <Typography><strong>ПІБ:</strong> {user.fullName}</Typography>
          <Typography><strong>Email:</strong> {user.email}</Typography>
          <Typography><strong>Роль:</strong> {roleLabels[user.role]}</Typography>
        </Stack>
      </ContentCard>

      <ContentCard title="Змінити пароль" sx={{ maxWidth: 480 }}>
        <Stack spacing={2} component="form" onSubmit={(e) => { e.preventDefault(); changePassword.mutate(); }}>
          <TextField
            type="password"
            label="Поточний пароль"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            fullWidth
          />
          <TextField
            type="password"
            label="Новий пароль"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            fullWidth
            helperText="Мінімум 6 символів"
          />
          <TextField
            type="password"
            label="Підтвердження пароля"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            fullWidth
          />
          {changePassword.error && (
            <Alert severity="error">
              {changePassword.error instanceof Error ? changePassword.error.message : 'Помилка'}
            </Alert>
          )}
          <Box>
            <Button type="submit" variant="contained" disabled={changePassword.isPending}>
              {changePassword.isPending ? 'Збереження…' : 'Зберегти пароль'}
            </Button>
          </Box>
        </Stack>
      </ContentCard>
    </>
  );
}
