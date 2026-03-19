'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation'; // useRouter eklendi
import { useEffect } from 'react';

export function ViewSwitcher() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const query = searchParams.get('q') || '';
  const currentView = searchParams.get('view'); // Varsayılanı burada vermiyoruz

  // HAFIZA KONTROLÜ: Sayfa ilk açıldığında çalışır
  useEffect(() => {
    const savedView = localStorage.getItem('memonex_view');
    
    // Eğer URL'de bir view yoksa ama hafızada varsa, oraya yönlendir
    if (!currentView && savedView) {
      const params = new URLSearchParams(window.location.search);
      params.set('view', savedView);
      router.replace(`?${params.toString()}`);
    }
  }, [currentView, router]);

  const setView = (view: string) => {
    localStorage.setItem('memonex_view', view);
  };

  // UI için varsayılanı 'list' kabul et
  const activeView = currentView || 'list';

  return (
    <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200">
      <Link
        href={`?q=${query}&view=list`}
        onClick={() => setView('list')}
        className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${
          activeView === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        LİSTE
      </Link>
      <Link
        href={`?q=${query}&view=grid`}
        onClick={() => setView('grid')}
        className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${
          activeView === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        KATALOG
      </Link>
    </div>
  );
}