// ***********************************
// *           REMOTE SDR            *
// *              F1ATB              *
// * GNU General Public Licence v3.0 *
// ***********************************
//Process to interpol the audio samples received from the
//RX signal processing at 10kHz to the audio context at 48kHz
class MyRXProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.IdxOut = 0;
        this.Fout_Fin = 48000 / 10000;
        this.BufferSource = [];
        this.BufferMax = 3000;
        this.inSample = 0;
        this.levelRC = 0;
        this.deltaRC = 0;
        this.port.onmessage = (e) => {
            try {
                if (e.data.Fout_Fin) {
                    this.Fout_Fin = parseFloat(e.data.Fout_Fin);
                }
                if (e.data.BufferMax) {
                    this.BufferMax = parseInt(e.data.BufferMax);
                }
                if (e.data.BufferSource) {
                    this.BufferSource = this.BufferSource.concat(e.data.BufferSource);
                    if (this.BufferSource.length > this.BufferMax)
                        this.BufferSource = this.BufferSource.slice(this.BufferSource.length - this.BufferMax); //Remove older samples
                }
            } catch (e) {
                console.log(e);
            }
        }
    }
    process(inputs, outputs, parameters) {
        try {
            const input = inputs[0];
            const output = outputs[0];
            var outputChannelLeft = output[0];
            for (var i = 0; i < outputChannelLeft.length; i++) {
                this.levelRC = 0.2 * this.inSample + 0.8 * this.levelRC; //smoothing
                outputChannelLeft[i] = this.levelRC;
                this.IdxOut++;
                if (this.IdxOut > this.Fout_Fin) {
                    this.IdxOut = this.IdxOut - this.Fout_Fin;
                    this.inSample = (this.BufferSource.length > 0) ? this.BufferSource.shift() : this.inSample;
                }
            }
            var deltaIndex = this.BufferSource.length - this.BufferMax / 2;
            this.deltaRC = 0.1 * deltaIndex + 0.9 * this.deltaRC;
            let k = 1;
            if (Math.abs(deltaIndex) > 800)
                k = 10;
            if (Math.abs(deltaIndex) > Math.abs(this.deltaRC))
                k = 10;
            this.Fout_Fin = this.Fout_Fin - k * deltaIndex / 10000000000; //Interpolation velocity adjustment
            this.port.postMessage({
                BufferSize: this.BufferSource.length
            });
            return true;
        } catch (e) {
            console.log(e);
        }
    }
}
registerProcessor('MyRXProcessor', MyRXProcessor);