import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getCached, setCached, invalidateCache } from './useCache';
import { useAuth } from './useAuth';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  paidUsers: number;
  freeUsers: number;
  expiredUsers: number;
}

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  cnpj: string;
  responsible_name: string;
  phone: string;
  razao_social: string;
  nome_fantasia: string;
  endereco: string;
  site: string;
  is_admin: boolean;
  is_active: boolean;
  subscription_status: string;
  subscription_expires_at: string | null;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialCategory {
  id: string;
  channel: string;
  channel_group: string;
  channel_category: string;
  erp_parent_category: string;
  erp_category: string;
  category_type: string;
  deducted: string;
  invoice: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialAccount {
  id: string;
  canal: string;
  caixa: string;
  fornecedor_nome_fantasia: string;
  fornecedor_razao_social: string;
  fornecedor_cnpj: string;
  created_at: string;
  updated_at: string;
}

// Verificação de admin compartilhada entre todas as instâncias do hook (1 requisição por usuário)
const _adminCheck = new Map<string, Promise<boolean>>();

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Check if current user is admin
  useEffect(() => {
    if (user) {
      checkAdminStatus();
    } else {
      setIsAdmin(false);
      setLoading(false);
    }
  }, [user?.id]);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    let pending = _adminCheck.get(user.id);
    if (!pending) {
      pending = fetchAdminStatus();
      _adminCheck.set(user.id, pending);
      pending.catch(() => _adminCheck.delete(user.id));
    }
    const admin = await pending.catch(() => false);
    setIsAdmin(admin);
    setLoading(false);
  };

  const fetchAdminStatus = async (): Promise<boolean> => {
    if (!user) return false;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('is_admin, responsible_name')
      .eq('user_id', user.id)
      .single();

    if (!error) return data?.is_admin || false;
    if (error.code !== 'PGRST116') throw error;

    // Sem perfil ainda: cria um
    const isAdminEmail = user.email === 'admin@feex.com.br';
    const { error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: user.id,
        is_admin: isAdminEmail,
        responsible_name: isAdminEmail ? 'Administrador' : 'Usuário'
      });
    if (insertError && insertError.code !== '23505') throw insertError;
    return isAdminEmail;
  };

  const getAdminStats = async (): Promise<AdminStats> => {
    if (!isAdmin) throw new Error('Acesso negado');

    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*');

    if (error) throw error;

    const now = new Date();
    const stats: AdminStats = {
      totalUsers: profiles.length,
      activeUsers: profiles.filter(p => p.is_active).length,
      inactiveUsers: profiles.filter(p => !p.is_active).length,
      paidUsers: profiles.filter(p => p.subscription_status === 'paid').length,
      freeUsers: profiles.filter(p => p.subscription_status === 'free').length,
      expiredUsers: profiles.filter(p => 
        p.subscription_expires_at && new Date(p.subscription_expires_at) < now
      ).length,
    };

    return stats;
  };

  const getAllUsers = async (): Promise<UserProfile[]> => {
    if (!isAdmin) throw new Error('Acesso negado');

    // Get user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) throw profilesError;

    // Get auth users data
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      // Fallback: return profiles without email data
      return profiles.map(profile => ({
        ...profile,
        email: 'Email não disponível'
      }));
    }

    // Combine the data
    const users: UserProfile[] = profiles.map(profile => {
      const authUser = authData.users.find(u => u.id === profile.user_id);
      return {
        ...profile,
        email: authUser?.email || 'Email não disponível',
      };
    });

    return users;
  };

  const updateUser = async (userId: string, updates: Partial<UserProfile>) => {
    if (!isAdmin) throw new Error('Acesso negado');

    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('user_id', userId);

    if (error) throw error;
  };

  const deleteUser = async (userId: string) => {
    if (!isAdmin) throw new Error('Acesso negado');

    // Delete from auth.users (this will cascade to user_profiles)
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) throw error;
  };

  // Updated getCategories function - now available to all authenticated users
  const getCategories = async (): Promise<FinancialCategory[]> => {
    console.log('Fetching categories...');
    
    const { data, error } = await supabase
      .from('financial_categories')
      .select('*')
      .order('channel', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }

    console.log('Categories fetched successfully:', data?.length || 0, 'records');
    return data || [];
  };

  const createCategory = async (category: Omit<FinancialCategory, 'id' | 'created_at' | 'updated_at'>) => {

    const { data, error } = await supabase
      .from('financial_categories')
      .insert(category)
      .select()
      .single();

    if (error) throw error;

    return data;
  };

  const updateCategory = async (id: string, updates: Partial<FinancialCategory>) => {
    if (!isAdmin) throw new Error('Acesso negado');

    const { error } = await supabase
      .from('financial_categories')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  };

  const deleteCategory = async (id: string) => {
    if (!isAdmin) throw new Error('Acesso negado');

    const { error } = await supabase
      .from('financial_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  };

  // Updated getAccounts function - now available to all authenticated users
  const getAccounts = async (): Promise<FinancialAccount[]> => {
    console.log('Fetching accounts...');
    
    const { data, error } = await supabase
      .from('financial_accounts')
      .select('*')
      .order('canal', { ascending: true });

    if (error) {
      console.error('Error fetching accounts:', error);
      throw error;
    }

    console.log('Accounts fetched successfully:', data?.length || 0, 'records');
    return data || [];
  };

  const createAccount = async (account: Omit<FinancialAccount, 'id' | 'created_at' | 'updated_at'>) => {

    const { data, error } = await supabase
      .from('financial_accounts')
      .insert(account)
      .select()
      .single();

    if (error) throw error;

    return data;
  };

  const updateAccount = async (id: string, updates: Partial<FinancialAccount>) => {
    if (!isAdmin) throw new Error('Acesso negado');

    const { error } = await supabase
      .from('financial_accounts')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  };

  const deleteAccount = async (id: string) => {
    if (!isAdmin) throw new Error('Acesso negado');

    const { error } = await supabase
      .from('financial_accounts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  };

  return {
    isAdmin,
    loading,
    error,
    getAdminStats,
    getAllUsers,
    updateUser,
    deleteUser,
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
  };
};