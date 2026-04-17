import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types';

export const authService = {
  /**
   * Obtiene el perfil del usuario desde la tabla 'profiles'
   */
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Cierra la sesion actual
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Obtiene el usuario actual y su perfil
   */
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    try {
      const profile = await this.getProfile(user.id);
      return {
        id: user.id,
        email: user.email || '',
        name: profile.nombre_completo,
        role: profile.rol as UserRole,
        avatarUrl: profile.avatar_url,
      };
    } catch (e) {
      console.error('Error fetching profile:', e);
      return null;
    }
  }
};
