import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import { useAuth } from '../context/AuthContext';
import './login.css';

const demoAccounts = [
  { role: 'Менеджер', email: 'manager@optsklad.ua', color: '#059669', icon: WorkOutlineOutlinedIcon },
  { role: 'Адмін', email: 'admin@optsklad.ua', color: '#7c3aed', icon: AdminPanelSettingsOutlinedIcon },
  { role: 'Керівник', email: 'director@optsklad.ua', color: '#d97706', icon: DashboardOutlinedIcon },
];

export function LoginPage() {
  const [email, setEmail] = useState('manager@optsklad.ua');
  const [password, setPassword] = useState('demo123');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка входу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-v2">
      <div className="login-v2__slant" aria-hidden />
      <div className="login-v2__boxes" aria-hidden>
        <div className="login-v2__box" />
        <div className="login-v2__box" />
        <div className="login-v2__box" />
      </div>

      <div className="login-v2__grid">
        <section className="login-v2__brand">
          <div className="login-v2__eyebrow">
            <span className="login-v2__eyebrow-dot" />
            Система оптової торгівлі
          </div>

          <h1 className="login-v2__title">
            Опт
            <span className="login-v2__title-accent">Склад</span>
          </h1>

          <p className="login-v2__lead">
            Облік партій, термінів придатності, відвантажень B2B-клієнтам і аналітика для керівника — без Excel і паперових журналів.
          </p>

          <div className="login-v2__pills">
            <span className="login-v2__pill">FEFO-списання</span>
            <span className="login-v2__pill">Партійний склад</span>
            <span className="login-v2__pill">Звіти CSV</span>
          </div>
        </section>

        <section className="login-v2__panel">
          <div className="login-v2__panel-head">
            <h2>Вхід</h2>
            <p>Обліковий запис працівника бази</p>
          </div>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              className="login-v2__field"
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon sx={{ fontSize: 20, color: '#047857', opacity: 0.65 }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              className="login-v2__field"
              fullWidth
              label="Пароль"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ fontSize: 20, color: '#047857', opacity: 0.65 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowPass(!showPass)}
                      edge="end"
                      aria-label="Показати пароль"
                    >
                      {showPass ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              className="login-v2__submit"
              fullWidth
              type="submit"
              variant="contained"
              disableElevation
              disabled={loading}
            >
              {loading ? 'Зачекайте…' : 'Увійти →'}
            </Button>
          </form>

          <p className="login-v2__demos-label">Демо · demo123</p>
          <div className="login-v2__demos">
            {demoAccounts.map((a) => {
              const Icon = a.icon;
              const active = email === a.email;
              return (
                <button
                  key={a.email}
                  type="button"
                  className={`login-v2__demo${active ? ' login-v2__demo--active' : ''}`}
                  style={{ '--demo-color': a.color } as React.CSSProperties}
                  onClick={() => {
                    setEmail(a.email);
                    setPassword('demo123');
                    setError('');
                  }}
                >
                  <span className="login-v2__demo-icon">
                    <Icon sx={{ fontSize: 20 }} />
                  </span>
                  <span className="login-v2__demo-name">{a.role}</span>
                </button>
              );
            })}
          </div>

          <p className="login-v2__footer-note">
            Продовольчі товари · оптова реалізація · бакалаврський проєкт
          </p>
        </section>
      </div>
    </div>
  );
}
