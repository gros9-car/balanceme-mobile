import CryptoJS from "crypto-js";

const DEFAULT_SECRET = "balanceme-local-secret";

const resolveSecret = () =>
  (process.env.EXPO_PUBLIC_MESSAGE_SECRET || "").trim() || DEFAULT_SECRET;

const deriveKey = (chatId) => {
  const secret = resolveSecret();
  return CryptoJS.SHA256(`${secret}:${chatId}`).toString();
};

// Genera un par {ciphertext, iv, version} listo para persistir en Firestore.
export const encryptChatMessage = (plainText, chatId) => {
  if (!plainText || !chatId) {
    return null;
  }

  const iv = CryptoJS.lib.WordArray.random(16);
  const key = CryptoJS.enc.Hex.parse(deriveKey(chatId));

  const encrypted = CryptoJS.AES.encrypt(plainText, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return {
    ciphertext: encrypted.toString(),
    iv: iv.toString(CryptoJS.enc.Hex),
    version: 1,
  };
};

// Devuelve el texto plano o null si no puede desencriptar.
export const decryptChatMessage = (payload, chatId) => {
  if (!payload?.ciphertext || !payload?.iv || !chatId) {
    return null;
  }

  try {
    const key = CryptoJS.enc.Hex.parse(deriveKey(chatId));
    const decrypted = CryptoJS.AES.decrypt(payload.ciphertext, key, {
      iv: CryptoJS.enc.Hex.parse(payload.iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const text = decrypted.toString(CryptoJS.enc.Utf8);
    return text || null;
  } catch (error) {
    return null;
  }
};
