import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

export async function getFormations(
  page = 1,
  pageSize = 500,
  filters: Record<string, any> = {},
  sortBy?: string,
  sortDirection?: 'asc' | 'desc'
) {
  let query = supabase
    .from('formation_list')
    .select('*', { count: 'exact' });

  // Build filter conditions
  let filterQuery = query;

  // Handle search filter
  if (filters.search) {
    filterQuery = filterQuery.or(`etablissement.ilike.%${filters.search}%,filiere.ilike.%${filters.search}%,ville.ilike.%${filters.search}%`);
  }

  // Handle type filters (BTS, BUT, etc.) and "autres" filter
  const typeConditions = [];
  if (filters.type && filters.type.length > 0) {
    typeConditions.push(...filters.type.map(type => `voie.eq.${type}`));
  }
  if (filters.autre) {
    typeConditions.push(`voie.eq.${filters.autre}`);
  }
  if (typeConditions.length > 0) {
    filterQuery = filterQuery.or(typeConditions.join(','));
  }

  // Handle departement filter
  if (filters.departement) {
    filterQuery = filterQuery.eq('departement', filters.departement);
  }

  // Handle ville filter
  if (filters.ville) {
    filterQuery = filterQuery.eq('ville', filters.ville);
  }

  // Apply pagination
  filterQuery = filterQuery.range((page - 1) * pageSize, page * pageSize - 1);

  // Apply sorting if present
  if (sortBy) {
    filterQuery = filterQuery.order(sortBy, { ascending: sortDirection === 'asc' });
  }

  const { data, error, count } = await filterQuery;

  if (error) {
    console.error('Error fetching formations:', error);
    throw error;
  }

  return { data, count };
}

export async function getFormationById(id: number) {
  const { data: formationData, error: formationError } = await supabase
    .from('formation_list')
    .select('*')
    .eq('id', id)
    .single();

  if (formationError) {
    console.error('Error fetching formation:', formationError);
    throw formationError;
  }

  return formationData;
}

export async function getUserTokens() {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    return 0;
  }
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('tokens')
    .eq('user_id', user.user.id)
    .single();

  if (error) {
    console.error('Error fetching user tokens:', error);
    return 0;
  }

  return data?.tokens || 0;
}