'use client';

import { CreatorSignInView } from './creator-sign-in-view';
import { CreatorRegisterView } from './creator-register-view';

type Props = {
  mode: 'sign-in' | 'register';
};

export function CreatorAuthView({ mode }: Props) {
  return mode === 'register' ? <CreatorRegisterView /> : <CreatorSignInView />;
}
