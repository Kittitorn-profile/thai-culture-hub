const unavailable = () => {
  throw new Error('Amplify auth is not configured for this app.');
};

export const signInWithPassword = async (..._args: any[]) => unavailable();

export const signUp = async (..._args: any[]) => unavailable();

export const resetPassword = async (..._args: any[]) => unavailable();

export const updatePassword = async (..._args: any[]) => unavailable();

export const confirmSignUp = async (..._args: any[]) => unavailable();

export const resendSignUpCode = async (..._args: any[]) => unavailable();
