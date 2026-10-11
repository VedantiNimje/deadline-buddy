importScripts("https://www.gstatic.com/firebasejs/13.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/13.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyD1TlKdRD36_xR2hAm_HZRRO2YUK7dph-E",
    authDomain: "deadline-buddy-e615b.firebaseapp.com",
    projectId: "deadline-buddy-e615b",
    storageBucket: "deadline-buddy-e615b.firebasestorage.app",
    messagingSenderId: "586619181939",
    appId: "1:586619181939:web:223556fa72b7e3f5c70306",
    measurementId: "G-VKTKW9F42P"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
    const notificationTitle =
        payload.notification?.title || "🌷 Deadline Buddy Reminder";

    const notificationOptions = {
        body: payload.notification?.body || "You have an upcoming deadline!",
        icon: "./icon-192.png"
    };

    return self.registration.showNotification(
        notificationTitle,
        notificationOptions
    );
});