'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Trash2, Plus, Store, AlertCircle, Hash, 
  Edit3, CircleDollarSign, Calendar, AlignLeft, 
  CheckCircle2 
} from 'lucide-react';
import { SupplierOfferModal } from './SupplierOfferModal';

interface Offer {
  id: string;
  supplier_id: string;
  unit_price: number;
  currency: string;
  supplier_sku?: string;
  supplier_description?: string;
  contacts?: { name: string };
  created_at: string;
}

export function SupplierOfferTable({ productId, offers, suppliers, onRefresh }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  
  const sortedOffers = [...offers].sort((a, b) => a.unit_price - b.unit_price);

  const handleDelete = async (id: string) => {
    if (!confirm('Bu teklifi silmek istediğinize emin misiniz?')) return;
    try {
      const { error } = await supabase.from('product_supplier_offers').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (err) {
      console.error("Memonex Hata:", err);
    }
  };

  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setIsModalOpen(true);
  };

  return (
    <div className="w-full space-y-8">
      
      {/* BAŞLIK VE YENİ KAYIT BUTONU */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-900 p-5 sm:p-6 rounded-[32px] shadow-2xl border-b-4 border-blue-600">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="bg-blue-600 p-3 rounded-2xl text-white shrink-0 shadow-lg shadow-blue-500/20">
            <CircleDollarSign size={24} />
          </div>
          <div className="italic tracking-tighter text-left">
            <h2 className="text-white font-black uppercase text-lg sm:text-2xl leading-none">TEKLİF ANALİZİ</h2>
            <p className="text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">TEDARİKÇİ FİYAT KARŞILAŞTIRMASI</p>
          </div>
        </div>
        <button 
          onClick={() => { setEditingOffer(null); setIsModalOpen(true); }}
          className="w-full sm:w-auto bg-blue-600 hover:bg-white hover:text-slate-900 text-white px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform" /> YENİ TEKLİF EKLE
        </button>
      </div>

      {/* GRID LİSTE SİSTEMİ */}
      {sortedOffers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedOffers.map((offer, index) => (
            <div 
              key={offer.id} 
              className={`group relative flex flex-col bg-white border-2 rounded-[40px] transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden ${
                index === 0 ? 'border-emerald-500 shadow-xl shadow-emerald-100' : 'border-slate-100 hover:border-blue-200'
              }`}
            >
              {/* EN UYGUN ROZETİ */}
              {index === 0 && (
                <div className="absolute top-0 right-8 bg-emerald-500 text-white px-4 py-2 rounded-b-2xl text-[9px] font-black uppercase tracking-widest shadow-md z-10 flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> EN UYGUN
                </div>
              )}

              <div className="p-6 sm:p-8 flex flex-col h-full space-y-5">
                
                {/* 1. BÖLÜM: TEDARİKÇİ */}
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${index === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                    <Store size={26} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">TEDARİKÇİ FİRMA</p>
                    <h3 className="font-black text-slate-900 text-lg uppercase italic tracking-tighter truncate leading-tight">
                      {offer.contacts?.name || 'BELİRTİLMEMİŞ'}
                    </h3>
                  </div>
                </div>

                {/* 2. BÖLÜM: FİYAT (Öne Çıkarılmış) */}
                <div className={`p-5 rounded-3xl flex flex-col items-center justify-center border-2 ${index === 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50/50 border-slate-50'}`}>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">BİRİM FİYAT</p>
                   <div className={`text-3xl sm:text-4xl font-black italic tracking-tighter leading-none ${index === 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {Number(offer.unit_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    <span className="text-xs ml-2 not-italic font-bold uppercase opacity-50">{offer.currency}</span>
                  </div>
                </div>

                {/* 3. BÖLÜM: KOD VE AÇIKLAMA */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl flex items-center gap-2">
                      <Hash size={12} className="text-blue-400" />
                      <span className="text-[10px] font-black italic tracking-tighter uppercase truncate">
                        {offer.supplier_sku || 'KOD YOK'}
                      </span>
                    </div>
                    <div className="flex-1 border-t-2 border-dashed border-slate-100"></div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Calendar size={12} />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">
                        {new Date(offer.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 min-h-[60px]">
                    <div className="flex gap-2 text-slate-400 mb-1">
                      <AlignLeft size={12} />
                      <span className="text-[8px] font-black uppercase tracking-widest">Açıklama / Not</span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-600 italic leading-relaxed line-clamp-3">
                      {offer.supplier_description || 'Bu teklif için bir açıklama girilmemiş.'}
                    </p>
                  </div>
                </div>

                {/* 4. BÖLÜM: AKSİYONLAR */}
                <div className="flex items-center gap-2 pt-2">
                  <button 
                    onClick={() => handleEdit(offer)}
                    className="flex-1 py-4 bg-slate-900 text-white hover:bg-blue-600 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-lg"
                  >
                    <Edit3 size={16} /> DÜZENLE
                  </button>
                  <button 
                    onClick={() => handleDelete(offer.id)}
                    className="p-4 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-2xl transition-all active:scale-95 flex items-center justify-center"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>
      ) : (
        /* BOŞ DURUM */
        <div className="bg-white border-4 border-dashed border-slate-100 rounded-[64px] py-24 flex flex-col items-center justify-center text-center px-10">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
            <AlertCircle size={48} />
          </div>
          <h4 className="text-slate-400 font-black uppercase italic tracking-[0.3em] text-sm">VERİ ANALİZİ BOŞ</h4>
          <p className="text-slate-300 text-[11px] mt-3 uppercase font-bold tracking-tight max-w-xs">
            Bu ürün için henüz sisteme girilmiş bir tedarikçi teklifi bulunmuyor.
          </p>
        </div>
      )}

      {/* MODAL BİLEŞENİ */}
      <SupplierOfferModal 
        productId={productId} 
        suppliers={suppliers} 
        isOpen={isModalOpen} 
        editingOffer={editingOffer}
        onClose={() => { setIsModalOpen(false); setEditingOffer(null); }} 
        onSuccess={onRefresh} 
      />
    </div>
  );
}