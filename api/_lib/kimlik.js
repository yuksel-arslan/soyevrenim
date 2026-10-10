// KİMLİK — "adını seç" kişi id'si + aile oturum jetonu.
// Ücretsiz kotayı internetten gelen isteklere karşı korumak için asistan ve hikâye
// uçları aile/admin jetonu ister; kişi id'si ağaçta var olmalı.
import { jetonDogrula } from '../giris.js';
import { agacOku } from './db.js';
import { adiGoster } from './agac.js';

export class KimlikHatasi extends Error {
  constructor(mesaj, kod = 401) { super(mesaj); this.kod = kod; }
}

export async function kimlikCoz(body) {
  const oturum = jetonDogrula(body.jeton);
  if (!oturum) throw new KimlikHatasi('Asistan için aile şifresiyle giriş yap.');
  // Kimlik önce OTURUMDAN (kişiye bağlı jeton / kişisel giriş bağlantısı); yoksa istemcinin seçimi
  const kisiId = String(oturum.kisi || body.kisi_id || '').trim();
  if (!/^[\w-]{1,40}$/.test(kisiId)) throw new KimlikHatasi('Önce adını seç ("Bu evrene kim bakıyor?").');
  const veri = await agacOku();
  const n = (veri.nodes || []).find((x) => x.id === kisiId);
  if (!n) throw new KimlikHatasi('Seçilen kişi ağaçta yok.', 404);
  return { kisiId, ad: adiGoster(n.name), rol: oturum.rol, veri };
}
