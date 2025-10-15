/**
 * AGC (Automatic Gain Control) Example
 * 
 * This example demonstrates how to use the AGC feature to automatically
 * adjust audio gain for consistent output levels.
 * 
 * v2.8.0 Feature
 */

const { AudioCapture } = require('../index');
const fs = require('fs');

async function main() {
    console.log('🎙️  AGC (Automatic Gain Control) Example\n');
    
    // Create audio capture with AGC enabled
    const capture = new AudioCapture({
        processId: 0,  // System loopback (all applications)
        useExternalBuffer: true,
        bufferPoolStrategy: 'adaptive'
    });
    
    // Enable AGC with custom settings
    capture.setAGCEnabled(true);
    capture.setAGCOptions({
        targetLevel: -20,    // Target output level: -20 dBFS
        maxGain: 20,         // Maximum gain: 20 dB
        minGain: -10,        // Minimum gain: -10 dB
        attackTime: 10,      // Attack time: 10 ms (fast response)
        releaseTime: 100     // Release time: 100 ms (smooth decay)
    });
    
    console.log('📊 AGC Configuration:');
    const options = capture.getAGCOptions();
    console.log(`   Target Level: ${options.targetLevel} dBFS`);
    console.log(`   Gain Range: ${options.minGain} to ${options.maxGain} dB`);
    console.log(`   Attack Time: ${options.attackTime} ms`);
    console.log(`   Release Time: ${options.releaseTime} ms`);
    console.log('');
    
    let packetCount = 0;
    let startTime = Date.now();
    let lastLogTime = startTime;
    
    // Audio data handler
    capture.on('data', (audioData) => {
        packetCount++;
        
        // Log AGC stats every second
        const now = Date.now();
        if (now - lastLogTime >= 1000) {
            const stats = capture.getAGCStats();
            const elapsed = ((now - startTime) / 1000).toFixed(1);
            
            console.log(`[${elapsed}s] AGC Stats:`);
            console.log(`   Current Gain: ${stats.currentGain.toFixed(2)} dB`);
            console.log(`   Average Level: ${stats.averageLevel.toFixed(2)} dBFS`);
            console.log(`   RMS: ${stats.rmsLinear.toFixed(6)}`);
            console.log(`   Clipping: ${stats.clipping ? '⚠️  YES' : '✓ No'}`);
            console.log(`   Frames Processed: ${stats.framesProcessed.toLocaleString()}`);
            console.log('');
            
            // Warning if clipping detected
            if (stats.clipping) {
                console.log('⚠️  WARNING: Clipping detected! Consider reducing maxGain.\n');
            }
            
            lastLogTime = now;
        }
        
        // Stop after 10 seconds
        if (now - startTime >= 10000) {
            console.log('⏹️  Stopping capture...\n');
            capture.stop();
        }
    });
    
    capture.on('error', (err) => {
        console.error('❌ Error:', err);
    });
    
    capture.on('stopped', () => {
        const finalStats = capture.getAGCStats();
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log('✅ Capture stopped\n');
        console.log('📊 Final Statistics:');
        console.log(`   Duration: ${duration}s`);
        console.log(`   Packets Received: ${packetCount}`);
        console.log(`   Frames Processed: ${finalStats.framesProcessed.toLocaleString()}`);
        console.log(`   Final Gain: ${finalStats.currentGain.toFixed(2)} dB`);
        console.log(`   Average Level: ${finalStats.averageLevel.toFixed(2)} dBFS`);
        console.log('');
        console.log('💡 Tips:');
        console.log('   - Increase targetLevel for louder output');
        console.log('   - Adjust maxGain to control maximum amplification');
        console.log('   - Shorter attackTime = faster response to quiet sounds');
        console.log('   - Longer releaseTime = smoother gain changes');
    });
    
    console.log('🎵 Starting audio capture...');
    console.log('   (AGC will automatically adjust gain)\n');
    
    await capture.start();
}

// Run example
main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
