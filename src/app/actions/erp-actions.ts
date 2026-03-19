'use server'

import { supabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

// --- TİPLER ---
export type TransactionType = 'sale' | 'purchase' | 'return_in' | 'return_out'
export type FinanceType = 'collection' | 'payment'
export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card'

interface TransactionItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_amount?: number;
}

// Yardımcı Fonksiyon: Sayısal güvenliği sağlar ve kuruş hatalarını önler
const toFixedNum = (num: number, precision: number = 2) => 
  Math.round((num + Number.EPSILON) * Math.pow(10, precision)) / Math.pow(10, precision);

const toNumber = (val: any) => (Number.isFinite(+val) ? +val : 0);

export async function saveProduct(data: any) {
  try {
    // 1. Payload hazırlığı (stock_count EKLENDİ)
    const payload = {
      sku: data.sku?.trim().toUpperCase(),
      oem_code: data.oem_code?.trim() || null,
      name: (data.name || 'İsimsiz Ürün').trim(),
      brand: data.brand?.trim() || null,
      category: data.category || null,
      purchase_price: toFixedNum(toNumber(data.purchase_price)),
      sell_price: toFixedNum(toNumber(data.sell_price)),
      tax_rate: toNumber(data.tax_rate) || 20,
      image_url: data.image_url || null,
      critical_limit: Math.floor(toNumber(data.critical_limit) || 5),
      shelf_no: data.shelf_no?.toUpperCase() || null,
      stock_count: toNumber(data.stock_count), // KRİTİK EKSİK BURASIYDI
      updated_at: new Date().toISOString(),
      is_deleted: false,
      is_active: true
    };

    // 2. Önceki stok değerini al (Stock Movement için gerekli)
    let prevStock = 0;
    if (data.id) {
      const { data: oldProd } = await supabase
        .from('products')
        .select('stock_count')
        .eq('id', data.id)
        .single();
      prevStock = oldProd?.stock_count || 0;
    }

    // 3. Ürünü Kaydet/Güncelle
    const { data: savedProduct, error } = data.id 
      ? await supabase.from('products').update(payload).eq('id', data.id).select().single()
      : await supabase.from('products').insert([payload]).select().single();

    if (error) throw error;

    // 4. EĞER FARK VARSA: stock_movements tablosuna kayıt at
    const adjustment = toNumber(data.adjustment_amount);
    if (adjustment !== 0) {
      const { error: moveError } = await supabase.from('stock_movements').insert({
        product_id: savedProduct.id,
        type: adjustment > 0 ? 'IN' : 'OUT',
        quantity: Math.abs(adjustment),
        prev_stock: prevStock,
        next_stock: savedProduct.stock_count,
        source_type: 'ADJUSTMENT', // Tablo kısıtına uygun
        description: 'Manuel stok düzeltme yapıldı.'
      });
      if (moveError) console.error("Stok hareketi yazılamadı:", moveError.message);
    }

    revalidatePath('/stok');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Ürün hatası: " + error.message };
  }
}
/**
 * --- CARİ İŞLEMLERİ ---
 */
export async function saveContact(data: any) {
  try {
    const payload = {
      name: (data.name || '').trim(),
      type: data.type || 'customer',
      tax_office: data.tax_office || null,
      tax_number: data.tax_number || null,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      district: data.district || null,
      city: data.city || null,
      is_company: !!data.is_company,
      is_deleted: false
    };

    const { error } = data.id 
      ? await supabase.from('contacts').update(payload).eq('id', data.id)
      : await supabase.from('contacts').insert([payload]);

    if (error) throw error;
    revalidatePath('/cariler');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Cari hatası: " + error.message };
  }
}

/**
 * --- FİNANS (TAHSİLAT / ÖDEME) ---
 */
export async function addFinanceEntry(data: {
  contact_id: string;
  type: FinanceType;
  amount: number;
  payment_method?: PaymentMethod;
  description?: string;
}) {
  try {
    const amount = toFixedNum(Math.abs(toNumber(data.amount)));
    if (amount <= 0) throw new Error("Geçerli bir tutar giriniz.");

    const { error } = await supabase.from('finance_logs').insert([{
      contact_id: data.contact_id,
      amount,
      type: data.type,
      payment_method: data.payment_method || 'cash',
      description: data.description?.trim(),
    }]);

    if (error) throw error;

    revalidatePath('/finans');
    revalidatePath(`/cariler/${data.contact_id}`); // Cari detay sayfasını da tazele
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * --- FATURA / İŞLEM (SATIŞ / ALIM) ---
 */
export async function createTransaction(data: {
  contact_id: string;
  type: TransactionType;
  invoice_type?: 'SATIS' | 'IADE' | 'TEVKIFAT' | 'ISTISNA';
  doc_no?: string;
  items: TransactionItem[];
  description?: string;
}) {
  try {
    if (!data.items?.length) throw new Error("İşlem için en az bir ürün seçilmelidir.");

    let subtotal = 0;
    let tax_total = 0;
    let discount_total = 0;

    // 1. Kalemleri ve Toplamları Hesapla
    const itemsPayload = data.items.map(i => {
      const q = Math.abs(toNumber(i.quantity));
      const p = Math.abs(toNumber(i.unit_price));
      const d = Math.abs(toNumber(i.discount_amount || 0));
      const tr = i.tax_rate ?? 20;
      
      const line_subtotal = (q * p) - d;
      const line_tax = (line_subtotal * tr) / 100;
      
      subtotal += (q * p);
      discount_total += d;
      tax_total += line_tax;

      return {
        product_id: i.product_id,
        quantity: q,
        unit_price: p,
        tax_rate: tr,
        tax_amount: toFixedNum(line_tax),
        discount_amount: toFixedNum(d),
        line_total: toFixedNum(line_subtotal + line_tax),
        net_unit_price: toFixedNum(line_subtotal / q)
      };
    });

    const grand_total = (subtotal - discount_total) + tax_total;

    // 2. Transaction Başlığını Oluştur
    const { data: trans, error: tError } = await supabase
      .from('transactions')
      .insert([{
        contact_id: data.contact_id,
        type: data.type,
        invoice_type: data.invoice_type || 'SATIS',
        doc_no: data.doc_no || `MNX${new Date().getFullYear()}${Date.now().toString().slice(-6)}`,
        ett_no: crypto.randomUUID(),
        subtotal: toFixedNum(subtotal),
        tax_total: toFixedNum(tax_total),
        discount_total: toFixedNum(discount_total),
        total_amount: toFixedNum(grand_total),
        description: data.description || `Memonex ${data.type} işlemi`,
        status: 'onaylandi'
      }])
      .select('id').single();

    if (tError) throw tError;

    // 3. Kalemleri Kaydet
    const finalItems = itemsPayload.map(item => ({ 
      ...item, 
      transaction_id: trans.id 
    }));

    const { error: iError } = await supabase.from('transaction_items').insert(finalItems);
    
    if (iError) {
      // Rollback: Kalemler başarısızsa transaction'ı sil
      await supabase.from('transactions').delete().eq('id', trans.id);
      throw iError;
    }

    revalidatePath('/stok');
    revalidatePath('/cariler');
    revalidatePath('/satis');
    revalidatePath('/alis');
    
    return { success: true, id: trans.id };
  } catch (err: any) {
    console.error("Transaction Error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * --- SİLME İŞLEMLERİ ---
 */
export async function deleteTransaction(id: string) {
  try {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;

    revalidatePath('/', 'layout'); // Tüm veriler değişmiş olabileceği için layout bazlı refresh
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteContact(contactId: string) {
  try {
    const { error } = await supabase.from('contacts').update({ is_deleted: true }).eq('id', contactId);
    if (error) throw error;
    revalidatePath('/cariler');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteProduct(productId: string) {
  try {
    const { error } = await supabase.from('products').update({ is_deleted: true }).eq('id', productId);
    if (error) throw error;
    revalidatePath('/stok');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteFinanceEntry(id: string) {
  try {
    const { error } = await supabase.from('finance_logs').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/finans');
    revalidatePath('/cariler');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
