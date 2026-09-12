import { useState } from 'react';
import { Shield, User, Database, Cpu } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [ollamaModel]    = useState(import.meta.env.VITE_OLLAMA_MODEL ?? 'llama3.2');

  return (
    <div className="p-6 max-w-xl space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Account and system configuration</p>
      </div>

      {/* Profile */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <User className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-200">Profile</h2>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Name</span>
            <span className="text-white">{user?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="text-white">{user?.email}</span>
          </div>
        </div>
      </Card>

      {/* AI Model */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Cpu className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-200">AI Configuration</h2>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Engine</span>
            <span className="text-white">Ollama (local)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Model</span>
            <span className="text-white font-mono text-xs">{ollamaModel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">API cost</span>
            <span className="text-green-400 font-medium">₹0 / free</span>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-3">
          All AI inference runs locally. No data is sent to external services.
        </p>
      </Card>

      {/* Privacy */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-200">Privacy & Data</h2>
        </div>
        <ul className="text-xs text-gray-500 space-y-1.5">
          <li>✓ Passwords hashed with bcrypt (12 rounds)</li>
          <li>✓ JWT authentication — tokens expire after 7 days</li>
          <li>✓ Demo mode uses entirely fictional data</li>
          <li>✓ No real personal data collected or shared</li>
          <li>✓ Database stored locally (PostgreSQL)</li>
        </ul>
      </Card>

      {/* Danger zone */}
      <Card>
        <h2 className="text-sm font-semibold text-red-400 mb-3">Danger Zone</h2>
        <button
          onClick={logout}
          className="text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg transition-colors">
          Sign Out
        </button>
      </Card>
    </div>
  );
}
