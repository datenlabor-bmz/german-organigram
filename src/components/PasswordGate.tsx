'use client';

import { useState, useEffect, ReactNode } from 'react';

const PASSWORD = 'Staatsmodernisierung';

export default function PasswordGate({ children }: { children: ReactNode }) {
    const [authenticated, setAuthenticated] = useState<boolean | null>(null);
    const [input, setInput] = useState('');
    const [error, setError] = useState(false);

    useEffect(() => {
        setAuthenticated(localStorage.getItem('auth') === 'true');
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input === PASSWORD) {
            localStorage.setItem('auth', 'true');
            setAuthenticated(true);
        } else {
            setError(true);
            setInput('');
        }
    };

    if (authenticated === null) return null;
    if (authenticated) return <>{children}</>;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
                <h2 className="text-xl font-semibold mb-4 text-center">Passwort erforderlich</h2>
                <input
                    type="password"
                    value={input}
                    onChange={(e) => { setInput(e.target.value); setError(false); }}
                    placeholder="Passwort"
                    className={`w-full px-4 py-2 border rounded-md mb-4 ${error ? 'border-red-500' : 'border-gray-300'}`}
                    autoFocus
                />
                {error && <p className="text-red-500 text-sm mb-4">Falsches Passwort</p>}
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors">
                    Einloggen
                </button>
            </form>
        </div>
    );
}

