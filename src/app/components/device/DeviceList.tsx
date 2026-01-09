import * as React from 'react';
import { useState, useMemo } from 'react';
import { Plus, ChevronRight, Smartphone } from 'lucide-react';
import { Button } from '../ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { AdbConnectDialog } from './AdbConnectDialog';
import { DeviceCard } from './DeviceCard';
import { OfflineDeviceRow } from './OfflineDeviceRow';
import { DeviceListProps } from './types';
import { DeviceState } from '../../../common/DeviceState';

export function DeviceList({
    devices,
    trackerId,
    trackerName,
    trackerParams,
    players,
    onCommand,
    onConnect,
    onDisconnect,
    onConfigureStream,
    onOpenPlayer,
}: DeviceListProps): React.ReactElement {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [offlineOpen, setOfflineOpen] = useState(false);

    // Split devices into online and offline
    const { onlineDevices, offlineDevices } = useMemo(() => {
        const online = devices.filter((d) => d.state === DeviceState.DEVICE);
        const offline = devices.filter((d) => d.state !== DeviceState.DEVICE);
        return { onlineDevices: online, offlineDevices: offline };
    }, [devices]);

    return (
        <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
            {/* Header */}
            <header className="shrink-0 border-b bg-background">
                <div className="flex h-14 items-center justify-between px-6">
                    <h1 className="text-lg font-semibold">ws-scrcpy</h1>
                    <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                        <Plus className="h-4 w-4" />
                        Add Device
                    </Button>
                </div>
            </header>

            <main className="flex-1 w-full px-6 py-6 space-y-8 overflow-y-auto">
                {/* Tracker Name - subtle indicator */}
                {trackerName && (
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        {trackerName}
                    </p>
                )}

                {/* Online Devices Section */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            Connected Devices ({onlineDevices.length})
                        </h2>
                    </div>

                    {onlineDevices.length > 0 ? (
                        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {onlineDevices.map((device) => (
                                <DeviceCard
                                    key={device.udid}
                                    device={device}
                                    trackerId={trackerId}
                                    trackerParams={trackerParams}
                                    players={players}
                                    onCommand={onCommand}
                                    onConfigureStream={onConfigureStream}
                                    onOpenPlayer={onOpenPlayer}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Smartphone className="h-12 w-12 text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">No devices connected</p>
                            <p className="text-sm text-muted-foreground/70 mt-1">
                                Connect an Android device via USB or use Add Device for remote ADB
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-4"
                                onClick={() => setDialogOpen(true)}
                            >
                                <Plus className="h-4 w-4" />
                                Add Remote Device
                            </Button>
                        </div>
                    )}
                </section>

                {/* Offline Devices Section */}
                {offlineDevices.length > 0 && (
                    <Collapsible open={offlineOpen} onOpenChange={setOfflineOpen}>
                        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                            <ChevronRight
                                className={`h-4 w-4 transition-transform duration-200 ${
                                    offlineOpen ? 'rotate-90' : ''
                                }`}
                            />
                            Offline Devices ({offlineDevices.length})
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-4 space-y-2">
                            {offlineDevices.map((device) => (
                                <OfflineDeviceRow key={device.udid} device={device} />
                            ))}
                        </CollapsibleContent>
                    </Collapsible>
                )}
            </main>

            {/* ADB Connect Dialog */}
            <AdbConnectDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onConnect={onConnect}
                onDisconnect={onDisconnect}
            />
        </div>
    );
}
