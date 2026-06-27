const FIREBASE_VERSION = '10.14.1';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyACVC5zHB9QVXVgHlr3p7MvG30rIylUrxk',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'edupractice-ab9a2.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'edupractice-ab9a2',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'edupractice-ab9a2.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '816355594607',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:816355594607:web:9d3d7f48a56f056373d89a',
};

let firebasePromise;

export const normalizeAuthIdentifier = (role, username) => {
  const value = String(username || '').trim().toLowerCase();
  if (value.includes('@')) return value;
  const safe = value.replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return `${role}.${safe || 'user'}@edupractice.local`;
};

export const ensurePassword = (password, fallback) => {
  const preferred = String(password || '').trim();
  if (preferred.length >= 6) return preferred;
  const fallbackValue = String(fallback || '').trim();
  if (fallbackValue.length >= 6) return fallbackValue;
  return `${fallbackValue || 'edupractice'}123456`;
};

export const loadFirebase = async () => {
  if (!firebasePromise) {
    firebasePromise = (async () => {
      const [appModule, authModule, firestoreModule] = await Promise.all([
        import(/* @vite-ignore */ `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
        import(/* @vite-ignore */ `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
        import(/* @vite-ignore */ `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`),
      ]);
      const app = appModule.getApps().length ? appModule.getApp() : appModule.initializeApp(firebaseConfig);
      return {
        app,
        auth: authModule.getAuth(app),
        db: firestoreModule.getFirestore(app),
        modules: { app: appModule, auth: authModule, firestore: firestoreModule },
      };
    })();
  }
  return firebasePromise;
};

export const createManagedAuthUser = async ({ role, username, password, profile }) => {
  const { db, modules } = await loadFirebase();
  const secondaryApp = modules.app.initializeApp(firebaseConfig, `provision-${Date.now()}-${Math.random()}`);
  const secondaryAuth = modules.auth.getAuth(secondaryApp);
  const email = normalizeAuthIdentifier(role, username);
  try {
    const credential = await modules.auth.createUserWithEmailAndPassword(secondaryAuth, email, password);
    await modules.firestore.setDoc(modules.firestore.doc(db, 'users', credential.user.uid), {
      uid: credential.user.uid,
      email,
      role,
      username: String(username || ''),
      ...profile,
      createdAt: modules.firestore.serverTimestamp(),
      updatedAt: modules.firestore.serverTimestamp(),
    }, { merge: true });
    await modules.auth.signOut(secondaryAuth).catch(() => {});
    return { uid: credential.user.uid, email };
  } finally {
    await modules.app.deleteApp(secondaryApp).catch(() => {});
  }
};
