
const fs = require('fs');
const path = require('path');

class VoiceRecordingHandler {
    constructor(client) {
        this.client = client;
        this.setupCleanupInterval();
    }

    setupCleanupInterval() {
        // Clean up old recording files every hour
        setInterval(() => {
            this.cleanupOldRecordings();
        }, 60 * 60 * 1000); // 1 hour
    }

    cleanupOldRecordings() {
        // Recordings are now preserved - no automatic deletion
        console.log('[VOICE RECORDING] Recordings are preserved and not automatically deleted');
    }

    async cleanupRecording(guildId) {
        if (!this.client.voiceRecordings || !this.client.voiceRecordings.has(guildId)) {
            return;
        }

        const recording = this.client.voiceRecordings.get(guildId);

        try {
            // Clear timeout
            if (recording.timeout) {
                clearTimeout(recording.timeout);
            }

            // Remove voice state update handler
            if (recording.voiceStateHandler) {
                this.client.removeListener('voiceStateUpdate', recording.voiceStateHandler);
            }

            // Stop recording flag
            recording.isRecording = false;

            // Stop all audio streams
            if (recording.userStreams) {
                recording.userStreams.forEach((stream, userId) => {
                    if (!stream.destroyed) {
                        stream.destroy();
                    }
                });
                recording.userStreams.clear();
            }

            // Close FFmpeg process
            if (recording.ffmpegProcess && !recording.ffmpegProcess.killed) {
                if (recording.ffmpegProcess.stdin && !recording.ffmpegProcess.stdin.destroyed) {
                    recording.ffmpegProcess.stdin.end();
                }
                recording.ffmpegProcess.kill('SIGTERM');
            }

            // Disconnect from voice channel
            if (recording.connection) {
                recording.connection.destroy();
            }

            // Remove from active recordings
            this.client.voiceRecordings.delete(guildId);

        } catch (error) {
            console.error('Error during recording cleanup:', error);
        }
    }
}

module.exports = VoiceRecordingHandler;
