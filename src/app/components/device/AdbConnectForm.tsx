import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Power, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { AdbConnectFormProps, RecentConnection } from './types';

const RECENT_CONNECTIONS_KEY = 'adb_recent_connections';
const MAX_RECENT_CONNECTIONS = 10;

type StatusType = 'idle' | 'pending' | 'success' | 'error';

interface Status {
    type: StatusType;
    message: string;
}

function loadRecentConnections(): RecentConnection[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];

    const stored = localStorage.getItem(RECENT_CONNECTIONS_KEY);
    if (!stored) return [];

    try {
        return JSON.parse(stored) as RecentConnection[];
    } catch {
        return [];
    }
}

function saveRecentConnection(host: string, port: number): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    let connections = loadRecentConnections();

    // Remove existing entry for this host:port
    connections = connections.filter((c) => !(c.host === host && c.port === port));

    // Add to front
    connections.unshift({ host, port, timestamp: Date.now() });

    // Limit size
    connections = connections.slice(0, MAX_RECENT_CONNECTIONS);

    localStorage.setItem(RECENT_CONNECTIONS_KEY, JSON.stringify(connections));
}

function parseHostPort(value: string): { host: string; port: number } | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parts = trimmed.split(':');
    const host = parts[0];
    if (!host) return null;

    const port = parts.length > 1 ? parseInt(parts[1], 10) : 5555;
    if (isNaN(port) || port <= 0 || port > 65535) return null;

    return { host, port };
}

export function AdbConnectForm({ onConnect, onDisconnect }: AdbConnectFormProps): React.ReactElement {
    const [inputValue, setInputValue] = useState('');
    const [status, setStatus] = useState<Status>({ type: 'idle', message: '' });
    const [recentConnections, setRecentConnections] = useState<RecentConnection[]>([]);

    useEffect(() => {
        setRecentConnections(loadRecentConnections());
    }, []);

    const clearStatus = useCallback(() => {
        setStatus({ type: 'idle', message: '' });
    }, []);

    useEffect(() => {
        if (status.type === 'success' || status.type === 'error') {
            const timer = setTimeout(clearStatus, 5000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [status, clearStatus]);

    const handleConnect = async (): Promise<void> => {
        const parsed = parseHostPort(inputValue);
        if (!parsed) {
            setStatus({ type: 'error', message: 'Invalid format. Use IP:Port' });
            return;
        }

        setStatus({ type: 'pending', message: 'Connecting...' });

        try {
            const result = await onConnect(parsed.host, parsed.port);
            if (result.success) {
                setStatus({ type: 'success', message: `Connected: ${result.message}` });
                saveRecentConnection(parsed.host, parsed.port);
                setRecentConnections(loadRecentConnections());
            } else {
                setStatus({ type: 'error', message: `Failed: ${result.message}` });
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setStatus({ type: 'error', message: `Error: ${errorMessage}` });
        }
    };

    const handleDisconnect = async (): Promise<void> => {
        const parsed = parseHostPort(inputValue);
        if (!parsed) {
            setStatus({ type: 'error', message: 'Invalid format. Use IP:Port' });
            return;
        }

        setStatus({ type: 'pending', message: 'Disconnecting...' });

        try {
            const result = await onDisconnect(parsed.host, parsed.port);
            if (result.success) {
                setStatus({ type: 'success', message: `Disconnected: ${result.message}` });
            } else {
                setStatus({ type: 'error', message: `Failed: ${result.message}` });
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setStatus({ type: 'error', message: `Error: ${errorMessage}` });
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === 'Enter') {
            handleConnect();
        }
    };

    const handleRecentClick = (conn: RecentConnection): void => {
        setInputValue(`${conn.host}:${conn.port}`);
    };

    const statusColorClass =
        status.type === 'success'
            ? 'text-green-500'
            : status.type === 'error'
              ? 'text-red-500'
              : status.type === 'pending'
                ? 'text-muted-foreground'
                : '';

    return (
        <div className="p-4 bg-card border-b border-border space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
                <Input
                    type="text"
                    placeholder="IP:Port (e.g., 192.168.1.100:5555)"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="min-w-[250px] max-w-[300px] font-mono"
                />
                <Button variant="outline" onClick={handleConnect} disabled={status.type === 'pending'}>
                    <Power className="h-4 w-4" />
                    <span>Connect</span>
                </Button>
                <Button variant="outline" onClick={handleDisconnect} disabled={status.type === 'pending'}>
                    <X className="h-4 w-4" />
                    <span>Disconnect</span>
                </Button>
                {status.message && <span className={`text-sm ${statusColorClass}`}>{status.message}</span>}
            </div>

            {recentConnections.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Recent:</span>
                    {recentConnections.map((conn) => (
                        <Button
                            key={`${conn.host}:${conn.port}`}
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 font-mono text-xs"
                            onClick={() => handleRecentClick(conn)}
                        >
                            {conn.host}:{conn.port}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
}
