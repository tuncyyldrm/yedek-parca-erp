import { supabase } from '@/lib/supabase';
import { ProductModal } from '@/components/ProductModal';
import { SearchInput } from '@/components/SearchInput';
import { ViewSwitcher } from '@/components/ViewSwitcher'; // YENİ İMPORT
import Link from 'next/link';

interface StokPageProps {
  searchParams: Promise<{ q?: string; view?: string }>;
}

export default async function StokPage({ searchParams }: StokPageProps) {
  const resolvedParams = await searchParams;
  const query = resolvedParams.q || '';
  const view = resolvedParams.view || 'list';

// 1. Veri Çekme - Kategori, SKU ve Ad sıralaması eklendi
  let sbQuery = supabase.from('products').select('*').eq('is_deleted', false);
  if (query) {
    sbQuery = sbQuery.or(`name.ilike.%${query}%,sku.ilike.%${query}%,oem_code.ilike.%${query}%,category.ilike.%${query}%,brand.ilike.%${query}%`);
  }

// 1. Kategori (A-Z), 2. Stok Kodu (A-Z), 3. Ürün Adı (A-Z)
const { data: rawProducts } = await sbQuery
  .order('category', { ascending: true })
  .order('sku', { ascending: true })
  .order('name', { ascending: true });
  const products = rawProducts || [];

  // 2. İstatistik Hesaplamaları
  const stats = {
    totalItems: products.length,
    criticalItems: products.filter(p => p.stock_count <= (p.critical_limit || 5)).length,
    totalQuantity: products.reduce((acc, p) => acc + (p.stock_count || 0), 0),
    totalValue: products.reduce((acc, p) => acc + ((p.purchase_price || 0) * (p.stock_count || 0)), 0),
    avgMargin: products.length 
      ? (products.reduce((acc, p) => {
          const margin = p.purchase_price > 0 ? ((p.sell_price - p.purchase_price) / p.purchase_price * 100) : 0;
          return acc + margin;
        }, 0) / products.length).toFixed(1)
      : "0"
  };


  
  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto text-slate-900 font-sans min-h-screen bg-[#F8FAFC]">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-2 bg-blue-600 rounded-full italic shadow-[0_0_15px_rgba(37,99,235,0.4)]"></div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic text-slate-900">
              Envanter <span className="text-blue-600">&</span> Depo
            </h1>
          </div>
          <p className="text-slate-500 text-sm font-medium italic ml-5">
            Memonex ERP Systems • <span className="text-slate-900 font-bold px-2 bg-slate-200/50 rounded">Isparta Merkez</span>
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="flex-1 sm:min-w-[300px]">
            <SearchInput defaultValue={query} />
          </div>
          <ProductModal trigger={
            <button className="bg-slate-900 hover:bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2 group">
              <span className="text-xl group-hover:rotate-90 transition-transform">+</span> Yeni Parça Tanımla
            </button>
          } />
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
        <StatBox title="Çeşit" value={stats.totalItems} sub="Aktif Ürün" />
        <StatBox title="Kritik" value={stats.criticalItems} sub="Acil Tedarik" variant={stats.criticalItems > 0 ? "danger" : "default"} />
        <StatBox title="Toplam Adet" value={stats.totalQuantity.toLocaleString('tr-TR')} sub="Stok Mevcudu" variant="blue" />
        <StatBox title="Envanter Değeri" value={`${stats.totalValue.toLocaleString('tr-TR')} TL`} sub={`Ort. Kar: %${stats.avgMargin}`} variant="dark" />
      </div>

{/* GÖRÜNÜM SEÇİCİ BÖLÜMÜ - DEĞİŞTİ */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 italic">
          {view === 'grid' ? 'Katalog Görünümü' : 'Liste Görünümü'}
        </h3>
        
        <ViewSwitcher /> {/* HATA VEREN LİNKLERİN YERİNE GELDİ */}
      </div>

      {/* MAIN CONTENT */}
      {view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[32px] md:rounded-[48px] overflow-hidden shadow-xl shadow-slate-200/50">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Parça Bilgisi</th>
                  <th className="p-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Konum</th>
                  <th className="p-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Stok</th>
                  <th className="p-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fiyatlandırma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {products.map((p) => <ProductRow key={p.id} p={p} />)}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-slate-100">
            {products.map((p) => <MobileProductCard key={p.id} p={p} />)}
          </div>
        </div>
      )}

      {products.length === 0 && (
        <div className="py-20 text-center space-y-3">
          <div className="text-4xl">🔍</div>
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs italic">Sonuç bulunamadı</p>
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---

function StatBox({ title, value, sub, variant = "default" }: any) {
  const styles: any = {
    default: "bg-white border-slate-200 text-slate-900",
    danger: "bg-red-50 border-red-100 text-red-600 shadow-red-100/50 shadow-lg",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    dark: "bg-slate-900 border-slate-800 text-white shadow-slate-900/20 shadow-xl"
  };
  return (
    <div className={`p-6 rounded-[24px] md:rounded-[32px] border-2 transition-all hover:scale-[1.02] ${styles[variant]}`}>
      <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block mb-1">{title}</span>
      <p className="text-3xl font-black tracking-tighter italic">{value}</p>
      <span className="text-[10px] font-bold uppercase opacity-80">{sub}</span>
    </div>
  );
}

function ProductRow({ p }: { p: any }) {
  const isCritical = (p.stock_count || 0) <= (p.critical_limit || 5);
  const taxRate = p.tax_rate || 20;
  const sellPriceWithTax = p.sell_price * (1 + taxRate / 100);

  return (
    <tr className={`group transition-all hover:bg-blue-50/50 border-b border-slate-50 ${isCritical ? 'bg-red-50/10' : ''}`}>
      <td>
        <Link href={`/stok/hareketler/${p.id}`} className="flex items-center gap-4 p-6 w-full h-full">
          <div className="w-14 h-14 shrink-0 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200 group-hover:border-blue-500 transition-all shadow-sm">
            {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-[10px] font-black italic text-slate-400">{p.sku?.substring(0, 2)}</span>}
          </div>
          <div>
            <div className="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase italic leading-none">{p.name}</div>
            <div className="flex gap-2 mt-2">
              <span className="text-[9px] font-black text-blue-600 bg-blue-100/50 px-1.5 py-0.5 rounded">{p.sku}</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{p.brand}</span>
            </div>
          </div>
        </Link>
      </td>
      <td className="p-6 text-center pointer-events-none text-[11px] font-black uppercase text-slate-600 italic">{p.shelf_no || '---'}</td>
      <td className="p-6 text-center pointer-events-none font-black text-xl italic">{p.stock_count || 0}</td>
      <td className="p-6 text-right pointer-events-none">
        <div className="text-lg font-black text-slate-900 italic leading-none">{p.sell_price?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</div>
        <div className="text-[10px] font-bold text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded-md mt-2 italic">{sellPriceWithTax.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</div>
      </td>
    </tr>
  );
}

function ProductCard({ p }: { p: any }) {
  const isCritical = (p.stock_count || 0) <= (p.critical_limit || 5);
  const taxRate = p.tax_rate || 20;
  const sellPriceWithTax = p.sell_price * (1 + taxRate / 100);

  return (
    <Link href={`/stok/hareketler/${p.id}`} className="group bg-white border-2 border-slate-100 rounded-[40px] p-5 transition-all hover:border-blue-600 hover:shadow-2xl hover:shadow-blue-200/50 flex flex-col h-full">
      <div className="aspect-square w-full bg-slate-50 rounded-[32px] overflow-hidden border border-slate-100 mb-5 relative">
        {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-slate-300 font-black italic text-4xl bg-slate-100 uppercase">{p.sku?.substring(0, 2)}</div>}
        <div className={`absolute top-4 right-4 px-4 py-2 rounded-2xl font-black text-[10px] tracking-widest shadow-lg ${isCritical ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-900 text-white'}`}>{p.stock_count} ADET</div>
      </div>
      <div className="flex-1 space-y-2 px-2">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md">{p.sku}</span>
          <span className="text-[9px] font-bold text-slate-400 uppercase italic">{p.shelf_no || 'RAFSİZ'}</span>
        </div>
        <h3 className="font-black text-lg text-slate-900 leading-tight uppercase italic">{p.name}</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{p.brand}</p>
      </div>
      <div className="mt-6 pt-4 border-t border-slate-50 flex items-end justify-between px-2">
        <div>
          <span className="block text-[8px] font-black text-slate-400 uppercase">Fiyat</span>
          <span className="text-xl font-black text-slate-900 italic leading-none">{p.sell_price?.toLocaleString('tr-TR')} TL</span>
        </div>
        <div className="text-right">
          <span className="block text-[8px] font-black text-blue-400 uppercase italic">Brüt</span>
          <span className="text-[11px] font-bold text-blue-600">{sellPriceWithTax.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</span>
        </div>
      </div>
    </Link>
  );
}

function MobileProductCard({ p }: { p: any }) {
  const isCritical = (p.stock_count || 0) <= (p.critical_limit || 5);
  const taxRate = p.tax_rate || 20;
  const sellPriceWithTax = p.sell_price * (1 + taxRate / 100);

  return (
    <Link href={`/stok/hareketler/${p.id}`} className={`block p-6 active:bg-slate-50 border-b border-slate-100 ${isCritical ? 'bg-red-50/20' : 'bg-white'}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-4">
          <div className="w-16 h-16 shrink-0 bg-white border border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden">
             {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <span className="font-black italic text-xs text-slate-400 uppercase">{p.sku?.substring(0, 2)}</span>}
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-base uppercase italic text-slate-900 leading-tight">{p.name}</h4>
            <p className="text-[10px] font-bold text-slate-400">{p.sku} • {p.brand}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-base font-black text-slate-900 leading-none">{p.sell_price?.toLocaleString('tr-TR')} TL</div>
          <div className="text-[9px] font-bold text-blue-600 mt-2 italic">{sellPriceWithTax.toLocaleString('tr-TR')} TL (BRÜT)</div>
        </div>
      </div>
      <div className="flex items-center justify-between bg-slate-50/50 p-4 rounded-2xl border border-slate-100 italic">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Mevcut Stok</span>
            <span className={`font-black text-2xl ${isCritical ? 'text-red-600' : 'text-slate-900'}`}>{p.stock_count}</span>
          </div>
          <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest italic">DETAY <span className="text-lg">→</span></div>
      </div>
    </Link>
  );
}