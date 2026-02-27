import { useState } from 'react';
import App from '../../App';
import { PassphraseDialog } from './PassphraseDialog';
import { isEncryptionEnabled } from '../../lib/encryptionStore';

export function AppShell() {
  const [unlocked, setUnlocked] = useState(() => !isEncryptionEnabled());

  if (!unlocked) {
    return <PassphraseDialog onUnlocked={() => setUnlocked(true)} />;
  }

  return <App />;
}
