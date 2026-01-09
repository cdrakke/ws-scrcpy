import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Settings, Play, Square, MoreHorizontal } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { DeviceCardProps } from './types';
import { DeviceState } from '../../../common/DeviceState';
import { ControlCenterCommand } from '../../../common/ControlCenterCommand';
import { ACTION } from '../../../common/Action';
import { SERVER_PORT } from '../../../common/Constants';
import Util from '../../Util';

const LAST_PLAYER_KEY = 'device_list::last_player';

interface InterfaceOption {
    name: string;
    displayName: string;
    url: string;
}

function getLocalStorageKey(fullName: string): string {
    return `device_list::${fullName}::interface`;
}

function buildPlayerUrl(
    action: string,
    udid: string,
    playerCodeName: string,
    wsUrl: string,
    params: DeviceCardProps['trackerParams'],
): string {
    const q: Record<string, string | number | boolean | undefined> = {
        action,
        udid,
        player: playerCodeName,
        ws: wsUrl,
    };

    let { hostname } = params;
    let port: string | number | undefined = params.port;
    let pathname = params.pathname ?? location.pathname;
    let protocol = params.secure ? 'https:' : 'http:';

    if (params.useProxy) {
        q.hostname = hostname;
        q.port = port;
        q.pathname = pathname;
        q.secure = params.secure;
        q.useProxy = true;
        protocol = location.protocol;
        hostname = location.hostname;
        port = location.port;
        pathname = location.pathname;
    }

    const searchParams = new URLSearchParams();
    Object.entries(q).forEach(([key, value]) => {
        if (value !== undefined) {
            searchParams.set(key, String(value));
        }
    });

    const hash = `#!${searchParams.toString()}`;
    return `${protocol}//${hostname}:${port}${pathname}${hash}`;
}

function createProxyUrl(params: DeviceCardProps['trackerParams'], udid: string): string {
    const secure = !!params.secure;
    const hostname = params.hostname || location.hostname;
    const port = typeof params.port === 'number' ? params.port : secure ? 443 : 80;
    const pathname = params.pathname || location.pathname;
    const protocol = secure ? 'wss:' : 'ws:';

    const url = new URL(`${protocol}//${hostname}${pathname}`);
    url.port = port.toString();
    url.searchParams.set('action', ACTION.PROXY_ADB);
    url.searchParams.set('remote', `tcp:${SERVER_PORT.toString(10)}`);
    url.searchParams.set('udid', udid);

    return url.toString();
}

function getLastPlayer(): string | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return localStorage.getItem(LAST_PLAYER_KEY);
}

function saveLastPlayer(playerCodeName: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.setItem(LAST_PLAYER_KEY, playerCodeName);
}

export function DeviceCard({
    device,
    trackerId,
    trackerParams,
    players,
    onCommand,
    onConfigureStream,
    onOpenPlayer,
}: DeviceCardProps): React.ReactElement {
    const isActive = device.state === DeviceState.DEVICE;
    const hasPid = device.pid !== -1;
    const fullName = `${trackerId}_${Util.escapeUdid(device.udid)}`;

    // Ref to track if we're waiting for server to start
    const waitingForServer = useRef(false);
    const pendingPlayerRef = useRef<string | null>(null);

    // Build interface options
    const buildInterfaceOptions = useCallback((): InterfaceOption[] => {
        const options: InterfaceOption[] = [];

        // Add device interfaces
        device.interfaces.forEach((iface) => {
            const protocol = 'ws:';
            const url = new URL(`${protocol}//${iface.ipv4}${trackerParams.pathname || '/'}`);
            url.port = SERVER_PORT.toString();
            options.push({
                name: iface.name,
                displayName: `${iface.name}: ${iface.ipv4}`,
                url: url.toString(),
            });
        });

        // Add proxy option for active devices
        if (isActive) {
            options.push({
                name: 'proxy',
                displayName: 'proxy over adb',
                url: createProxyUrl(trackerParams, device.udid),
            });
        }

        return options;
    }, [device.interfaces, device.udid, trackerParams, isActive]);

    const [interfaceOptions, setInterfaceOptions] = useState<InterfaceOption[]>(buildInterfaceOptions);

    // Update interface options when device interfaces change
    useEffect(() => {
        setInterfaceOptions(buildInterfaceOptions());
    }, [buildInterfaceOptions]);

    // Determine initial selected interface
    const getInitialInterface = useCallback((): string => {
        const localStorageKey = getLocalStorageKey(fullName);
        const lastSelected = localStorage?.getItem(localStorageKey);

        if (lastSelected) {
            const found = interfaceOptions.find((opt) => opt.name === lastSelected);
            if (found) return found.name;
        }

        // Default to wifi interface or first available
        const wifiInterface = interfaceOptions.find((opt) => opt.name === device['wifi.interface']);
        if (wifiInterface) return wifiInterface.name;

        // Default to proxy if available
        const proxyInterface = interfaceOptions.find((opt) => opt.name === 'proxy');
        if (proxyInterface) return proxyInterface.name;

        return interfaceOptions[0]?.name || '';
    }, [interfaceOptions, device, fullName]);

    const [selectedInterface, setSelectedInterface] = useState<string>(getInitialInterface);

    // Update selected interface when options change
    useEffect(() => {
        if (!interfaceOptions.find((opt) => opt.name === selectedInterface)) {
            setSelectedInterface(getInitialInterface());
        }
    }, [interfaceOptions, selectedInterface, getInitialInterface]);

    const selectedOption = interfaceOptions.find((opt) => opt.name === selectedInterface);
    const selectedUrl = selectedOption?.url || '';

    // Save interface selection to localStorage
    useEffect(() => {
        if (selectedInterface && localStorage) {
            const localStorageKey = getLocalStorageKey(fullName);
            localStorage.setItem(localStorageKey, selectedInterface);
        }
    }, [selectedInterface, fullName]);

    // Effect to handle auto-open player when server becomes available
    useEffect(() => {
        if (waitingForServer.current && hasPid && pendingPlayerRef.current && selectedUrl) {
            waitingForServer.current = false;
            const playerCodeName = pendingPlayerRef.current;
            pendingPlayerRef.current = null;

            const url = buildPlayerUrl(ACTION.STREAM_SCRCPY, device.udid, playerCodeName, selectedUrl, trackerParams);
            onOpenPlayer(url);
        }
    }, [hasPid, selectedUrl, device.udid, trackerParams, onOpenPlayer]);

    const handleStartServer = (): void => {
        onCommand(ControlCenterCommand.START_SERVER, { udid: device.udid });
    };

    const handleKillServer = (): void => {
        onCommand(ControlCenterCommand.KILL_SERVER, { udid: device.udid, pid: device.pid });
    };

    const handleUpdateInterfaces = (): void => {
        onCommand(ControlCenterCommand.UPDATE_INTERFACES, { udid: device.udid });
    };

    const handleConfigureStream = (): void => {
        onConfigureStream(device.udid);
    };

    const openPlayer = (playerCodeName: string): void => {
        if (!selectedUrl) return;
        saveLastPlayer(playerCodeName);
        const url = buildPlayerUrl(ACTION.STREAM_SCRCPY, device.udid, playerCodeName, selectedUrl, trackerParams);
        onOpenPlayer(url);
    };

    const handleStream = (): void => {
        if (!isActive) return;

        // Determine which player to use
        const lastPlayer = getLastPlayer();
        const playerToUse = players.find((p) => p.playerCodeName === lastPlayer) || players[0];
        if (!playerToUse) return;

        if (hasPid) {
            // Server is running, open player directly
            openPlayer(playerToUse.playerCodeName);
        } else {
            // Server not running, start it and wait
            waitingForServer.current = true;
            pendingPlayerRef.current = playerToUse.playerCodeName;
            handleStartServer();
        }
    };

    const handlePlayerClick = (playerCodeName: string): void => {
        if (!isActive) return;

        if (hasPid) {
            openPlayer(playerCodeName);
        } else {
            // Auto-start server for this player
            waitingForServer.current = true;
            pendingPlayerRef.current = playerCodeName;
            handleStartServer();
        }
    };

    const deviceName = `${device['ro.product.manufacturer'] || 'Unknown'} ${device['ro.product.model'] || 'Device'}`;

    return (
        <Card className={`transition-all hover:border-primary/50 hover:shadow-lg ${isActive ? '' : 'opacity-60'}`}>
            <CardContent className="p-4">
                {/* Header Row: Status + Name + Version */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className={`w-2 h-2 rounded-full shrink-0 ${
                                isActive ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'
                            }`}
                        />
                        <h3 className="font-medium truncate">{deviceName}</h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge variant="secondary" className="text-xs">
                            Android {device['ro.build.version.release']}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                            SDK {device['ro.build.version.sdk']}
                        </Badge>
                    </div>
                </div>

                {/* UDID + Status Row */}
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted-foreground font-mono truncate">{device.udid}</p>
                    {hasPid && (
                        <Badge variant="success" className="text-xs shrink-0 ml-2">
                            Running (PID: {device.pid})
                        </Badge>
                    )}
                </div>

                {/* Network Interface Selector */}
                {interfaceOptions.length > 0 && isActive && (
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-muted-foreground shrink-0">Interface:</span>
                        <Select value={selectedInterface} onValueChange={setSelectedInterface}>
                            <SelectTrigger className="h-7 flex-1 text-xs">
                                <SelectValue placeholder="Select interface" />
                            </SelectTrigger>
                            <SelectContent>
                                {interfaceOptions.map((option) => (
                                    <SelectItem key={option.name} value={option.name} className="text-xs">
                                        {option.displayName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={handleUpdateInterfaces}
                        >
                            <RefreshCw className="h-3 w-3" />
                        </Button>
                    </div>
                )}

                {/* Actions Row */}
                <div className="flex items-center justify-between">
                    <Button
                        size="sm"
                        onClick={handleStream}
                        disabled={!isActive || players.length === 0}
                        className="gap-2"
                    >
                        <Play className="h-4 w-4" />
                        Stream
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {players.length > 0 && (
                                <>
                                    <DropdownMenuLabel>Players</DropdownMenuLabel>
                                    {players.map((player) => (
                                        <DropdownMenuItem
                                            key={player.playerCodeName}
                                            onClick={() => handlePlayerClick(player.playerCodeName)}
                                            disabled={!isActive}
                                        >
                                            <Play className="h-4 w-4" />
                                            {player.playerFullName}
                                        </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                </>
                            )}
                            {isActive && (
                                <>
                                    <DropdownMenuItem onClick={handleConfigureStream}>
                                        <Settings className="h-4 w-4" />
                                        Configure
                                    </DropdownMenuItem>
                                    {hasPid && (
                                        <DropdownMenuItem
                                            onClick={handleKillServer}
                                            className="text-destructive focus:text-destructive"
                                        >
                                            <Square className="h-4 w-4" />
                                            Stop Server
                                        </DropdownMenuItem>
                                    )}
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardContent>
        </Card>
    );
}
