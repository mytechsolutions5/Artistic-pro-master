'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { getUserRole, getEmployeeAllowedSections } from '@/src/utils/adminUtils';

export default function AdminRootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/sign-in');
      return;
    }

    const role = getUserRole(user);
    if (role === 'admin') {
      router.replace('/admin/dashboard');
      return;
    }

    if (role === 'employee') {
      const allowed = getEmployeeAllowedSections(user);
      if (allowed.includes('dashboard')) {
        router.replace('/admin/dashboard');
      } else if (allowed.length > 0) {
        // Redirect to employee's first assigned operational tab
        router.replace(`/admin/${allowed[0]}`);
      } else {
        router.replace('/admin/dashboard');
      }
      return;
    }

    // Default fallback
    router.replace('/admin/dashboard');
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
        <span className="text-xs text-gray-500 font-medium">Entering Admin Portal...</span>
      </div>
    </div>
  );
}
