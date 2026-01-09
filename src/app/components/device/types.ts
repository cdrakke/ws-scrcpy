import GoogDeviceDescriptor from '../../../types/GoogDeviceDescriptor';
import { PlayerClass } from '../../player/BasePlayer';
import { ParamsDeviceTracker } from '../../../types/ParamsDeviceTracker';

export interface RecentConnection {
    host: string;
    port: number;
    timestamp: number;
}

export interface AdbCommandResult {
    success: boolean;
    message: string;
}

export interface DeviceCardProps {
    device: GoogDeviceDescriptor;
    trackerId: string;
    trackerParams: ParamsDeviceTracker;
    players: PlayerClass[];
    onCommand: (command: string, data: Record<string, unknown>) => void;
    onConfigureStream: (udid: string) => void;
    onOpenPlayer: (url: string) => void;
}

export interface DeviceListProps {
    devices: GoogDeviceDescriptor[];
    trackerId: string;
    trackerName: string;
    trackerParams: ParamsDeviceTracker;
    players: PlayerClass[];
    onCommand: (command: string, data: Record<string, unknown>) => void;
    onConnect: (host: string, port: number) => Promise<AdbCommandResult>;
    onDisconnect: (host: string, port: number) => Promise<AdbCommandResult>;
    onConfigureStream: (udid: string) => void;
    onOpenPlayer: (url: string) => void;
}

export interface AdbConnectFormProps {
    onConnect: (host: string, port: number) => Promise<AdbCommandResult>;
    onDisconnect: (host: string, port: number) => Promise<AdbCommandResult>;
}

export interface AdbConnectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConnect: (host: string, port: number) => Promise<AdbCommandResult>;
    onDisconnect: (host: string, port: number) => Promise<AdbCommandResult>;
}
