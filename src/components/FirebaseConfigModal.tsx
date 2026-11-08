import React, { useState } from 'react';
import { 
  X, Database, CheckCircle2, AlertCircle, ExternalLink, 
  Copy, Key, RefreshCw, Sparkles, Terminal, FileCode 
} from 'lucide-react';
import { firebaseConfig, isFirebaseConfigured, saveRuntimeFirebaseConfig } from '../firebase/firebaseConfig';
import { testFirestoreConnection } from '../firebase/firebase';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const isConfigured = isFirebaseConfigured();
  const [apiKey, setApiKey] = useState(firebaseConfig.apiKey === 'YOUR_API_KEY_HERE' ? '' : firebaseConfig.apiKey);
  const [projectId, setProjectId] = useState(firebaseConfig.projectId === 'YOUR_PROJECT_ID_HERE' ? '' : firebaseConfig.projectId);
  const [authDomain, setAuthDomain] = useState(firebaseConfig.authDomain.includes('YOUR_PROJECT_ID') ? '' : firebaseConfig.authDomain);
  const [storageBucket, setStorageBucket] = useState(firebaseConfig.storageBucket.includes('YOUR_PROJECT_ID') ? '' : firebaseConfig.storageBucket);
  const [messagingSenderId, setMessagingSenderId] = useState(firebaseConfig.messagingSenderId === 'YOUR_MESSAGING_SENDER_ID' ? '' : firebaseConfig.messagingSenderId);
  const [appId, setAppId] = useState(firebaseConfig.appId === 'YOUR_APP_ID_HERE' ? '' : firebaseConfig.appId);

  const [testStatus, setTestStatus] = useState<{ loading: boolean; message?: string; success?: boolean }>({
    loading: false,
  });
  const [copied, setCopied] = useState(false);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !projectId.trim()) {
      alert('Please provide at least your Firebase API Key and Project ID.');
      return;
    }

    saveRuntimeFirebaseConfig({
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      storageBucket: storageBucket.trim() || `${projectId.trim()}.appspot.com`,
      messagingSenderId: messagingSenderId.trim() || '123456789',
      appId: appId.trim() || '1:123456789:web:abcdef',
    });
  };

  const handleTestConnection = async () => {
    setTestStatus({ loading: true });
    const res = await testFirestoreConnection();
    setTestStatus({
      loading: false,
      success: res.success,
      message: res.message,
    });
  };

  const copySampleConfig = () => {
    const snippet = `// File: src/firebase/firebaseConfig.ts
export const firebaseConfig = {
  apiKey: "${apiKey || 'AIzaSy...'}",
  authDomain: "${projectId ? `${projectId}.firebaseapp.com` : 'your-project.firebaseapp.com'}",
  projectId: "${projectId || 'your-project-id'}",
  storageBucket: "${projectId ? `${projectId}.appspot.com` : 'your-project.appspot.com'}",
  messagingSenderId: "${messagingSenderId || '123456789'}",
  appId: "${appId || '1:123456789:web:abc123'}"
};`;
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" />

      {/* Main Dialog */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92dvh] animate-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="bg-[#005A36] text-white p-4 sm:p-5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FFC72C] text-[#1E1E1E] flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-[#005A36]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
                Firebase Database Configuration
              </h2>
              <p className="text-[11px] text-[#C8E6C9] truncate">
                Connect your Firebase Console & Firestore database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Bar */}
        <div className={`px-4 py-2.5 border-b text-xs flex items-center justify-between gap-2 shrink-0 ${
          isConfigured 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            {isConfigured ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span className="font-semibold truncate">
              {isConfigured 
                ? 'Firebase Configured · Live Firestore Sync Active' 
                : 'Firebase Config File Ready · Paste your API key below or in src/firebase/firebaseConfig.ts'}
            </span>
          </div>

          {isConfigured && (
            <button
              onClick={handleTestConnection}
              disabled={testStatus.loading}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${testStatus.loading ? 'animate-spin' : ''}`} />
              <span>Test Connection</span>
            </button>
          )}
        </div>

        {/* Test Result Message */}
        {testStatus.message && (
          <div className={`px-4 py-2 text-xs border-b ${
            testStatus.success 
              ? 'bg-emerald-100/70 border-emerald-200 text-emerald-900' 
              : 'bg-rose-100/70 border-rose-200 text-rose-900'
          }`}>
            <span className="font-bold">{testStatus.success ? 'Success: ' : 'Notice: '}</span>
            {testStatus.message}
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4 text-slate-700">
          {/* Step-by-step Guide */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#0B7B48]" />
                How to set up in Firebase Console:
              </span>
              <a
                href="https://console.firebase.google.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[#005A36] hover:underline font-bold"
              >
                Open Firebase Console <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
              <li>Open your project at <strong>console.firebase.google.com</strong>.</li>
              <li>Go to <strong>Project Settings</strong> &gt; <strong>General</strong> &gt; <strong>Your apps</strong> &gt; Click <strong>Web ( &lt;/&gt; )</strong> to register an app.</li>
              <li>Copy the credentials from the Firebase SDK snippet.</li>
              <li>Go to <strong>Firestore Database</strong> and click <strong>Create Database</strong> (start in Test mode).</li>
              <li>Paste your keys below (or into <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">src/firebase/firebaseConfig.ts</code>).</li>
            </ol>
          </div>

          {/* Form to paste credentials directly */}
          <form onSubmit={handleSaveConfig} className="space-y-3">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Paste Firebase Web App Credentials:</span>
              <button
                type="button"
                onClick={copySampleConfig}
                className="text-[11px] font-semibold text-[#005A36] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? 'Copied code!' : 'Copy Code Snippet'}</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                API Key (apiKey) *
              </label>
              <div className="minsu-input-wrapper">
                <div className="minsu-icon-box">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Project ID (projectId) *
                </label>
                <input
                  type="text"
                  placeholder="minsu-foundit-app"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#005A36]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Auth Domain (optional)
                </label>
                <input
                  type="text"
                  placeholder="project-id.firebaseapp.com"
                  value={authDomain}
                  onChange={(e) => setAuthDomain(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#005A36]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Storage Bucket (optional)
                </label>
                <input
                  type="text"
                  placeholder="project-id.appspot.com"
                  value={storageBucket}
                  onChange={(e) => setStorageBucket(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#005A36]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  App ID (optional)
                </label>
                <input
                  type="text"
                  placeholder="1:123456789:web:abcdef..."
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#005A36]"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <span className="text-[11px] text-slate-500">
                You can also directly edit <code className="bg-slate-100 px-1 py-0.5 rounded text-[#005A36] font-semibold">src/firebase/firebaseConfig.ts</code>
              </span>
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#005A36] hover:bg-[#00472a] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-[#FFC72C]" />
                <span>Save & Connect Firebase</span>
              </button>
            </div>
          </form>

          {/* Files created in project info */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs space-y-1 text-emerald-900">
            <span className="font-bold flex items-center gap-1 text-[#005A36]">
              <FileCode className="w-3.5 h-3.5" />
              Generated Project Files:
            </span>
            <ul className="list-disc list-inside text-[11px] text-emerald-800 space-y-0.5 pl-1">
              <li><strong>/src/firebase/firebaseConfig.ts</strong>: Ready for your Firebase credentials</li>
              <li><strong>/src/firebase/firebase.ts</strong>: Firestore sync, realtime listeners & CRUD</li>
              <li><strong>/firestore.rules</strong>: Security rules for items and users</li>
              <li><strong>/firebase-blueprint.json</strong>: Standard Firestore schema specification</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
