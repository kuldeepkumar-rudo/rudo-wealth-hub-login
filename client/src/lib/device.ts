import { nanoid } from "nanoid";

const DEVICE_ID_KEY = "rudo_device_id";

export interface DeviceInfo {
    deviceId: string;
    platform: string;
    displayName: string;
    os: string;
    osVersion: string;
    browserName: string;
    browserVersion: string;
    userAgent: string;
    screenHeight: string;
    screenWidth: string;
    manufacturer: string;
    brand: string;
    model: string;
    network: string;
    registrationToken: string;
    metadata: {
        language: string;
        screen: string;
        tz: string;
    };
}

function getBrowserInfo() {
    const ua = navigator.userAgent;
    let browserName = "Unknown";
    let browserVersion = "Unknown";

    if (ua.indexOf("Chrome") > -1) {
        browserName = "Chrome";
        const match = ua.match(/Chrome\/([0-9.]+)/);
        browserVersion = match ? `Chrome/${match[1]}` : "Chrome";
    } else if (ua.indexOf("Safari") > -1) {
        browserName = "Safari";
        const match = ua.match(/Version\/([0-9.]+)/);
        browserVersion = match ? `Safari/${match[1]}` : "Safari";
    } else if (ua.indexOf("Firefox") > -1) {
        browserName = "Firefox";
        const match = ua.match(/Firefox\/([0-9.]+)/);
        browserVersion = match ? `Firefox/${match[1]}` : "Firefox";
    } else if (ua.indexOf("Edge") > -1) {
        browserName = "Edge";
        const match = ua.match(/Edge\/([0-9.]+)/);
        browserVersion = match ? `Edge/${match[1]}` : "Edge";
    }

    return { browserName, browserVersion };
}

function getOSInfo() {
    const ua = navigator.userAgent;
    let os = "Unknown";
    let osVersion = "Unknown";

    if (ua.indexOf("Mac OS X") > -1) {
        os = "Mac OS X";
        const match = ua.match(/Mac OS X ([0-9_]+)/);
        if (match) {
            osVersion = match[1].replace(/_/g, ".");
        }
    } else if (ua.indexOf("Windows") > -1) {
        os = "Windows";
        const match = ua.match(/Windows NT ([0-9.]+)/);
        osVersion = match ? match[1] : "Unknown";
    } else if (ua.indexOf("Linux") > -1) {
        os = "Linux";
    } else if (ua.indexOf("Android") > -1) {
        os = "Android";
        const match = ua.match(/Android ([0-9.]+)/);
        osVersion = match ? match[1] : "Unknown";
    } else if (ua.indexOf("iOS") > -1 || ua.indexOf("iPhone") > -1 || ua.indexOf("iPad") > -1) {
        os = "iOS";
        const match = ua.match(/OS ([0-9_]+)/);
        if (match) {
            osVersion = match[1].replace(/_/g, ".");
        }
    }

    return { os, osVersion };
}

export function getDeviceInfo(): DeviceInfo {
    if (typeof window === "undefined") {
        return {
            deviceId: "server-side",
            platform: "WEB",
            displayName: "Server",
            os: "Server",
            osVersion: "Unknown",
            browserName: "Server",
            browserVersion: "Unknown",
            userAgent: "Server",
            screenHeight: "0",
            screenWidth: "0",
            manufacturer: "server",
            brand: "Server",
            model: "Server",
            network: "unknown",
            registrationToken: "",
            metadata: {
                language: "en-US",
                screen: "0x0",
                tz: "UTC",
            },
        };
    }

    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
        // Generate a unique device ID for this client
        deviceId = nanoid();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    const { browserName, browserVersion } = getBrowserInfo();
    const { os, osVersion } = getOSInfo();
    const screenHeight = window.screen.height.toString();
    const screenWidth = window.screen.width.toString();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return {
        deviceId,
        platform: "WEB",
        displayName: `${browserName} on ${os}`,
        os,
        osVersion,
        browserName,
        browserVersion,
        userAgent: navigator.userAgent,
        screenHeight,
        screenWidth,
        manufacturer: browserName.toLowerCase(),
        brand: browserName,
        model: browserName,
        network: "4g", // Default, can't reliably detect from browser
        // Generate a dummy token that looks like a valid FCM token
        registrationToken: "dummy_token_" + nanoid(20) + ":APA91b" + nanoid(100),
        metadata: {
            language: navigator.language,
            screen: `${screenHeight}x${screenWidth}`,
            tz: timezone,
        },
    };
}
