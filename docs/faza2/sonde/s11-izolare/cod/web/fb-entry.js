// Intrarea pentru pachetul Firebase (esbuild -> web/fb.bundle.js, servit de pe aceeasi origine, ca in aplicatia livrata)
export { initializeApp } from 'firebase/app';
export { getAuth, connectAuthEmulator, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, createUserWithEmailAndPassword } from 'firebase/auth';
