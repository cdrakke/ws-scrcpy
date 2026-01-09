import '../../../style/devicelist.css';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { BaseDeviceTracker } from '../../client/BaseDeviceTracker';
import { ACTION } from '../../../common/Action';
import GoogDeviceDescriptor from '../../../types/GoogDeviceDescriptor';
import { ControlCenterCommand } from '../../../common/ControlCenterCommand';
import { StreamClientScrcpy } from './StreamClientScrcpy';
import { ConfigureScrcpy } from './ConfigureScrcpy';
import { Message } from '../../../types/Message';
import { ParamsStreamScrcpy } from '../../../types/ParamsStreamScrcpy';
import { HostItem } from '../../../types/Configuration';
import { ChannelCode } from '../../../common/ChannelCode';
import { Tool } from '../../client/Tool';
import { HostTracker } from '../../client/HostTracker';
import { DeviceList } from '../../components/device/DeviceList';
import { AdbCommandResult } from '../../components/device/types';

export class DeviceTracker extends BaseDeviceTracker<GoogDeviceDescriptor, never> {
    public static readonly ACTION = ACTION.GOOG_DEVICE_LIST;
    public static readonly CREATE_DIRECT_LINKS = true;
    private static instancesByUrl: Map<string, DeviceTracker> = new Map();
    protected static tools: Set<Tool> = new Set();
    protected tableId = 'goog_device_list';
    private pendingRequests: Map<number, (result: AdbCommandResult) => void> = new Map();
    private reactRoot: Root | null = null;

    public static start(hostItem: HostItem): DeviceTracker {
        const url = this.buildUrlForTracker(hostItem).toString();
        let instance = this.instancesByUrl.get(url);
        if (!instance) {
            instance = new DeviceTracker(hostItem, url);
        }
        return instance;
    }

    public static getInstance(hostItem: HostItem): DeviceTracker {
        return this.start(hostItem);
    }

    protected constructor(params: HostItem, directUrl: string) {
        super({ ...params, action: DeviceTracker.ACTION }, directUrl);
        DeviceTracker.instancesByUrl.set(directUrl, this);
        this.buildDeviceTable();
        this.openNewConnection();
    }

    protected onSocketOpen(): void {
        // nothing here;
    }

    protected setIdAndHostName(id: string, hostName: string): void {
        super.setIdAndHostName(id, hostName);
        for (const value of DeviceTracker.instancesByUrl.values()) {
            if (value.id === id && value !== this) {
                console.warn(
                    `Tracker with url: "${this.url}" has the same id(${this.id}) as tracker with url "${value.url}"`,
                );
                console.warn(`This tracker will shut down`);
                this.destroy();
            }
        }
    }

    protected getChannelCode(): string {
        return ChannelCode.GTRC;
    }

    public destroy(): void {
        super.destroy();
        if (this.reactRoot) {
            this.reactRoot.unmount();
            this.reactRoot = null;
        }
        DeviceTracker.instancesByUrl.delete(this.url.toString());
        if (!DeviceTracker.instancesByUrl.size) {
            const holder = document.getElementById(BaseDeviceTracker.HOLDER_ELEMENT_ID);
            if (holder && holder.parentElement) {
                holder.parentElement.removeChild(holder);
            }
        }
    }

    protected onSocketMessage(event: MessageEvent): void {
        let message: Message;
        try {
            message = JSON.parse(event.data);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[DeviceTracker]', errorMessage);
            return;
        }

        // Handle responses for pending ADB connect/disconnect requests
        if (
            message.type === `${ControlCenterCommand.ADB_CONNECT}_response` ||
            message.type === `${ControlCenterCommand.ADB_DISCONNECT}_response`
        ) {
            const pending = this.pendingRequests.get(message.id);
            if (pending) {
                this.pendingRequests.delete(message.id);
                pending(message.data as AdbCommandResult);
            }
            return;
        }

        // Delegate to parent for standard messages
        super.onSocketMessage(event);
    }

    // Command handler for React components
    private handleCommand = (command: string, data: Record<string, unknown>): void => {
        const message: Message = {
            id: this.getNextId(),
            type: command,
            data,
        };

        if (this.ws && this.ws.readyState === this.ws.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    };

    // ADB Connect handler for React components
    private handleConnect = (host: string, port: number): Promise<AdbCommandResult> => {
        return new Promise((resolve) => {
            const id = this.getNextId();
            const message: Message = {
                id,
                type: ControlCenterCommand.ADB_CONNECT,
                data: { host, port },
            };

            if (this.ws && this.ws.readyState === this.ws.OPEN) {
                this.ws.send(JSON.stringify(message));
                this.pendingRequests.set(id, resolve);
            } else {
                resolve({ success: false, message: 'WebSocket not connected' });
            }
        });
    };

    // ADB Disconnect handler for React components
    private handleDisconnect = (host: string, port: number): Promise<AdbCommandResult> => {
        return new Promise((resolve) => {
            const id = this.getNextId();
            const message: Message = {
                id,
                type: ControlCenterCommand.ADB_DISCONNECT,
                data: { host, port },
            };

            if (this.ws && this.ws.readyState === this.ws.OPEN) {
                this.ws.send(JSON.stringify(message));
                this.pendingRequests.set(id, resolve);
            } else {
                resolve({ success: false, message: 'WebSocket not connected' });
            }
        });
    };

    // Configure stream handler for React components
    private handleConfigureStream = (udid: string): void => {
        const descriptor = this.getDescriptorByUdid(udid);
        if (!descriptor) {
            return;
        }

        const options: ParamsStreamScrcpy = {
            udid,
            ws: '',
            player: '',
            action: ACTION.STREAM_SCRCPY,
            secure: this.params.secure,
            hostname: this.params.hostname,
            port: this.params.port,
            pathname: this.params.pathname,
            useProxy: this.params.useProxy,
        };

        const dialog = new ConfigureScrcpy(this, descriptor, options);
        dialog.on('closed', this.onConfigureDialogClosed);
    };

    private onConfigureDialogClosed = (event: { dialog: ConfigureScrcpy; result: boolean }): void => {
        event.dialog.off('closed', this.onConfigureDialogClosed);
        if (event.result) {
            HostTracker.getInstance().destroy();
        }
    };

    // Open player in new tab
    private handleOpenPlayer = (url: string): void => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    // Build device row - required by base class but not used (React handles rendering)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected buildDeviceRow(_tbody: Element, _device: GoogDeviceDescriptor): void {
        // React handles device rendering, this is a no-op
    }

    protected buildDeviceTable(): void {
        const holder = this.getOrCreateTableHolder();

        // Create or get React root container
        const containerId = `react-root-${this.elementId}`;
        let container = document.getElementById(containerId);

        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            holder.appendChild(container);
            this.reactRoot = createRoot(container);
        }

        // Render React component with current device data
        if (this.reactRoot) {
            this.reactRoot.render(
                React.createElement(DeviceList, {
                    devices: this.descriptors,
                    trackerId: this.id,
                    trackerName: this.trackerName,
                    trackerParams: this.params,
                    players: StreamClientScrcpy.getPlayers(),
                    onCommand: this.handleCommand,
                    onConnect: this.handleConnect,
                    onDisconnect: this.handleDisconnect,
                    onConfigureStream: this.handleConfigureStream,
                    onOpenPlayer: this.handleOpenPlayer,
                }),
            );
        }
    }
}
