import WS from 'ws';
import { Mw, RequestParameters } from '../../mw/Mw';
import { ControlCenterCommand } from '../../../common/ControlCenterCommand';
import { ControlCenter } from '../services/ControlCenter';
import { ACTION } from '../../../common/Action';
import GoogDeviceDescriptor from '../../../types/GoogDeviceDescriptor';
import { DeviceTrackerEvent } from '../../../types/DeviceTrackerEvent';
import { DeviceTrackerEventList } from '../../../types/DeviceTrackerEventList';
import { Multiplexer } from '../../../packages/multiplexer/Multiplexer';
import { ChannelCode } from '../../../common/ChannelCode';

export class DeviceTracker extends Mw {
    public static readonly TAG = 'DeviceTracker';
    public static readonly type = 'android';
    private adt: ControlCenter = ControlCenter.getInstance();
    private readonly id: string;

    public static processChannel(ws: Multiplexer, code: string): Mw | undefined {
        if (code !== ChannelCode.GTRC) {
            return;
        }
        return new DeviceTracker(ws);
    }

    public static processRequest(ws: WS, params: RequestParameters): DeviceTracker | undefined {
        if (params.action !== ACTION.GOOG_DEVICE_LIST) {
            return;
        }
        return new DeviceTracker(ws);
    }

    constructor(ws: WS | Multiplexer) {
        super(ws);

        this.id = this.adt.getId();
        this.adt
            .init()
            .then(() => {
                this.adt.on('device', this.sendDeviceMessage);
                this.buildAndSendMessage(this.adt.getDevices());
            })
            .catch((error: Error) => {
                console.error(`[${DeviceTracker.TAG}] Error: ${error.message}`);
            });
    }

    private sendDeviceMessage = (device: GoogDeviceDescriptor): void => {
        const data: DeviceTrackerEvent<GoogDeviceDescriptor> = {
            device,
            id: this.id,
            name: this.adt.getName(),
        };
        this.sendMessage({
            id: -1,
            type: 'device',
            data,
        });
    };

    private buildAndSendMessage = (list: GoogDeviceDescriptor[]): void => {
        const data: DeviceTrackerEventList<GoogDeviceDescriptor> = {
            list,
            id: this.id,
            name: this.adt.getName(),
        };
        this.sendMessage({
            id: -1,
            type: 'devicelist',
            data,
        });
    };

    protected onSocketMessage(event: WS.MessageEvent): void {
        let command: ControlCenterCommand;
        try {
            command = ControlCenterCommand.fromJSON(event.data.toString());
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[${DeviceTracker.TAG}], Received message: ${event.data}. Error: ${message}`);
            return;
        }

        const commandId = command.getId();
        const commandType = command.getType();

        this.adt
            .runCommand(command)
            .then((result) => {
                // Send response for connect/disconnect commands
                if (
                    commandType === ControlCenterCommand.ADB_CONNECT ||
                    commandType === ControlCenterCommand.ADB_DISCONNECT
                ) {
                    this.sendMessage({
                        id: commandId,
                        type: `${commandType}_response`,
                        data: result,
                    });
                }
            })
            .catch((e: Error) => {
                console.error(`[${DeviceTracker.TAG}], Received message: ${event.data}. Error: ${e.message}`);
                // Send error response for connect/disconnect commands
                if (
                    commandType === ControlCenterCommand.ADB_CONNECT ||
                    commandType === ControlCenterCommand.ADB_DISCONNECT
                ) {
                    this.sendMessage({
                        id: commandId,
                        type: `${commandType}_response`,
                        data: { success: false, message: e.message },
                    });
                }
            });
    }

    public release(): void {
        super.release();
        this.adt.off('device', this.sendDeviceMessage);
    }
}
