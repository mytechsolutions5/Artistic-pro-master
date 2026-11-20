'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewsletterRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/marketing?tab=newsletter');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-800 border-t-transparent" />
        <span className="text-xs text-gray-500 font-medium">Opening Newsletter...</span>
      </div>
    </div>
  );
}
