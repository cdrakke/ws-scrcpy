import * as React from 'react';
import { WifiOff } from 'lucide-react';
import GoogDeviceDescriptor from '../../../types/GoogDeviceDescriptor';

interface OfflineDeviceRowProps {
    device: GoogDeviceDescriptor;
}

function formatLastUpdate(timestamp: number | undefined): string {
    if (!timestamp) return 'Unknown';

    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
}

export function OfflineDeviceRow({ device }: OfflineDeviceRowProps): React.ReactElement {
    const deviceName = `${device['ro.product.manufacturer'] || 'Unknown'} ${device['ro.product.model'] || 'Device'}`;
    const lastSeen = formatLastUpdate(device['last.update.timestamp']);

    return (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 opacity-60 hover:opacity-80 transition-opacity">
            <WifiOff className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0 flex items-center gap-4">
                <span className="font-medium truncate">{deviceName}</span>
                <span className="text-muted-foreground hidden sm:inline">|</span>
                <span className="text-xs font-mono text-muted-foreground truncate hidden sm:inline">
                    {device.udid}
                </span>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
                Last seen: {lastSeen}
            </span>
        </div>
    );
}
