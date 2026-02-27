import { useState, useEffect } from 'react';
import App from '../../App';
import { PassphraseDialog } from './PassphraseDialog';
import { isEncryptionEnabled, getCachedSessionKey } from '../../lib/encryptionStore';
import { importSessionKey, base64ToArrayBuffer } from '../../lib/crypto';
import { setSessionKey } from '../../lib/encryptionMiddleware';

function getInitialState() {
  if (!isEncryptionEnabled()) return { unlocked: true, cachedKey: null as string | null };
  return { unlocked: false, cachedKey: getCachedSessionKey() };
}

export function AppShell() {
  const [{ unlocked: initialUnlocked, cachedKey }] = useState(getInitialState);
  const [ready, setReady] = useState(!cachedKey);
  const [isUnlocked, setIsUnlocked] = useState(initialUnlocked);

  // Try to restore session from cached key on mount
  useEffect(() => {
    if (!cachedKey) return;

    importSessionKey(base64ToArrayBuffer(cachedKey))
      .then((key) => {
        setSessionKey(key);
        setIsUnlocked(true);
      })
      .catch(() => {
        // Cached key invalid — fall through to passphrase dialog
      })
      .finally(() => setReady(true));
  }, [cachedKey]);

  if (!ready) return null; // brief flash while importing cached key

  if (!isUnlocked) {
    return <PassphraseDialog onUnlocked={() => setIsUnlocked(true)} />;
  }

  return <App />;
}
