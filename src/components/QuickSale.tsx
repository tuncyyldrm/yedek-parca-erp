'use client';
import { useState, useMemo, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createTransaction } from '@/app/actions/erp-actions';

export function QuickSale({ products = [], contacts = [] }: { products: any[], contacts: any[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
// formData state'ini şu şekilde güncelle:
const [formData, setFormData] = useState({ 
  contact_id: '', 
  product_id: '', 
  qty: 1, 
  tax_rate: 20 // Varsayılan değer
});
  
  const contactSelectRef = useRef<HTMLSelectElement>(null);
  const productSelectRef = useRef<HTMLSelectElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // Kısayol Desteği (F1: Müşteri, F2: Ürünü Sıfırla ve Seç)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        contactSelectRef.current?.focus();
      }
      if (e.key === 'F2') {
        e.preventDefault();
        setFormData(prev => ({ ...prev, product_id: '', qty: 1 }));
        productSelectRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selectedProduct = useMemo(() => {
    if (!formData.product_id) return null;
    return products.find((p: any) => String(p.id) === String(formData.product_id));
  }, [products, formData.product_id]);

  const totalAmount = useMemo(() => 
    (Number(selectedProduct?.sell_price) || 0) * formData.qty, 
    [selectedProduct, formData.qty]
  );

// handleProductChange içinde seçilen ürünün KDV'sini otomatik set et:
const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const val = e.target.value.trim();
  const prod = products.find((p: any) => String(p.id) === String(val));
  
  setFormData(prev => ({ 
    ...prev, 
    product_id: val, 
    qty: 1, 
    tax_rate: prod?.tax_rate || 20 // Ürünün kendi KDV'sini getir
  }));
  
  if (val) {
    setTimeout(() => qtyInputRef.current?.focus(), 50);
  }
};

const handleSale = async (e?: React.FormEvent) => {
  e?.preventDefault();
  if (!formData.contact_id || !formData.product_id || !selectedProduct) return;

  if (formData.qty > (selectedProduct.stock_count || 0)) {
    alert(`⚠️ STOK YETERSİZ!\nMevcut: ${selectedProduct.stock_count} Adet`);
    return;
  }

  startTransition(async () => {
    try {
      const result = await createTransaction({
        contact_id: formData.contact_id,
        type: 'sale',
        invoice_type: 'SATIS',
        items: [{ 
          product_id: formData.product_id, 
          quantity: formData.qty, 
          // Veritabanındaki net fiyatı gönderiyoruz
          unit_price: Number(selectedProduct.sell_price), 
          // Seçilebilir KDV oranını (formData içindeki) gönderiyoruz
          tax_rate: Number(formData.tax_rate) 
        }],
        description: `Hızlı Satış: ${selectedProduct.sku}`
      });

      if (result.success) {
        // Formu temizle ve odaklan
        setFormData(prev => ({ ...prev, product_id: '', qty: 1 }));
        router.refresh(); 
        setTimeout(() => productSelectRef.current?.focus(), 150);
      } else {
        alert("İşlem Başarısız: " + (result.error || "Bilinmeyen hata."));
      }
    } catch (error) {
      console.error("Satış Hatası:", error);
      alert('Bağlantı Hatası!');
    }
  });
};

  return (
    <form onSubmit={handleSale} className="bg-white p-6 rounded-[40px] space-y-6 text-slate-900 shadow-2xl shadow-slate-200/50 border border-slate-50 max-w-md mx-auto">
      
      {/* Üst Bilgi Paneli */}
      <div className="flex justify-between items-start border-b border-slate-100 pb-5">
        <div>
          <h3 className="font-black text-slate-900 flex items-center gap-2 tracking-tighter uppercase italic text-lg leading-none">
            <span className="bg-blue-600 text-white w-8 h-8 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center text-[10px] not-italic">FX</span>
            Hızlı Satış
          </h3>
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1 italic">Isparta / Memonex Terminal</p>
        </div>
        <div className={`text-[8px] font-black px-2 py-1 rounded-md border tracking-tighter transition-colors ${isPending ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
          {isPending ? 'İŞLENİYOR...' : 'SİSTEM AKTİF'}
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Müşteri Seçimi (F1) */}
        <div className="group space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
            Cari Kart (F1)
          </label>
          <select 
            ref={contactSelectRef}
            disabled={isPending}
            required
            value={formData.contact_id}
            className="w-full border-2 border-slate-100 rounded-2xl p-3.5 text-sm bg-slate-50/30 focus:border-blue-600 focus:bg-white outline-none transition-all font-bold"
            onChange={(e) => setFormData({...formData, contact_id: e.target.value})}
          >
            <option value="">Müşteri Seçin...</option>
            {contacts.map((c: any) => (
              <option key={c.id} value={c.id}>
                {(c.name || "İsimsiz").toUpperCase()} — {Number(c.balance || 0).toLocaleString('tr-TR')} TL
              </option>
            ))}
          </select>
        </div>

        {/* Ürün Seçimi (F2) */}
        <div className="group space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-blue-600 transition-colors">
            Parça / SKU (F2)
          </label>
          <select 
            ref={productSelectRef}
            disabled={isPending || !formData.contact_id}
            required
            value={formData.product_id}
            className="w-full border-2 border-slate-100 rounded-2xl p-3.5 text-sm bg-slate-50/30 focus:border-blue-600 focus:bg-white outline-none transition-all font-bold disabled:opacity-50"
            onChange={handleProductChange}
          >
            <option value="">Ürün Seçin...</option>
            {products.map((p: any) => (
              <option key={p.id} value={p.id} disabled={(p.stock_count || 0) <= 0}>
                {p.sku} — {(p.name || 'İsimsiz').toUpperCase()} ({p.stock_count} AD)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dinamik Stok ve Raf Bilgisi Paneli */}
      <div className="h-[72px]">
        {selectedProduct ? (
          <div className="grid grid-cols-2 gap-3 animate-in fade-in zoom-in-95 duration-200">
            <div className={`p-3 rounded-2xl border-2 flex flex-col justify-center transition-colors ${
              Number(selectedProduct.stock_count) <= Number(selectedProduct.critical_limit) 
                ? 'bg-red-50 border-red-100' 
                : 'bg-blue-50/50 border-blue-100'
            }`}>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5 leading-none">Mevcut Stok</span>
              <span className={`text-[11px] font-black italic ${Number(selectedProduct.stock_count) <= Number(selectedProduct.critical_limit) ? 'text-red-600' : 'text-blue-600'}`}>
                 {selectedProduct.stock_count || 0} ADET {Number(selectedProduct.stock_count) <= Number(selectedProduct.critical_limit) && '⚠️'}
              </span>
            </div>
            <div className="p-3 rounded-2xl border-2 border-slate-100 bg-slate-50/50 flex flex-col justify-center">
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5 leading-none">Raf Konumu</span>
              <span className="text-[11px] font-black text-slate-700 italic uppercase">LOC: {selectedProduct.shelf_no || 'YOK'}</span>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/20 italic text-[9px] font-black text-slate-300 uppercase tracking-widest">
            Ürün Bekleniyor...
          </div>
        )}
      </div>

{/* Sadeleştirilmiş Akıllı Finansal Panel */}
<div className="bg-[#0f172a] p-6 rounded-[32px] shadow-2xl border border-slate-800 relative overflow-hidden text-white">
  
  {/* Üst Kısım: Giriş Alanları */}
  <div className="flex items-center gap-4 mb-6">
    <div className="flex-1 space-y-1.5">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Miktar</label>
      <input 
        ref={qtyInputRef}
        type="number"
        value={formData.qty}
        className="w-full bg-slate-800/50 border-2 border-slate-700 rounded-2xl py-3 px-4 font-black text-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-center"
        onChange={(e) => setFormData({...formData, qty: Math.max(1, Number(e.target.value))})}
      />
    </div>
    <div className="flex-1 space-y-1.5">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">KDV Oranı</label>
      <div className="relative">
        <select 
          value={formData.tax_rate}
          className="w-full bg-slate-800/50 border-2 border-slate-700 rounded-2xl py-3 px-4 font-black text-xl outline-none focus:border-blue-500 appearance-none text-center cursor-pointer"
          onChange={(e) => setFormData({...formData, tax_rate: Number(e.target.value)})}
        >
          <option value="20">%20</option>
          <option value="10">%10</option>
          <option value="1">%1</option>
          <option value="0">%0</option>
        </select>
      </div>
    </div>
  </div>

  {/* Orta Kısım: Birim Fiyat Karşılaştırması (Vurgulu) */}
  <div className="bg-slate-800/30 rounded-[24px] p-4 border border-slate-700/50 mb-6 flex justify-between items-center">
    <div>
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter block mb-1">Birim (NET)</span>
      <span className="text-lg font-bold text-slate-400 italic">
        {selectedProduct ? Number(selectedProduct.sell_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : "0,00"} <small className="text-[10px] not-italic opacity-50">TL</small>
      </span>
    </div>
    <div className="h-8 w-[1px] bg-slate-700"></div>
    <div className="text-right">
      <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter block mb-1">Birim (KDV DAHİL)</span>
      <span className="text-2xl font-black text-blue-400 italic tracking-tighter">
        {selectedProduct ? (Number(selectedProduct.sell_price) * (1 + formData.tax_rate / 100)).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : "0,00"} <small className="text-xs not-italic">TL</small>
      </span>
    </div>
  </div>

  {/* Alt Kısım: Özet ve Büyük Toplam */}
  <div className="flex justify-between items-end px-2">
    <div className="space-y-1">
      <div className="flex gap-2 items-center">
        <span className="text-[9px] font-bold text-slate-500 uppercase">Ara Toplam:</span>
        <span className="text-xs font-black text-slate-400">{(Number(selectedProduct?.sell_price || 0) * formData.qty).toLocaleString('tr-TR')} TL</span>
      </div>
      <div className="flex gap-2 items-center">
        <span className="text-[9px] font-bold text-slate-500 uppercase">KDV Toplam:</span>
        <span className="text-xs font-black text-slate-400">{(Number(selectedProduct?.sell_price || 0) * formData.qty * (formData.tax_rate / 100)).toLocaleString('tr-TR')} TL</span>
      </div>
    </div>

    <div className="text-right">
      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] block mb-1">Ödenecek Tutar</span>
      <div className="flex items-baseline justify-end gap-1">
        <span className="text-4xl font-black text-white italic tracking-tighter leading-none">
          {selectedProduct 
            ? (Number(selectedProduct.sell_price) * formData.qty * (1 + formData.tax_rate / 100)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })
            : "0,00"}
        </span>
        <span className="text-emerald-500 font-black text-sm">TL</span>
      </div>
    </div>
  </div>
</div>

      {/* Satış Butonu */}
      <button 
        type="submit"
        disabled={isPending || !selectedProduct}
        className="w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all disabled:opacity-30 disabled:grayscale active:scale-95"
      >
        {isPending ? 'İŞLENİYOR...' : 'SATIŞI TAMAMLA →'}
      </button>
    </form>
  );
}