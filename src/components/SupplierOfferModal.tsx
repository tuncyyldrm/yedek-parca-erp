'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Store, Tag, FileText, Hash, Link2, Edit3, CheckCircle2, Search } from 'lucide-react';

interface Props {
  productId: string;
  suppliers: any[];
  isOpen: boolean;
  editingOffer: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function SupplierOfferModal({ productId, suppliers, isOpen, editingOffer, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'decision' | 'manual' | 'mapping'>(editingOffer ? 'manual' : 'decision');
  const [loading, setLoading] = useState(false);
  const [foundPrice, setFoundPrice] = useState<any>(null);

  const [formData, setFormData] = useState({
    supplier_id: '',
    unit_price: '',
    currency: 'TRY',
    supplier_sku: '',
    supplier_description: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (editingOffer) {
        setStep('manual');
        setFormData({
          supplier_id: editingOffer.supplier_id || '',
          unit_price: editingOffer.unit_price?.toString() || '',
          currency: editingOffer.currency || 'TRY',
          supplier_sku: editingOffer.supplier_sku || '',
          supplier_description: editingOffer.supplier_description || ''
        });
      } else {
        setStep('decision');
        setFormData({ supplier_id: '', unit_price: '', currency: 'TRY', supplier_sku: '', supplier_description: '' });
      }
      setFoundPrice(null);
    }
  }, [isOpen, editingOffer]);

  const handleCheckMapping = async () => {
    if (!formData.supplier_id || !formData.supplier_sku) return;
    setLoading(true);
    const cleanSku = formData.supplier_sku.toUpperCase().trim();
    
    const { data } = await supabase
      .from('product_supplier_offers')
      .select('*')
      .eq('supplier_id', formData.supplier_id)
      .eq('supplier_sku', cleanSku)
      .maybeSingle();

    if (data) {
      setFoundPrice(data);
      setFormData(prev => ({
        ...prev,
        unit_price: data.unit_price.toString(),
        currency: data.currency,
        supplier_description: data.supplier_description || ''
      }));
    } else {
      alert("Bu kodla eşleşen veri bulunamadı.");
      setStep('manual');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cleanSku = formData.supplier_sku.toUpperCase().trim();
      const payload = {
        product_id: productId,
        supplier_id: formData.supplier_id,
        unit_price: parseFloat(formData.unit_price),
        currency: formData.currency,
        supplier_sku: cleanSku,
        supplier_description: formData.supplier_description,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('product_supplier_offers')
        .upsert({ ...(editingOffer?.id && { id: editingOffer.id }), ...payload });

      if (error) {
        if (error.code === '23505') {
          const { data: conflict } = await supabase
            .from('product_supplier_offers')
            .select('products(sku, name)')
            .eq('supplier_sku', cleanSku)
            .eq('supplier_id', formData.supplier_id)
            .maybeSingle();
          
          const p: any = conflict?.products;
          alert(`HATA: ${cleanSku} kodu zaten "${p?.name}" (${p?.sku}) ürününde eşli!`);
          return;
        }
        throw error;
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      alert("Hata: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-slate-900/90 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-[30px] sm:rounded-[40px] shadow-2xl flex flex-col max-h-[92vh] border-t-4 border-slate-900">
        
        {/* HEADER - Daha Dar */}
        <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="italic">
            <span className="text-blue-400 text-[9px] font-black uppercase tracking-widest block">MEMONEX CORE</span>
            <h3 className="font-black uppercase text-lg leading-tight">
              {step === 'decision' ? 'İŞLEM SEÇİN' : 'TEKLİF FORMU'}
            </h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        {/* CONTENT - Kaydırılabilir */}
        <div className="p-5 overflow-y-auto pb-50">
          {step === 'decision' ? (
            <div className="space-y-3">
              <button onClick={() => setStep('manual')} className="w-full flex items-center gap-4 p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl hover:border-blue-500 text-left transition-all">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0"><Edit3 size={24} /></div>
                <div><h4 className="font-black text-sm uppercase">MANUEL GİRİŞ</h4><p className="text-[10px] text-slate-400 font-bold">SIFIRDAN VERİ EKLE</p></div>
              </button>
              <button onClick={() => setStep('mapping')} className="w-full flex items-center gap-4 p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl hover:border-emerald-500 text-left transition-all">
                <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white shrink-0"><Link2 size={24} /></div>
                <div><h4 className="font-black text-sm uppercase">VERİ EŞLE</h4><p className="text-[10px] text-slate-400 font-bold">KODDAN FİYAT ÇEK</p></div>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter px-1 italic">TEDARİKÇİ</label>
                <select required value={formData.supplier_id} onChange={(e) => setFormData({...formData, supplier_id: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 p-3 rounded-xl font-bold text-sm focus:border-blue-500 outline-none">
                  <option value="">SEÇİNİZ...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name?.toUpperCase()}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter px-1 italic">STOK KODU (SKU)</label>
                <div className="flex gap-2">
                  <input required type="text" placeholder="KOD..." value={formData.supplier_sku} onChange={(e) => setFormData({...formData, supplier_sku: e.target.value})} className="flex-1 bg-slate-50 border-2 border-slate-200 p-3 rounded-xl font-bold text-sm uppercase outline-none focus:border-blue-500" />
                  {step === 'mapping' && (
                    <button type="button" onClick={handleCheckMapping} disabled={loading} className="bg-slate-900 text-white px-4 rounded-xl hover:bg-emerald-600"><Search size={18} /></button>
                  )}
                </div>
              </div>

              {(step === 'manual' || foundPrice) && (
                <div className="space-y-4 pt-2 border-t border-dashed animate-in fade-in duration-300">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase text-center block italic">FİYAT</label>
                      <input required type="number" step="0.01" value={formData.unit_price} onChange={(e) => setFormData({...formData, unit_price: e.target.value})} className="w-full bg-slate-900 text-white p-3 rounded-xl font-black text-lg text-center outline-none ring-offset-2 focus:ring-2 ring-emerald-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase text-center block italic">DÖVİZ</label>
                      <select value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})} className="w-full bg-slate-100 border-2 border-slate-100 p-3 rounded-xl font-black text-center outline-none">
                        <option value="TRY">TL</option><option value="USD">USD</option><option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase px-1 italic">NOTLAR</label>
                    <textarea rows={2} value={formData.supplier_description} onChange={(e) => setFormData({...formData, supplier_description: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 p-3 rounded-xl font-bold text-xs outline-none focus:border-blue-500 resize-none" />
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                    <CheckCircle2 size={18} /> {loading ? 'İŞLENİYOR...' : 'GÜNCELLE'}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}