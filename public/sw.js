self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "LinkUp", body: event.data ? event.data.text() : "New notification" };
  }

  const title = payload.title || "LinkUp";
  const options = {
    body: payload.body || "You have a new update.",
    icon: "/img/linkup-nav-mark.png",
    badge: "/img/linkup-nav-mark.png",
    tag: payload.tag || "linkup-notification",
    data: { url: payload.url || "/admin/orders" },
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin/orders";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
