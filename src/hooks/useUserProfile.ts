import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface UserProfile {
  id: string;
  user_id: string;
  cnpj: string;
  responsible_name: string;
  phone: string;
  razao_social: string;
  nome_fantasia: string;
  endereco: string;
  site: string;
  two_factor_enabled: boolean;
  two_factor_method: string;
  created_at: string;
  updated_at: string;
}

export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      setProfile(data);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: 'Usuário não autenticado' };

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar perfil';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      // First verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword
      });

      if (verifyError) {
        return { error: 'Senha atual incorreta' };
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar senha';
      return { error: errorMessage };
    }
  };

  const enableTwoFactor = async (method: 'email' | 'sms') => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      const { error } = await updateProfile({
        two_factor_enabled: true,
        two_factor_method: method
      });

      if (error) throw new Error(error);

      // Here you would typically send a verification code
      // For now, we'll just simulate it
      return { error: null, message: `Código de verificação enviado via ${method}` };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao ativar 2FA';
      return { error: errorMessage };
    }
  };

  const disableTwoFactor = async () => {
    if (!user) return { error: 'Usuário não autenticado' };

    try {
      const { error } = await updateProfile({
        two_factor_enabled: false,
        two_factor_method: 'email'
      });

      if (error) throw new Error(error);

      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao desativar 2FA';
      return { error: errorMessage };
    }
  };

  return {
    profile,
    loading,
    error,
    loadProfile,
    updateProfile,
    updatePassword,
    enableTwoFactor,
    disableTwoFactor
  };
};