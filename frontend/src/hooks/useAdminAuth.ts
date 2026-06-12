import { useContext } from 'react';
import { AdminAuthContext } from '../contexts/AdminAuthContext';

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth deve ser usado dentro de AdminAuthProvider');
  }
  return context;
}
