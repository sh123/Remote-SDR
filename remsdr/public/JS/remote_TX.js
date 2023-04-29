// ***********************************
// *           REMOTE SDR            *
// *              F1ATB              *
// * GNU General Public Licence v3.0 *
// ***********************************
//Parametres GNU Radio
var TX = {
    Freq: 432000000,
    Fsdr: 432000000,
    LNUC: 1, //LSB_NBFM_USB_CW
    G1: 87,
    G2: 45,
    invSpectra: false,
    CTCSS: 0
};
//SDR Parameters
var TXsdr = [];
//"hackrf"
TXsdr.push({
    name: "hackrf",
    G1: ["AMP (dB)", 0, 14, 14], //name,min,max,step
    G2: ["VGA (dB)", 0, 47, 1],
    Fmin: 1000000,
    Fmax: 6000000000
});
//Pluto
TXsdr.push({
    name: "pluto",
    G1: ["Gain (dB)", 0, 89, 1], //name,min,max,step
    G2: ["", 0, 0, 1],
    Fmin: 70000000,
    Fmax: 6000000000
});
//Variables Transmitter
var SDR_TX = {
    Xtal_Error: 0,
    Bande: 0,
    Fmin: 0,
    Fmax: 0,
    Decal_RX: 0,
    relay_auto: false,
    invert: false,
    TXeqRX: false,
    Fduplex: true,
    idxSdr: 0,
    ready: false,
    SDRtx: ""
};

var recal_auto_relay = -1;
var timer_auto_relay = 0;
var timer_AutoCorrect;
var TX_GPIO_state = "";
var TX_Xtal_Errors = new Array(); //Errors Xtal frequency
var TXconverter = {
    fixed_offset: 0,
    invSpectra: false
};
var audioParaTX = {
    Compresse: 1,
    VolMic: 1,
    VolAux: 0,
    In_aux: 0
};
//Variables CW
var CW = {
    state: false,
    levelRC: 0,
    alpha: 1 / 20,
    out_phase: 0,
    display: false,
    spot: false,
    lastT: 0
}
//Gpredict
var GPredictTXcount = 0;
//Table for CTCSS  channels
var CTCSS = {
    freq: 0,
    channels: []
};
CTCSS.channels = [0, 67, 71.9, 74.4, 77, 79.7, 82.5, 85.4, 88.5, 91.5, 94.8, 97.4, 100, 103.5, 107.2, 110.9, 114.8, 118.8, 123, 127.3, 131.8, 136.5, 141.3, 146.2, 151.4, 156.7, 162.2, 167.9, 173.8, 179.9, 186.2, 192.8, 203.5, 210.7, 218.1, 225.7, 233.6, 241.8, 250.3]
function init_para_sdrTX() {
    console.log(Date.now() - T0_remsdr, "TX parameters init");
    TXeqRX();
    Mode_TX();
    recal_auto_relay = -1;
    Test_si_relais_TX();
    freq_TX();
}
function choixBandeTX() { //Suivant freq TX defini les limites
    for (var i = 0; i < ConfTX.Bandes.length; i++) {
        if (ConfTX.Bandes[i][0] <= TX.Freq && ConfTX.Bandes[i][1] >= TX.Freq) {
            SDR_TX.Bande = i;
            SDR_TX.Fmin = ConfTX.Bandes[i][0];
            SDR_TX.Fmax = ConfTX.Bandes[i][1];
            SDR_TX.Decal_RX = ConfTX.Bandes[i][3];
            SDR_TX.Xtal_Error = TX_Xtal_Errors[i];
        }
    }
    Affich_freq_champs(TX.Freq, "#FRT");
    Affich_freq_champs(SDR_TX.Xtal_Error, "#OFT");
    TXconverter.fixed_offset = 0;
    for (var i = 0; i < ConfTX.FixedOffset.length; i++) {
        if (TX.Freq > ConfTX.FixedOffset[i][0] && TX.Freq < ConfTX.FixedOffset[i][1]) {
            TXconverter.fixed_offset = ConfTX.FixedOffset[i][2];
        }
    }
    $("#slider_Fr_TX").slider("option", "min", SDR_TX.Fmin);
    $("#slider_Fr_TX").slider("option", "max", SDR_TX.Fmax);
    $("#slider_Fr_TX").slider("option", "value", TX.Freq);
    $("#BandeTX option[value='" + SDR_TX.Bande + "']").prop('selected', true);
    Trace_EchelleTX();
    ListRelay();
    Set_TX_GPIO();
}
function newBandTX(t) {
    Transmit_On_Off(false); // Stop any transmission
    GPredictTXcount = -6;
    TX.Freq = Math.floor((ConfTX.Bandes[t.value][0] + ConfTX.Bandes[t.value][1]) / 2);
    choixBandeTX();
    freq_TX();
    TXeqRX();
}
// PARAMETERS TO PASS TO SDR
//***************************
function freq_TX() {
    TX.Freq = Math.floor(TX.Freq);
    if (TX.Freq > SDR_TX.Fmin && TX.Freq < SDR_TX.Fmax) { //Frequence autorisée
        var Fcorrige = TX.Freq + SDR_TX.Xtal_Error + TXconverter.fixed_offset;
        TXconverter.invSpectra = (Fcorrige < 0) ? true : false;
        TX.Fsdr = Math.abs(Math.floor(Fcorrige)); //Frequency send to SDR corrected with any TCXO error and fixed offset due to upconverter
        TXdata.T_TX = 0; // To speed up transmission to SDR
        $("#val_Fr_TX").css("background-color", "#555");
    } else {
        $("#val_Fr_TX").css("background-color", "#F00");
    }
    Affich_Curs_TX();
    if (ZoomFreq.id == "FRT")
        Affich_freq_champs(TX.Freq, "#ZFr"); //Zoom display
    Save_TX_Para();
}
function CTCSS_SA818(channel) {
    TX.CTCSS = channel;
}
function Mode_TX() {
    SDR_RX.mode = $("input[name='mode']:checked").val();
    if (SDR_RX.mode > 4) { // CW
        $("#para_TX_CW").css("display", "block");
        $("#para_TX_SSB_FM").css("display", "none");
    } else {
        $("#para_TX_CW").css("display", "none");
        $("#para_TX_SSB_FM").css("display", "block");
    }
    if (ProcIP.TX.length > 3) {
        Transmit_On_Off(false); //Transmit Off
        $("#start-audioTX").html("TX Audio Off");
        $("#start-audioTX").removeClass('bt_on').addClass('bt_off');
        console.log(Date.now() - T0_remsdr, 'TX Start New Mode');
        $("#TXonLed").css("background-color", "Grey");
    }
    choice_TX_Source()
    Mode_LSB_NBFM_USB_CW();
    TX_init = true;
}
// GPIO Set to switch any device On the Orange Pi managing the Transmitter.  Not necessary for RPI4
function Set_TX_GPIO() {
    var s = "";
    var v = "";
    for (var i = 0; i < ConfTX.GPIO.length; i++) {
        if (TX.Freq >= ConfTX.GPIO[i][0] && TX.Freq <= ConfTX.GPIO[i][1] && (!audioTX.Transmit && JSON.parse(ConfTX.GPIO[i][4]) || audioTX.Transmit && JSON.parse(ConfTX.GPIO[i][5]))) {
            s += v + ConfTX.GPIO[i][2] + "," + ConfTX.GPIO[i][3];
            v = "*";
        }
    }
    if (s != "" && TX_GPIO_state != s) {
        TXdata.SetTX_GPIOs(s);
        TX_GPIO_state = s;
    }
}
//RESIZE
//**********
function window_resize_TX() {
    var W = $("#echelleTX").innerWidth();
    var H = $("#echelleTX").innerHeight();
    $("#echelleTX").html('<canvas id="myEchelleTX" width="' + W + '" height="' + H + '" ></canvas><div id="TXFSDR">SDR Freq.: <div id="TXfreqSDR"></div></div><div id="curseurTX"></div>');
    Trace_EchelleTX();
    Init_champs_freq("SDT", "#TXfreqSDR");
    Affich_freq_champs(TX.Freq, "#FRT");
    var W = $("#visus_TX").innerWidth() / 2;
    var H = $("#visus_TX").innerHeight();
    $("#visus_TXt").html('<canvas id="canvasT" width="' + W + '" height="' + H + '" ></canvas>');
    $("#visus_TXf").html('<canvas id="canvasF" width="' + W + '" height="' + H + '" ></canvas>');
    Affich_Curs_TX();
}
function Init_Page_TX() {
    console.log(Date.now() - T0_remsdr, "Init_Page_TX()");
    window_resize_TX();
    Init_Sliders_TX();
    Init_Sliders_TX_Audio();
    var S = '<label for="bandSelect">Select frequency band:</label>';
    S += '<select name="bandSelect" id="bandSelect" onchange="newBandTX(this);">';
    for (var i = 0; i < ConfTX.Bandes.length; i++) {
        S += '<option value=' + i + '>' + ConfTX.Bandes[i][2] + '</option>';
        TX_Xtal_Errors[i] = 0;
    }
    S += '</select>';
    $("#BandeTX").html(S);
    Recall_ParaTX();
    Init_champs_freq("FRT", "#val_Fr_TX");
    Init_champs_freq("OFT", "#val_Of_TX");
    freq_TX();
    Affich_freq_champs(TX.Freq, "#FRT");
    Affich_freq_champs(SDR_TX.Xtal_Error, "#OFT");
    for (var i = 1; i < 13; i++) {
        $('#FRT' + i).on('mousewheel', function (event) {
            Mouse_Freq_TX(event)
        });
        $('#OFT' + i).on('mousewheel', function (event) {
            Mouse_deltaOffsetTX(event)
        });
        $('#FRT' + i).on('click', function (event) {
            OpenZoomFreq(event)
        }); //see remote_sdr.js
        $('#OFT' + i).on('click', function (event) {
            OpenZoomFreq(event)
        });
    }
    Affich_Curs_TX();
    //disp_CPU(ProcIP.Protocol,ProcIP.TX, "TX_CPU");
    setInterval("TXdata.Sequencer();", 100);
    Mode_TX();
    //First local storage of parameters
    if (!Local_Storage) {
        Save_SDR_Para();
        Save_visus();
        Save_RX_Para();
        Save_TX_Para();
    }
}
function ListRelay() {
    //Relays list
    var S = '<label for="relay">Relays :</label>';
    S += '<select name="relay" id="relay" onchange="ForceRelay(this.value);" onclick="ForceRelay(this.value);">';
    for (var i = 0; i < ConfTX.Relays.length; i++) {
        if (SDR_RX.BandeRXmin <= ConfTX.Relays[i][0] && SDR_RX.BandeRXmax >= ConfTX.Relays[i][0]) {
            ConfTX.Relays[i][4] = true; //on valide ce relais
            S += '<option value=' + i + '>' + ConfTX.Relays[i][3] + '</option>';
        } else {
            ConfTX.Relays[i][4] = false;
        }
    }
    S += '<option value=' + ConfTX.Relays.length + ' selected></option>';
    S += '</select>';
    $("#Relays").html(S);
}
function ForceRelay(v) {
    var S = "";
    $("#Relays_info").css("display", "none");
    if (v < ConfTX.Relays.length) {
        S = "<div>Frequency : " + ConfTX.Relays[v][0] + " Hz</div>";
        S += "<div>TX Shift : " + ConfTX.Relays[v][1] + " Hz</div>";
        CTCSS.freq = 0;
        if (ConfTX.Relays[v][2] > 0) {
            CTCSS.freq = ConfTX.Relays[v][2];
            S += "<div>CTCSS : " + CTCSS.freq + " Hz</div>";
            if (SDR_TX.SDRtx == "SA818") {
                //SA818 reject frequencies below 300Hz. CTCSS generated directly by SA818
                for (var i = 0; i < CTCSS.channels.length; i++) {
                    if (CTCSS.channels[i] == CTCSS.freq)
                        CTCSS_SA818(i); //SA818 request a channel instead a frequency
                }
            }
        }
        choice_TX_Source();
        $("#Relays_info").css("display", "block");
        var deltaF = ConfTX.Relays[v][0] - SDR_RX.Audio_RX
            Recal_fine_centrale(deltaF);
        TX.Freq = ConfTX.Relays[v][0] + ConfTX.Relays[v][1];
        var Fr = RX.Ffine + SDR_TX.Decal_RX + Rx.Fcentral; // Freq RX = Freq TX
        if (Fr != TX.Freq) {
            SDR_TX.TXeqRX = false;
            $("#txeqrx").prop("checked", SDR_TX.TXeqRX);
            TXeqRX();
        }
        freq_TX();
        Affich_Curs_TX();
        Affich_freq_champs(TX.Freq, "#FRT");
        $("#slider_Fr_TX").slider('value', TX.Freq);
    }
    $("#Relays_info").html(S);
    timer_info = 2;
}
function AutoRelay() {
    SDR_TX.relay_auto = $("#relay_auto").prop("checked");
    Save_TX_Para();
}
function Mode_LSB_NBFM_USB_CW() {
    var Invert = SDR_TX.invert;
    var M = 0; // NBFM
    //The TX needs -1 or 1 for LSB / USB and 0 for NBFM
    if (SDR_RX.mode == 0)
        M = -1; //Mode TX = Mode RX = LSB
    if (SDR_RX.mode == 1)
        M = 1; //Mode TX = Mode RX = USB
    if (TXconverter.invSpectra)
        !Invert;
    if (Invert)
        M = -1 * M; // Inversion LSB / USB in case of inverted transponder
    if (SDR_RX.mode == 5 || SDR_RX.mode == 6)
        M = 2; //Mode TX = CW
    TX.LNUC = M //LSB_NBFM_USB_CW (-1,0,1,2)
        TXdata.T_TX = 0; //To speed UP transmission to SDR
    Save_TX_Para();
    $("#AutoCorect").css("visibility", !SDR_RX.gui_full || M == 0 || !SDR_TX.TXeqRX || !audioTX.Transmit || audioTX.Mic_or_Aux == 1 ? "hidden" : "visible");
}
function TXeqRX() {
    SDR_TX.TXeqRX = $("#txeqrx").prop("checked");
    Mode_LSB_NBFM_USB_CW();
    if (SDR_TX.TXeqRX) {
        rxvtx();
        choixBandeTX();
    }
    $("#TX_RX").css("display", SDR_TX.TXeqRX ? "none" : "block");
}
function Duplex() {
    SDR_TX.Fduplex = $("#full_duplex").prop("checked");
    Save_TX_Para();
}
function Test_si_relais_TX() {
    var its_a_relay = -1;
    for (var i = 0; i < ConfTX.Relays.length; i++) {
        if (ConfTX.Relays[i][4]) { //Relays in the band
            if (Math.abs(ConfTX.Relays[i][0] - SDR_RX.Audio_RX) < 2000) {
                its_a_relay = i;
            }
        }
    }
    if (its_a_relay == -1)
        CTCSS.freq = 0;
    if (SDR_TX.relay_auto) {
        if (its_a_relay != -1 && recal_auto_relay != its_a_relay) {
            ForceRelay(its_a_relay); //To force freq only once.
            $("#Relays_info").css("display", "none");
            $("#relay").val(its_a_relay);
        }
        if (its_a_relay == -1 && recal_auto_relay >= 0) {
            $("#relay").val(ConfTX.Relays.length); //We leave the relay
        }
        recal_auto_relay = its_a_relay;
    }
    if (SDR_TX.SDRtx == "SA818" && CTCSS.freq == 0)
        CTCSS_SA818(0);
}
function AutoCorTX(x) {
    audioTX.AutoCorrection = x;
    choice_TX_Source();
    if (x) {
        timer_AutoCorrect = setInterval("AutoRecal();", 1000);
    } else {
        clearInterval(timer_AutoCorrect);
    }
}
function AutoRecal() { // TX freq steers to RX freq
    if (audioRX.F_Audio_Top > 0) {
        let deltaF = Math.floor((800 - audioRX.F_Audio_Top) / 3);
        var Invert = SDR_TX.invert;
        if (SDR_RX.mode == 0 || SDR_RX.mode == 5) //LSB
            deltaF = -deltaF;
        if (Invert)
            deltaF = -deltaF; // Inversion LSB / USB in case of inverted transponder
        Recal_OFT(deltaF)
    }
}
function Mouse_Freq_TX(ev) { //modif des digits
    ZoomFreq.col = parseInt(ev.target.id.substr(3)) - 1;
    var deltaF = ev.deltaY * Math.pow(10, ZoomFreq.col);
    Recal_FTX(deltaF);
    GPredictTXcount = -6;
}
function Recal_FTX(deltaF) {
    TX.Freq = TX.Freq + deltaF;
    Affich_freq_champs(TX.Freq, "#FRT");
    freq_TX();
    Affich_Curs_TX();
    if (SDR_TX.TXeqRX)
        txvrx();
    GPredictTXcount = -6;
}
function Mouse_deltaOffsetTX(ev) {
    ZoomFreq.col = parseInt(ev.target.id.substr(3)) - 1;
    var deltaF = ev.deltaY * Math.pow(10, ZoomFreq.col);
    Recal_OFT(deltaF);
    GPredictTXcount = -6;
}
function Recal_OFT(deltaF) {
    SDR_TX.Xtal_Error = SDR_TX.Xtal_Error + deltaF;
    TX_Xtal_Errors[SDR_TX.Bande] = SDR_TX.Xtal_Error;
    Affich_freq_champs(SDR_TX.Xtal_Error, "#OFT");
    if (ZoomFreq.id == "OFT")
        Affich_freq_champs(SDR_TX.Xtal_Error, "#ZFr"); //Zoom display
    freq_TX();
    Affich_Curs_TX();
}
function txvrx() { //Frequence TX envoyé au RX
    RX.Ffine = TX.Freq - SDR_TX.Decal_RX - Rx.Fcentral - SDR_RX.CW_shiftRXTX;
    choix_freq_fine();
    Affiche_Curseur();
}
function rxvtx() {
    TX.Freq = RX.Ffine + SDR_TX.Decal_RX + Rx.Fcentral + SDR_RX.CW_shiftRXTX;
    freq_TX();
    Affich_Curs_TX();
    Affich_freq_champs(TX.Freq, "#FRT");
    $("#slider_Fr_TX").slider('value', TX.Freq);
}
//AFFICHAGES
function Affich_Curs_TX() {
    var W = $("#echelleTX").innerWidth();
    var X = (TX.Freq - SDR_TX.Fmin) * W / (SDR_TX.Fmax - SDR_TX.Fmin);
    $("#curseurTX").css("left", X);
    //Curseur TX dans la zone RX
    var F = TX.Freq - SDR_TX.Decal_RX - Rx.Fcentral;
    var p = ecran.innerW * (0.5 + F / (SDR_RX.bande)) + ecran.border;
    $("#Curseur_TX").css("left", p);
}
//TRACE DES CANVAS
function Trace_EchelleTX() {
    var canvasEchelle = document.getElementById("myEchelleTX");
    var ctxE = canvasEchelle.getContext("2d");
    var W = $("#echelleTX").innerWidth();
    var H = $("#echelleTX").innerHeight();
    var band = SDR_TX.Fmax - SDR_TX.Fmin;
    ctxE.beginPath();
    ctxE.strokeStyle = "#FFFFFF";
    ctxE.fillStyle = "#FFFFFF";
    ctxE.lineWidth = 1;
    ctxE.clearRect(0, 0, W, H);
    ctxE.font = "9px Arial";
    var DF = 100000;
    var df = 50000;
    if (band > 500000) {
        DF = 500000;
        df = 100000;
    }
    if (band > 5000000) {
        DF = 1000000;
        df = 200000;
    }
    if (band > 10000000) {
        DF = 10000000;
        df = 2000000;
    }
    for (var f = SDR_TX.Fmin; f <= SDR_TX.Fmax; f = f + df) {
        var Fint = df * Math.floor(f / df);
        var X = (Fint - SDR_TX.Fmin) * W / band;
        ctxE.moveTo(X, 0);
        var Y = 4;
        var Fintk = Fint / 1000;
        if (Fint % DF == 0) {
            ctxE.fillText(Fintk, X - ctxE.measureText(Fintk).width / 2, 14);
            Y = 6;
        }
        ctxE.lineTo(X, Y); //traits
    }
    ctxE.stroke(); // Fin graduations
    //Ecriture Labels
    ctxE.beginPath();
    ctxE.font = "8px Arial";
    ctxE.strokeStyle = "#AAF";
    ctxE.fillStyle = "#AAF";
    for (var i = 0; i < ConfTX.Label.length; i++) {
        if (ConfTX.Label[i][0] >= SDR_TX.Fmin && ConfTX.Label[i][0] <= SDR_TX.Fmax) {
            var X = (ConfTX.Label[i][0] - SDR_TX.Fmin) * W / band;
            ctxE.moveTo(X, 17);
            ctxE.fillText(ConfTX.Label[i][1], X + 5, 22);
            ctxE.lineTo(X, 23); //traits
        }
    }
    ctxE.stroke(); // Fin labels
    //Ecriture bande en couleur
    ctxE.lineWidth = 2;
    for (var i = 0; i < ConfTX.Zone.length; i++) {
        if ((ConfTX.Zone[i][0] >= SDR_TX.Fmin && ConfTX.Zone[i][0] <= SDR_TX.Fmax) || (ConfTX.Zone[i][1] >= SDR_TX.Fmin && ConfTX.Zone[i][1] <= SDR_TX.Fmax)) {
            ctxE.beginPath();
            ctxE.strokeStyle = ConfTX.Zone[i][2];
            var X0 = (ConfTX.Zone[i][0] - SDR_TX.Fmin) * W / band;
            var X1 = (ConfTX.Zone[i][1] - SDR_TX.Fmin) * W / band;
            ctxE.moveTo(X0, 0);
            ctxE.lineTo(X1, 0); //traits
            ctxE.stroke();
        }
    }
}
function Init_Sliders_TX() {
    $(function () {
        $("#slider_Fr_TX").slider({
            value: TX.Freq,
            min: SDR_TX.Fmin,
            max: SDR_TX.Fmax,
            step: 10,
            slide: function (event, ui) {
                TX.Freq = ui.value;
                Affich_freq_champs(TX.Freq, "#FRT");
                freq_TX();
                GPredictTXcount = -6;
                if (SDR_TX.TXeqRX)
                    txvrx();
                Save_TX_Para();
            }
        });
        choixBandeTX();
        freq_TX();
    });
    TX.G1 = Math.max(TXsdr[SDR_TX.idxSdr].G1[1], Math.min(TXsdr[SDR_TX.idxSdr].G1[2], TX.G1));
    $(function () {
        $("#slider_G1_TX").slider({
            value: TX.G1,
            min: TXsdr[SDR_TX.idxSdr].G1[1],
            max: TXsdr[SDR_TX.idxSdr].G1[2],
            step: TXsdr[SDR_TX.idxSdr].G1[3],
            slide: function (event, ui) {
                TX.G1 = ui.value;
                $("#G1TX").html(TX.G1);
                TXdata.T_TX = 0;
            }
        });
    });
    $("#G1NTX").html(TXsdr[SDR_TX.idxSdr].G1[0]);
    $("#G1TX").html(TX.G1);
    TX.G2 = Math.max(TXsdr[SDR_TX.idxSdr].G2[1], Math.min(TXsdr[SDR_TX.idxSdr].G2[2], TX.G2));
    $(function () {
        $("#slider_G2_TX").slider({
            value: TX.G2,
            min: TXsdr[SDR_TX.idxSdr].G2[1],
            max: TXsdr[SDR_TX.idxSdr].G2[2],
            step: TXsdr[SDR_TX.idxSdr].G2[3],
            slide: function (event, ui) {
                TX.G2 = ui.value;
                $("#G2TX").html(TX.G2);
                TXdata.T_TX = 0;
            }
        });
    });
    $("#G2NTX").html(TXsdr[SDR_TX.idxSdr].G2[0]);
    $("#G2TX").html(TX.G2);
    if (TXsdr[SDR_TX.idxSdr].G2[0] == "")
        $("#bloc_G2TX").css("display", "none");
}
//Refresh info with TX Server
//****************************
const TXdata = {
    T_TX: 0,
    PushTX: function () { //Pilot.Short Refresh rate
        var T = Date.now();
        this.T_TX = T;
        var data = {
            TX: TX
        }
        $("#TXonLed").css("background-color", "Blue");
        TXsocket.emit("PushTX", JSON.stringify(data), (response) => {
            var data = JSON.parse(response);
			
            if (SDR_TX.SDRtx != "none")
                $("#TXonLed").css("background-color", "lightgreen");
            SDR_TX.ready = true;
            var FTX_Gpredict = parseInt(data.FTX_Gpredict);
            var V = "hidden";
            if (GPredictTXcount >= 0 && FTX_Gpredict > 0) { //Take into account Freq doppler correction from Gpredict
                TX.Freq = FTX_Gpredict;
                freq_TX();
                Affich_freq_champs(TX.Freq, "#FRT");
                Affich_Curs_TX();
                V = "visible"
            }
            $("#TXgpredict").css("visibility", V);
            if (GPredictTXcount <= 0)
                GPredictTXcount++;
        });
    },
    CallTX: function () { //Slave.Short Refresh rate
        var T = Date.now();
        this.T_TX = T;
        TXsocket.emit("CallTX", JSON.stringify(""), (response) => {
            data = JSON.parse(response);
            TX.Fsdr = data.Fsdr;
            TX.Freq = TX.Fsdr - SDR_TX.Xtal_Error - TXconverter.fixed_offset;
            choixBandeTX();
        });
    },
    SetTX_GPIOs(s) {
        TXsocket.emit("SetGPIOs", s);
    },
    Sequencer: function () {
        var T = Date.now();
        if (User.TXpilot) {
            if (T > this.T_TX + 2000)
                this.PushTX();
        } else {
            $("#TXonLed").css("background-color", "grey");
            if (T > this.T_TX + 2000)
                this.CallTX();
        }
    }
}
//OLD PARAMETERS
function Recall_ParaTX() {
    if (Local_Storage) {
        try {
            TX = JSON.parse(localStorage.getItem("TX"));
			var sdr=SDR_TX.SDRtx; //already defined
            SDR_TX = JSON.parse(localStorage.getItem("Para_SDR_TX"));
			SDR_TX.SDRtx=sdr;
            audioParaTX = JSON.parse(localStorage.getItem("Para_Audio_TX"));
            $("input:radio[name~='VolumeTX']").filter("[value='" + audioParaTX.Compresse + "']").prop('checked', true);
            $("#TX_IP").val(ProcIP.TX);
            $("#relay_auto").prop("checked", SDR_TX.relay_auto);
            $("#txeqrx").prop("checked", SDR_TX.TXeqRX);
            $("#TXinvLsbUsb").prop("checked", SDR_TX.invert);
            $("#full_duplex").prop("checked", SDR_TX.Fduplex);
            var Old_TX_Xtal_Errors = JSON.parse(localStorage.getItem("TX_Xtal_Errors"));
            var idx_min = Math.min(Old_TX_Xtal_Errors.length, TX_Xtal_Errors.length);
            for (var i = 0; i < idx_min; i++) {
                TX_Xtal_Errors[i] = Old_TX_Xtal_Errors[i];
            }
            FilterTX = JSON.parse(localStorage.getItem("FilterTX"));
            FilterTX.display = false;
        } catch (e) {}
    }
}
function Save_TX_Para() {
    SDR_TX.TXeqRX = $("#txeqrx").prop("checked");
    SDR_TX.invert = $("#TXinvLsbUsb").prop("checked");
    localStorage.setItem("Para_SDR_TX", JSON.stringify(SDR_TX));
    localStorage.setItem("TX_Xtal_Errors", JSON.stringify(TX_Xtal_Errors));
    localStorage.setItem("Para_Audio_TX", JSON.stringify(audioParaTX));
    localStorage.setItem("FilterTX", JSON.stringify(FilterTX));
    localStorage.setItem("TX", JSON.stringify(TX));
}
function TX_Compress() {
    audioParaTX.Compresse = $("input[name='VolumeTX']:checked").val();
    if (audioParaTX.Compresse == 0) { //Manuel
        $("#slider_Vol_TX").css("display", "block");
        $("#val_Vol_TX").css("display", "inline-block");
        audioParaTX.VolMic = DBtoV($("#slider_Vol_TX").slider("option", "value")); //dB
    } else { // Auto
        $("#slider_Vol_TX").css("display", "none");
        $("#val_Vol_TX").css("display", "none");
        audioParaTX.VolMic = 1; //Input Micro Gain
    }
    choice_TX_Source();
    Para_To_AudioProcessor();
    Save_TX_Para();
}
console.log("End loading remote_TX.js");