// ***********************************
// *           REMOTE SDR            *
// *              F1ATB              *
// * GNU General Public Licence v3.0 *
// ***********************************
// Variables Audio
//****************
const audioRX = {
    Ctx: null, //Contexte
    Tampon0: new Array(10), //Zone mémoire
    idx_tampon0: 0,
    Fout_Fin: 1, //Ratio Sampling Frequency
    BufferSize: 1000,
    BufferMax: 3000,
    entreeFreq: 10000,
    sortieFreq: 0,
	meanIn:0,
    on: false,
    cptFFT: 0,
    deviceout: [],
    AuxOut: null,
    AuxAudio: null,
    Tupdate: 0,
    F_Audio_Top: 0,
    BufferSizeUpd: function () {
        var Tc = Date.now();
        if ((Tc - this.Tupdate) > 2000) {
            this.Tupdate = Tc;
            //Size MAX of the input Buffer adjusted to communication quality
            if (this.BufferSize > 0.8 * this.BufferMax || this.BufferSize < 0.2 * this.BufferMax) { //close to the max or min
                this.BufferMax = this.BufferMax + 500;
            } else {
                this.BufferMax = this.BufferMax - 50;
            }
            this.BufferMax = Math.min(3000, Math.max(200, this.BufferMax)); //between 0.2s and 3s
        }
    }
}
const audioRXnode = {
    source: null,
    filterLP: null,
    filterHP: null,
    analFFT: null,
    filterLS: null,
    filterHS: null,
    filterNH: null,
    gain_main: null,
    gain_aux: null
}
const audioFFT = 2048;
var FilterRX = {
    F1: 200,
    F2: 2600,
    display: false,
    freqLS: 1000,
    dB_LS: 0,
    freqHS: 2500,
    dB_HS: 0,
    Vol_wrx: 1,
    Vol_wtx: 0.2,
    notchOn: false,
    notchF: 2000,
    noiseOn: false,
    LevelNoise: 1,
    direct: false,
    Vol_aux: 1,
    Out_aux: 0,
    Mode_aux: 0
};
var WaterAudioLeft = {
    id: "Disp_Audio_Left",
    Line: 0,
    Bloc: true
}
var WaterAudioRight = {
    id: "Disp_Audio_Right",
    Line: 0,
    Bloc: true
}
//Communication
//**************
const ComRXaudio = {
    packet_number: 0,
    Debit: 0,
    buffer: [],
    first_load: true,
    call_Audio: function () {

        var adresse = ProcIP.Protocol + "//" + ProcIP.RX + "/RXaudio";
        // Fetch the spectra
        fetch(adresse)
        // Retrieve its body as ReadableStream
        .then(response => response.body)
        .then(rs => {
            const reader = rs.getReader();
            return new ReadableStream({
                async start(controller) {
                    while (true) {
                        const {
                            done,
                            value
                        } = await reader.read();
                        // When no more data needs to be consumed, break the reading
                        if (done) {
                            break;
                        }
                        // Enqueue the next data chunk into our target stream
                        try {
                            var table_in = Array.from(value); //Bytes
                            //controller.enqueue(value);
                            Watch_dog.RXaudio = 0;
                            ComRXaudio.buffer = ComRXaudio.buffer.concat(table_in);
                            var Len = Math.floor(ComRXaudio.buffer.length / 2);
                            table_in = ComRXaudio.buffer.splice(0, 2 * Len);
                            var Audio_in = new Int16Array(Len);
                            var j = 0;
                            for (var i = 0; i < Len; i++) { //Conversion byte to 16 bit signed integer
                                Audio_in[i] = ((table_in[j + 1]) << 8) | (table_in[j]);
                                j = j + 2;
                            }
                            if (audioRXnode.source != null) {
                                // Volume RX Audio
                                var Vol = FilterRX.Vol_wrx;
                                var Vol_aux = FilterRX.Vol_aux;
                                if (audioTX.Transmit) {
                                    Vol = FilterRX.Vol_wtx; //Volume audio quand on transmet
                                    Vol_aux = 0;
                                }
                                if (Vol < 0.011)
                                    Vol = 0; // Off if -40dB
                                if (!audioRX.on)
                                    Vol = 0; //Audio Off
                                if (Vol_aux < 0.011)
                                    Vol_aux = 0; // Off if -40dB
                                audioRXnode.gain_main.gain.value = Vol;
                                audioRXnode.gain_aux.gain.value = Vol_aux;
                                var BufferSource = [];
                                if (ComRXaudio.first_load) {
                                    for (var i = 0; i < 6000; i++) {
                                        BufferSource.push(0);
                                    }
                                    ComRXaudio.first_load = false;
                                }
                                var noise = false;
                                var S0 = FilterRX.LevelNoise * audioRX.meanIn;
                                var S1 = FilterRX.LevelNoise * 4 * audioRX.meanIn;
                                for (var i = 0; i < Len; i++) {
                                    var v = Audio_in[i] / 32768; ; //Audio are signed 16 bits  samples
                                    audioRX.meanIn = 0.01 * Math.abs(v) + 0.99 * audioRX.meanIn;
                                    if (FilterRX.noiseOn ) { // Noise Filter selected
                                        audioRX.Tampon0[audioRX.idx_tampon0] = v;
                                        var W = [];
                                        for (let j = 0; j < 5; j++) {
                                            if (j != 2) {
                                                W.push(audioRX.Tampon0[(audioRX.idx_tampon0 - j + 10) % 10]);
                                            }
                                        }
                                        W.sort();
                                        var X = audioRX.Tampon0[(audioRX.idx_tampon0 + 8) % 10];
                                        var mean = (W[1] + W[2]) / 2;
                                        if (X < mean) {
                                            var D0 = W[0] - X;
                                            var D1 = W[1] - X;
                                        } else {
                                            var D0 = X - W[3];
                                            var D1 = X - W[2];
                                        }
                                        if (D0 > S0 || D1 > S1) { //It's a noise
                                            audioRX.Tampon0[(audioRX.idx_tampon0 + 8) % 10] = mean;
                                            noise = true;
                                        }
                                        v = audioRX.Tampon0[(audioRX.idx_tampon0 + 8) % 10];
                                        audioRX.idx_tampon0 = (audioRX.idx_tampon0 + 1) % 10;
                                    }
                                    v = Math.min(1, Math.max(-1, v)); //Value must be between -1 and +1


                                    BufferSource.push(v);
                                }

                                if (RTTY.on)
                                    Bcast.AudioData.postMessage(BufferSource);
                                $("#labelNoise").css("color", noise ? "lightblue" : "white");
                                audioRXnode.source.port.postMessage({
                                    BufferMax: audioRX.BufferMax
                                });
                                audioRXnode.source.port.postMessage({
                                    BufferSource: BufferSource
                                });
                            }
                        } catch (e) {
                            console.log(e);
                        }
                    }
                    // Close the stream
                    controller.close(); //Normally, the communication never stop
                    reader.releaseLock();
                }
            })
        })
    }

}

//
//Audio Filter Nodes
function Init_Audio_RX() {
    audioRX.Ctx = new AudioContext();
    audioRX.sortieFreq = audioRX.Ctx.sampleRate;
    audioRX.Fout_Fin = audioRX.sortieFreq / audioRX.entreeFreq; //Rapport sortie audio/entree audio
    //NODES creation
    //Filer audio highpass
    audioRXnode.filterHP = audioRX.Ctx.createBiquadFilter();
    audioRXnode.filterHP.type = "highpass";
    audioRXnode.filterHP.frequency.value = FilterRX.F1; //Fc:basse
    audioRXnode.filterHP.Q.value = 0.5;
    //Filter audio lowpass
    audioRXnode.filterLP = audioRX.Ctx.createBiquadFilter();
    audioRXnode.filterLP.type = "lowpass";
    audioRXnode.filterLP.frequency.value = FilterRX.F2; //Fc:haute
    //Filter Lowshelf
    audioRXnode.filterLS = audioRX.Ctx.createBiquadFilter();
    audioRXnode.filterLS.type = "lowshelf";
    //Filter Highshelf
    audioRXnode.filterHS = audioRX.Ctx.createBiquadFilter();
    audioRXnode.filterHS.type = "highshelf";
    //Filter audio notch
    audioRXnode.filterNH = audioRX.Ctx.createBiquadFilter();
    audioRXnode.filterNH.type = "notch";
    audioRXnode.filterNH.frequency.value = FilterRX.notchF; //
    audioRXnode.filterNH.Q.value = 2;
    //Analyseur temporel et spectral
    audioRXnode.analFFT = audioRX.Ctx.createAnalyser();
    audioRXnode.analFFT.smoothingTimeConstant = 0.9;
    audioRXnode.analFFT.fftSize = audioFFT;
    //Gains
    audioRXnode.gain_main = audioRX.Ctx.createGain();
    audioRXnode.gain_aux = audioRX.Ctx.createGain();
    //
    navigator.mediaDevices.enumerateDevices()
    .then(function (devices) {
        devices.forEach(function (device) {
            if (device.kind == "audiooutput")
                audioRX.deviceout.push(['Audio Ouput : ' + device.label, device.deviceId]);
        });
        var s = "";
        for (var i = 0; i < audioRX.deviceout.length; i++) {
            s += '<option value=' + i + '>' + audioRX.deviceout[i][0] + '</option>';
        }
        $("#RXaudioOutput").html(s);
        $("#RXaudioOutput option[value='" + FilterRX.Out_aux + "']").prop('selected', true);
        RX_SinkId(FilterRX.Out_aux);
    })
    .catch(function (err) {
        console.log(err.name + ": " + err.message);
    });
    // Buffer for Noise filter
    for (var i = 0; i < 10; i++) {

        audioRX.Tampon0[i] = 0;
    }
    // Auxiliary RX audio output
    audioRX.AuxAudio = document.createElement('audio');
    audioRX.AuxOut = audioRX.Ctx.createMediaStreamDestination();
    audioRX.AuxAudio.srcObject = audioRX.AuxOut.stream;
    Create_RX_Source_Node();
}
function drawFFT() {
    var dessin = requestAnimationFrame(drawFFT);
    audioRX.cptFFT = (audioRX.cptFFT + 1) % 6; // We don't plot too much FFT
    if (audioRX.cptFFT == 0 && SDR_RX.gui_full) {
        var buffer_length = audioRXnode.analFFT.frequencyBinCount;
        var array_freq_domain = new Uint8Array(buffer_length);
        var array_time_domain = new Uint8Array(buffer_length);
        audioRXnode.analFFT.getByteFrequencyData(array_freq_domain);
        audioRXnode.analFFT.getByteTimeDomainData(array_time_domain);
        let Max = (Math.max(...array_time_domain, 160) - 127) / 128;
        //audioRX.meanT = 0.01 * Max + 0.99 * audioRX.meanT;
        if (visus.disp_audio_left == 0)
            Plot_Table("myDisp_Audio_Left", array_time_domain, 0, 0, "white", Max, true, false);
        if (visus.disp_audio_left == 1)
            Plot_Table("myDisp_Audio_Left", array_freq_domain, audioRX.Ctx.sampleRate, 4000, "white", 1, true, true);
        if (visus.disp_audio_left == 2)
            Plot_Water_Audio(WaterAudioLeft, array_freq_domain, audioRX.Ctx.sampleRate, 4000);
        if (visus.disp_audio_right == 0)
            Plot_Table("myDisp_Audio_Right", array_time_domain, 0, 0, "white", Max, true, false);
        if (visus.disp_audio_right == 1)
            Plot_Table("myDisp_Audio_Right", array_freq_domain, audioRX.Ctx.sampleRate, 4000, "white", 1, true, true);
        if (visus.disp_audio_right == 2)
            Plot_Water_Audio(WaterAudioRight, array_freq_domain, audioRX.Ctx.sampleRate, 4000);
        audioRX.F_Audio_Top = Plot_Table("equalizerFFTRX", array_freq_domain, audioRX.Ctx.sampleRate, 5000, "white", 1, false, true);
    }
};
//Asynchronuous load to prepare a WorkletNode Processor
async function Create_RX_Source_Node() {
    await audioRX.Ctx.audioWorklet.addModule('JS/remote_RX_audio_Processor.js'); //Separate file containig the code of the AudioWorkletProcessor
    audioRXnode.source = new AudioWorkletNode(audioRX.Ctx, 'MyRXProcessor'); //Link to MyRXProcessor defined in file remote_RX_audio_Processor.js
    audioRXnode.source.port.onmessage = event => {
        if (event.data.BufferSize) { //Message received from the AudioWorkletProcessor called 'MyRXProcessor'
            audioRX.BufferSize = event.data.BufferSize;
            audioRX.BufferSizeUpd(); //Recompute Optimized size
            TraceAudio.Plot();
        }
    }
    audioRXnode.source.port.postMessage({
        Fout_Fin: audioRX.Fout_Fin.toString()
    });
    Connect_RX_Nodes();
    SetGui();
    drawFFT();
}
function Connect_RX_Nodes() {
    if (audioRXnode.source) {
        FilterRX.notchOn = $("#RXnotchfilter").prop("checked");
        FilterRX.noiseOn = $("#RXnoisefilter").prop("checked");
        FilterRX.direct = $("#mainRXnofilter").prop("checked");
        FilterRX.Mode_aux = parseInt($("input[name='auxRXfilter']:checked").val());
        audioRXnode.source.disconnect();
        audioRXnode.filterLP.disconnect();
        RX_SinkId(FilterRX.Out_aux);
        if (FilterRX.direct) { //No Filter. Direct Link
            audioRXnode.source.connect(audioRXnode.gain_main);
            if (SDR_RX.gui_full)
                audioRXnode.source.connect(audioRXnode.analFFT);
        } else { //Normal Filtering
            audioRXnode.filterLP.connect(audioRXnode.gain_main);
            if (SDR_RX.gui_full)
                audioRXnode.filterLP.connect(audioRXnode.analFFT);
            Trace_EqualizerRX();
        }
        audioRXnode.gain_main.connect(audioRX.Ctx.destination);
        if (FilterRX.Mode_aux == 1) {
            audioRXnode.source.connect(audioRXnode.gain_aux);
        }
        if (FilterRX.Mode_aux == 2) {
            audioRXnode.filterLP.connect(audioRXnode.gain_aux);
        }
        audioRXnode.gain_aux.connect(audioRX.AuxOut);
        let disp_filter = !FilterRX.direct || FilterRX.Mode_aux == 2;
        if (disp_filter) {
            //Connections Inter NODES
            audioRXnode.source.connect(audioRXnode.filterHP);
            audioRXnode.filterHP.disconnect();
            audioRXnode.filterNH.disconnect();
            if (FilterRX.notchOn) {
                audioRXnode.filterHP.connect(audioRXnode.filterNH);
                audioRXnode.filterNH.connect(audioRXnode.filterLS);
            } else {
                audioRXnode.filterHP.connect(audioRXnode.filterLS);
            }
            audioRXnode.filterLS.connect(audioRXnode.filterHS);
            audioRXnode.filterHS.connect(audioRXnode.filterLP);
        }
        $("#Zone_AuEqual2").css("display", disp_filter ? "block" : "none");
        $(".Zone_Au5").css("display", disp_filter ? "block" : "none");
        $("#RXnotch").css("display", disp_filter ? "block" : "none");
    }
}
$("#start-audio").click(function () {
    if (!audioRX.Ctx)
        Init_Audio_RX(); //Filtrage audio
    if (audioRX.Ctx != null && ProcIP.RX.length > 3) {
        audioRX.on = !audioRX.on;
        if (audioRX.on) {
            var v = "RX Audio On";
            $("#start-audio").removeClass('bt_off').addClass('bt_on');
            if (audioRXnode.source) {
                audioRXnode.source.port.postMessage({
                    Fout_Fin: audioRX.Fout_Fin.toString()
                });
            }
        } else {
            var v = "RX Audio Off";
            $("#start-audio").removeClass('bt_on').addClass('bt_off');
            // for (var i = 0; i < audioRX.nbFrames; i++) {
            //     audioRX.Tampon[i] = 0; //Reset audio Buffer when off
            // }
        }
        $("#start-audio").html(v);
    }
    //*****************  if (!audioTXnode.process_out)     Init_Audio_TX(); //Prepare also the TX. Needed in some case for external audio
});
function display_RXequalizer() {
    FilterRX.display = !FilterRX.display;
    $("#Zone_AuEqualizer").css("display", FilterRX.display ? "block" : "none");
    $("#ArrowRXequalizer").html(FilterRX.display ? "&#x1F879;" : "&#x1F87B;");
    Trace_EqualizerRX();
}
function Trace_EqualizerRX() {
    if (!audioRX.Ctx)
        Init_Audio_RX(); //Filtrage audio
    var W = $("#canvasEqualizerRX").innerWidth() - 4;
    var H = 100;
    var h = 104;
    $("#canvasEqualizerRX").css("height", h + "px");
    $("#canvasEqualizerRX").html('<div class="equalcanRX" style="height:' + H + 'px;width:' + W + 'px;"><canvas id="equalizerRX" width="' + W + '" height="' + H + '" ></canvas></div><div class="equalcanRX" style="height:' + H + 'px;width:' + W + 'px;"><canvas id="equalizerFFTRX"  width="' + W + '" height="' + H + '" ></canvas></div>');
    audioRXnode.filterHP.frequency.value = FilterRX.F1;
    audioRXnode.filterLP.frequency.value = FilterRX.F2;
    audioRXnode.filterLS.frequency.value = FilterRX.freqLS;
    audioRXnode.filterLS.gain.value = FilterRX.dB_LS;
    audioRXnode.filterHS.frequency.value = FilterRX.freqHS;
    audioRXnode.filterHS.gain.value = FilterRX.dB_HS;
    audioRXnode.filterNH.frequency.value = FilterRX.notchF;
    $("#LFARX").html(FilterRX.F1 + " - " + FilterRX.F2);
    $("#RX_FLS").html(FilterRX.freqLS + " Hz");
    $("#RX_dBLS").html(FilterRX.dB_LS + " dB");
    $("#RX_FHS").html(FilterRX.freqHS + " Hz");
    $("#RX_dBHS").html(FilterRX.dB_HS + " dB");
    var frequencyArray = new Float32Array(200);
    for (let i = 0; i < 200; i++) {
        frequencyArray[i] = i * 25; //5KHZ band
    }
    var magResponseOutputLS = new Float32Array(200)
        var magResponseOutputHS = new Float32Array(200)
        var magResponseOutputLP = new Float32Array(200)
        var magResponseOutputHP = new Float32Array(200)
        var magResponseOutputNH = new Float32Array(200)
        var phaseResponseOutput = new Float32Array(200)
        audioRXnode.filterLS.getFrequencyResponse(frequencyArray, magResponseOutputLS, phaseResponseOutput);
    audioRXnode.filterHS.getFrequencyResponse(frequencyArray, magResponseOutputHS, phaseResponseOutput);
    audioRXnode.filterLP.getFrequencyResponse(frequencyArray, magResponseOutputLP, phaseResponseOutput);
    audioRXnode.filterHP.getFrequencyResponse(frequencyArray, magResponseOutputHP, phaseResponseOutput);
    audioRXnode.filterNH.getFrequencyResponse(frequencyArray, magResponseOutputNH, phaseResponseOutput);
    var TableMag = [];
    for (let i = 0; i < 200; i++) {
        var Amplitude = magResponseOutputLP[i] * magResponseOutputLS[i] * magResponseOutputHS[i] * magResponseOutputHP[i];
        if (FilterRX.notchOn) {
            Amplitude = Amplitude * magResponseOutputNH[i]
        }
        TableMag.push(12 * (10 + 20 * Math.log10(Amplitude)));
    }
    Plot_Table("equalizerRX", TableMag, 10000, 5000, "lightgreen", 1, true, false)
    Save_RX_Audio();
}
function Plot_Water_Audio(Ref, array_freq_domain, sampleRate, Fmax) { //Audio Waterfall
    var H = Math.floor($("#" + Ref.id).innerHeight());
    var W = Math.floor($("#" + Ref.id).innerWidth());
    var Sl = Math.floor(2 * Fmax * array_freq_domain.length / sampleRate);
    if (Ref.Line == 0) {
        Ref.Bloc = !Ref.Bloc;
        var canvas = document.getElementById("Label_" + Ref.id);
        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, W, H);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'white';
        ctx.fillStyle = 'white';
        ctx.font = "12px Arial";
        ctx.beginPath();
        var FMX = Fmax / 1000;
        for (var f = 0; f < FMX; f++) {
            var x = W * f / FMX;
            ctx.moveTo(x, H);
            ctx.lineTo(x, 0.95 * H);
            ctx.fillText(f + "kHz", x, 0.95 * H);
        }
        ctx.stroke();
    }
    var L = H - Ref.Line - 1;
    var p0 = -L + "px";
    var p1 = -L + H + "px";
    if (Ref.Bloc) {
        $("#Wa0" + Ref.id).css("top", p0);
        $("#Wa1" + Ref.id).css("top", p1);
    } else {
        $("#Wa0" + Ref.id).css("top", p1);
        $("#Wa1" + Ref.id).css("top", p0);
    }
    var canvasWaterfall0 = document.getElementById("Wa0" + Ref.id);
    var ctxW0 = canvasWaterfall0.getContext("2d");
    var canvasWaterfall1 = document.getElementById("Wa1" + Ref.id);
    var ctxW1 = canvasWaterfall1.getContext("2d");
    if (Ref.Bloc) {
        var imgData = ctxW0.getImageData(0, L, W, 1);
    } else {
        var imgData = ctxW1.getImageData(0, L, W, 1);
    }
    var A_FFT = []
    for (var k = 0; k <= W; k++) {
        var i = Math.floor(k * Sl / W);
        var i0 = Math.max(Math.min(i, 20), 0, i - 20);
        var i1 = Math.min(Sl, i + 20, Math.max(i + 1, Sl - 20));
        var sector = array_freq_domain.slice(i0, i1);
        var min = Math.min(...sector);
        A_FFT.push(array_freq_domain[i] - min); //High pass spatial filter
    }
    var max = Math.max(1, ...A_FFT);
    var k = 0;
    for (var i = 0; i < W; i++) {
        var A = Math.floor(300 * A_FFT[i] / max);
        A = Math.min(A, 300); //300 different amplitudes
        imgData.data[k] = Cpalette[A][0]; //Red
        imgData.data[k + 1] = Cpalette[A][1]; //Green
        imgData.data[k + 2] = Cpalette[A][2]; //Blue
        imgData.data[k + 3] = 255;
        k = k + 4;
    }
    if (Ref.Bloc) {
        ctxW0.putImageData(imgData, 0, L); //On modifie la ligne L
    } else {
        ctxW1.putImageData(imgData, 0, L);
    }
    Ref.Line = (Ref.Line + 1) % H;
}
function RX_SinkId(v) {
    FilterRX.Out_aux = v;
    if (FilterRX.Mode_aux > 0 && audioRX.deviceout.length > v) {
        audioRX.AuxAudio.setSinkId(audioRX.deviceout[v][1]);
        audioRX.AuxAudio.play();
    } else {
        audioRX.AuxAudio.pause();
    }
}
function Recall_RX_Audio() {
    if (Local_Storage) { // Parameters stored in local
        try {
            FilterRX = JSON.parse(localStorage.getItem("FilterRX"));
            FilterRX.display = false;
            FilterRX.notchOn = false;
            FilterRX.noiseOn = false;
            FilterRX.direct = false;
            if (FilterRX.F2 - FilterRX.F1 < 200) {
                FilterRX = {
                    F1: 200,
                    F2: 2600
                };
            }
            $("input:radio[name~='auxRXfilter']").filter("[value='" + FilterRX.Mode_aux + "']").prop('checked', true);
        } catch (e) {}
    }
}
function Save_RX_Audio() {
    localStorage.setItem("FilterRX", JSON.stringify(FilterRX));
}
function Init_Sliders_RX_Audio() {
    $(function () {
        $("#slider_Vol_RX").slider({
            min: -40,
            max: 10,
            step: 1,
            value: VtoDB(FilterRX.Vol_wrx),
            slide: function (event, ui) {
                FilterRX.Vol_wrx = DBtoV(ui.value); //dB
                Trace_EqualizerRX();
            }
        });
    });
    $(function () {
        $("#slider_Vol_RXTX").slider({
            min: -40,
            max: 0,
            step: 0.1,
            value: VtoDB(FilterRX.Vol_wtx),
            slide: function (event, ui) {
                FilterRX.Vol_wtx = DBtoV(ui.value); //dB
                Trace_EqualizerRX();
            }
        });
    });
    $(function () {
        $("#slider_Filtre_RX").slider({
            range: true,
            min: 100,
            max: 4000,
            values: [FilterRX.F1, FilterRX.F2],
            slide: function (event, ui) {
                FilterRX.F1 = ui.values[0];
                FilterRX.F2 = ui.values[1];
                Trace_EqualizerRX();
            }
        });
    });
    $(function () {
        $("#RX_FreqLS").slider({
            value: FilterRX.freqLS,
            min: 100,
            max: 1500,
            step: 50,
            orientation: "vertical",
            slide: function (event, ui) {
                FilterRX.freqLS = ui.value;
                Trace_EqualizerRX();
            }
        });
    });
    $(function () {
        $("#RX_dB_LS").slider({
            value: FilterRX.dB_LS,
            min: -10,
            max: 10,
            step: 1,
            orientation: "vertical",
            slide: function (event, ui) {
                FilterRX.dB_LS = ui.value;
                Trace_EqualizerRX();
            }
        });
    });
    $(function () {
        $("#RX_FreqHS").slider({
            value: FilterRX.freqHS,
            min: 1000,
            max: 3500,
            step: 50,
            orientation: "vertical",
            slide: function (event, ui) {
                FilterRX.freqHS = ui.value;
                Trace_EqualizerRX();
            }
        });
    });
    $(function () {
        $("#RX_dB_HS").slider({
            value: FilterRX.dB_HS,
            min: -10,
            max: 10,
            step: 1,
            orientation: "vertical",
            slide: function (event, ui) {
                FilterRX.dB_HS = ui.value;
                Trace_EqualizerRX();
            }
        });
    });
    $(function () {
        $("#RX_FreqNotch").slider({
            value: FilterRX.notchF,
            min: 10,
            max: 4900,
            step: 1,
            slide: function (event, ui) {
                FilterRX.notchF = ui.value;
                Trace_EqualizerRX();
            }
        });
    });
    $(function () {
        $("#RX_LevelNoise").slider({
            value: VtoDB(1 / FilterRX.LevelNoise),
            min: -20,
            max: 40,
            step: 1,
            slide: function (event, ui) {
                FilterRX.LevelNoise = 1 / DBtoV(ui.value);
            }
        });
    });
    $(function () {
        $("#auxRXlevel").slider({
            min: -40,
            max: 10,
            step: 1,
            value: VtoDB(FilterRX.Vol_aux),
            slide: function (event, ui) {
                FilterRX.Vol_aux = DBtoV(ui.value); //dB
            }
        });
    });
}
console.log("End loading remote_RX_audio.js");
