// ***********************************
// *           REMOTE SDR            *
// *              F1ATB              *
// * GNU General Public Licence v3.0 *
// ***********************************
//Process to interpol the audio samples received from the
//RX signal processing at 10kHz to the audio context at 10kHz of the PC
class RTTY_RXProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.IdxOut = 0;
        this.Fout_Fin = 10000 / 10000;
        this.BufferSource = [];
        this.BufferMax = 5000;
        this.inSample1 = 0;
		this.inSample0 = 0;
        this.deltaRC = 0;
        this.port.onmessage = (e) => {
            if (e.data.Fout_Fin) {
                this.Fout_Fin = parseFloat(e.data.Fout_Fin);
            }
            
            if (e.data.BufferSource) {
                this.BufferSource = this.BufferSource.concat(e.data.BufferSource);
                if (this.BufferSource.length > this.BufferMax)
                    this.BufferSource = this.BufferSource.slice(this.BufferSource.length - this.BufferMax); //Remove older samples
            }
        }
    }
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        var outputChannelLeft = output[0];
        for (var i = 0; i < outputChannelLeft.length; i++) {
			
            outputChannelLeft[i] = this.IdxOut*this.inSample1+(1-this.IdxOut)*this.inSample0;
            this.IdxOut++;
            while (this.IdxOut > this.Fout_Fin) {
                this.IdxOut = this.IdxOut - this.Fout_Fin;
				this.inSample0=this.inSample1;
                this.inSample1 = (this.BufferSource.length > 0) ? this.BufferSource.shift() : this.inSample1;
            }
        }
        var deltaIndex = this.BufferSource.length - this.BufferMax / 3;
        this.deltaRC = 0.1 * deltaIndex + 0.9 * this.deltaRC;
        let k = 1;
        if (Math.abs(deltaIndex) > 800)
            k = 10;
        if (Math.abs(deltaIndex) > Math.abs(this.deltaRC))
            k = 10;
        this.Fout_Fin = this.Fout_Fin - k * deltaIndex / 10000000000; //Interpolation velocity adjustment
        this.port.postMessage({
            BufferSize: this.BufferSource.length, Fout_Fin: this.Fout_Fin
        });
        return true;
    }
}
registerProcessor('RTTY_RXProcessor', RTTY_RXProcessor);
