'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AnalyticsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard?tab=analytics');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent" />
        <span className="text-xs text-gray-500 font-medium">Opening Analytics...</span>
      </div>
    </div>
  );
}
