// Firebase Realtime Database — lobi / koltuk / beğeni / cüzdan-ID senkronu
// 🔴 Kökteki `balvakti/*` başka projenin verisi — DOKUNMA. Biz `soygun/` altındayız.
import { initializeApp } from 'firebase/app'
import {
  getDatabase, ref, onValue, set, update, get, remove,
  onDisconnect, runTransaction, serverTimestamp,
} from 'firebase/database'

const firebaseConfig = {
  databaseURL: 'https://liqidasyon-default-rtdb.europe-west1.firebasedatabase.app',
}

export const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
export const ROOT = 'soygun'   // kendi isim alanımız

export { ref, onValue, set, update, get, remove, onDisconnect, runTransaction, serverTimestamp }

// Kimlik: Telegram user → gerçek; değilse kalıcı misafir id
export function identity() {
  const tg = window.Telegram?.WebApp?.initDataUnsafe?.user
  if (tg?.id) return { uid: 'tg_' + tg.id, name: (tg.first_name || 'Oyuncu'), tg: true }
  let uid = localStorage.getItem('sg_uid')
  if (!uid) { uid = 'g_' + Math.random().toString(36).slice(2, 10); localStorage.setItem('sg_uid', uid) }
  return { uid, name: localStorage.getItem('sg_name') || ('MISAFIR' + uid.slice(-3).toUpperCase()), tg: false }
}

// Demo cüzdan: user başına kalıcı sahte EVM adresi üret, DB'ye eşle.
// (Gerçek sürümde TON Connect ile kullanıcının KENDİ cüzdanı bağlanır.)
export function demoWallet(uid) {
  let w = localStorage.getItem('sg_wallet')
  if (!w) {
    const hex = '0123456789abcdef'
    w = '0x' + Array.from({ length: 40 }, () => hex[Math.floor(Math.random() * 16)]).join('')
    localStorage.setItem('sg_wallet', w)
  }
  return w
}
