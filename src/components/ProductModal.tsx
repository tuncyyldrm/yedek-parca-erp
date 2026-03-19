'use client';

import { useState, useEffect } from 'react';
import { saveProduct } from '@/app/actions/erp-actions';
import { useRouter } from 'next/navigation';
// 6. satırdaki hatalı yolu bununla değiştir:
import { supabase } from '@/lib/supabase';
import imageCompression from 'browser-image-compression';

export function ProductModal({ trigger, editData }: { trigger: React.ReactNode; editData?: any }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const initialForm = {
    id: undefined,
    sku: '',
    oem_code: '',
    name: '',
    brand: '',
    category: '',
    shelf_no: '',
    purchase_price: 0,
    sell_price: 0,
    tax_rate: 20,
    unit: 'Adet',
    stock_count: 0,
    critical_limit: 5,
    is_active: true,
    adjustment_amount: 0,
    image_url: '' // Yeni eklenen alan    
  };

  const [formData, setFormData] = useState(initialForm);

  // Görsel Yükleme Fonksiyonu
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);

      // 1. Görsel Sıkıştırma (Browser-side)
      const options = {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 1000,
        useWebWorker: true,
        fileType: 'image/webp'
      };
      const compressedFile = await imageCompression(file, options);

      // 2. Storage'a Yükleme
      const fileName = `${formData.sku || 'prod'}-${Date.now()}.webp`;
const { data, error } = await supabase.storage
  .from('product-images')
  .upload(fileName, compressedFile, {
    contentType: 'image/webp', // Dosya tipini açıkça belirt
    upsert: true               // Aynı isimde dosya varsa üzerine yaz
  });

      if (error) throw error;

      // 3. Public URL'i Al ve Form State'ine Yaz
const { data: { publicUrl } } = supabase.storage
  .from('product-images')
  .getPublicUrl(fileName);
const cacheBusterUrl = `${publicUrl}?t=${Date.now()}`;
setFormData(prev => ({ ...prev, image_url: cacheBusterUrl }));

    } catch (err: any) {
      alert("Görsel yüklenemedi: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (editData && isOpen) {
      setFormData({
        ...initialForm,
        ...editData,
        purchase_price: Number(editData.purchase_price) || 0,
        sell_price: Number(editData.sell_price) || 0,
        tax_rate: Number(editData.tax_rate) || 20,
        stock_count: Number(editData.stock_count) || 0,
        critical_limit: Number(editData.critical_limit) || 5,
        
        image_url: editData.image_url || ''
      });
    } else if (!isOpen) {
      setFormData(initialForm);
    }
  }, [editData, isOpen]);

  const margin = formData.purchase_price > 0 
    ? (((formData.sell_price - formData.purchase_price) / formData.purchase_price) * 100).toFixed(0) 
    : 0;

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => { // e tipini düzelttik
  e.preventDefault();
  setLoading(true);
  
  try {
    // Mevcut stok ile farkı toplayıp yeni stok değerini hesaplıyoruz
    const currentStock = Number(formData.stock_count) || 0;
    const adjustment = Number(formData.adjustment_amount) || 0;
    const finalStock = currentStock + adjustment;

    const result = await saveProduct({
      ...formData,
      stock_count: finalStock, // Veritabanına gidecek gerçek rakam
      is_adjustment: adjustment !== 0 // Eğer fark 0 değilse hareket kaydı oluşturması için
    });

    if (result.success) {
      // Başarılı olduktan sonra local state'i ve farkı sıfırlıyoruz
      setFormData(prev => ({ ...prev, stock_count: finalStock, adjustment_amount: 0 }));
      setIsOpen(false);
      router.refresh();
    } else {
      alert(`Hata: ${result.error}`);
    }
  } catch (err) {
    console.error(err);
    alert("Sistem hatası oluştu.");
  } finally {
    setLoading(false);
  }
};

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="inline-block w-full md:w-auto">{trigger}</div>

      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsOpen(false)} />
          
          <div className="relative bg-white w-full max-w-4xl md:rounded-[40px] rounded-t-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300 max-h-[95vh] flex flex-col">
            
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Envanter Yönetimi</span>
                <h2 className="text-xl md:text-2xl font-black italic uppercase text-slate-900 tracking-tighter">
                  {formData.id ? `DÜZENLE: ${formData.sku}` : 'YENİ ÜRÜN KAYDI'}
                </h2>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-sm text-slate-400 hover:text-red-500 transition-colors">✕</button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8 overflow-y-auto custom-scrollbar flex-grow text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Sol Bölüm: Tanımlama */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest italic">Ürün Görseli & Tanım</span>
                    <div className="h-px flex-grow bg-slate-100" />
                  </div>

                  {/* Görsel Yükleme Alanı */}
<div className="flex items-center gap-5 p-5 bg-slate-50 rounded-[28px] border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all relative group">
  {/* Görsel Önizleme Alanı */}
<div className="w-24 h-24 bg-white rounded-2xl flex-shrink-0 border border-slate-100 flex items-center justify-center overflow-hidden relative shadow-inner group/img-box">
  {formData.image_url ? (
    <>
      <img 
        src={formData.image_url} 
        alt="Preview" 
        className="w-full h-full object-cover" 
      />
      {/* Overlay: Sadece hover durumunda görünür */}
      <div className="absolute inset-0 bg-red-600/80 opacity-0 group-hover/img-box:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1">
        <button 
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
          className="text-white font-black text-[10px] uppercase tracking-widest hover:scale-110 transition-transform"
        >
          Görseli Kaldır
        </button>
      </div>
    </>
  ) : (
    <div className="flex flex-col items-center gap-1 opacity-40">
      <span className="text-3xl">📸</span>
      <span className="text-[8px] font-black uppercase tracking-tighter">FOTO YOK</span>
    </div>
  )}
</div>

  {/* Yükleme Kontrolleri */}
  <div className="flex-grow space-y-2">
    <div>
      <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 tracking-widest italic">
        {formData.image_url ? 'Görseli Değiştir' : 'Parça Fotoğrafı'}
      </label>
      <div className="relative">
        {/* Gizli input'u tetikleyen şık bir buton */}
        <button
          type="button"
          className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-tight shadow-sm hover:bg-slate-900 hover:text-white transition-all"
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          {uploading ? 'İŞLENİYOR...' : formData.image_url ? 'YENİ SEÇ' : 'DOSYA SEÇ'}
        </button>
        <input 
          id="file-upload"
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload}
          className="hidden" 
        />
      </div>
    </div>
    
    {uploading ? (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
        <p className="text-[9px] font-bold text-blue-600 uppercase italic">Görsel optimize ediliyor...</p>
      </div>
    ) : (
      <p className="text-[9px] text-slate-400 font-medium italic">
        Max 200KB • Auto WebP Dönüşümü
      </p>
    )}
  </div>
</div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Ürün Adı / Açıklama</label>
                    <input 
                      className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold focus:border-blue-600 outline-none transition-all bg-slate-50 focus:bg-white"
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Örn: Fren Balatası Ön"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-2">SKU (Kod)</label>
                      <input 
                        className="w-full border-2 border-slate-100 p-4 rounded-2xl font-black text-blue-600 tracking-widest focus:border-blue-600 outline-none bg-slate-50 focus:bg-white"
                        value={formData.sku || ''}
                        onChange={e => setFormData({...formData, sku: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-2">OEM Kodu</label>
                      <input 
                        className="w-full border-2 border-slate-100 p-4 rounded-2xl font-medium focus:border-blue-600 outline-none bg-slate-50 focus:bg-white"
                        value={formData.oem_code || ''}
                        onChange={e => setFormData({...formData, oem_code: e.target.value})}
                      />
                    </div>
                  </div>
                  {/* ... Diğer inputlar aynı kalıyor ... */}
                  
                  {/* Kategori ve Marka buraya gelecek */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Kategori</label>
                      <input 
                        className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold focus:border-blue-600 outline-none bg-slate-50 focus:bg-white"
                        value={formData.category || ''}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Marka</label>
                      <input 
                        className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold focus:border-blue-600 outline-none bg-slate-50 focus:bg-white"
                        value={formData.brand || ''}
                        onChange={e => setFormData({...formData, brand: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Sağ Bölüm: Finansal & Stok (Kodun devamı senin orijinal yapınla aynı) */}

<div className="space-y-5">
  <div className="flex items-center gap-2 mb-2">
    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest italic">Finans & Depo</span>
    <div className="h-px flex-grow bg-slate-100" />
  </div>

{/* STOK DÜZELTME KARTI */}
<div className="space-y-4 p-6 bg-slate-900 rounded-[32px] text-white shadow-xl relative overflow-hidden group">
  {/* Arka plan dekorasyonu */}
  <div className="absolute -right-4 -top-4 text-white/5 text-6xl font-black italic select-none group-hover:scale-110 transition-transform">
    STOCK
  </div>

  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
    Mevcut Stok & Sayım Düzeltme
  </label>

  <div className="flex items-center justify-between gap-4 relative z-10">
    {/* Güncel Stok Göstergesi */}
    <div className="flex flex-col">
      <span className="text-4xl font-black italic tracking-tighter leading-none">
        {formData.stock_count}
      </span>
      <span className="text-[9px] font-bold text-blue-400 uppercase mt-1">Sistem Kaydı</span>
    </div>

    {/* +/- Düzeltme Girişi (Widget) */}
    <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
      <button 
        type="button"
        onClick={() => setFormData(prev => ({...prev, adjustment_amount: prev.adjustment_amount - 1}))}
        className="w-10 h-10 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white transition-all font-black text-xl flex items-center justify-center"
      >
        -
      </button>
      
      <div className="flex flex-col items-center min-w-[60px]">
        <input 
          type="number"
          className="bg-transparent w-full text-center text-xl font-black outline-none border-b-2 border-blue-500/50 focus:border-blue-500 text-white"
          value={formData.adjustment_amount}
          onChange={e => setFormData({...formData, adjustment_amount: Number(e.target.value)})}
        />
        <span className="text-[8px] font-black uppercase text-slate-500">Fark</span>
      </div>

      <button 
        type="button"
        onClick={() => setFormData(prev => ({...prev, adjustment_amount: prev.adjustment_amount + 1}))}
        className="w-10 h-10 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-500 hover:text-white transition-all font-black text-xl flex items-center justify-center"
      >
        +
      </button>
    </div>
  </div>

  {/* Alt Bilgi Satırı */}
  <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px] font-bold italic text-slate-400">
    <span>İŞLEM SONRASI TOPLAM:</span>
    <span className={formData.adjustment_amount !== 0 ? "text-blue-400 font-black" : ""}>
      {Number(formData.stock_count) + Number(formData.adjustment_amount)} {formData.unit}
    </span>
  </div>
</div>

{/* KRİTİK LİMİT & BİRİM (Kartın Dışında - Net Okunabilirlik) */}
<div className="grid grid-cols-2 gap-4">
  <div className="space-y-1.5 text-left">
    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Kritik Limit</label>
    <div className="relative">
      <input 
        type="number"
        className="w-full border-2 border-slate-100 p-4 rounded-2xl font-black text-red-600 focus:border-red-500 outline-none bg-slate-50 focus:bg-white transition-all shadow-sm"
        value={formData.critical_limit}
        onChange={e => setFormData({...formData, critical_limit: Number(e.target.value)})}
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300 uppercase">MİN</span>
    </div>
  </div>
  
  <div className="space-y-1.5 text-left">
    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Birim</label>
    <div className="relative">
      <select 
        className="w-full border-2 border-slate-100 p-4 rounded-2xl font-black focus:border-blue-600 outline-none bg-slate-50 focus:bg-white appearance-none cursor-pointer shadow-sm"
        value={formData.unit}
        onChange={e => setFormData({...formData, unit: e.target.value})}
      >
        <option value="Adet">ADET</option>
        <option value="Set">SET</option>
        <option value="Metre">METRE</option>
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
    </div>
  </div>
</div>

  <div className="grid grid-cols-2 gap-4 p-5 bg-blue-50/50 rounded-[32px] border border-blue-100 relative">
    {/* Marj Rozeti */}
    <div className="absolute -top-3 right-6 bg-emerald-500 text-white text-[9px] font-black px-4 py-1 rounded-full shadow-lg">
      %{margin} MARJ
    </div>


    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-blue-600 uppercase ml-2 italic">Alış (Net)</label>
      <input 
        type="number" step="0.01"
        className="w-full border-2 border-white p-3 rounded-xl font-black text-lg focus:border-blue-500 outline-none shadow-sm"
        value={formData.purchase_price}
        onChange={e => setFormData({...formData, purchase_price: Number(e.target.value)})}
      />
    </div>

    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-blue-600 uppercase ml-2 italic">Satış (Net)</label>
      <input 
        type="number" step="0.01"
        className="w-full border-2 border-white p-3 rounded-xl font-black text-lg focus:border-blue-500 outline-none shadow-sm"
        value={formData.sell_price}
        onChange={e => setFormData({...formData, sell_price: Number(e.target.value)})}
      />
      {/* ANLIK BRÜT HESAPLAMA BİLGİSİ */}
      <div className="px-2 text-[10px] font-bold text-slate-400 italic">
        Brüt: {(formData.sell_price * (1 + formData.tax_rate / 100)).toLocaleString('tr-TR', {minimumFractionDigits: 2})} TL
      </div>
    </div>
  </div>

  <div className="grid grid-cols-3 gap-3">
    {/* KDV Giriş Alanı */}
    <div className="space-y-1.5">
      <label className="text-[9px] font-black text-slate-500 uppercase ml-2">KDV %</label>
      <select 
        className="w-full border-2 border-slate-100 p-4 rounded-2xl font-black text-center focus:border-blue-600 outline-none bg-white appearance-none cursor-pointer"
        value={formData.tax_rate}
        onChange={e => setFormData({...formData, tax_rate: Number(e.target.value)})}
      >
        <option value={20}>%20</option>
        <option value={10}>%10</option>
        <option value={1}>%1</option>
        <option value={0}>%0</option>
      </select>
    </div>
    {/* Stok ve Kritik alanları orijinal halindeki gibi kalabilir */}
    {/* ... */}
  </div>
</div>
              </div>

              {/* Action Button */}
              <div className="pt-6">
                <button 
                  type="submit" 
                  disabled={loading || uploading}
                  className={`w-full py-6 rounded-[24px] font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95
                    ${loading || uploading ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-blue-600 shadow-blue-200 border-b-4 border-black/20'}`}
                >
                  {loading ? 'VERİLER YAZILIYOR...' : uploading ? 'GÖRSEL YÜKLENİYOR...' : (
                    <>
                      {formData.id ? 'DEĞİŞİKLİKLERİ KAYDET' : 'ÜRÜNÜ SİSTEME TANIMLA'}
                      <span className="text-xl">→</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}