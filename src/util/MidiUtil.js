import TinyMidiPCM from '#/3rdparty/tinymidipcm.js';

// Fix iOS Audio Context by Blake Kus https://gist.github.com/kus/3f01d60569eeadefe3a1
// MIT license
(function () {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    if (window.AudioContext) {
        window.audioContext = new window.AudioContext();
    }
    var fixAudioContext = function (e) {
        if (window.audioContext) {
            // Create empty buffer
            var buffer = window.audioContext.createBuffer(1, 1, 22050);
            var source = window.audioContext.createBufferSource();
            source.buffer = buffer;
            // Connect to output (speakers)
            source.connect(window.audioContext.destination);
            // Play sound
            if (source.start) {
                source.start(0);
            } else if (source.play) {
                source.play(0);
            } else if (source.noteOn) {
                source.noteOn(0);
            }
        }
        // Remove events
        document.removeEventListener('touchstart', fixAudioContext);
        document.removeEventListener('touchend', fixAudioContext);
        document.removeEventListener('click', fixAudioContext);
    };
    // iOS 6-8
    document.addEventListener('touchstart', fixAudioContext);
    // iOS 9
    document.addEventListener('touchend', fixAudioContext);
    // Safari
    document.addEventListener('click', fixAudioContext);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            if (window.audioContext) {
                window.audioContext.resume();
            }
        }
    });
})();

// controlling tinymidipcm:
(async () => {
    const channels = 2;
    const sampleRate = 44100;
    const flushTime = 250;
    const renderInterval = 30;
    const fadeseconds = 2;

    // let renderEndSeconds = 0;
    // let currentMidiBuffer = null;
    let samples = new Float32Array();

    let gainNode = window.audioContext.createGain();
    gainNode.gain.setValueAtTime(0.1, window.audioContext.currentTime);
    gainNode.connect(window.audioContext.destination);

    // let startTime = 0;
    let lastTime = window.audioContext.currentTime;
    let bufferSources = [];

    const tinyMidiPCM = new TinyMidiPCM({
        renderInterval,
        onPCMData: pcm => {
            let float32 = new Float32Array(pcm.buffer);
            let temp = new Float32Array(samples.length + float32.length);
            temp.set(samples, 0);
            temp.set(float32, samples.length);
            samples = temp;
        },
        onRenderEnd: ms => {
            // renderEndSeconds = Math.floor(startTime + Math.floor(ms / 1000));
        },
        bufferSize: 1024 * 100
    });

    await tinyMidiPCM.init();

    const soundfontRes = await fetch(new URL('SCC1_Florestan.sf2', import.meta.url));
    const soundfontBuffer = new Uint8Array(await soundfontRes.arrayBuffer());
    tinyMidiPCM.setSoundfont(soundfontBuffer);

    function flush() {
        if (!window.audioContext || !samples.length) {
            return;
        }

        let bufferSource = window.audioContext.createBufferSource();
        // bufferSource.onended = function(event) {
        //     const timeSeconds = Math.floor(window.audioContext.currentTime);

        //     if (renderEndSeconds > 0 && Math.abs(timeSeconds - renderEndSeconds) <= 2) {
        //         renderEndSeconds = 0;

        //         if (currentMidiBuffer) {
        //             // midi looping
        //             // note: this was buggy with some midi files
        //             window._tinyMidiPlay(currentMidiBuffer, -1);
        //         }
        //     }
        // }

        const length = samples.length / channels;
        const audioBuffer = window.audioContext.createBuffer(channels, length, sampleRate);

        for (let channel = 0; channel < channels; channel++) {
            const audioData = audioBuffer.getChannelData(channel);

            let offset = channel;
            for (let i = 0; i < length; i++) {
                audioData[i] = samples[offset];
                offset += channels;
            }
        }

        if (lastTime < window.audioContext.currentTime) {
            lastTime = window.audioContext.currentTime;
        }

        bufferSource.buffer = audioBuffer;
        bufferSource.connect(gainNode);
        bufferSource.start(lastTime);
        bufferSources.push(bufferSource);

        lastTime += audioBuffer.duration;
        samples = new Float32Array();
    }

    let flushInterval;

    function fadeOut(callback) {
        const currentTime = window.audioContext.currentTime;
        gainNode.gain.cancelScheduledValues(currentTime);
        gainNode.gain.setTargetAtTime(0, currentTime, 0.5);
        setTimeout(callback, fadeseconds * 1000);
    }

    function stop() {
        if (flushInterval) {
            clearInterval(flushInterval);
        }

        // currentMidiBuffer = null;
        samples = new Float32Array();

        if (bufferSources.length) {
            let temp = gainNode.gain.value;
            gainNode.gain.setValueAtTime(0, window.audioContext.currentTime);
            bufferSources.forEach(bufferSource => {
                bufferSource.stop(window.audioContext.currentTime);
            });
            bufferSources = [];
            gainNode.gain.setValueAtTime(temp, window.audioContext.currentTime);
        }
    }

    function start(vol, midiBuffer) {
        // vol -1 = reuse last volume level
        if (vol !== -1) {
            window._tinyMidiVolume(vol);
        }

        // currentMidiBuffer = midiBuffer;
        // startTime = window.audioContext.currentTime;
        lastTime = window.audioContext.currentTime;
        flushInterval = setInterval(flush, flushTime);
        tinyMidiPCM.render(midiBuffer);
    }

    window._tinyMidiStop = async fade => {
        if (fade) {
            fadeOut(() => {
                stop();
            });
        } else {
            stop();
        }
    };

    window._tinyMidiVolume = (vol = 1) => {
        gainNode.gain.setValueAtTime(vol, window.audioContext.currentTime);
    };

    window._tinyMidiPlay = async (midiBuffer, vol, fade) => {
        if (!midiBuffer) {
            return;
        }

        await window._tinyMidiStop(fade);

        if (fade) {
            setTimeout(() => {
                start(vol, midiBuffer);
            }, fadeseconds * 1000);
        } else {
            start(vol, midiBuffer);
        }
    };
})();
