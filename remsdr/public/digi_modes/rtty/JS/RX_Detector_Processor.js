// ***********************************
// *           REMOTE SDR            *
// *              F1ATB              *
// * GNU General Public Licence v3.0 *
// ***********************************
class RX_Detect_Processor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.OutData = [];

    }
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        var inputChannel = input[0]; // Left channel Only
        var outputChannelLeft = output[0];
        if (inputChannel) {
            for (var i = 0; i < inputChannel.length; ++i) { //128 Samples
                this.OutData[i] = inputChannel[i]; //Filtered sample from the Band Pass
            }
        }
        this.port.postMessage({
            OutData: this.OutData,
        });
        return true;
    }
}

registerProcessor('RX_Detect_Processor', RX_Detect_Processor);
