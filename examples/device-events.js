/**
 * Device Event Monitoring Example
 * Demonstrates v2.4.0 hot-plug detection and device event notifications
 */

const { AudioCapture } = require('node-windows-audio-capture');

console.log('========================================');
console.log('Device Event Monitoring Example (v2.4.0)');
console.log('========================================\n');

/**
 * Example 1: List all audio devices
 */
async function listDevices() {
    console.log('Available Audio Devices:');
    console.log('------------------------');
    
    const devices = await AudioCapture.getAudioDevices();
    
    devices.forEach((device, index) => {
        console.log(`\n${index + 1}. ${device.name}`);
        console.log(`   ID: ${device.id}`);
        console.log(`   Default: ${device.isDefault ? 'Yes' : 'No'}`);
        console.log(`   Active: ${device.isActive ? 'Yes' : 'No'}`);
    });
    
    const defaultId = await AudioCapture.getDefaultDeviceId();
    console.log(`\nDefault Device ID: ${defaultId}\n`);
}

/**
 * Example 2: Monitor device events
 */
function startMonitoring() {
    console.log('Starting Device Monitoring...');
    console.log('Try the following actions:');
    console.log('  - Plug in a USB audio device');
    console.log('  - Unplug a USB audio device');
    console.log('  - Change default audio device in Windows settings');
    console.log('  - Enable/disable audio devices');
    console.log('Press Ctrl+C to stop\n');
    
    AudioCapture.startDeviceMonitoring((event) => {
        const timestamp = new Date().toLocaleTimeString();
        
        console.log(`[${timestamp}] ${formatEventType(event.type)}`);
        console.log(`  Device ID: ${event.deviceId.substring(0, 40)}...`);
        
        if (event.type === 'deviceStateChanged') {
            console.log(`  New State: ${formatDeviceState(event.state)}`);
        } else if (event.type === 'defaultDeviceChanged') {
            console.log(`  Data Flow: ${formatDataFlow(event.dataFlow)}`);
            console.log(`  Role: ${formatRole(event.role)}`);
        }
        
        console.log('');
    });
}

/**
 * Format event type
 */
function formatEventType(type) {
    const types = {
        'deviceAdded': '🔌 Device Added',
        'deviceRemoved': '🔴 Device Removed',
        'defaultDeviceChanged': '⭐ Default Device Changed',
        'deviceStateChanged': '🔄 Device State Changed',
        'devicePropertyChanged': '📝 Device Property Changed'
    };
    return types[type] || type;
}

/**
 * Format device state
 */
function formatDeviceState(state) {
    const states = {
        1: 'ACTIVE',
        2: 'DISABLED',
        4: 'NOT_PRESENT',
        8: 'UNPLUGGED'
    };
    return states[state] || `Unknown (${state})`;
}

/**
 * Format data flow
 */
function formatDataFlow(flow) {
    const flows = ['Render (Output)', 'Capture (Input)', 'All'];
    return flows[flow] || `Unknown (${flow})`;
}

/**
 * Format device role
 */
function formatRole(role) {
    const roles = ['Console', 'Multimedia', 'Communications'];
    return roles[role] || `Unknown (${role})`;
}

/**
 * Main function
 */
async function main() {
    try {
        // List all devices
        await listDevices();
        
        // Start monitoring
        startMonitoring();
        
        // Handle Ctrl+C gracefully
        process.on('SIGINT', () => {
            console.log('\n\nStopping device monitoring...');
            AudioCapture.stopDeviceMonitoring();
            console.log('Monitoring stopped. Goodbye!\n');
            process.exit(0);
        });
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Run the example
main();
