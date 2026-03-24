'use server'

// createClient yerine doğrudan 'supabase' objesini içeri alıyoruz
import { supabase } from '@/lib/supabase' 
import { revalidatePath } from 'next/cache'

/**
 * Ürüne ait tüm tedarikçi tekliflerini getirir.
 */
export async function getSupplierOffers(productId: string) {
  // Artık const supabase = createClient() satırına GEREK YOK.
  
  const { data, error } = await supabase
    .from('product_supplier_offers')
    .select(`
      *,
      contacts:supplier_id (id, name)
    `)
    .eq('product_id', productId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Teklifler getirilirken hata:', error)
    return []
  }
  
  return data
}

/**
 * Yeni bir tedarikçi teklifi ekler veya mevcut olanı günceller.
 */
export async function upsertSupplierOffer(payload: any) {
  // const supabase = createClient() satırını sildik, yukarıdaki import yeterli.
  
  const { data, error } = await supabase
    .from('product_supplier_offers')
    .upsert({
      ...(payload.id && { id: payload.id }),
      product_id: payload.product_id,
      supplier_id: payload.supplier_id,
      supplier_sku: payload.supplier_sku?.toUpperCase(),
      supplier_description: payload.supplier_description,
      unit_price: parseFloat(payload.unit_price),
      currency: payload.currency || 'TRY',
      updated_at: new Date().toISOString()
    })
    .select()

  if (error) throw new Error(error.message)
  
  revalidatePath(`/stok/hareketler/${payload.product_id}`)
  return { success: true, data }
}

// Diğer fonksiyonlarda da (delete, applyOffer vb.) 
// 'const supabase = createClient()' satırlarını kaldırıp 
// doğrudan 'supabase.from(...)' şeklinde kullanabilirsin.