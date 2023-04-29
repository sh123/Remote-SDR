var RTTYstore = {
    idxMode: 0,
    idxShift: 3,
    Fmark: 2295,
	FidxTX:0,
    inv: false,
    Q: 20,
    m: "MyCall",
    s: "MyName",
    c: "HisCall",
    n: "HisName",
	AmpOn:true,
	PhiOn:true,
	WaterCol:0
}
const RTTY_RX = {
    ctx: null,
    Fmark: 2295,
    Fspace: 2125,
    Fnotch: 1000,
    Fout_Fin: 1,
    BufferSize: 0,
    cptFFT: 0,
    LSB: false,
    Faudio: 0

};

//Waterfall
var Water = {
    Line: 0,
    bloc: false,
    water_col: 0
}

var modes = []
modes.push({
    bauds: 45,
    Nsample: 22,
    Nstep: 10
});
modes.push({
    bauds: 50,
    Nsample: 20,
    Nstep: 10
});
modes.push({
    bauds: 75,
    Nsample: 13.33333,
    Nstep: 10
});
var shifts = [23, 85, 160, 170, 182, 200, 240, 350, 425, 450, 850]
var Fmarks=["TX=RX",2295];
const Colors = [];
Colors.push(["#fff", "#aaa", "#333", "#000"]);
Colors.push(["#fff", "#fff", "#000", "#000"]);
Colors.push(["#fff", "#f00", "#0f0", "#004"]);
Colors.push(["#8f8", "#0f0", "#080", "#000"]);
Colors.push(["#fa0", "#f80", "#840", "#000"]);
Colors.push(["#fff", "#f00", "#aa0", "#004"]);
Colors.push(["#ff0", "#f00", "#000", "#000"]);
Colors.push(["#fa3", "#ba1", "#a53", "#000"]);
Colors.push(["#f40", "#fa0", "#800", "#000"]);
Colors.push(["#88f", "#00f", "#008", "#000"]);
Colors.push(["#fff", "#99f", "#148", "#000"]);
Colors.push(["#fff", "#26f", "#136", "#000"]);
var Cpalette = []; //Waterfall Color Palette


//Short Integration
const ShortInt = {
    Out: 0,
    OutM: [],
    OutS: [],
    M: 0,
    S: 0,
    Sum: 0,
    NbSample: 0,
    PreFiltre: [],
    IdxLoadPF: 0,
    Size: 500,
    LastSignal: 0,
    Phase: [],
    Zeros: 0,
    Integrate: function () {
        var SampleTotal = modes[RTTYstore.idxMode].Nsample;
        while (this.OutM.length > 0 && this.OutS.length > 0) {
            var M = this.OutM.shift();
            var S = this.OutS.shift();
            this.Sum += M * M - S * S; //Energy Mark - Energy Space for Detection on amplitude
            this.NbSample += 1;
            var Signal = M + S; //Signal Mark + Space to count the transition at zero for detection on Phase
            if (Signal * this.LastSignal <= 0)
                this.Zeros++;
            this.LastSignal = Signal;
            if (this.NbSample >= SampleTotal) {
                this.Out = (this.Sum > 0) ? 1 : 0; //Partial detection for test (short integration only)
                this.NbSample -= SampleTotal;
                this.PreFiltre[this.IdxLoadPF] = this.Sum; //Short Integration
                this.Phase[this.IdxLoadPF] = this.Zeros;
                this.Zeros = 0;
                this.IdxLoadPF = (this.IdxLoadPF + 1) % this.Size; //Storage of 1ms of results
                this.Sum = 0;
                this.M = M; //Last Sample for XY display
                this.S = S;
                Plot_XY.Plot();

            }
        }

    }
}
const RTTY_RXnode = {
    source: null,
    filterNotch: null,
    filterBPs: null,
    filterBPm: null,
    analFFT: null,
    detectS: null,
    detectM: null,
    start: function () {
        RTTY_RX.Ctx = new AudioContext({
            sampleRate: 10000
        });
        //NODES creation
        //Filter Notch
        this.filterNotch = RTTY_RX.Ctx.createBiquadFilter();
        this.filterNotch.type = "notch";
        this.filterNotch.frequency.value = RTTY_RX.Fnotch; //F notch
        this.filterNotch.Q.value = 20;
        //Filter audio bandpass Space
        this.filterBPs = RTTY_RX.Ctx.createBiquadFilter();
        this.filterBPs.type = "bandpass";
        this.filterBPs.frequency.value = RTTY_RX.Fspace; //F Space
        this.filterBPs.Q.value = RTTYstore.Q;
        //Filter audio bandpass Mark
        this.filterBPm = RTTY_RX.Ctx.createBiquadFilter();
        this.filterBPm.type = "bandpass";
        this.filterBPm.frequency.value = RTTY_RX.Fmark; //F Mark
        this.filterBPm.Q.value = RTTYstore.Q;
        //Analyseur temporel et spectral
        this.analFFT = RTTY_RX.Ctx.createAnalyser();
        this.analFFT.smoothingTimeConstant = 0.9;
        this.analFFT.fftSize = 1024;
        this.Create_RTTY_Source_Node();
        this.Create_RTTY_Detector_Nodes();
        Init_Sliders();
        newMode(RTTYstore.idxMode);
        newShift(RTTYstore.idxShift);
		newFmark(RTTYstore.FidxTX);
        window_resize();
        ResetRTTY();
        Plot_WaterFall();
        setInterval("DetectAmp.Detect();", 95);
        setInterval("DetectPhase.Detect();", 96);
		
        
       // setInterval("DetectAmp.Scroll();", 1000);
		//setInterval("DetectPhase.Scroll();", 1001);

        $("#startbutton").css("display", "none");
        $(".paraRXin").css("display", "block");
    },
    ConnectSource: function () {
        this.notchOn = $("#RXnotchfilter").prop("checked");
        this.source.disconnect();
        this.filterNotch.disconnect();
        if (this.notchOn) {
            this.source.connect(RTTY_RXnode.filterNotch);
            this.filterNotch.connect(RTTY_RXnode.filterBPs);
            this.filterNotch.connect(RTTY_RXnode.filterBPm);
            this.filterNotch.connect(RTTY_RXnode.analFFT);
        } else {
            this.source.connect(RTTY_RXnode.filterBPs);
            this.source.connect(RTTY_RXnode.filterBPm);
            this.source.connect(RTTY_RXnode.analFFT);
        }
    },
    Create_RTTY_Detector_Nodes: async function () {
        await RTTY_RX.Ctx.audioWorklet.addModule('JS/RX_Detector_Processor.js'); //Separate file containig the code of the AudioWorkletProcessor
        this.detectS = new AudioWorkletNode(RTTY_RX.Ctx, 'RX_Detect_Processor');
        this.detectM = new AudioWorkletNode(RTTY_RX.Ctx, 'RX_Detect_Processor');
        this.detectS.port.onmessage = event => {
            if (event.data.OutData) { //Message received from the AudioWorkletProcessor called 'RTTY_RXProcessor'
                ShortInt.OutS = ShortInt.OutS.concat(event.data.OutData);
                ShortInt.Integrate();
            }
        }
        this.detectM.port.onmessage = event => {
            if (event.data.OutData) { //Message received from the AudioWorkletProcessor called 'RTTY_RXProcessor'
                ShortInt.OutM = ShortInt.OutM.concat(event.data.OutData);
                ShortInt.Integrate();
            }
        }
        this.filterBPs.connect(this.detectS);
        this.filterBPm.connect(this.detectM);
    },
    Create_RTTY_Source_Node: async function () { //Asynchronuous load to prepare a WorkletNode Processor
        await RTTY_RX.Ctx.audioWorklet.addModule('JS/RX_Source_Processor.js'); //Separate file containig the code of the AudioWorkletProcessor
        this.source = new AudioWorkletNode(RTTY_RX.Ctx, 'RTTY_RXProcessor'); //Link to RTTY_RXProcessor defined in file RX_Source_Processor.js
        this.source.port.onmessage = event => {
            if (event.data.BufferSize) { //Message received from the AudioWorkletProcessor called 'RTTY_RXProcessor'
                RTTY_RX.BufferSize = event.data.BufferSize;

                //To be plotted for debugging
            }
            if (event.data.Fout_Fin) { //Message received from the AudioWorkletProcessor called 'RTTY_RXProcessor'
                RTTY_RX.Fout_Fin = event.data.Fout_Fin;
            }
        }
        this.source.port.postMessage({
            Fout_Fin: RTTY_RX.Fout_Fin.toString()
        });
        this.ConnectSource();

    }

}
//BroadcastChannels
const Bcast = {
    AudioData: new BroadcastChannel('AudioData'),
    RTTY_RXdata: new BroadcastChannel('RTTY_RXdata'),
    RTTY_TXdata: new BroadcastChannel('RTTY_TXdata'),
    sendTXData: function (C) {
        var message = {
            TXcar: C
        };
        message = JSON.stringify(message);
        Bcast.RTTY_TXdata.postMessage(message);
    },
    sendTXOn: function () {
        var NbsampleBit = modes[RTTYstore.idxMode].Nsample * modes[RTTYstore.idxMode].Nstep; //Nb audio sample per bit
		var message = {
            TXOn: RTTY_TX.TX_ON,
            PHImark: RTTY_TX.Fmark / 50,
            PHIspace: RTTY_TX.Fspace / 50,
            NbsampleBit: NbsampleBit
        }; //1KHz correspond to a step of 20 in phase
        message = JSON.stringify(message);
        Bcast.RTTY_TXdata.postMessage(message);

    }
}
Bcast.AudioData.addEventListener('message', (event) => {
    if (RTTY_RXnode.source != null) {
        RTTY_RXnode.source.port.postMessage({
            BufferSource: event.data
        });
    }
});

Bcast.RTTY_RXdata.addEventListener('message', (event) => {
    var RTTY_RXdata = JSON.parse(event.data);
    $("#RXmode").html(RTTY_RXdata.mode);
    RTTY_RX.LSB = false;
    if (RTTY_RXdata.mode.indexOf("LSB") >= 0)
        RTTY_RX.LSB = true;

    RTTY_RX.Faudio = RTTY_RXdata.Faudio;
    if (RTTY_RX.LSB) {
        var HFs = RTTY_RX.Faudio - RTTY_RX.Fspace;
        var HFm = RTTY_RX.Faudio - RTTY_RX.Fmark;
    } else {
        var HFs = RTTY_RX.Faudio + RTTY_RX.Fspace;
        var HFm = RTTY_RX.Faudio + RTTY_RX.Fmark;
    }
    $("#FHFspace").html(HFs.toLocaleString());
    $("#FHFmark").html(HFm.toLocaleString());
    RTTY_TX.Fduplex = RTTY_RXdata.Fduplex;
});
Bcast.RTTY_TXdata.addEventListener('message', (event) => {
    var RTTY_TXdata = JSON.parse(event.data);
    RTTY_TX.NbCar = RTTY_TXdata.NbCar;

});

//Audio Filter Nodes
function Init_RTTY_RX() {
    Recall_RTTY();
    WaterColor(Water.water_col);
    for (var i = 0; i < ShortInt.Size; i++) {
        ShortInt.PreFiltre[i] = 0; //Partial storage during 1ms
        ShortInt.Phase[i] = 0;
        DetectPhase.FiltreOut[i] = 0;
        DetectAmp.FiltreOut[i] = 0;

    }
    //RTTY Modes
    InitPage.TheModes();
    InitPage.TheMacros();
    RTTY_TX.Init();
    window_resize();
    $('#waterFFT').on('mousewheel', function (event) {
        var deltaF = event.deltaY; //1Hz step
        RTTYstore.Fmark = Math.floor(RTTYstore.Fmark + deltaF);
        RTTYstore.Fmark = Math.max(0, Math.min(RTTYstore.Fmark, 4000));
        ResetRTTY();
    });
    Save_RTTY();
}

function newMode(v) {
    RTTYstore.idxMode = v;
    $("#ModeSelect option[value='" + v + "']").prop('selected', true);
    Save_RTTY();
}
function newShift(v) {
    RTTYstore.idxShift = v;
    $("#Shift option[value='" + v + "']").prop('selected', true);
    ResetRTTY();
}
function newFmark(v){
	RTTYstore.FidxTX= v;
	$("#FMark option[value='" + v + "']").prop('selected', true);
	ResetRTTY();
}
function ResetRTTY() {
    RTTYstore.inv = $("#Inverse").prop("checked");
	var FmarkTX=RTTYstore.Fmark;
	if (RTTYstore.FidxTX>0) FmarkTX=Fmarks[RTTYstore.FidxTX];
    if (RTTYstore.inv) {
        RTTY_RX.Fspace = RTTYstore.Fmark; //Fmark of the RX
        RTTY_RX.Fmark = RTTY_RX.Fspace - shifts[RTTYstore.idxShift];
		RTTY_TX.Fspace = FmarkTX; //Fmark of the TX
        RTTY_TX.Fmark = RTTY_TX.Fspace - shifts[RTTYstore.idxShift];
    } else {
        RTTY_RX.Fmark = RTTYstore.Fmark;
        RTTY_RX.Fspace = RTTY_RX.Fmark - shifts[RTTYstore.idxShift];
		RTTY_TX.Fmark = FmarkTX;
        RTTY_TX.Fspace = RTTY_TX.Fmark - shifts[RTTYstore.idxShift];
    }
    RTTY_RXnode.filterBPs.frequency.value = RTTY_RX.Fspace;
    RTTY_RXnode.filterBPm.frequency.value = RTTY_RX.Fmark;
    $("#FAspace").html(RTTY_RX.Fspace.toLocaleString());
    $("#FAmark").html(RTTY_RX.Fmark.toLocaleString());
    Plot_FFT.Freq_Response();
    Save_RTTY();
}
function clickFreq(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    var P0 = $("#waterFFT").position();
    var W = $("#waterFFT").innerWidth();
    var new_pos = e.clientX - P0.left;
    if (RTTY_RXnode.filterBPm != null) {
        RTTYstore.Fmark = Math.floor(4000 * new_pos / W);
        ResetRTTY();
    }
}

function Plot_WaterFall() {
    Plot_FFT.Plot();
    var dessin = requestAnimationFrame(Plot_WaterFall);
}

function window_resize() {
    DetectAmp.Resize();
    DetectPhase.Resize();

    Plot_XY.Resize();
    Plot_FFT.Resize();
    Plot_FFT.Freq_Response();

}
function WaterColor(V) {
    Water.water_col = V;
    //Save_visus();
    var CT = [];
    for (var c = 0; c < 3; c++) {
        CT.push([0, 0, 0]);
        for (var t = 0; t < 3; t++) {
            var C = Colors[Water.water_col][c + 1].substr(t + 1, 1);
            C = C + C;
            CT[c][t] = parseInt(C, 16);
        }
    }
    Cpalette = [];
    for (var i = 0; i <= 300; i++) {
        if (i <= 150) {
            var R = CT[2][0] + (CT[1][0] - CT[2][0]) * i / 150;
            var V = CT[2][1] + (CT[1][1] - CT[2][1]) * i / 150;
            var B = CT[2][2] + (CT[1][2] - CT[2][2]) * i / 150;
        } else {
            var j = i - 150;
            var R = CT[1][0] + (CT[0][0] - CT[1][0]) * j / 150;
            var V = CT[1][1] + (CT[0][1] - CT[1][1]) * j / 150;
            var B = CT[1][2] + (CT[0][2] - CT[1][2]) * j / 150;
        }
        Cpalette.push([Math.floor(R), Math.floor(V), Math.floor(B)]);
    }
	$("#waterbut").val(Water.water_col);
	var C="rgb("+Cpalette[300][0]+","+Cpalette[300][1]+","+Cpalette[300][2]+")";
	$("#waterbut").css("background-color",C);
	
}
function Init_Sliders() {
    $(function () {
        $("#slider_Q").slider({
            min: 0,
            max: 40,
            step: 1,
            value: RTTYstore.Q,
            slide: function (event, ui) {
                RTTY_RXnode.filterBPs.Q.value = ui.value;
                RTTY_RXnode.filterBPm.Q.value = ui.value;
                RTTYstore.Q = ui.value;
                ResetRTTY();
            }
        });
    });
    $(function () {
        $("#RX_FreqNotch").slider({
            value: RTTY_RX.Fnotch,
            min: 10,
            max: 4000,
            step: 1,
            slide: function (event, ui) {
                RTTY_RX.Fnotch = ui.value;
                RTTY_RXnode.filterNotch.frequency.value = RTTY_RX.Fnotch;
                Plot_FFT.Freq_Response();
            }
        });
    });
    $(function () {
        $("#RX_Qnotch").slider({
            min: 1,
            max: 20,
            step: 1,
            value: 10,
            slide: function (event, ui) {
                RTTY_RXnode.filterNotch.Q.value = ui.value;
                Plot_FFT.Freq_Response();
            }
        });
    });
}
function Save_RTTY() {
    RTTYstore.m = $("#MyCall").val();
    RTTYstore.s = $("#MyName").val();
    RTTYstore.c = $("#HisCall").val();
    RTTYstore.n = $("#HisName").val();
	RTTYstore.AmpOn=DetectAmp.On;
	RTTYstore.PhiOn=DetectPhase.On;
	RTTYstore.WaterCol=Water.water_col;
    localStorage.setItem("RTTYstore", JSON.stringify(RTTYstore));
    var RTTY_InitP = {
        MacroTitle: InitPage.MacroTitle,
        MacroText: InitPage.MacroText
    };
    localStorage.setItem("RTTY_InitP", JSON.stringify(RTTY_InitP));
}
function Recall_RTTY() {
    if (localStorage.getItem("RTTYstore") != null) { // We have an old storage
        if (localStorage.getItem("RTTYstore").length > 10) {
            RTTYstore = JSON.parse(localStorage.getItem("RTTYstore"));
			DetectAmp.On=RTTYstore.AmpOn;
			DetectPhase.On=RTTYstore.PhiOn;
			Water.water_col=RTTYstore.WaterCol;
            var RTTY_InitP = JSON.parse(localStorage.getItem("RTTY_InitP"));
            InitPage.MacroTitle = RTTY_InitP.MacroTitle;
            InitPage.MacroText = RTTY_InitP.MacroText;
        }
    }
}

