// ***********************************
// *           REMOTE SDR            *
// *              F1ATB              *
// * GNU General Public Licence v3.0 *
// ***********************************
const Sinus = []
for (let i = 0; i < 200; i++) {
    Sinus.push(Math.sin(2 * Math.PI * i / 200)); //Table of sine
}
class MyTXProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.OutData = new Int16Array(128);
        this.SDR_RX_mode = 0;
        this.Compresse = 0;
        this.RC_Amp = 0;
        this.PitchPhase = 14; //Frequency local beep in CW
        this.Phase = 0;
        this.Alpha = 1 / 50; //Coeficient filter to avoid click noise in CW
        this.Beta = 1 - this.Alpha;
        this.CW_play = [];
        this.CWstate = false;
        this.RTTY = {
            TXon: false,
            PHImark: 0,
            PHIspace: 0,
            NbsampleBit: 0
        };
        this.RTTY_ = {
            Car: [],
            Nsample: 0,
            Phi: 0,
            Nbit: -5,
            bits: "",
            Car_encour: ""
        }
        this.port.onmessage = (e) => {
            if (e.data.SDR_RX_mode) {
                this.SDR_RX_mode = parseInt(e.data.SDR_RX_mode);
                this.Compresse = parseInt(e.data.Compresse);
                this.PitchPhase = parseInt(e.data.Pitch) / 50;
                this.Alpha = parseFloat(e.data.Alpha);
                this.Beta = 1 - this.Alpha;
            }
            if (e.data.RTTY) {
                this.RTTY = e.data.RTTY;
            }
            if (e.data.RTTY_TXcar) {
                this.RTTY_.Car.push(e.data.RTTY_TXcar);
            }
            if (e.data.CW_play) {
                let Last_CW_play = e.data.CW_play;
                for (let i = 0; i < Last_CW_play.length; i++) {
                    Last_CW_play[i].T = Last_CW_play[i].T + 22; //  delay to compensate jitter of execution time
                    this.CW_play.push(Last_CW_play[i]);
                }
            }
        }
    }
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        var MaxMicLevel = 0;
        var inputChannel = input[0]; // Left channel Only
        var outputChannelLeft = output[0];
        if (this.SDR_RX_mode >= 5) { // CW
            var Tstart = Date.now();
            var step = 1 / 10;
            for (var i = 0; i < outputChannelLeft.length; i++) { //128 Samples
                if (this.CW_play.length > 0) { //Historic Left key pressed not yet played
                    let T = Tstart + i * step;
                    if (this.CW_play[0].T < T) {
                        this.CWstate = this.CW_play[0].state;
                        this.CW_play.shift();
                    }
                }
                if (this.CWstate) {
                    this.RC_Amp = this.Beta * this.RC_Amp + this.Alpha; //Filter to avoid Click. Slope around 5ms
                } else {
                    this.RC_Amp = this.Beta * this.RC_Amp;
                }
                this.Phase = (this.Phase + this.PitchPhase) % 200;
                outputChannelLeft[i] = this.RC_Amp * Sinus[Math.floor(this.Phase)]; //Sine Wave in local
                this.OutData[i] = Math.floor(this.RC_Amp * 32700);
            }
        } else { //SSB or NBFM Micro or RTTY
            if (inputChannel) {
                if (this.RTTY.TXon) { //RTTY Mode
                    for (var i = 0; i < inputChannel.length; ++i) { //Synchronisation on the 128 Audio Samples not used
                        if (this.RTTY_.Nbit < 0)
                            this.RTTY_.Phi = this.RTTY.PHImark;
                        this.RTTY_.Nsample += 1; //Sample per bit
                        if (this.RTTY_.Nsample >= this.RTTY.NbsampleBit) {
                            this.RTTY_.Nsample = 0;
                            if (this.RTTY_.bits != "") {
                                this.RTTY_.Nbit += 1;
                            } else {
                                this.RTTY_.Nbit = Math.min(this.RTTY_.Nbit, -1);
                            }
                            this.RTTY_.Phi = this.RTTY.PHImark;
                            switch (this.RTTY_.Nbit) {
                            case 0:
                                this.RTTY_.Phi = this.RTTY.PHIspace; //Start bit
                                break;
                            case 6:
                                this.RTTY_.Nsample = -Math.floor(this.RTTY.NbsampleBit / 2); //half bit length
                                this.RTTY_.bits = ""; //No more bits
                                break;
                            default:
                                if (this.RTTY_.Nbit > 0) {
                                    var p = this.RTTY_.bits.length
                                        var bit = this.RTTY_.bits.slice(p - 1);
                                    this.RTTY_.bits = this.RTTY_.bits.slice(0, p - 1);
                                    if (bit == "0")
                                        this.RTTY_.Phi = this.RTTY.PHIspace;
                                }
                            }
                            if (this.RTTY_.bits == "" && this.RTTY_.Car.length > 0) {
                                this.RTTY_.Car_encour = this.RTTY_.Car[0];
                                this.RTTY_.bits = "000000" + this.RTTY_.Car.shift().toString(2); //5 last bits + "*"
                                this.RTTY_.Nbit = Math.min(this.RTTY_.Nbit, -2);
                            }
                        }
                        this.Phase = (this.Phase + this.RTTY_.Phi) % 200;
                        // Loop through the  samples to convert in integer with amplitude adjusted
                        let OutLocal = Sinus[Math.floor(this.Phase)];
                        outputChannelLeft[i] = OutLocal; //For local Audio
                        this.OutData[i] = Math.floor(32000 * OutLocal); //Signed Integer on 16 bits
                        MaxMicLevel = Math.max(OutLocal, MaxMicLevel);
                    }
                } else { // Audio from microphone
                    this.RTTY_.Nbit = -5;
                    for (var i = 0; i < inputChannel.length; ++i) { //128 Samples
                        var Level_ = inputChannel[i];
                        var Amp_max = Math.max(Math.abs(Level_), 0.02); //Correction only if signal> -34dB below Max=1
                        if (this.Compresse == 1) { //Audio Compressée
                            this.RC_Amp = 0.001 * Amp_max + 0.999 * this.RC_Amp; //Mean Value amplitude max
                            this.RC_Amp = Math.max(this.RC_Amp, Amp_max);
                        } else if (this.Compresse == 2) {
                            this.RC_Amp = 0.005 * Amp_max + 0.995 * this.RC_Amp; //Mean Value amplitude max
                            this.RC_Amp = Math.max(this.RC_Amp, Amp_max);
                        } else { // Volume Manuel
                            this.RC_Amp = 1;
                        }
                        // Loop through the  samples to convert in integer with amplitude adjusted
                        let OutLocal = Level_ / this.RC_Amp;
                        outputChannelLeft[i] = OutLocal; //For local Audio
                        this.OutData[i] = Math.floor(30000 * OutLocal); //Signed Integer on 16 bits. Above 30000 there are distorsions in Gnu Radio
                        MaxMicLevel = Math.max(OutLocal, MaxMicLevel);
                    }
                }
            }
        }
        this.port.postMessage({
            MaxMicLevel: Math.max(0.1, MaxMicLevel),
            OutData: this.OutData,
            SampleRate: sampleRate,
            RTTYnbCar: this.RTTY_.Car.length
        });
        return true;
    }
}
registerProcessor('MyTXProcessor', MyTXProcessor);
