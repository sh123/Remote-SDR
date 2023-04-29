// ***********************************
// *           REMOTE SDR            *
// *              F1ATB              *
// * GNU General Public Licence v3.0 *
// ***********************************
//
//Parametres GNU Radio
var RX = {
    Fsdr: 432000000,
    Ffine: 0,
    Xtal_Error: 0
};
var Rx = {
    Fcentral: 432000000,
    Foffset: 0,
    IdxModul: 1,
    Squelch: -80,
    G1: 0,
    G2: 20,
    G3: 20,
    invSpectra: false,
    idxBW: 10
};
var Rx2 = {
    auto_offset: true,
    Ffine: 0
}
var SDR_RX = {
    Audio_RX: 145100000,
    Audio_RXaff: 145100000,
    CW_shiftRXTX: 0,
    min: 0,
    max: 0,
    bande: 1,
    bandeRX: 0,
    BandeRXmin: 0,
    BandeRXmax: 0,
    BWmax: 10,
    SDRrx: "",
    gui_full: true,
    idxSdr: 0,
    WindowSearch: 0
};
//GPIOstate
var RX_GPIO_state = "";
//SDR Parameters
var RXsdr = [];
RXsdr.push({
    name: "hackrf",
    G1: ["AMP (dB)", 0, 14, 14], //name,min,max,step
    G2: ["IF (dB)", 0, 40, 1],
    G3: ["VGA (dB)", 0, 47, 1], // 47 ou 62dB suivant les docs ?????
    Fmin: 1000000,
    Fmax: 6000000000
});
//Pluto
RXsdr.push({
    name: "pluto",
    G1: ["AGC (off/on)", 0, 1, 1], //name,min,max,step
    G2: ["Gain (dB)", 0, 73, 1],
    G3: ["", 0, 40, 1],
    Fmin: 70000000,
    Fmax: 6000000000
});
//RTL SDR
RXsdr.push({
    name: "rtlsdr",
    G1: ["AGC (off/on)", 0, 1, 1],
    G2: ["Tuner Gain (dB)", 0, 49.6, 1], //name,min,max,step
    G3: ["", 0, 0, 1],
    Fmin: 24000000,
    Fmax: 1764000000
});
//SDR Play
RXsdr.push({
    name: "sdrplay",
    G1: ["AGC (off/on)", 0, 1, 1],
    G2: ["RF Gain (dB)", -47, 0, 1],
    G3: ["", 0, 40, 1],
    Fmin: 1000,
    Fmax: 2000000000
});
//Reception/Transmission modes
//Mode,HF Band,Freq. step
var RX_modes = new Array();
RX_modes.push(["LSB", 3000, 10]);
RX_modes.push(["USB", 3000, 10]);
RX_modes.push(["AM", 7500, 10]);
RX_modes.push(["NBFM", 10000, 2500]);
RX_modes.push(["WBFM", 150000, 10000]);
RX_modes.push(["CW-LSB", 3000, 10]);
RX_modes.push(["CW-USB", 3000, 10]);
var timer_info = 0;
//Gpredict
var GPredictRXcount = 0;
var TX_init = false;
//Communication
const ComRX = {
    dataSpectre: [],
    beam_buffer: [],
    call_Spectre: function () {
        var adresse = ProcIP.Protocol + "//" + ProcIP.RX + "/RXspectra";
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
                        var table_in = Array.from(value);
                        //controller.enqueue(value);
                        Watch_dog.RXspectre = 0;
                        TraceAudio.PlotSpectraIn();
                        ComRX.beam_buffer = ComRX.beam_buffer.concat(table_in);
                        if (ComRX.beam_buffer.length > 65536) { //Video not displayed. Don't Store data
                            ComRX.beam_buffer.splice(0, 65536);
                        } else {
                            balise.voie_recu = true;
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
// Variables websockets spectrum and parameters
//*********************************************
function MessageFromOmnirig(data) {
    //Return from Omnirig
    if (User.RXpilot) {
        Watch_dog.Omnirig = 3;
        if (data == "TX1" && audioTXnode.process_out && User.TXpilot) { //Demand to TX
            Transmit_On_Off(true);
            if (audioTX.Transmit) {
                RXsocket.emit("ToOmnirig", "TX1")
            } else { //Transmission refused
                RXsocket.emit("ToOmnirig", "TX0")
            }
        }
        if (data == "TX0" && audioTXnode.process_out && User.TXpilot) { //Demand to RX
            Transmit_On_Off(false);
            RXsocket.emit("ToOmnirig", "TX0")
        }
        if (data.indexOf("FA") == 0) { //Omni want to set the frequency
            var newFreq = parseInt(data.substr(2));
            if (newFreq > 0) {
                var deltaF = newFreq - SDR_RX.Audio_RX;
                Recal_fine_centrale(deltaF); //Rough tune
                choixBandeRX();
                newBandRX(SDR_RX.bandeRX);
                $("#bandSelectRX option[value='" + SDR_RX.bandeRX + "']").prop('selected', true);
                for (let i = 0; i < 2; i++) { //Fine tune
                    deltaF = newFreq - SDR_RX.Audio_RX;
                    if (deltaF != 0)
                        Recal_fine_centrale(deltaF);
                }
                if (SDR_TX.TXeqRX) {
                    rxvtx();
                    choixBandeTX();
                }
            }
        }
    }
};
function init_para_sdrRX() {
    //On initialise les parametres du  traitement SDR
    console.log(Date.now() - T0_remsdr, 'RX parameters init');
    choix_freq_fine();
    choix_freq_central();
    Bandwidth();
    choix_mode();
}
// PARAMETERS TO PASS TO THE RX SDR
//*********************************
function choix_freq_central() {
    Rx.Fcentral = 10000 * Math.floor(Rx.Fcentral / 10000); //10kHz step
    Rx.Fcentral = Math.abs(Rx.Fcentral);
    //Offset in case of Up or Down Converter
    Rx.Foffset = 0;
    for (var i = 0; i < ConfRX.FixedOffset.length; i++) {
        if (Rx.Fcentral > ConfRX.FixedOffset[i][0] && Rx.Fcentral < ConfRX.FixedOffset[i][1]) {
            Rx.Foffset = ConfRX.FixedOffset[i][2];
        }
    }
    RX.Fsdr = Rx.Fcentral + Rx.Foffset + RX.Xtal_Error;
    Rx.invSpectra = (RX.Fsdr < 0) ? true : false; // ex: Converter with an oscillator higher than the received frequency
    RX.Fsdr = Math.abs(Math.floor(RX.Fsdr));
    if (RX.Fsdr > RXsdr[SDR_RX.idxSdr].Fmin && RX.Fsdr < RXsdr[SDR_RX.idxSdr].Fmax) { //Frequency allowed
        Affich_freq_champs(RX.Fsdr, "#SFr")
        Set_RX_GPIO();
        $("#Frequence_AudioRX").css("background-color", "#555");
    } else {
        $("#Frequence_AudioRX").css("background-color", "#F00");
    }
    Trace_Echelle();
    Affich_freq_Audio_RX();
    Affich_freq_champs(Rx.Foffset, "#OFS");
    Affich_freq_champs(RX.Xtal_Error, "#DOF");
    if (ZoomFreq.id == "DOF")
        Affich_freq_champs(RX.Xtal_Error, "#ZFr"); //Zoom display
}
function Audio_Bandwidth() { // Green Cursor width
    var bw = RX_modes[Rx.IdxModul][1];
    var Hz_by_pix = SDR_RX.bande / fenetres.spectreW;
    var wp = bw / Hz_by_pix;
    $("#curseur_w").css("width", wp + "px");
    var left = 10 - wp / 2;
    if (RX_modes[Rx.IdxModul][0] == "LSB" || RX_modes[Rx.IdxModul][0] == "CW-LSB")
        left = 10 - wp;
    if (RX_modes[Rx.IdxModul][0] == "USB" || RX_modes[Rx.IdxModul][0] == "CW-USB")
        left = 10;
    $("#curseur_w").css("left", left + "px");
}
function choix_mode() { //MODE
    Rx.IdxModul = parseInt($("input[name='mode']:checked").val());
    RXdata.T_Rx = 0; //Accelerate transmission to SDR
    Audio_Bandwidth();
    Save_RX_Para();
    if (TX_init)
        Mode_TX();
    Affich_freq_Audio_RX();
    if (SDR_TX.TXeqRX)
        rxvtx();
}
function click_squelch() {
    $("#val_squelch").html(Rx.Squelch);
    $("#fen_squelch").css("display", "block");
    timer_info = 2;
}
function Bandwidth() { //Decimation done in GNU Radio
    var BW = 100 * Rx.idxBW; //kHz. Useful bandwidth .
    if (BW < 1000) {
        BW = BW + "kHz";
    } else {
        BW = BW / 1000 + "MHz";
    }
    $("#Bande_RX").html(BW);
}
function choix_freq_fine() { //Frequency for audio channel
    var step = RX_modes[Rx.IdxModul][2];
    if (step >= 2500)
        RX.Ffine = step * Math.floor(RX.Ffine / step + 0.5); // rounded values for NBFM and WBFM
    var deltaF = (SDR_RX.bande) / 2;
    RX.Ffine = Math.max(RX.Ffine, -deltaF);
    RX.Ffine = Math.min(RX.Ffine, deltaF);
    RX.Ffine = Math.floor(RX.Ffine);
    if (SDR_TX.TXeqRX)
        rxvtx();
    timer_auto_relay = 2;
    Affich_freq_Audio_RX();
    RXdata.T_RX = 0; //Accelerate transmission to SDR
}
// GPIO Set to switch any device On the Orange Pi/Raspberry Pi managing the receiver. Refer to configurationRX.js file
function Set_RX_GPIO() {
    if (User.RXpilot) {
        var s = "";
        var v = "";
        for (var i = 0; i < ConfRX.GPIO.length; i++) {
            if (RX.Fsdr >= ConfRX.GPIO[i][0] && RX.Fsdr <= ConfRX.GPIO[i][1] && (!audioTX.Transmit && JSON.parse(ConfRX.GPIO[i][4]) || audioTX.Transmit && JSON.parse(ConfRX.GPIO[i][5]))) {
                s += v + ConfRX.GPIO[i][2] + "," + ConfRX.GPIO[i][3];
                v = "*";
            }
        }
        if (s != "" && RX_GPIO_state != s) {
            RXdata.SetRX_GPIOs(s);
            RX_GPIO_state = s;
        }
    }
}
// Initialisation RX
// *****************
function Init_Page_RX() {
    console.log(Date.now() - T0_remsdr, "Init_Page_RX()");
    $("#RXonLed").css("background-color", "Red");
    ComRX.call_Spectre();
    ComRXaudio.call_Audio();
    setInterval("RXdata.Sequencer();", 200);
    // Init Tracking eventuel des beacons pour compenser les offsets
    setInterval("Track_Beacon();", 1000);
    setInterval("Watch_dog.Check();", 900);
    setInterval("Bcast.sendRXData();", 2115);
    choix_mode();
    Save_RX_Para();
    init_para_sdrRX();
}
function Recall_RX_Para() {
    if (Local_Storage) { // On a d'anciens parametres en local
        try {
            Rx = JSON.parse(localStorage.getItem("Rx"));
            Rx2 = JSON.parse(localStorage.getItem("Rx2"));
            $("#Auto_Offset_On").prop("checked", Rx2.auto_offset);
            RX.Ffine = Rx2.Ffine;
            var Old_RX_Xtal_Errors = JSON.parse(localStorage.getItem("RX_Xtal_Errors"));
            var idx_min = Math.min(Old_RX_Xtal_Errors.length, RX_Xtal_Errors.length);
            for (var i = 0; i < idx_min; i++) {
                RX_Xtal_Errors[i] = Old_RX_Xtal_Errors[i];
            }
            for (var i = 0; i < ConfRX.Bandes.length; i++) {
                if (RX_Xtal_Errors[i] < ConfRX.Bandes[i][3] || RX_Xtal_Errors[i] > ConfRX.Bandes[i][4]) {
                    RX_Xtal_Errors[i] = (ConfRX.Bandes[i][3] + ConfRX.Bandes[i][4]) / 2;
                }
            }
            $("#" + RX_modes[Rx.IdxModul][0]).prop("checked", true);
        } catch (e) {}
    }
}
function Save_RX_Para() {
    Rx2.auto_offset = $("#Auto_Offset_On").prop("checked");
    Rx2.Ffine = RX.Ffine;
    localStorage.setItem("Rx", JSON.stringify(Rx));
    localStorage.setItem("Rx2", JSON.stringify(Rx2));
    localStorage.setItem("RX_Xtal_Errors", JSON.stringify(RX_Xtal_Errors));
}
function Track_Beacon() {
    var coul = "grey";
    Rx2.auto_offset = $("#Auto_Offset_On").prop("checked");
    Watch_dog.Last_Refresh++;
    if (balise.voie_recu && Rx2.auto_offset) { //On s'assure d'avoir reçu des données recemment
        var Ecart = 0;
        var Nb_valide = 0;
        coul = "Orange";
        for (var i = 0; i < balise.nb; i++) {
            for (var v = -1; v <= 1; v++) {
                balise.Voies[i][v + 1] = 0.1 * (Plot_.Mean[balise.Idx[i] + v] - Plot_.Min[balise.Idx[i] + v]) + 0.9 * balise.Voies[i][v + 1]; //Integration longue niveau voie
            }
            //Recherche grossière de la voie la plus forte
            var Max = -1000000;
            var K = 0;
            for (var j = balise.Idx_zone[i][0]; j <= balise.Idx_zone[i][1]; j++) {
                var level = Plot_.Mean[j] - Plot_.Min[j];
                if (level > Max) {
                    Max = level;
                    K = j;
                }
            }
            var alpha = 0.02; //RC filter
            if (Max > 1000) { //Niveau voie centrale suffisant
                if (Math.abs(balise.Idx[i] - K) <= 1) { //voie centrale, gauche ou droite
                    var Vg = Math.pow(10, balise.Voies[i][0] / 10000); //On quitte les log
                    var Vc = Math.pow(10, balise.Voies[i][1] / 10000);
                    var Vd = Math.pow(10, balise.Voies[i][2] / 10000);
                    Ecart += (Vg * balise.K[i][0] + Vc * balise.K[i][1] + Vd * balise.K[i][2]) / Vc; //Ecart normalisé
                    Nb_valide++;
                    coul = "Lime";
                } else {
                    alpha = 0.2;
                    var delta = Math.abs(balise.Idx[i] - K);
                    var big_step = 10 * delta / (balise.Idx_zone[i][1] - balise.Idx_zone[i][0]);
                        big_step = Math.min(big_step,5);

                    SDR_RX.WindowSearch = Math.max(SDR_RX.WindowSearch * 0.9, (delta + 10) * SDR_RX.bande / FFT);
                    
                    if (K < balise.Idx[i]) {
                        Ecart +=  - big_step
                    } else {
                        Ecart += big_step;
                    }
                    Nb_valide++;
                    coul = "DeepSkyBlue";
                }
            }
        }
        if (Nb_valide > 0) { // On a des ecarts par rapport aux balises
            var dF = 30 * Ecart / Nb_valide; //Coef de decalage en frequence
            balise.meanDelta = alpha * dF + (1 - alpha) * balise.meanDelta; //Fitre decalage
            dF = Math.floor(balise.meanDelta);
            dF = Math.min(dF, 150); //150Hz max
            dF = Math.max(dF, -150);
            if (dF != 0) {
                RX_Xtal_Errors[SDR_RX.bandeRX] += dF;
                RX.Xtal_Error = RX_Xtal_Errors[SDR_RX.bandeRX];
                RX.Xtal_Error = Math.max(ConfRX.Bandes[SDR_RX.bandeRX][3], RX.Xtal_Error)
                    RX.Xtal_Error = Math.min(ConfRX.Bandes[SDR_RX.bandeRX][4], RX.Xtal_Error);
                RX_Xtal_Errors[SDR_RX.bandeRX] = RX.Xtal_Error;
                choix_freq_central();
            }
            $("#F_df").html(dF + " Hz");
        }
    } else {
        $("#F_df").html("");
    }
    balise.voie_recu = false;
    $("#F_Offset_locked").css("background-color", coul);
}
//Refresh info with RX Server
//****************************
const RXdata = {
    T_RX: 0,
    T_Rx: 0,
    T_Status: 0,
    UserStatus: function () {
        var T = Date.now();
        this.T_Status = T;
        if (User.RXlastM > T - 6000) { //Still some exchanges with the server
            var data = {
                MyIdx: User.RXidx
            }
            RXsocket.emit("UserStatus", JSON.stringify(data), (response) => {
                var data = JSON.parse(response);
                User.RXpilot = data.RXpilot;
                User.AccessOk = data.AccessOk;
                User.RXlastM = Date.now();
                if (ProcIP.SameIP) {
                    User.TXpilot = data.TXpilot;
                    User.TXlastM = Date.now();
                }
                var border = "0px";
                var bg = {
                    "cursor": "auto"
                };
                if (!User.RXpilot && User.AccessOk) {
                    border = "2px outset grey";
                    bg = {
                        "cursor": "pointer"
                    };
                }
                $("#RXpilotLed").css("background-color", User.RXpilot ? "LightGreen" : User.AccessOk ? "Coral" : "Red");
                $(".Head_RXpilot").css("border", border);
                $(".Head_RXpilot:hover").css(bg);
                $(".Head_RXpilot:hover").css("border-color", "coral");
                $("#head_User").html("User(s) : " + data.NbU);
            });
        }
    },
    CallRX: function () { //Slave.Short Refresh rate
        var T = Date.now();
        this.T_RX = T;
        var data = {
            MyIdx: User.RXidx
        }
        RXsocket.emit("CallRX", JSON.stringify(data), (response) => {
            RX = JSON.parse(response);
            RX_Xtal_Errors[SDR_RX.bandeRX] = RX.Xtal_Error;
        });
    },
    CallRx: function () { //Slave.Long Refresh Rate
        var T = Date.now();
        this.T_Rx = T;
        var data = {
            MyIdx: User.RXidx
        }
        RXsocket.emit("CallRx", JSON.stringify(data), (response) => {
            Rx = JSON.parse(response);
            choixBandeRX();
            choix_freq_central();
            $("#" + RX_modes[Rx.IdxModul][0]).prop("checked", true);
            $("#slider_BW_RX").slider("value", Rx.idxBW);
            Bandwidth();
            $("#slider_Frequence_centrale_RX").slider("option", "min", SDR_RX.BandeRXmin);
            $("#slider_Frequence_centrale_RX").slider("option", "max", SDR_RX.BandeRXmax);
            $("#slider_Frequence_centrale_RX").slider("option", "value", Rx.Fcentral);
        });
    },
    PushRX: function () { //Pilot.Short Refresh rate
        var T = Date.now();
        this.T_RX = T;
        var data = {
            MyIdx: User.RXidx,
            RX: RX
        }
        RXsocket.emit("PushRX", JSON.stringify(data), (response) => {
            var data = JSON.parse(response);
            var FRX_Gpredict = parseInt(data.FRX_Gpredict);
            var V = "hidden";
            if (GPredictRXcount >= 0 && FRX_Gpredict > 0) { //Take into account Freq doppler correction from Gpredict
                RX.Ffine = FRX_Gpredict - Rx.Fcentral;
                choix_freq_fine();
                Affiche_Curseur();
                V = "visible"
            }
            $("#RXgpredict").css("visibility", V);
            if (GPredictRXcount <= 0)
                GPredictRXcount++;
        })
    },
    PushRx: function () { //Pilot.Long Refresh Rate
        var T = Date.now();
        this.T_Rx = T;
        var data = {
            MyIdx: User.RXidx,
            Rx: Rx
        }
        RXsocket.emit("PushRx", JSON.stringify(data), (response) => {
            var data = JSON.parse(response);
        });
    },
    SetRX_GPIOs(s) {
        RXsocket.emit("SetGPIOs", s);
    },
    Sequencer: function () {
        if (User.RXidx >= 0) {
            var T = Date.now();
            if (T > this.T_Status + 2001)
                this.UserStatus();
            if (User.RXpilot) { //Pilot
                if (T > this.T_RX + 900)
                    this.PushRX();
                if (T > this.T_Rx + 3501)
                    this.PushRx();
            } else { //Slave client
                if (T > this.T_RX + 1501)
                    this.CallRX();
                if (T > this.T_Rx + 3501)
                    this.CallRx();
            }
        }
    }
}
function UsersList() {
    $("#fen_User").css("display", "block");
    var data = {
        MyIdx: User.RXidx
    }
    RXsocket.emit("UsersList", JSON.stringify(data), (response) => {
        var data = JSON.parse(response);
        var T = Date.now();
        var S = "";
        for (var i = 0; i < data.UL.length; i++) {
            var Pilot = "No";
            if (data.UL[i][1])
                Pilot = "Yes";
            var Tconnect = new Date(data.UL[i][2]).toLocaleString();
            var TlastM = new Date(data.UL[i][3]).toLocaleString();
            var bg = "#000";
            if (T < parseInt(data.UL[i][3]) + 3000)
                bg = "darkgreen";
            if (i == User.RXidx)
                bg = "blue";
            S = "<tr style='background-color:" + bg + "'><td>" + data.UL[i][0] + "</td><td>" + Pilot + "</td><td>" + Tconnect + "</td><td>" + TlastM + "</td></tr>" + S
                // Users.list[i].pseudo,Users.list[i].RXpilot,Users.list[i].Tconnect,Users.list[i].lastM]
        }
        S = "<table><tr><th>Ident.</th><th>Pilot</th><th>Connect</th><th>Last message</th><tr>" + S + "</table>";
        $("#list_user").html(S);
    });
}
//Watchdog Data Exchanges and timer_info
//**************************************
const Watch_dog = {
    RXspectre: -2,
    RXaudio: -2,
    Last_Refresh: 0,
    Omnirig: 0,
    Check: function () {
        if (ProcIP.RX.length > 3) {
            this.RXspectre = this.RXspectre + 3;
            if (audioRX.on)
                this.RXaudio++;
            if (Math.max(this.RXspectre, this.RXaudio) > 7)
                $("#RXonLed").css("background-color", "Red"); //Alerte messages n'arrivent pas
        }
        if (timer_info > 0) {
            timer_info--;
        } else {
            $("#fen_squelch").css("display", "none");
            $("#Relays_info").css("display", "none");
        }
        if (timer_auto_relay > 0) {
            timer_auto_relay--;
        } else {
            Test_si_relais_TX();
        }
        this.Omnirig--;
        if (this.Omnirig > 0) {
            var V = "visible";
        } else {
            var V = "hidden";
        }
        $("#Omnirig").css("visibility", V);
    }
}
console.log("End loading remote_RX.js");
