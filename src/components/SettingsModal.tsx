import React, { useState, useEffect } from 'react';
import { X, Building2, Save, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { profile, updateProfile, updatePassword, enableTwoFactor, disableTwoFactor } = useUserProfile();

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    cnpj: '', responsible_name: '', phone: '',
    razao_social: '', nome_fantasia: '', endereco: '', site: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false, new: false, confirm: false
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        cnpj: profile.cnpj || '',
        responsible_name: profile.responsible_name || '',
        phone: profile.phone || '',
        razao_social: profile.razao_social || '',
        nome_fantasia: profile.nome_fantasia || '',
        endereco: profile.endereco || '',
        site: profile.site || ''
      });
    }
  }, [profile]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  const handleSaveProfile = async () => {
    setSaving(true); setMessage(null);
    try {
      const { error } = await updateProfile(formData);
      setMessage(error ? { type: 'error', text: error } : { type: 'success', text: 'Perfil atualizado!' });
    } catch { setMessage({ type: 'error', text: 'Erro ao salvar perfil' }); }
    finally { setSaving(false); }
  };

  const handleUpdatePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem' }); return;
    }
    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Senha deve ter pelo menos 6 caracteres' }); return;
    }
    setSaving(true); setMessage(null);
    try {
      const { error } = await updatePassword(passwordData.currentPassword, passwordData.newPassword);
      if (error) { setMessage({ type: 'error', text: error }); }
      else { setMessage({ type: 'success', text: 'Senha atualizada!' }); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }
    } catch { setMessage({ type: 'error', text: 'Erro ao atualizar senha' }); }
    finally { setSaving(false); }
  };

  const handleToggleTwoFactor = async (method: 'email' | 'sms') => {
    setSaving(true); setMessage(null);
    try {
      if (profile?.two_factor_enabled) {
        const { error } = await disableTwoFactor();
        setMessage(error ? { type: 'error', text: error } : { type: 'success', text: '2FA desativado' });
      } else {
        const { error, message: msg } = await enableTwoFactor(method);
        setMessage(error ? { type: 'error', text: error } : { type: 'success', text: msg || '2FA ativado' });
      }
    } catch { setMessage({ type: 'error', text: 'Erro ao alterar 2FA' }); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelCls = "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1";
  const sectionCls = "bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4";

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[360px] z-50 flex flex-col bg-white dark:bg-gray-800 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Configurações</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* Message */}
          {message && (
            <div className={`mb-4 px-3 py-2 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
              {message.text}
            </div>
          )}

          {/* Company Info */}
          <div className={sectionCls}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Informações da Empresa
            </h3>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>CNPJ</label>
                <input className={inputCls} value={formData.cnpj} onChange={e => setFormData(f => ({ ...f, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <label className={labelCls}>Razão Social</label>
                <input className={inputCls} value={formData.razao_social} onChange={e => setFormData(f => ({ ...f, razao_social: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Nome Fantasia</label>
                <input className={inputCls} value={formData.nome_fantasia} onChange={e => setFormData(f => ({ ...f, nome_fantasia: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Site</label>
                <input className={inputCls} value={formData.site} onChange={e => setFormData(f => ({ ...f, site: e.target.value }))} placeholder="https://" />
              </div>
              <div>
                <label className={labelCls}>Endereço</label>
                <input className={inputCls} value={formData.endereco} onChange={e => setFormData(f => ({ ...f, endereco: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Responsible */}
          <div className={sectionCls}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Responsável
            </h3>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Nome do Responsável</label>
                <input className={inputCls} value={formData.responsible_name} onChange={e => setFormData(f => ({ ...f, responsible_name: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Telefone</label>
                <input className={inputCls} value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input className={inputCls} value={user?.email || ''} disabled />
              </div>
            </div>
          </div>

          {/* Save profile */}
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-4"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Perfil'}
          </button>

          {/* Password */}
          <div className={sectionCls}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Lock className="w-4 h-4" /> Alterar Senha
            </h3>
            <div className="space-y-3">
              {(['current', 'new', 'confirm'] as const).map(key => {
                const labels = { current: 'Senha Atual', new: 'Nova Senha', confirm: 'Confirmar Nova Senha' };
                const fields = { current: 'currentPassword', new: 'newPassword', confirm: 'confirmPassword' } as const;
                return (
                  <div key={key}>
                    <label className={labelCls}>{labels[key]}</label>
                    <div className="relative">
                      <input
                        type={showPasswords[key] ? 'text' : 'password'}
                        className={inputCls + ' pr-9'}
                        value={passwordData[fields[key]]}
                        onChange={e => setPasswordData(p => ({ ...p, [fields[key]]: e.target.value }))}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(p => ({ ...p, [key]: !p[key] }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showPasswords[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleUpdatePassword}
              disabled={saving}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              {saving ? 'Atualizando...' : 'Atualizar Senha'}
            </button>
          </div>

          {/* 2FA */}
          <div className={sectionCls}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Autenticação de Dois Fatores
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {profile?.two_factor_enabled ? 'Autenticação de dois fatores está ativa.' : 'Adicione uma camada extra de segurança.'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleToggleTwoFactor('email')}
                disabled={saving}
                className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  profile?.two_factor_enabled
                    ? 'border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                } disabled:opacity-50`}
              >
                {profile?.two_factor_enabled ? 'Desativar 2FA' : 'Ativar via Email'}
              </button>
              {!profile?.two_factor_enabled && (
                <button
                  onClick={() => handleToggleTwoFactor('sms')}
                  disabled={saving}
                  className="flex-1 py-2 text-xs font-medium rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
                >
                  Ativar via SMS
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};
