// Cloud Functions para notificaciones push de chat directo.
// Copia/usa este archivo como entrypoint de tus Functions
// (por ejemplo, `functions/index.js` en tu proyecto Firebase).

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Obtiene todos los tokens de push asociados a un usuario.
 * - Campo plano `expoPushToken` en `users/{uid}`.
 * - Subcolección `users/{uid}/devices/{token}` (permite varios dispositivos).
 */
/**
 * Obtiene todos los tokens de push asociados a un usuario, tanto del campo
 * plano `expoPushToken` como de la subcolección `devices` en `users/{uid}`.
 *
 * @param {string} userId UID del usuario destino.
 * @returns {Promise<string[]>} Lista de tokens Expo Push únicos.
 */
async function getUserPushTokens(userId) {
  const db = admin.firestore();
  const tokens = new Set();

  if (!userId) {
    return [];
  }

  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();

  if (userSnap.exists) {
    const data = userSnap.data() || {};
    const topLevelToken =
      typeof data.expoPushToken === "string" ? data.expoPushToken.trim() : "";
    if (topLevelToken) {
      tokens.add(topLevelToken);
    }
  }

  const devicesSnap = await userRef.collection("devices").get();
  devicesSnap.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const token =
      typeof data.token === "string" ? data.token.trim() : "";
    if (token) {
      tokens.add(token);
    }
  });

  return Array.from(tokens);
}

/**
 * Deriva un nombre legible a partir de los datos de usuario.
 */
/**
 * Deriva un nombre legible a partir de los datos de usuario
 * para mostrarlo en notificaciones y mensajes.
 *
 * @param {Object} userData Documento del usuario en Firestore.
 * @returns {string} Nombre legible para mostrar.
 */
function deriveDisplayName(userData) {
  if (!userData || typeof userData !== "object") {
    return "Contacto";
  }

  const name =
    (typeof userData.name === "string" && userData.name.trim()) ||
    (typeof userData.displayName === "string" &&
      userData.displayName.trim()) ||
    (typeof userData.email === "string" &&
      userData.email.trim().split("@")[0]);

  return name || "Contacto";
}

/**
 * Cloud Function:
 * Escucha nuevos mensajes en `privateChats/{chatId}/messages/{messageId}`
 * y envía una push notification vía Expo al otro participante.
 *
 * El `chatId` se espera en el formato usado en la app:
 *   `${uidA}_${uidB}` con ambos UID ordenados.
 */
exports.notifyOnNewMessage = functions.firestore
  .document("privateChats/{chatId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const message = snap.data();
    if (!message) {
      return null;
    }

    const { chatId } = context.params;
    const senderId = message.senderId;

    if (!chatId || !senderId) {
      return null;
    }

    const participantIds = String(chatId).split("_").filter(Boolean);
    if (participantIds.length !== 2) {
      return null;
    }

    const [uidA, uidB] = participantIds;
    const receiverId = senderId === uidA ? uidB : uidA;

    // No enviamos nada si no se puede determinar receptor
    // o si por error coincide con el emisor.
    if (!receiverId || receiverId === senderId) {
      return null;
    }

    const db = admin.firestore();

    // Cargamos datos del emisor y tokens del receptor.
    const [senderSnap, receiverTokens] = await Promise.all([
      db.collection("users").doc(senderId).get(),
      getUserPushTokens(receiverId),
    ]);

    if (!receiverTokens.length) {
      return null;
    }

    const senderData = senderSnap.exists ? senderSnap.data() || {} : {};
    const senderName = deriveDisplayName(senderData);
    const senderEmail =
      typeof senderData.email === "string" ? senderData.email : undefined;

    const preview =
      typeof message.text === "string" && message.text.trim()
        ? message.text.trim().slice(0, 140)
        : "Tienes un nuevo mensaje";

    // Construimos un payload por token, como en el ejemplo.
    const payloads = receiverTokens.map((token) => ({
      to: token,
      title: `Nuevo mensaje de ${senderName}`,
      body: preview,
      data: {
        type: "NEW_MESSAGE",
        legacyType: "chat",
        chatId,
        senderId,
        senderName,
        senderEmail,
        friendUid: senderId,
        friendName: senderName,
        friendEmail: senderEmail,
        preview,
      },
    }));

    // Usa fetch global (Node 18+) o recurre a node-fetch si es necesario.
    let fetchImpl = global.fetch;
    if (typeof fetchImpl !== "function") {
      // eslint-disable-next-line global-require
      fetchImpl = require("node-fetch");
    }

    await fetchImpl("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloads),
    });

    return null;
  });

/**
 * Cloud Function:
 * Escucha nuevas solicitudes de amistad en
 * `users/{targetUid}/friendships/{friendUid}` y envía una notificación
 * push al usuario que recibe la solicitud.
 *
 * Se asume que:
 * - `status` === "pending" representa una solicitud pendiente.
 * - `initiatedBy` es el UID del usuario que envió la solicitud.
 */
exports.notifyOnFriendRequest = functions.firestore
  .document("users/{targetUid}/friendships/{friendUid}")
  .onCreate(async (snap, context) => {
    const friendship = snap.data() || {};
    const { targetUid } = context.params;

    const status = friendship.status || "pending";
    const initiatedBy = friendship.initiatedBy;

    if (status !== "pending") {
      return null;
    }

    if (!initiatedBy || initiatedBy === targetUid) {
      return null;
    }

    const db = admin.firestore();

    const [senderSnap, receiverTokens] = await Promise.all([
      db.collection("users").doc(initiatedBy).get(),
      getUserPushTokens(targetUid),
    ]);

    if (!receiverTokens.length) {
      return null;
    }

    const senderData = senderSnap.exists ? senderSnap.data() || {} : {};
    const senderName = deriveDisplayName(senderData);
    const senderEmail =
      typeof senderData.email === "string" ? senderData.email : undefined;

    const payloads = receiverTokens.map((token) => ({
      to: token,
      title: "Nueva solicitud de amistad",
      body: `${senderName} quiere unirse a tu red.`,
      data: {
        type: "FRIEND_REQUEST",
        legacyType: "friend-request",
        fromUserId: initiatedBy,
        senderId: initiatedBy,
        senderName,
        senderEmail,
        requestId: initiatedBy,
        friendUid: initiatedBy,
        targetUid,
        friendEmail: senderEmail,
      },
    }));

    let fetchImpl = global.fetch;
    if (typeof fetchImpl !== "function") {
      // eslint-disable-next-line global-require
      fetchImpl = require("node-fetch");
    }

    await fetchImpl("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloads),
    });

    return null;
  });
