const unavailable = () => {
  throw new Error('Firebase auth is not configured for this app.');
};

export const signInWithPassword = async (..._args: any[]) => unavailable();

export const signInWithGoogle = async (..._args: any[]) => unavailable();

export const signInWithGithub = async (..._args: any[]) => unavailable();

export const signInWithTwitter = async (..._args: any[]) => unavailable();

export const signUp = async (..._args: any[]) => unavailable();

export const sendPasswordResetEmail = async (..._args: any[]) => unavailable();
