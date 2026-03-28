'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  X, User, Phone, MapPin, Hash, Building2, Save, 
  Loader2, Info, Briefcase, UserCircle2, Globe 
} from 'lucide-react';

interface ContactModalProps {
  contact?: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ContactModal({ contact, isOpen, onClose, onSuccess }: ContactModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    first_name: '',
    last_name: '',
    type: 'customer',
    is_company: true,
    phone: '',
    email: '',
    tax_office: '',
    tax_number: '',
    address: '',
    city: 'Isparta', // Varsayılan merkezimiz
    district: '',
    country: 'Türkiye',
    invoice_scenario: 'Temel Fatura'
  });

  useEffect(() => {
    if (isOpen) {
      if (contact) {
        setFormData({
          name: contact.name || '',
          first_name: contact.first_name || '',
          last_name: contact.last_name || '',
          type: contact.type || 'customer',
          is_company: contact.is_company ?? true,
          phone: contact.phone || '',
          email: contact.email || '',
          tax_office: contact.tax_office || '',
          tax_number: contact.tax_number || '',
          address: contact.address || '',
          city: contact.city || 'Isparta',
          district: contact.district || '',
          country: contact.country || 'Türkiye',
          invoice_scenario: contact.invoice_scenario || 'Temel Fatura'
        });
      } else {
        setFormData({
          name: '', first_name: '', last_name: '', type: 'customer',
          is_company: true, phone: '', email: '', tax_office: '',
          tax_number: '', address: '', city: 'Isparta', district: '',
          country: 'Türkiye', invoice_scenario: 'Temel Fatura'
        });
      }
    }
  }, [contact, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // SQL Şemasına uygun veri paketi
    const payload = {
      ...formData,
      name: formData.is_company 
        ? formData.name.toUpperCase() 
        : `${formData.first_name} ${formData.last_name}`.toUpperCase()
    };

    try {
      let error;
      if (contact?.id) {
        const { error: err } = await supabase.from('contacts').update(payload).eq('id', contact.id);
        error = err;
      } else {
        const { error: err } = await supabase.from('contacts').insert([payload]);
        error = err;
      }
      
      if (error) throw error;
      onSuccess();
      onClose();
    } catch (error: any) {
      alert('Veritabanı Hatası: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
// Yeni: z-[999] veya en azından navigasyondan yüksek bir değer
<div className="fixed inset-0 z-[999] flex items-center justify-center p-2 sm:p-6">
  {/* Backdrop */}
  <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose}/>
  {/* Modal Content */}

      <div className="relative bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-50 flex justify-between items-center bg-white sticky top-0 z-20">
          <div>
            <h2 className="text-2xl font-black tracking-tighter uppercase italic text-slate-900">
              {contact ? 'Cari Bilgilerini Güncelle' : 'Yeni Paydaş Kaydı'}
            </h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Memonex ERP / Contacts v2.0</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 overflow-y-auto space-y-8 custom-scrollbar">
          
          {/* Seçenekler: Cari Tipi ve Şirket/Şahıs Ayrımı */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Cari Rolü</label>
              <div className="flex p-1 bg-slate-100 rounded-2xl">
                {['customer', 'supplier', 'both'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData({...formData, type: t})}
                    className={`flex-1 py-2 rounded-xl font-black text-[9px] uppercase transition-all ${formData.type === t ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                  >
                    {t === 'customer' ? 'Müşteri' : t === 'supplier' ? 'Tedarikçi' : 'Hibrit'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">İşletme Türü</label>
              <div className="flex p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, is_company: true})}
                  className={`flex-1 py-2 rounded-xl font-black text-[9px] uppercase transition-all flex items-center justify-center gap-2 ${formData.is_company ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                  <Briefcase size={12} /> KURUMSAL
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, is_company: false})}
                  className={`flex-1 py-2 rounded-xl font-black text-[9px] uppercase transition-all flex items-center justify-center gap-2 ${!formData.is_company ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >
                  <UserCircle2 size={12} /> BİREYSEL
                </button>
              </div>
            </div>
          </div>

          {/* Dinamik İsim Alanları */}
          <div className="space-y-4">
            {formData.is_company ? (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Ticari Ünvan</label>
                <input 
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-6 focus:border-blue-500 focus:bg-white outline-none transition-all font-black italic text-lg shadow-sm"
                  placeholder="Memonex Tasarım ve Üretim"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Ad</label>
                  <input className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-6 font-black outline-none focus:border-blue-500" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Soyad</label>
                  <input className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 px-6 font-black outline-none focus:border-blue-500" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
                </div>
              </div>
            )}
          </div>

          {/* İletişim ve Konum */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Telefon & E-Posta</label>
              <div className="flex flex-col gap-2">
                <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold" placeholder="05xx..." value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-sm font-bold" placeholder="email@memonex.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Vergi Bilgileri</label>
              <div className="grid grid-cols-2 gap-2">
                <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-xs font-black" placeholder="V. Dairesi" value={formData.tax_office} onChange={(e) => setFormData({...formData, tax_office: e.target.value})} />
                <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-xs font-black" placeholder="V. No / TC" value={formData.tax_number} onChange={(e) => setFormData({...formData, tax_number: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Adres Bölümü (Şehir/İlçe SQL Uyumlu) */}
          <div className="space-y-4">
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Şehir</label>
                  <input className="w-full bg-slate-100 border-none rounded-xl py-3 px-4 text-xs font-black" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">İlçe</label>
                  <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-xs font-black" placeholder="Örn: Merkez" value={formData.district} onChange={(e) => setFormData({...formData, district: e.target.value})} />
                </div>
                <div className="space-y-2 md:col-span-1 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Senaryo</label>
                  <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 px-4 text-xs font-black outline-none" value={formData.invoice_scenario} onChange={(e) => setFormData({...formData, invoice_scenario: e.target.value})}>
                    <option>Temel Fatura</option>
                    <option>Ticari Fatura</option>
                  </select>
                </div>
             </div>
             <textarea className="w-full bg-slate-50 border-2 border-slate-50 rounded-[24px] py-4 px-6 font-bold text-sm min-h-[100px] resize-none" placeholder="Tam Adres Detayı..." value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
          </div>
        </form>

        {/* Footer Action */}
        <div className="p-6 md:p-8 border-t border-slate-50 bg-slate-50/50">
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.3em] italic hover:bg-blue-600 transition-all flex items-center justify-center gap-4 shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : <><Save size={18} /> KAYDI VERİTABANINA İŞLE</>}
          </button>
        </div>
      </div>
    </div>
  );
}