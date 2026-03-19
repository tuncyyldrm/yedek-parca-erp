'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ProductModal } from '@/components/ProductModal';
import { DeleteProductButton } from '@/components/DeleteProductButton';
import { 
  ArrowLeft, 
  ExternalLink, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Hash, 
  Info 
} from 'lucide-react';

export default function UrunHareketPage() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

// fetchMovements içindeki sorguyu bu şekilde güncelledim:
const fetchMovements = useCallback(async () => {
  if (!id) return;
  setLoading(true);
  try {
    const { data: prodData } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    const { data: moveData, error: moveError } = await supabase
      .from('stock_movements')
      .select(`
        id, type, quantity, prev_stock, next_stock, description, source_type, created_at, 
        transaction_items (
          unit_price, line_total,
          transactions (id, type, doc_no, contacts (name))
        )
      `)
      .eq('product_id', id)
      .order('created_at', { ascending: false });

    if (moveError) throw moveError;

// --- KARMAŞAYI BİTİREN FİLTRELEME MANTIĞI ---
const realTransactions = (moveData || []).filter(m => {
  // 1. Durum: Bir faturaya bağlı gerçek ticaret (Alış/Satış)
  const isInvoice = m.transaction_items !== null;
  
  // 2. Durum: Manuel düzeltme (Faturası yoktur ama ADJUSTMENT veya sayım olarak işaretlenmiştir)
  // Bir önceki kodda source_type: 'ADJUSTMENT' demiştik, bunu kontrol etmek en garantisidir.
  const isAdjustment = 
    m.source_type === 'ADJUSTMENT' || 
    m.type === 'ADJUSTMENT' || 
    m.description?.toUpperCase().includes('DÜZELTME') ||
    m.description?.toUpperCase().includes('SAYIM');

  // 3. Durum: Sistem loglarını (SİSTEM/DELETE/OTOMATİK) dışarıda tut
  // Sadece gerçek, anlamlı hareketleri alıyoruz
  const isNotSystemLog = 
    !m.description?.toUpperCase().includes('SİSTEM') && 
    !m.description?.toUpperCase().includes('DELETE') &&
    m.source_type !== 'SYSTEM';

  // Sonuç: Faturası olanlar VEYA manuel düzeltmeler (Sistem logu olmayanlar)
  return (isInvoice || isAdjustment) && isNotSystemLog;
});

    if (prodData) {
      setProduct(prodData);
      setMovements(realTransactions); 
    }
  } catch (err) {
    console.error("Memonex Sistem Hatası:", err);
  } finally {
    setLoading(false);
  }
}, [id]);

  useEffect(() => { fetchMovements(); }, [fetchMovements]);

  if (loading) return <LoadingSpinner />;

  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-10 bg-white">
      <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-6">
        <Info size={48} />
      </div>
      <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Ürün Bulunamadı!</h2>
      <button 
        onClick={() => router.push('/stok')} 
        className="mt-6 bg-slate-900 text-white px-10 py-4 rounded-[20px] font-black uppercase tracking-widest text-[11px] shadow-2xl active:scale-95 transition-all"
      >
        STOK LİSTESİNE DÖN
      </button>
    </div>
  );

// Sayaçları da sadece TRANSACTION tipine göre sadeleştirdim:
const totalIn = movements
  .filter(m => m.type === 'IN')
  .reduce((acc, curr) => acc + curr.quantity, 0);

const totalOut = movements
  .filter(m => m.type === 'OUT')
  .reduce((acc, curr) => acc + Math.abs(curr.quantity), 0);

  return (
    <div className="p-4 md:p-12 max-w-[1500px] mx-auto text-slate-900 bg-[#F8FAFC] min-h-screen font-sans">
      
      {/* ÜST PANEL: NAVİGASYON */}
      <div className="flex flex-col gap-10 mb-12">
        <button 
          onClick={() => router.back()} 
          className="group flex items-center gap-4 text-slate-400 hover:text-slate-900 transition-all font-black text-[10px] uppercase tracking-[0.3em]"
        >
          <div className="w-12 h-12 rounded-[18px] border-2 border-slate-100 bg-white flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all shadow-sm">
            <ArrowLeft size={18} />
          </div>
          GERİ DÖN
        </button>

<div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-10 bg-white p-6 md:p-12 rounded-[48px] border-2 border-slate-100 shadow-xl shadow-slate-200/40">
  
  {/* ÜRÜN BİLGİ ALANI: Mobilde görsel ve metinler alt alta gelir */}
  <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 w-full lg:w-auto">
    
    {/* Ürün Görseli / SKU Avatar - Mobilde ortalanır */}
    <div className="w-32 h-32 md:w-36 md:h-36 shrink-0 bg-slate-100 rounded-[40px] overflow-hidden border-4 border-white shadow-2xl relative group">
      {product.image_url ? (
        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white font-black italic text-3xl">
          {product.sku?.substring(0, 2)}
        </div>
      )}
    </div>

    {/* Başlık ve Aksiyonlar - Mobilde tam genişlik */}
    <div className="flex flex-col justify-between items-stretch gap-6 w-full">
      <div className="space-y-4 text-center md:text-left">
        {/* SKU ve Kategori - Mobilde ortalı, Masaüstünde sola yaslı */}
        <div className="flex items-center justify-center md:justify-start gap-3">
          <span className="bg-blue-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-blue-200 flex items-center gap-2">
            <Hash size={12} /> {product.sku}
          </span>
          <span className="text-slate-300 font-black text-[10px] uppercase tracking-widest italic">/ {product.category}</span>
        </div>

        {/* Ürün İsmi */}
        <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-tight text-slate-900 break-words">
          {product.name}
        </h1>
        
        {/* AKSİYON BUTONLARI: Mobilde TEK SÜTUN, Masaüstünde yan yana */}
        <div className="flex flex-col sm:flex-row items-stretch gap-3 pt-2">
          <ProductModal editData={product} trigger={
            <button className="flex items-center justify-center gap-2 px-6 py-4 bg-white text-blue-600 rounded-2xl border-2 border-slate-100 shadow-sm hover:shadow-md hover:bg-blue-600 hover:text-white transition-all font-black text-[11px] uppercase tracking-[0.2em] w-full sm:w-auto">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              DÜZENLE
            </button>
          } />
          
          <div className="w-full sm:w-auto">
            <DeleteProductButton id={product.id} name={product.name} />
          </div>
        </div>
      </div>
    </div>
  </div>

  {/* KPI ÖZETİ: Mobilde 2'li ızgara, Tablette 3'lü, Masaüstünde yan yana */}
  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full lg:w-auto mt-6 lg:mt-0">
    <StatCard label="TOPLAM GİRİŞ" value={totalIn} color="emerald" icon={<TrendingUp size={16}/>} unit={product.unit || 'Adet'} />
    <StatCard label="TOPLAM ÇIKIŞ" value={totalOut} color="red" icon={<TrendingDown size={16}/>} unit={product.unit || 'Adet'} />
    <div className="col-span-2 md:col-span-1 bg-slate-900 p-8 rounded-[36px] text-center shadow-2xl shadow-slate-900/30 transform hover:scale-105 transition-all">
        <span className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">GÜNCEL STOK</span>
        <span className="text-5xl font-black text-white tracking-tighter italic leading-none">{product.stock_count}</span>
        <span className="block text-[10px] font-bold text-blue-400 uppercase mt-2 tracking-widest italic">{product.unit || 'ADET'}</span>
    </div>
  </div>
</div>
      </div>

      {/* HAREKET LİSTESİ */}
      <div className="bg-white border-2 border-slate-100 rounded-[64px] shadow-sm overflow-hidden mb-20">
        <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
               <div className="w-3 h-8 bg-slate-900 rounded-full"></div>
               <h2 className="font-black italic uppercase tracking-tighter text-3xl text-slate-900">İşlem Geçmişi</h2>
            </div>
            <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-slate-200 text-[10px] font-black uppercase tracking-widest italic shadow-sm">
              <Package size={14} className="text-blue-600" />
              {movements.length} Kayıtlı Hareket Analiz Edildi
            </div>
        </div>

        {/* MASAÜSTÜ GÖRÜNÜM */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 border-b border-slate-50 bg-white">
                <th className="p-12">Tarih / Saat</th>
                <th className="p-12">İşlem & Cari Detay</th>
                <th className="p-12 text-center">Miktar</th>
                <th className="p-12 text-right">Birim Fiyat</th>
                <th className="p-12 text-right">Satır Toplamı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {movements.map((m) => <DesktopRow key={m.id} m={m} />)}
            </tbody>
          </table>
        </div>

        {/* MOBİL GÖRÜNÜM */}
        <div className="md:hidden divide-y divide-slate-100">
          {movements.map((m) => <MobileRow key={m.id} m={m} />)}
        </div>

        {movements.length === 0 && <EmptyState />}
      </div>
    </div>
  );
}

// --- YARDIMCI BİLEŞENLER ---

function StatCard({ label, value, color, icon, unit }: any) {
  const styles: any = {
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-600 shadow-emerald-100/50",
    red: "bg-red-50 border-red-100 text-red-600 shadow-red-100/50"
  };
  return (
    <div className={`${styles[color]} border-2 p-8 rounded-[36px] text-center shadow-lg transition-all hover:-translate-y-2`}>
        <div className="flex items-center justify-center gap-2 mb-2 opacity-60">
          {icon}
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
        </div>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-4xl font-black tracking-tighter italic leading-none">{value}</span>
          <span className="text-[10px] font-bold uppercase italic opacity-60">{unit}</span>
        </div>
    </div>
  );
}


function DesktopRow({ m }: any) {
  // Veri Hiyerarşisi: stock_movements -> transaction_items -> transactions
  const tItem = m.transaction_items; 
  const trans = tItem?.transactions;
  
  // Hareket tipi kontrolü (IN, OUT, ADJUSTMENT)
  const isOut = m.type === 'OUT' || (m.type === 'ADJUSTMENT' && m.quantity < 0);
  
  // Belge türüne göre dinamik yönlendirme (sale, purchase, return_in, return_out)
  const viewLink = trans ? (
    ['sale', 'return_in'].includes(trans.type) 
      ? `/satis/izle/${trans.id}` 
      : `/alis/izle/${trans.id}`
  ) : '#';

  const typeMap: any = {
    IN: { label: 'GİRİŞ', color: 'bg-emerald-50 text-emerald-600' },
    OUT: { label: 'ÇIKIŞ', color: 'bg-red-50 text-red-600' },
    ADJUSTMENT: { label: 'DÜZELTME', color: 'bg-slate-100 text-slate-600' }
  };

  const currentType = typeMap[m.type] || { label: 'DİĞER', color: 'bg-slate-50 text-slate-400' };

  return (
    <tr className="hover:bg-slate-50/80 transition-all group border-b border-slate-50">
      <td className="p-12">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-black text-sm tracking-tighter text-slate-900 italic">
            <Calendar size={14} className="text-slate-200" />
            {new Date(m.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <span className="text-[10px] font-bold text-slate-300 uppercase italic ml-6">
            {new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </td>
      <td className="p-12">
        <div className="flex items-center gap-6">
          <div className={`px-4 py-2 rounded-xl text-[9px] font-black border uppercase italic tracking-widest ${currentType.color} border-current/10`}>
            {currentType.label}
          </div>
          <div>
            <div className="font-black uppercase text-slate-900 tracking-tight text-base mb-1 italic">
              {trans?.contacts?.name || m.description || 'GENEL HAREKET'}
            </div>
            <div className="flex items-center gap-4">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  BELGE: {trans?.doc_no || '---'}
               </span>
               {trans && (
<Link 
  href={viewLink} 
  className="inline-flex max-w-[150px] truncate bg-blue-50 text-blue-600 text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border border-blue-100 shadow-sm"
>
  {trans.doc_no || 'BELGE İZLE'}
</Link>
               )}
            </div>
          </div>
        </div>
      </td>
      <td className="p-12 text-center">
        <div className="flex flex-col items-center">
          <span className={`text-3xl font-black italic tracking-tighter ${isOut ? 'text-red-600' : 'text-emerald-600'}`}>
              {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
          </span>
          <div className="text-[9px] font-bold text-slate-400 mt-1 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 shadow-sm">
             {m.prev_stock} <span className="mx-2 text-blue-400">→</span> {m.next_stock}
          </div>
        </div>
      </td>
      <td className="p-12 text-right font-bold text-slate-400 text-sm italic">
        {tItem?.unit_price ? `${Number(tItem.unit_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL` : '---'}
      </td>
      <td className="p-12 text-right">
        <div className="text-2xl font-black tracking-tighter text-slate-900 italic">
          {tItem?.line_total ? `${Number(tItem.line_total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL` : '---'}
        </div>
      </td>
    </tr>
  );
}

function MobileRow({ m }: any) {
  const tItem = m.transaction_items;
  const trans = tItem?.transactions;
  
  const isOut = m.type === 'OUT' || (m.type === 'ADJUSTMENT' && m.quantity < 0);
  
  const viewLink = trans ? (
    ['sale', 'return_in'].includes(trans.type) 
      ? `/satis/izle/${trans.id}` 
      : `/alis/izle/${trans.id}`
  ) : '#';

  return (
    <div className="p-8 space-y-6 bg-white border-b border-slate-100">
      <div className="flex justify-between items-start">
        <div className="flex gap-5">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-[10px] font-black border-2 ${isOut ? 'border-red-100 text-red-600 bg-red-50' : 'border-emerald-100 text-emerald-600 bg-emerald-50'}`}>
            {m.type}
          </div>
          <div className="space-y-2">
            <p className="font-black uppercase text-slate-900 text-base leading-none italic">
              {trans?.contacts?.name || m.description || 'GENEL HAREKET'}
            </p>
            <div className="flex flex-col gap-2">
               <p className="text-[10px] font-bold text-slate-400 uppercase italic">
                 {new Date(m.created_at).toLocaleDateString('tr-TR')} - {new Date(m.created_at).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}
               </p>
               {trans && (
                 <Link 
                   href={viewLink} 
                   className="inline-flex w-fit bg-blue-50 text-blue-600 text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest border border-blue-100 shadow-sm"
                 >
                   BELGE No: {trans.doc_no || 'İZLE'}
                 </Link>
               )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className={`text-3xl font-black italic tracking-tighter ${isOut ? 'text-red-600' : 'text-emerald-600'}`}>
            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
          </div>
          <div className="text-[10px] font-bold text-slate-300 italic">
            {m.prev_stock} → {m.next_stock}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-[24px] border border-slate-100 shadow-inner">
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Birim Fiyat</span>
          <span className="font-bold text-sm italic text-slate-700">
            {tItem?.unit_price ? `${Number(tItem.unit_price).toLocaleString('tr-TR')} TL` : '---'}
          </span>
        </div>
        <div className="flex flex-col text-right border-l border-slate-200 pl-4">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Satır Toplam</span>
          <span className="font-black text-lg text-slate-900 italic">
            {tItem?.line_total ? `${Number(tItem.line_total).toLocaleString('tr-TR')} TL` : '---'}
          </span>
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-8">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-[8px] border-slate-100 rounded-full"></div>
          <div className="absolute inset-0 border-[8px] border-slate-900 rounded-full border-t-blue-600 animate-spin"></div>
        </div>
        <p className="text-[12px] font-black uppercase tracking-[1em] text-slate-400 italic animate-pulse">Memonex Analiz</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-40 text-center flex flex-col items-center gap-6">
       <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center text-slate-200">
         <Package size={40} />
       </div>
       <p className="text-slate-300 font-black uppercase tracking-[0.4em] text-xs italic">Henüz bir hareket kaydı bulunmuyor.</p>
    </div>
  );
}