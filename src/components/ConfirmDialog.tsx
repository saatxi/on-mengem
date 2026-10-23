import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal } from './Modal';

interface ConfirmOptions {
  message: string;
  /** Text addicional sota la pregunta (admet salts de línia). */
  details?: string;
  confirmLabel?: string;
  /** Acció que esborra o no es pot desfer: el botó de confirmar surt en vermell. */
  destructive?: boolean;
}

interface DialogRequest extends ConfirmOptions {
  /** Diàleg informatiu: només hi ha el botó d'acceptar. */
  alertOnly: boolean;
}

type OpenDialog = (request: DialogRequest) => Promise<boolean>;

const DialogContext = createContext<OpenDialog | null>(null);

function useOpenDialog(): OpenDialog {
  const open = useContext(DialogContext);
  if (!open) throw new Error('useConfirm i useAlert s\'han de fer servir dins de <DialogProvider>');
  return open;
}

/** Substitut de `window.confirm()`: `if (await confirm({ message })) …`. Escape o cancel·lar donen `false`. */
export function useConfirm() {
  const open = useOpenDialog();
  return useCallback((options: ConfirmOptions) => open({ ...options, alertOnly: false }), [open]);
}

/** Substitut de `window.alert()`: la promesa es resol quan es tanca el diàleg. */
export function useAlert() {
  const open = useOpenDialog();
  return useCallback(
    async (message: string, details?: string) => {
      await open({ message, details, alertOnly: true });
    },
    [open],
  );
}

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);

  const open = useCallback<OpenDialog>((next) => {
    // Un diàleg nou mentre n'hi ha un d'obert compta com a cancel·lar l'anterior.
    resolveRef.current?.(false);
    setRequest(next);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const close = (ok: boolean) => {
    resolveRef.current?.(ok);
    resolveRef.current = null;
    setRequest(null);
  };

  return (
    <DialogContext.Provider value={open}>
      {children}
      {request && (
        <Modal
          label={request.message}
          onClose={() => close(false)}
          panelClassName="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6"
        >
          <div className="p-6 space-y-3">
            <p className="text-base font-bold text-stone-900">{request.message}</p>
            {request.details && <p className="text-sm text-stone-600 whitespace-pre-line">{request.details}</p>}
          </div>
          <div className="flex gap-2 px-6 pb-6">
            {!request.alertOnly && (
              <button
                type="button"
                onClick={() => close(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-700 hover:bg-stone-100 transition"
              >
                Cancel·lar
              </button>
            )}
            <button
              type="button"
              onClick={() => close(true)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition ${
                request.destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              {request.confirmLabel ?? 'Acceptar'}
            </button>
          </div>
        </Modal>
      )}
    </DialogContext.Provider>
  );
};
