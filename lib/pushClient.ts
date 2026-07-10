"use client";

type PushSession = {
  access_token: string;
  user: {
    id: string;
  };
};

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

function getApplicationServerKey() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const applicationServerKey = urlBase64ToUint8Array(vapidKey);
  if (applicationServerKey.byteLength !== 65) {
    throw new Error("Push public key is invalid. Generate a new VAPID key pair.");
  }
  return { vapidKey, applicationServerKey };
}

function toPushErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/push service/i.test(message)) {
    return "Push service registration failed. Check the VAPID keys, then refresh and try again.";
  }
  if (/applicationServerKey|VAPID|public key/i.test(message)) {
    return message;
  }
  return error instanceof Error ? error.message : "Could not enable notifications.";
}

export function getPushSupportError() {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "This browser does not support web notifications.";
  }
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return "Push notifications are not configured.";
  }
  return null;
}

export function getNotificationPermissionHelp() {
  return "Notifications are blocked for this site. Open browser site settings, allow Notifications, then refresh and try again.";
}

export async function subscribeDeviceToPush(options: {
  session: PushSession | null;
  endpoint: "/api/v1/push-subscriptions" | "/api/v1/admin/push-subscriptions";
}) {
  const supportError = getPushSupportError();
  if (supportError) throw new Error(supportError);
  if (!options.session) throw new Error("Sign in again to enable notifications.");
  const { vapidKey, applicationServerKey } = getApplicationServerKey();

  if (Notification.permission === "denied") {
    throw new Error(getNotificationPermissionHelp());
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(getNotificationPermissionHelp());
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (subscription && localStorage.getItem("linkup:vapid-public-key") !== vapidKey) {
    await subscription.unsubscribe().catch(() => undefined);
    subscription = null;
  }
  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    } catch (error) {
      throw new Error(toPushErrorMessage(error));
    }
  }

  const response = await fetch(options.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.session.access_token}`,
      "x-user-id": options.session.user.id,
    },
    body: JSON.stringify(subscription.toJSON()),
  });

  if (!response.ok) {
    await subscription.unsubscribe().catch(() => undefined);
    throw new Error("Could not save notification subscription.");
  }

  localStorage.setItem("linkup:vapid-public-key", vapidKey);
  return subscription;
}

export async function unsubscribeDeviceFromPush(options: {
  session: PushSession | null;
  endpoint: "/api/v1/push-subscriptions" | "/api/v1/admin/push-subscriptions";
}) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const { endpoint } = subscription;
  await subscription.unsubscribe();
  localStorage.removeItem("linkup:vapid-public-key");

  if (!options.session) return;

  await fetch(options.endpoint, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.session.access_token}`,
      "x-user-id": options.session.user.id,
    },
    body: JSON.stringify({ endpoint }),
  });
}
