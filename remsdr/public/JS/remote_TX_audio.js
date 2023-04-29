// ***********************************
// *           REMOTE SDR            *
// *              F1ATB              *
// * GNU General Public Licence v3.0 *
// ***********************************
// Variables Audio
//****************
var audioTX = {
    Ctx: null,
    mic_stream: null,
    VolTxLocal: 0.0001,
    cptFFT: 0,
    osc1: null,
    osc2: null,
    osc_CTCSS: null,
    Source: 0,
    Transmit: false,
    Before: false,
    AutoCorrection: false,
    devicein: [],
    AuxSource: null,
    Mic_or_Aux: 0
};
var audioTXnode = {
    process_out: null,
    gain_out: null,
    gain_CTCSS: null,
    analFFT: null,
    filterLP: null,
    filterLS: null,
    filterHS: null,
    splitter: null,
    Mic_gain: null,
    Aux_gain: null
}
var FilterTX = {
    display: false,
    freqLS: 1000,
    dB_LS: 0,
    freqHS: 2500,
    dB_HS: 0
};
$("#start-audioTX").click(function () {
    if (!audioTXnode.process_out) {
        Init_Audio_TX();
        setTimeout("Transmit_Flip_On_Off();", 500); //A delay is needed to create the audio processor
    } else {
        Transmit_Flip_On_Off();
    }
});
function Transmit_Flip_On_Off() {
    if (!audioTX.Transmit) {
        Test_si_relais_TX();
        Transmit_On_Off(true);
    } else {
        Transmit_On_Off(false);
        RTTY.TXon = false;
        RTTYpara_To_Audioprocessor();
    }
}
function Transmit_On_Off(status_) {
    audioTX.Transmit = status_;
    SDR_RX.mode = parseInt($("input[name='mode']:checked").val());
    if (SDR_RX.mode == 2 || SDR_RX.mode == 4)
        audioTX.Transmit = false; //Pas d'emission en AM ou WBFM
    if (SDR_TX.sdr == "TXsa818" && SDR_RX.mode != 3)
        audioTX.Transmit = false;
    if (SDR_TX.ready && User.TXpilot) {
        if (audioTX.mic_stream == null)
            Lance_audioTX();
        Mode_LSB_NBFM_USB_CW();
        if (audioTX.Transmit) {
            Test_si_relais_TX();
            choice_TX_Source();
            freq_TX();
        } else {
            recal_auto_relay = -1;
        }
        Set_RX_GPIO();
        // Set_TX_GPIO();
    } else {
        audioTX.Transmit = false;
    }
    if (audioTX.Transmit) {
        RX_Scan.on = false;
        Scan_status();
        $("#start-audioTX").html("TX Audio On");
        $("#start-audioTX").removeClass('bt_off').addClass('bt_on');
    } else {
        $("#start-audioTX").html("TX Audio Off");
        $("#start-audioTX").removeClass('bt_on').addClass('bt_off');
    }
}
//Traitement Audio du Microphone
function Lance_audioTX() {
    Save_TX_Para();
    if (!navigator.getUserMedia)
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia || navigator.msGetUserMedia;
    if (navigator.getUserMedia) {
        //On se connecte à l'audio input par defaut, le micro
        navigator.getUserMedia({
            audio: true
        },
            function (stream) {
            try {
                //Micro stream
                audioTX.mic_stream = audioTX.Ctx.createMediaStreamSource(stream);
                //Connection between nodes.
                choice_TX_Source();
                Connect_TX_Nodes();
                Trace_EqualizerTX();
            } catch (e) {
                console.log("Micro Stream not ready");
            }
        },
            function (e) {
            alert('Error capturing audio.May be no microphone connected');
        });
    } else {
        alert('getUserMedia not supported in this browser or access to a non secure server(not https)');
    }
}
function Init_Audio_TX() {
    audioTX.Ctx = new AudioContext({
        sampleRate: 10000
    }); //Force 10kHz as sampling rate for the microphone
    //Flux Oscillateurs
    audioTX.osc1 = audioTX.Ctx.createOscillator();
    audioTX.osc2 = audioTX.Ctx.createOscillator();
    audioTX.osc_CTCSS = audioTX.Ctx.createOscillator();
    audioTX.osc1.start()
    audioTX.osc2.start()
    audioTX.osc_CTCSS.start()
    //Creationdes Nodes de gain
    audioTXnode.Mic_gain = audioTX.Ctx.createGain(); //Micro gain
    audioTXnode.Aux_gain = audioTX.Ctx.createGain(); //Auxiliary input gain
    audioTXnode.gain_out = audioTX.Ctx.createGain(); //Listen locally
    audioTXnode.gain_CTCSS = audioTX.Ctx.createGain(); //CTCSS for relays
    //Creation Processing Nodes
    audioTXnode.filterLP = audioTX.Ctx.createBiquadFilter();
    audioTXnode.filterLP.type = "lowpass";
    audioTXnode.filterLP.frequency.value = 3000; //Cut Off 3500Hz
    audioTXnode.filterLS = audioTX.Ctx.createBiquadFilter();
    audioTXnode.filterLS.type = "lowshelf";
    audioTXnode.filterHS = audioTX.Ctx.createBiquadFilter();
    audioTXnode.filterHS.type = "highshelf";
    audioTXnode.analFFT = audioTX.Ctx.createAnalyser();
    audioTXnode.analFFT.smoothingTimeConstant = 0.9;
    audioTXnode.analFFT.fftSize = audioFFT;
    audioTXnode.splitter = audioTX.Ctx.createChannelSplitter(2);
    TX_SourceId(audioParaTX.In_aux); //Selection of the auxiliary input
    Lance_audioTX();
}
//Asynchronuous load to prepare a WorkletNode Processor
async function Connect_TX_Nodes() {
    await audioTX.Ctx.audioWorklet.addModule('JS/remote_TX_audio_Processor.js?tt=9'); //Separate file containig the code of the AudioWorkletProcessor
    CW_play = [];
    CW_KeyLeft = {
        Ton: 0,
        Toff: 0,
        ToffLast: 0
    }; // Last Left key events
    CW_KeyRight = {
        Ton: 0,
        Toff: 0,
        ToffLast: 0
    };
    audioTXnode.process_out = new AudioWorkletNode(audioTX.Ctx, 'MyTXProcessor'); //Link to MyTXProcessor defined in file remote_TX_audio_Processor.js
    audioTXnode.process_out.port.onmessage = event => {
        if (event.data.MaxMicLevel) { //Message received from the AudioWorkletProcessor called 'MyTXProcessor'
            var MaxMicLevel = event.data.MaxMicLevel;
            var SampleRate = event.data.SampleRate;
            var OutData = event.data.OutData; // Table of 128 Integer, voice samples
            RTTY.NbCar = event.data.RTTYnbCar; //Carater still to transmit
            Bcast.sendTXData();
            if (audioTX.Transmit) {
                if (!audioTX.Before)
                    console.log("TX START Transmit");
                TXsocket.emit("AudioTX_Bytes", OutData); //array of 256 bytes. Stopping the sending of data cuts the power of the transmitter
            }
            if (!audioTX.Transmit && audioTX.Before)
                console.log("TX STOP Transmit");
            audioTX.Before = audioTX.Transmit;
            //Prepare next set of signal for CW
            if (SDR_RX.mode >= 5) { // CW
                CW.state = (Math.abs(OutData[0]) > 10000) ? true : false;
                var Tend = Date.now();
                auto_key_management(CW.lastT, Tend);
                CW.lastT = Tend;
                if (CW_play.length > 0) { //Historic Left key pressed not yet played
                    if (!audioTX.Transmit && CW_para.bkin) {
                        Transmit_Flip_On_Off(); //Start Transmission
                    }
                    CW_T.LastEvent = CW_play[CW_play.length - 1].T;
                    audioTXnode.process_out.port.postMessage({
                        CW_play: CW_play
                    });
                    CW_play = [];
                } else {
                    if (audioTX.Transmit && CW_para.bkin && (CW_T.LastEvent < Tend - CW_para.Tbkin) && !CW.state && !CW.spot) {
                        Transmit_Flip_On_Off(); //Stop Transmission
                    }
                    if (CW_Messages.On > 0) {
                        $("#CW_Mem1").removeClass('bt_on').addClass('bt_off');
                        $("#CW_Mem2").removeClass('bt_on').addClass('bt_off');
                        CW_Messages.On == 0;
                    }
                }
                trace_CW();
            }
            //Trace Amplitude et FFT Audio
            audioTX.cptFFT = (audioTX.cptFFT + 1) % 6;
            if (audioTX.cptFFT == 0) { //We don't plot all FFT
                //Analyseur de spectre
                let buffer_length = audioTXnode.analFFT.frequencyBinCount;
                let array_freq_domain = new Uint8Array(buffer_length);
                let array_time_domain = new Uint8Array(buffer_length);
                audioTXnode.analFFT.getByteFrequencyData(array_freq_domain);
                audioTXnode.analFFT.getByteTimeDomainData(array_time_domain);
                couleur = 'white';
                if (MaxMicLevel > 0.2)
                    couleur = 'Aqua';
                if (MaxMicLevel > 0.7)
                    couleur = 'orange';
                if (MaxMicLevel > 0.98)
                    couleur = 'red'; // saturation
                Plot_Table("canvasT", array_time_domain, 0, 0, couleur, MaxMicLevel, true, false);
                Plot_Table("canvasF", array_freq_domain, SampleRate, 4000, couleur, 1, true, false);
                if (FilterTX.display)
                    Plot_Table("equalizerFFTTX", array_freq_domain, SampleRate, 5000, couleur, 1, false, true);
            }
        }
    }
    audioTXnode.Mic_gain.connect(audioTXnode.filterLS);
    audioTXnode.filterLS.connect(audioTXnode.filterHS);
    audioTXnode.filterHS.connect(audioTXnode.filterLP);
    audioTXnode.gain_out.connect(audioTXnode.splitter);
    audioTXnode.splitter.connect(audioTX.Ctx.destination, 0, 0); //To distribute on Left and Right speaker
    audioTXnode.splitter.connect(audioTX.Ctx.destination, 1, 0);
    audioTX.AuxSource.connect(audioTXnode.Aux_gain);
    Para_To_AudioProcessor();
    choice_TX_Source();
    Trace_EqualizerTX();
}
function Para_To_AudioProcessor() {
    if (audioTXnode.process_out != null) {
        //Strange behaviour if you send an integer = 0.
        audioTXnode.process_out.port.postMessage({
            SDR_RX_mode: SDR_RX.mode.toString(),
            Compresse: audioParaTX.Compresse.toString(),
            Pitch: CW_para.pitch.toString(),
            Alpha: CW.alpha.toString()
        });
    }
}
function RTTYpara_To_Audioprocessor() {
    if (audioTXnode.process_out != null) {
        audioTXnode.process_out.port.postMessage({
            RTTY: {
                TXon: RTTY.TXon,
                PHImark: RTTY.PHImark,
                PHIspace: RTTY.PHIspace,
                NbsampleBit: RTTY.NbsampleBit
            }
        });
    }
}
function choice_TX_Source() {
    audioTX.Mic_or_Aux = $("input[name='TXsource']:checked").val();
    if (audioTXnode.process_out != null) { //Last node created
        audioTXnode.filterLP.disconnect();
        audioTXnode.Aux_gain.disconnect();
        if (audioTX.Mic_or_Aux == 0) { //Microphone as input
            $("#para_Micro").css("visibility", "visible");
            $("#dispTXequal").css("display", "block");
            audioTX.Source = $("input[name='Source']:checked").val();
            if (audioTX.AutoCorrection)
                audioTX.Source = 1; //Sinus transmitted  to align TX freq on RX
            if (audioTX.Source == 0) { //Micro
                audioTX.mic_stream.connect(audioTXnode.Mic_gain);
            } else {
                audioTX.mic_stream.disconnect();
            }
            if (audioTX.Source > 0) { //1 Sinus
                audioTX.osc1.frequency.value = 800;
                audioTX.osc1.connect(audioTXnode.Mic_gain);
            } else {
                audioTX.osc1.disconnect();
            }
            if (audioTX.Source == 2) { //2 Sinus
                audioTX.osc2.frequency.value = 1900;
                audioTX.osc1.frequency.value = 500;
                audioTX.osc2.connect(audioTXnode.Mic_gain);
            } else {
                audioTX.osc2.disconnect();
            }
            if (CTCSS.freq > 0 && SDR_TX.sdr != "TXsa818") {
                audioTX.osc_CTCSS.frequency.value = CTCSS.freq;
                audioTX.osc_CTCSS.connect(audioTXnode.gain_CTCSS)
                audioTXnode.gain_CTCSS.gain.value = 0.10; //10% modulation level, standard 15% could generate background signal
                audioTXnode.gain_CTCSS.connect(audioTXnode.process_out);
            } else {
                audioTXnode.gain_CTCSS.disconnect();
            }
            audioTXnode.filterLP.connect(audioTXnode.analFFT); //Reconnect
            audioTXnode.filterLP.connect(audioTXnode.process_out);
        } else { // Auxiliary as input
            $("#para_Micro").css("visibility", "hidden");
            $("#dispTXequal").css("display", "none");
            audioTXnode.Aux_gain.connect(audioTXnode.analFFT);
            audioTXnode.Aux_gain.connect(audioTXnode.process_out);
        }
        Trace_EqualizerTX();
        GainTXaudio();
        if (SDR_RX.mode > 4) { // CW
            audioTX.mic_stream.disconnect();
        }
        Para_To_AudioProcessor();
        Save_TX_Para();
    }
}
function GainTXaudio() {
    //Connection to Speakers
    if (audioTX.Ctx != null) {
        if (audioTX.VolTxLocal > 0.011 && SDR_RX.mode < 5) {
            audioTXnode.gain_out.gain.value = audioTX.VolTxLocal;
            audioTXnode.process_out.connect(audioTXnode.gain_out); // Stream connected to the  speakers
        } else if (CW_para.level > 0 && SDR_RX.mode >= 5) {
            audioTXnode.gain_out.gain.value = CW_para.level;
            audioTXnode.process_out.connect(audioTXnode.gain_out);
        } else {
            audioTXnode.process_out.disconnect();
        }
        audioTXnode.Mic_gain.gain.value = 0.5 * audioParaTX.VolMic / Math.max(1, audioTX.Source); //Divide by 2 if 2 tone test
        audioTXnode.Aux_gain.gain.value = audioParaTX.VolAux;
    }
}
function TX_SourceId(v) { //Create Auxiliry Source
    v = Math.max(0, Math.min(audioTX.devicein.length - 1, v)); //If number of media devices has changed
    audioParaTX.In_aux = v;
    if (v < audioTX.devicein.length && audioTX.Ctx != null) {
        let id = audioTX.devicein[v][1];
        var audioConstraint = {
            deviceId: {
                exact: id
            }
        }
        navigator.getUserMedia({
            audio: audioConstraint
        },
            function (stream) {
            //Auxiliary stream
            audioTX.AuxSource = audioTX.Ctx.createMediaStreamSource(stream);
        },
            function (e) {
            alert('Error capturing audio.May be no microphone connected');
        });
        if (Local_Storage)
            Save_TX_Para();
    }
}
// DTMF
function dtmf_d(x) {
    if (audioTX.mic_stream != null) {
        audioTX.Source = $("input[name='Source']:checked").val();
        audioTX.mic_stream.disconnect();
        audioTX.osc1.connect(audioTXnode.Mic_gain);
        if (x == 1750) { //Not dtmf but single tone 1750Hz
            audioTXnode.Mic_gain.gain.value = 0.5 * audioParaTX.VolMic; //-6dB to avoid saturation at input
            audioTX.osc2.disconnect();
            var Fl = x;
        } else {
            audioTX.osc2.connect(audioTXnode.Mic_gain);
            audioTXnode.Mic_gain.gain.value = 0.5 * audioParaTX.VolMic / 2; //Divide by 2 as 2 tones
            var Fc = 1209;
            if (x == "2" || x == "5" || x == "8" || x == "0")
                Fc = 1336; //Hz
            if (x == "3" || x == "6" || x == "9" || x == "#")
                Fc = 1477; //Hz
            if (x == "A" || x == "B" || x == "C" || x == "D")
                Fc = 1633; //Hz
            var Fl = 697;
            if (x == "4" || x == "5" || x == "6" || x == "B")
                Fl = 770; //Hz
            if (x == "7" || x == "8" || x == "9" || x == "C")
                Fl = 852; //Hz
            if (x == "*" || x == "0" || x == "#" || x == "D")
                Fl = 941; //Hz
            audioTX.osc2.frequency.value = Fc;
        }
        audioTX.osc1.frequency.value = Fl;
    }
}
function dtmf_u() {
    choice_TX_Source();
}
function display_AudioF() {
    if (!audioTXnode.process_out)
        Init_Audio_TX();
    FilterTX.display = !FilterTX.display;
    $("#para_TX_SSB_FM2").css("display", FilterTX.display ? "block" : "none");
    $("#ArrowAudioF").html(FilterTX.display ? "&#x1F879;" : "&#x1F87B;");
    Trace_EqualizerTX();
}
function Trace_EqualizerTX() {
    var W = $("#canvasEqualizerTX").innerWidth() - 4;
    var H = 100;
    var h = 104;
    $("#canvasEqualizerTX").css("height", h + "px");
    $("#canvasEqualizerTX").html('<div class="equalcanTX" style="height:' + H + 'px;width:' + W + 'px;"><canvas id="equalizerTX" width="' + W + '" height="' + H + '" ></canvas></div><div class="equalcanTX" style="height:' + H + 'px;width:' + W + 'px;"><canvas id="equalizerFFTTX"  width="' + W + '" height="' + H + '" ></canvas></div>');
    var TableMag = [];
    audioTX.Mic_or_Aux = $("input[name='TXsource']:checked").val();
    if (audioTXnode.process_out != null && audioTX.Mic_or_Aux == 0) {
        audioTXnode.filterLS.frequency.value = FilterTX.freqLS;
        audioTXnode.filterLS.gain.value = FilterTX.dB_LS;
        audioTXnode.filterHS.frequency.value = FilterTX.freqHS;
        audioTXnode.filterHS.gain.value = FilterTX.dB_HS;
        $("#TX_FLS").html(FilterTX.freqLS + " Hz");
        $("#TX_dBLS").html(FilterTX.dB_LS + " dB");
        $("#TX_FHS").html(FilterTX.freqHS + " Hz");
        $("#TX_dBHS").html(FilterTX.dB_HS + " dB");
        var frequencyArray = new Float32Array(200);
        for (let i = 0; i < 200; i++) {
            frequencyArray[i] = i * 25;
        }
        var magResponseOutputLS = new Float32Array(200)
            var magResponseOutputHS = new Float32Array(200)
            var magResponseOutputLP = new Float32Array(200)
            var phaseResponseOutput = new Float32Array(200)
            audioTXnode.filterLS.getFrequencyResponse(frequencyArray, magResponseOutputLS, phaseResponseOutput);
        audioTXnode.filterHS.getFrequencyResponse(frequencyArray, magResponseOutputHS, phaseResponseOutput);
        audioTXnode.filterLP.getFrequencyResponse(frequencyArray, magResponseOutputLP, phaseResponseOutput);
        for (let i = 0; i < 200; i++) {
            TableMag.push(12 * (10 + 20 * Math.log10(magResponseOutputLP[i] * magResponseOutputLS[i] * magResponseOutputHS[i])));
        }
    }
    Plot_Table("equalizerTX", TableMag, 10000, 5000, "lightgreen", 1, true, false);
}
function Init_Sliders_TX_Audio() {
    $(function () {
        $("#slider_Vol_TX").slider({
            value: VtoDB(audioParaTX.VolMic),
            min: -15,
            max: 25,
            step: 1,
            slide: function (event, ui) {
                audioParaTX.VolMic = DBtoV(ui.value);
                GainTXaudio();
                $("#val_Vol_TX").html(ui.value + " dB");
            }
        });
        TX_Compress();
    });
    $("#val_Vol_TX").html(VtoDB(audioParaTX.VolMic) + " dB");
    $(function () {
        $("#slider_TX_local").slider({
            value: VtoDB(audioTX.VolTxLocal),
            min: -40,
            max: 0,
            step: 1,
            slide: function (event, ui) {
                audioTX.VolTxLocal = DBtoV(ui.value);
                GainTXaudio();
            }
        });
    });
    $(function () {
        $("#TX_FreqLS").slider({
            value: FilterTX.freqLS,
            min: 100,
            max: 1500,
            step: 50,
            orientation: "vertical",
            slide: function (event, ui) {
                FilterTX.freqLS = ui.value;
                Trace_EqualizerTX();
                Save_TX_Para();
            }
        });
    });
    $(function () {
        $("#TX_dB_LS").slider({
            value: FilterTX.dB_LS,
            min: -10,
            max: 10,
            step: 1,
            orientation: "vertical",
            slide: function (event, ui) {
                FilterTX.dB_LS = ui.value;
                Trace_EqualizerTX();
                Save_TX_Para();
            }
        });
    });
    $(function () {
        $("#TX_FreqHS").slider({
            value: FilterTX.freqHS,
            min: 1000,
            max: 3500,
            step: 50,
            orientation: "vertical",
            slide: function (event, ui) {
                FilterTX.freqHS = ui.value;
                Trace_EqualizerTX();
                Save_TX_Para();
            }
        });
    });
    $(function () {
        $("#TX_dB_HS").slider({
            value: FilterTX.dB_HS,
            min: -10,
            max: 10,
            step: 1,
            orientation: "vertical",
            slide: function (event, ui) {
                FilterTX.dB_HS = ui.value;
                Trace_EqualizerTX();
                Save_TX_Para();
            }
        });
    });
    $(function () {
        $("#auxTXlevel").slider({
            min: -40,
            max: 10,
            step: 1,
            value: VtoDB(audioParaTX.VolAux),
            slide: function (event, ui) {
                audioParaTX.VolAux = DBtoV(ui.value); //dB
                GainTXaudio();
                Save_TX_Para();
            }
        });
    });
    navigator.mediaDevices.enumerateDevices()
    .then(function (devices) {
        devices.forEach(function (device) {
            if (device.kind == "audioinput")
                audioTX.devicein.push(['Audio Input : ' + device.label, device.deviceId]);
        });
        var s = "";
        for (var i = 0; i < audioTX.devicein.length; i++) {
            s += '<option value=' + i + '>' + audioTX.devicein[i][0] + '</option>';
        }
        $("#TXaudioInput").html(s);
        $("#TXaudioInput option[value='" + audioParaTX.In_aux + "']").prop('selected', true);
        TX_SourceId(audioParaTX.In_aux);
    })
    .catch(function (err) {
        console.log(err.name + ": " + err.message);
    });
}
console.log("End loading remote_TX_audio.js");
