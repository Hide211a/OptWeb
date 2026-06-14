import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TableBody, TableCell, TableHead, TableRow, Chip, Button, Typography,
} from '@mui/material';
import api from '../api/client';
import { PageHeader } from '../components/PageHeader';
import { ContentCard } from '../components/ui/ContentCard';
import { ScrollableTable } from '../components/ui/ScrollableTable';
import { DirectorViewAlert } from '../components/ui/DirectorViewAlert';
import { useAuth } from '../context/AuthContext';
import { directorTokens } from '../theme/directorTheme';
import { alpha } from '@mui/material/styles';
import { hideOnMobile, hideOnXs } from '../utils/tableResponsive';
import type { Customer } from '../types';

type CustomerRow = Customer & { shipmentCount?: number };

export function CustomersPage() {
  const { user } = useAuth();
  const isDirector = user?.role === 'DIRECTOR';

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await api.get<CustomerRow[]>('/directories/customers')).data,
  });

  const active = customers.filter((c) => c.isActive !== false);
  const mutedText = isDirector ? alpha(directorTokens.text, 0.5) : 'text.secondary';

  return (
    <>
      <PageHeader
        title="Оптові клієнти"
        subtitle="B2B-контрагенти — історія реалізації та оборот по кожному клієнту"
        crumbs={[{ label: 'Клієнти' }]}
        dark={isDirector}
      />

      {isDirector && (
        <DirectorViewAlert>
          Аналітика оптових клієнтів — режим перегляду для керівника.
        </DirectorViewAlert>
      )}

      <ContentCard noPadding dark={isDirector}>
        {isLoading ? (
          <Typography sx={{ color: mutedText }} p={3}>Завантаження…</Typography>
        ) : (
          <ScrollableTable minWidth={720} compactMinWidth={320}>
            <TableHead>
              <TableRow>
                <TableCell>Назва</TableCell>
                <TableCell sx={hideOnXs}>ЄДРПОУ</TableCell>
                <TableCell sx={hideOnMobile}>Телефон</TableCell>
                <TableCell align="right">Реалізацій</TableCell>
                <TableCell sx={hideOnXs}>Статус</TableCell>
                <TableCell align="right">Дії</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {active.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{c.name}</TableCell>
                  <TableCell sx={hideOnXs}>{c.edrpou ?? '—'}</TableCell>
                  <TableCell sx={hideOnMobile}>{c.phone ?? '—'}</TableCell>
                  <TableCell align="right">{c.shipmentCount ?? 0}</TableCell>
                  <TableCell sx={hideOnXs}>
                    <Chip label="Активний" size="small" color="success" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" component={Link} to={`/customers/${c.id}`}>
                      Картка
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </ScrollableTable>
        )}
      </ContentCard>
    </>
  );
}
