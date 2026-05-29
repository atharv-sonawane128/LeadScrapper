import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./firebase";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
}

type AuthCallback = (user: UserProfile | null) => void;

// LocalStorage Mock Auth implementation for sandbox mode
class MockAuthService {
  private listeners: AuthCallback[] = [];
  private currentUser: UserProfile | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("leadscraper_mock_user");
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
      }
    }
  }

  signUp(email: string, _: string): Promise<UserProfile> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const uid = `mock-user-${Math.random().toString(36).substring(2, 11)}`;
        const user = { uid, email, displayName: email.split("@")[0] };
        this.currentUser = user;
        localStorage.setItem("leadscraper_mock_user", JSON.stringify(user));
        this.notifyListeners();
        resolve(user);
      }, 800);
    });
  }

  signIn(email: string, _: string): Promise<UserProfile> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const uid = `mock-user-12345`;
        const user = { uid, email, displayName: email.split("@")[0] };
        this.currentUser = user;
        localStorage.setItem("leadscraper_mock_user", JSON.stringify(user));
        this.notifyListeners();
        resolve(user);
      }, 800);
    });
  }

  signOut(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.currentUser = null;
        localStorage.removeItem("leadscraper_mock_user");
        this.notifyListeners();
        resolve();
      }, 400);
    });
  }

  onAuthChange(callback: AuthCallback): () => void {
    this.listeners.push(callback);
    // Initial call
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.currentUser));
  }
}

const mockAuth = new MockAuthService();

export const authService = {
  isMock: !isFirebaseConfigured,

  signUp: async (email: string, pass: string): Promise<UserProfile> => {
    if (isFirebaseConfigured && auth) {
      const credential = await createUserWithEmailAndPassword(auth, email, pass);
      return {
        uid: credential.user.uid,
        email: credential.user.email,
        displayName: credential.user.displayName || email.split("@")[0],
      };
    } else {
      return mockAuth.signUp(email, pass);
    }
  },

  signIn: async (email: string, pass: string): Promise<UserProfile> => {
    if (isFirebaseConfigured && auth) {
      const credential = await signInWithEmailAndPassword(auth, email, pass);
      return {
        uid: credential.user.uid,
        email: credential.user.email,
        displayName: credential.user.displayName || email.split("@")[0],
      };
    } else {
      return mockAuth.signIn(email, pass);
    }
  },

  signOutUser: async (): Promise<void> => {
    if (isFirebaseConfigured && auth) {
      await fbSignOut(auth);
    } else {
      await mockAuth.signOut();
    }
  },

  onAuthChange: (callback: AuthCallback): () => void => {
    if (isFirebaseConfigured && auth) {
      return onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          callback({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
          });
        } else {
          callback(null);
        }
      });
    } else {
      return mockAuth.onAuthChange(callback);
    }
  }
};
