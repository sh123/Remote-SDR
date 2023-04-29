// ***********************************
// *           REMOTE SDR v3         *
// *              F1ATB              *
// * GNU General Public Licence v3.0 *
// ***********************************
// Rotating Knob and CW key Control
// --------------------------------
var USB = {
    port: undefined,
    lineBuffer: '',
    LastButton: "B1"
};
var CW_play = []; // events to play
var CW_KeyLeft = {
    Ton: 0,
    Toff: 0,
    ToffLast: 0
}; // Last Left key events
var CW_KeyRight = {
    Ton: 0,
    Toff: 0,
    ToffLast: 0
}; // Last Right Key events
var CW_Seq = {
    modulo: 0,
    R1: 0,
    R2: 0,
    F1: 0,
    F2: 0
}; // sequence Risings and Fallings
var CW_T = {
    Start_Beep: 0,
    Rising1: 0,
    Rising2: 0,
    Falling: 0,
    Falling2: 0,
    DotOrDash: 0,
    LastFalling: 0,
    Edge: 0,
    LastEvent: 0,
    ReSet: function (CW_Seq, PointLength) {
        this.Rising2 = this.Rising1 + CW_Seq.R2 * PointLength;
        this.Falling = this.Rising1 + CW_Seq.F1 * PointLength;
    }
};
var CW_para = {
    level: 0.1,
    pitch: 700,
    wpm: 20,
    Koption: "Single",
    bkin: false,
    Tbkin: 200,
    invert: false
};
var CW_Plot = {
    Count: 0,
    Width: 1
};
var CW_Messages = {
    M1: "CQ CQ CQ",
    M2: "73",
    On: 0
};
const Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890.,?/+,=";
var Morse = ". _,_ . . .,_ . _ .,_ . .,.,. . _ .,_ _ .,. . . .,. .,. _ _ _,_ . _,. _ . .,_ _,_ .,_ _ _,. _ _ .,_ _ . _,";
Morse += ". _ .,. . .,_,. . _,. . . _,. _ _,_ . . _,_ . _ _,_ _ . .,. _ _ _ _,. . _ _ _,. . . _ _,. . . . _,. . . . .,";
Morse += "_ . . . .,_ _ . . .,_ _ _ . .,_ _ _ _ .,_ _ _ _ _,. _ . _ . _,_ _ . . _ _,. . _ _ . .,_ . . _ .,. _ . _ .,. _ _ _ _ .,_ . . . . _";
Morse = Morse.replace(/ /g, "")
    Morse = Morse.split(",");
var Knob = {
    last_step: 0,
    RC_step: 0
};
//Asynchronus reader of the Serial port on USB
async function getReader() {
    USB.port = await navigator.serial.requestPort({});
    await USB.port.open({
        baudRate: 115200
    });
    $("#CWkey").css("background-color", "green");
    if (audioTX.Ctx == null)
        Init_Audio_TX();
    const appendStream = new WritableStream({ //Messages from Arduino
        write(chunk) {
            USB.lineBuffer += chunk;
            var lines = USB.lineBuffer.split('\n');
            while (lines.length > 1) {
                var message = lines.shift();

                //Rotating Knob
                if (message.indexOf("D") >= 0 || message.indexOf("U") >= 0) {
                    let N = 0;
                    let p = message.indexOf("D");
                    if (p >= 0)
                        N = 0 + parseInt(message.substr(1));
                    p = message.indexOf("U");
                    if (p >= 0)
                        N = 0 + parseInt(message.substr(1));
                    var step = N * N * N * RX_modes[SDR_RX.mode][2];
                    switch (ZoomFreq.id) {
                    case "DOF":
                        step = Math.pow(10, ZoomFreq.col) * Math.sign(step);
                        Recal_deltaOffset(step);
                        break;
                    case "FRT":
                        step = Math.pow(10, ZoomFreq.col) * Math.sign(step);
                        Recal_FTX(step);
                        $("#slider_Fr_TX").slider('value', SDR_TX.Freq);
                        GPredictTXcount = -6;
                        break;
                    case "OFT":
                        step = Math.pow(10, ZoomFreq.col) * Math.sign(step);
                        Recal_OFT(step);
                        GPredictTXcount = -6;
                        break;
                    default:
                        Recal_fine_centrale(step);
                    }
                }
                //Pushbutton
                if (message.indexOf("B0") >= 0 && USB.LastButton == "B1") {
                    USB.LastButton = message.trim();
                    Transmit_Flip_On_Off()
                }
                if (message.indexOf("B1") >= 0) {
                    USB.LastButton = message.trim();
                }
                //CW Key
                if (message.indexOf("L") >= 0 || message.indexOf("R") >= 0) { // CW key pressed or released
                    var T = Date.now();
                    if (CW_para.invert) {
                        var M = "";
                        if (message.indexOf("L0") >= 0) {
                            M = "R0";
                        } else if (message.indexOf("L1") >= 0) {
                            M = "R1";
                        } else if (message.indexOf("R0") >= 0) {
                            M = "L0";
                        } else if (message.indexOf("R1") >= 0) {
                            M = "L1";
                        }
                        message = M;
                    }
                    if (message.indexOf("L0") >= 0) {
                        CW_KeyLeft.Ton = T;
                        CW_KeyLeft.Toff = 0;
                    }
                    if (message.indexOf("L1") >= 0) {
                        CW_KeyLeft.Toff = T;
                    }
                    if (message.indexOf("R0") >= 0) {
                        CW_KeyRight.Ton = T;
                        CW_KeyRight.Toff = 0;
                    }
                    if (message.indexOf("R1") >= 0) {
                        CW_KeyRight.Toff = T;
                    }
                }
            }
            USB.lineBuffer = lines.pop();
        }
    });
    USB.port.readable
    .pipeThrough(new TextDecoderStream())
    .pipeTo(appendStream);
}
function listSerial() {
    if (USB.port) {
        USB.port.close();
        USB.port = undefined;
    } else {
        console.log("Look for Serial Port")
        getReader();
    }
}
//CW
function display_CW() {
    CW.display = !CW.display;
    $("#para_TX_CW_2").css("display", CW.display ? "block" : "none");
    $("#ArrowCW").html(CW.display ? "&#x1F879;" : "&#x1F87B;");
    resize_CW();
}
function auto_key_management(Tstart, Tend) {
    var PointLength = Math.floor(1200 / CW_para.wpm); //Ref PARIS = 50 symbols
    switch (CW_para.Koption) {
    case "Single":
        CW_T.Start_Beep = Math.max(CW_KeyLeft.Ton, CW_KeyRight.Ton);
        if (CW_KeyLeft.Ton > 0 && CW_KeyRight.Ton > 0)
            CW_T.Start_Beep = Math.min(CW_KeyLeft.Ton, CW_KeyRight.Ton);
        if (CW_T.Start_Beep > 0)
            CW_play.push({
                T: CW_T.Start_Beep,
                state: true
            });
        if (CW_KeyLeft.Toff > 0 && CW_KeyRight.Ton == 0)
            CW_play.push({
                T: CW_KeyLeft.Toff,
                state: false
            });
        if (CW_KeyRight.Toff > 0 && CW_KeyLeft.Ton == 0)
            CW_play.push({
                T: CW_KeyRight.Toff,
                state: false
            });
        if (CW_KeyLeft.Toff > 0 && CW_KeyRight.Toff > 0)
            CW_play.push({
                T: Math.max(CW_KeyLeft.Toff, CW_KeyRight.Toff),
                state: false
            });
        if (CW_KeyLeft.Toff > 0)
            Stop_Key_Left(); // Clear all
        if (CW_KeyRight.Toff > 0)
            Stop_Key_Right();
        break;
    case "Bug":
        if (CW_KeyLeft.Ton > 0) { //Left Key is on
            if (CW_T.Start_Beep == 0) {
                CW_T.Start_Beep = Math.max(CW_KeyLeft.Ton, CW_T.Rising2); //Avoid stating without a blank
                CW_Seq = {
                    modulo: 2,
                    R1: 0,
                    R2: 2,
                    F1: 1,
                    F2: 1
                }; // Start Dots only
            }
            var T_off_beep = CW_KeyLeft.Toff;
            if (T_off_beep == 0)
                T_off_beep = Tend + 10000; //Postponed stop as not known yet
            var Nend = Math.floor((Tend - CW_T.Start_Beep) / PointLength); // Index last edge
            var Nstart = Math.floor((Tstart - CW_T.Start_Beep) / PointLength); // Index first edge
            for (var N = Nstart; N <= Nend; N++) {
                CW_T.Rising1 = CW_T.Start_Beep + N * PointLength;
                if (N % 2 == 0 && CW_T.Rising1 >= CW_T.Start_Beep && CW_T.Rising1 < T_off_beep && CW_T.Rising1 > CW_T.Falling) {
                    CW_play.push({
                        T: CW_T.Rising1,
                        state: true
                    }); //Start Beep
                    CW_T.ReSet(CW_Seq, PointLength);
                    if (CW_KeyRight.Ton == 0 || CW_KeyRight.Toff > 0) {
                        CW_play.push({
                            T: CW_T.Falling,
                            state: false
                        }); //Stop Beep
                    }
                }
                if (T_off_beep <= CW_T.Rising2 + 1000) {
                    if (CW_KeyRight.Ton == 0 || CW_KeyRight.Toff > 0) {
                        CW_play.push({
                            T: CW_T.Falling,
                            state: false
                        }); //Stop Beep
                    }
                    Stop_Key_Left();
                    N = Nend + 1;
                }
            }
        }
        if (CW_KeyRight.Ton > 0) {
            CW_play.push({
                T: CW_KeyRight.Ton,
                state: true
            });
            CW_T.Start_Beep = Math.max(CW_KeyLeft.Ton, CW_KeyRight.Ton);
        }
        if (CW_KeyRight.Toff > 0) {
            CW_play.push({
                T: CW_KeyRight.Toff,
                state: false
            }); //Immediate stop
            CW_T.Start_Beep = CW_KeyRight.Toff + PointLength; //Resynchro dots on left after a blank;
            Stop_Key_Right();
        }
        break;
    case "IambicA":
        if (CW_KeyLeft.Ton > 0 || CW_KeyRight.Ton > 0) { //Left or Right Key is on
            if (CW_T.Start_Beep == 0) {
                CW_T.Start_Beep = Math.max(CW_KeyLeft.Ton, CW_KeyRight.Ton, CW_T.Rising2);
                CW_T.Rising1 = CW_T.Start_Beep;
                CW_Seq = {
                    modulo: 2,
                    R1: 0,
                    R2: 2,
                    F1: 1,
                    F2: 1
                }; // Start Dots only
                if (CW_KeyRight.Ton > 0)
                    CW_Seq = {
                        modulo: 4,
                        R1: 0,
                        R2: 4,
                        F1: 3,
                        F2: 3
                    }; // Start Dashes
                CW_T.Edge = 0;
            }
            var T_off_beep = Math.max(CW_KeyLeft.Toff, CW_KeyRight.Toff);
            if (T_off_beep == 0)
                T_off_beep = Tend + 10000; //Postponed stop as not known yet
            var Nend = Math.floor((Tend - CW_T.Start_Beep) / PointLength); // Index last edge
            var Nstart = Math.floor((Tstart - CW_T.Start_Beep) / PointLength); // Index first edge
            for (var N = Nstart; N <= Nend; N++) {
                CW_T.Edge = CW_T.Start_Beep + N * PointLength;
                var N_Edge = (Math.floor((CW_T.Edge - CW_T.Rising1 + 0.01) / PointLength) % CW_Seq.modulo);
                if (N_Edge < 2 && CW_Seq.modulo <= 4 && CW_KeyLeft.Ton > 0 && CW_KeyRight.Ton > 0) { // 2nd Key pressed
                    CW_Seq = (CW_Seq.R2 == 4) ? {
                        modulo: 6,
                        R1: 0,
                        R2: 4,
                        F1: 3,
                        F2: 5
                    }
                     : {
                        modulo: 6,
                        R1: 0,
                        R2: 2,
                        F1: 1,
                        F2: 5
                    };
                    N_Edge = (Math.floor((CW_T.Edge - CW_T.Rising1 + 0.01) / PointLength) % CW_Seq.modulo);
                    CW_T.ReSet(CW_Seq, PointLength);
                }
                if (CW_Seq.modulo == 6 && (CW_KeyLeft.Ton > 0 && CW_KeyRight.Ton == 0 || CW_KeyLeft.Ton == 0 && CW_KeyRight.Ton > 0)) { // 2nd Key released
                    CW_Seq = (CW_Seq.R2 == 4) ? {
                        modulo: 4,
                        R1: 0,
                        R2: 4,
                        F1: 3,
                        F2: 3
                    }
                     : {
                        modulo: 2,
                        R1: 0,
                        R2: 2,
                        F1: 1,
                        F2: 1
                    }; // Dashes/ Dots
                    N_Edge = (Math.floor((CW_T.Edge - CW_T.Rising1 + 0.01) / PointLength) % CW_Seq.modulo);
                    CW_T.ReSet(CW_Seq, PointLength);
                }
                if (CW_Seq.R2 == 4 && CW_KeyLeft.Ton > 0 && CW_KeyRight.Ton == 0) {
                    CW_Seq = {
                        modulo: 2,
                        R1: 0,
                        R2: 2,
                        F1: 1,
                        F2: 1
                    };
                    N_Edge = (Math.floor((CW_T.Edge - CW_T.Rising1 + 0.01) / PointLength) % CW_Seq.modulo);
                    CW_T.ReSet(CW_Seq, PointLength);
                }
                if (CW_Seq.R2 == 2 && CW_KeyLeft.Ton == 0 && CW_KeyRight.Ton > 0) {
                    CW_Seq = {
                        modulo: 2,
                        R1: 0,
                        R2: 2,
                        F1: 1,
                        F2: 1
                    };
                    N_Edge = (Math.floor((CW_T.Edge - CW_T.Rising1 + 0.01) / PointLength) % CW_Seq.modulo);
                    CW_T.ReSet(CW_Seq, PointLength);
                }
                if ((N_Edge == CW_Seq.R1 || N_Edge % CW_Seq.modulo == CW_Seq.R2) && CW_T.Edge >= CW_T.Start_Beep && CW_T.Edge < T_off_beep && CW_T.Edge > CW_T.Falling) {
                    CW_play.push({
                        T: CW_T.Edge,
                        state: true
                    }); //Start Beep
                    if (N_Edge == 0) {
                        CW_T.Rising1 = CW_T.Edge;
                        CW_T.ReSet(CW_Seq, PointLength);
                    }
                    if (N_Edge == CW_Seq.R2)
                        CW_T.Falling = CW_T.Rising1 + CW_Seq.F2 * PointLength;
                    CW_play.push({
                        T: CW_T.Falling,
                        state: false
                    }); //Stop Beep
                }
                if (T_off_beep <= CW_T.Edge + 1000) {
                    if (CW_KeyLeft.Toff > 0)
                        Stop_Key_Left();
                    if (CW_KeyRight.Toff > 0)
                        Stop_Key_Right();
                    N = Nend + 1;
                }
            }
        }
        break;
    case "IambicB":
        if (CW_KeyLeft.Ton > 0 || CW_KeyRight.Ton > 0) { //Left or Right Key is on
            if (CW_T.Start_Beep == 0) {
                CW_T.Start_Beep = Math.max(CW_KeyLeft.Ton, CW_KeyRight.Ton, CW_T.Rising2);
                CW_T.Rising1 = CW_T.Start_Beep;
                CW_Seq = {
                    modulo: 2,
                    R1: 0,
                    R2: 2,
                    F1: 1,
                    F2: 1
                }; // Start Dots only
                if (CW_KeyRight.Ton > 0)
                    CW_Seq = {
                        modulo: 4,
                        R1: 0,
                        R2: 4,
                        F1: 3,
                        F2: 3
                    }; // Start Dashes
                CW_T.DorOrDash = 0;
                CW_T.Edge = 0;
                Toto = CW_T.Start_Beep;
            }
            var T_off_beep = Math.max(CW_KeyLeft.Toff, CW_KeyRight.Toff);
            if (T_off_beep == 0)
                T_off_beep = Tend + 10000; //Postponed stop as not known yet
            var Nend = Math.floor((Tend - CW_T.Start_Beep) / PointLength); // Index last edge
            var Nstart = Math.floor((Tstart - CW_T.Start_Beep) / PointLength); // Index first edge
            for (var N = Nstart; N <= Nend; N++) {
                CW_T.Edge = CW_T.Start_Beep + N * PointLength;
                var N_Edge = (Math.floor((CW_T.Edge - CW_T.Rising1 + 0.01) / PointLength) % CW_Seq.modulo);
                if (N_Edge < 2 && CW_Seq.modulo <= 4 && CW_KeyLeft.Ton > 0 && CW_KeyRight.Ton > 0) { // 2nd Key pressed
                    CW_Seq = (CW_Seq.R2 == 4) ? {
                        modulo: 6,
                        R1: 0,
                        R2: 4,
                        F1: 3,
                        F2: 5
                    }
                     : {
                        modulo: 6,
                        R1: 0,
                        R2: 2,
                        F1: 1,
                        F2: 5
                    };
                    N_Edge = (Math.floor((CW_T.Edge - CW_T.Rising1 + 0.01) / PointLength) % CW_Seq.modulo);
                    CW_T.ReSet(CW_Seq, PointLength);
                }
                if (CW_Seq.modulo == 6 && (CW_KeyLeft.Ton > 0 && CW_KeyRight.Ton == 0 || CW_KeyLeft.Ton == 0 && CW_KeyRight.Ton > 0)) { // 2nd Key released
                    CW_Seq = (CW_Seq.R2 == 4) ? {
                        modulo: 4,
                        R1: 0,
                        R2: 4,
                        F1: 3,
                        F2: 3
                    }
                     : {
                        modulo: 2,
                        R1: 0,
                        R2: 2,
                        F1: 1,
                        F2: 1
                    }; // Dashes/ Dots
                    N_Edge = (Math.floor((CW_T.Edge - CW_T.Rising1 + 0.01) / PointLength) % CW_Seq.modulo);
                    CW_T.ReSet(CW_Seq, PointLength);
                }
                if (CW_Seq.R2 == 4 && CW_KeyLeft.Ton > 0 && CW_KeyRight.Ton == 0) {
                    CW_Seq = {
                        modulo: 2,
                        R1: 0,
                        R2: 2,
                        F1: 1,
                        F2: 1
                    };
                    N_Edge = (Math.floor((CW_T.Edge - CW_T.Rising1 + 0.01) / PointLength) % CW_Seq.modulo);
                    CW_T.ReSet(CW_Seq, PointLength);
                }
                if (CW_Seq.R2 == 2 && CW_KeyLeft.Ton == 0 && CW_KeyRight.Ton > 0) {
                    CW_Seq = {
                        modulo: 2,
                        R1: 0,
                        R2: 2,
                        F1: 1,
                        F2: 1
                    };
                    N_Edge = (Math.floor((CW_T.Edge - CW_T.Rising1 + 0.01) / PointLength) % CW_Seq.modulo);
                    CW_T.ReSet(CW_Seq, PointLength);
                }
                if ((N_Edge == CW_Seq.R1 || N_Edge % CW_Seq.modulo == CW_Seq.R2) && CW_T.Edge >= CW_T.Start_Beep && CW_T.Edge < T_off_beep && CW_T.Edge > CW_T.Falling) {
                    CW_play.push({
                        T: CW_T.Edge,
                        state: true
                    }); //Start Beep
                    if (N_Edge == 0) {
                        CW_T.Rising1 = CW_T.Edge;
                        CW_T.ReSet(CW_Seq, PointLength);
                    }
                    var LastPulse = CW_Seq.F1;
                    if (N_Edge == CW_Seq.R2) {
                        CW_T.Falling = CW_T.Rising1 + CW_Seq.F2 * PointLength;
                        LastPulse = CW_Seq.F2 - CW_Seq.R2;
                    }
                    CW_play.push({
                        T: CW_T.Falling,
                        state: false
                    }); //Stop Beep
                    CW_T.LastFalling = CW_T.Falling;
                    if (CW_KeyLeft.Ton > 0 && CW_KeyRight.Ton > 0)
                        CW_T.DorOrDash = LastPulse; //Last Pulse length with 2 keys On
                }
                if (T_off_beep <= CW_T.Edge + 1000) {
                    var StillOn = (CW_KeyLeft.Ton > 0 || CW_KeyRight.Ton) ? true : false;
                    if (CW_KeyLeft.Toff > 0) {
                        CW_KeyLeft.ToffLast = CW_KeyLeft.Toff;
                        Stop_Key_Left();
                    }
                    if (CW_KeyRight.Toff > 0) {
                        CW_KeyRight.ToffLast = CW_KeyRight.Toff;
                        Stop_Key_Right();
                    }
                    if (CW_KeyLeft.Toff == 0 && CW_KeyRight.Toff == 0 && StillOn) {
                        if (Math.abs(CW_KeyLeft.ToffLast - CW_KeyRight.ToffLast) / PointLength < CW_T.DorOrDash) { //2 keys off simultaneously during last pulse
                            var PulseLength = (CW_T.DorOrDash == 1) ? 3 : 1;
                            CW_play.push({
                                T: CW_T.LastFalling + PointLength,
                                state: true
                            }); //Start Beep
                            CW_play.push({
                                T: CW_T.LastFalling + (1 + PulseLength) * PointLength,
                                state: false
                            }); //Last stop
                            CW_T.Rising2 = Math.max(CW_T.Rising2, (2 + PulseLength) * PointLength); // To avoid transmissionimmediately after
                        }
                    }
                    N = Nend + 1;
                }
            }
        }
        break;
    }
}
function Stop_Key_Left() {
    CW_KeyLeft.Ton = 0;
    CW_KeyLeft.Toff = 0;
    if (CW_KeyLeft.Ton == 0) {
        CW_T.Start_Beep = 0;
        CW_T.Rising1 = 0;
    }
}
function Stop_Key_Right() {
    CW_KeyRight.Ton = 0;
    CW_KeyRight.Toff = 0;
    if (CW_KeyLeft.Ton == 0) {
        CW_T.Start_Beep = 0;
        CW_T.Rising1 = 0;
    }
}
function trace_CW() { // Plot Keys down and CW Audio On
    if (CW.display) {
        var canvasCW = document.getElementById("canvasCW");
        var ctxE = canvasCW.getContext("2d");
        ctxE.beginPath();
        ctxE.lineWidth = 1;
        ctxE.strokeStyle = "#FF0000";
        var Y0 = 15;
        var Y1 = 15;
        if (CW_KeyLeft.Ton > 0 && CW_T.Start_Beep > 0)
            Y1 = 11;
        ctxE.moveTo(CW_Plot.Count, Y0);
        ctxE.lineTo(CW_Plot.Count, Y1); //Left Key
        ctxE.stroke();
        ctxE.beginPath();
        ctxE.lineWidth = 1;
        ctxE.strokeStyle = "#00FF00";
        var Y0 = 10;
        var Y1 = 10;
        if (CW_KeyRight.Ton > 0 && CW_T.Start_Beep > 0)
            Y1 = 6;
        ctxE.moveTo(CW_Plot.Count, Y0);
        ctxE.lineTo(CW_Plot.Count, Y1); //Right Key
        ctxE.stroke();
        ctxE.beginPath();
        ctxE.lineWidth = 1;
        ctxE.strokeStyle = "#8888FF";
        var Y0 = 5;
        var Y1 = 5;
        if (CW.state || CW.spot)
            Y1 = 1;
        ctxE.moveTo(CW_Plot.Count, Y0);
        ctxE.lineTo(CW_Plot.Count, Y1); //Audio On
        ctxE.stroke();
        CW_Plot.Count++;
        CW_Plot.Count++;
        if (CW_Plot.Count > CW_Plot.Width) {
            CW_Plot.Count = 0;
            ctxE.clearRect(0, 0, CW_Plot.Width, 15);
        }
        ctxE.stroke();
    }
}
//OLD PARAMETERS
function Recall_ParaCW() {
    if (Local_Storage) { // On a d'anciens parametres en local
        try {
            CW_para = JSON.parse(localStorage.getItem("CW_para"));
            $("#KeyMode option[value='" + CW_para.Koption + "']").prop('selected', true);
            $("#bkin_auto").prop("checked", CW_para.bkin);
            $("#InvKeys").prop("checked", CW_para.invert);
            CW_Messages = JSON.parse(localStorage.getItem("CW_Messages"));
        } catch (e) {}
    }
}
function Save_ParaCW() {
    CW_para.bkin = $("#bkin_auto").prop("checked");
    CW_para.invert = $("#InvKeys").prop("checked");
    localStorage.setItem("CW_para", JSON.stringify(CW_para));
    CW_Messages.M1 = $("#MemCW1").val().trim();
    CW_Messages.M2 = $("#MemCW2").val().trim();
    localStorage.setItem("CW_Messages", JSON.stringify(CW_Messages));
}
function resize_CW() {
    CW_Plot.Width = $("#can_CW").innerWidth();
    $("#can_CW").html('<canvas id="canvasCW" width="' + CW_Plot.Width + '" height="15" ></canvas>');
}
function Init_Page_Keys() {
    $(function () {
        $("#slider_CW_audio_level").slider({
            value: CW_para.level,
            min: 0,
            max: 1,
            step: 0.01,
            slide: function (event, ui) {
                CW_para.level = ui.value;
                Save_ParaCW();
                choice_TX_Source();
            }
        });
    });
    $(function () {
        $("#slider_CW_pitch").slider({
            value: CW_para.pitch,
            min: 300,
            max: 1100,
            step: 10,
            slide: function (event, ui) {
                CW_para.pitch = ui.value;
                $("#CW_pitch").html(ui.value);
                Save_ParaCW();
                choix_freq_central();
                Para_To_AudioProcessor();
            }
        });
    });
    $("#CW_pitch").html(CW_para.pitch);
    // slider_CW_wpm
    $(function () {
        $("#slider_CW_wpm").slider({
            value: CW_para.wpm,
            min: 4,
            max: 40,
            step: 1,
            slide: function (event, ui) {
                CW_para.wpm = ui.value;
                $("#CW_wpm").html(ui.value);
                Save_ParaCW();
            }
        });
    });
    $("#CW_wpm").html(CW_para.wpm);
    $("#MemCW1").val(CW_Messages.M1);
    $("#MemCW2").val(CW_Messages.M2);
    Save_ParaCW();
}
$("#CW_Zin").mousedown(function () { //Zero Beat
    if (SDR_RX.mode > 4 && audioRX.on && audioRX.F_Audio_Top > 0) {
        $("#CW_Zin").removeClass('bt_off').addClass('bt_on');
        var deltaF = CW_para.pitch - audioRX.F_Audio_Top; //CW-LSB
        if (SDR_RX.mode == 6)
            deltaF = -deltaF; //CW-USB
        Recal_fine_centrale(deltaF);
    }
})
$("#CW_Zin").mouseup(function () {
    $("#CW_Zin").removeClass('bt_on').addClass('bt_off');
})
$("#CW_Spot").mousedown(function () {
    $("#CW_Spot").removeClass('bt_off').addClass('bt_on');
    if (audioTX.Ctx == null)
        Lance_audioTX();
    CW.spot = true;
    CW_play.push({
        T: Date.now(),
        state: true
    });
})
$("#CW_Spot").mouseup(function () {
    $("#CW_Spot").removeClass('bt_on').addClass('bt_off');
    CW.spot = false;
    CW_play.push({
        T: Date.now(),
        state: false
    });
})
$("#CW_Mem1").mousedown(function () {
    CW_Messages.On = 1;
    $("#CW_Mem1").removeClass('bt_off').addClass('bt_on');
    if (audioTX.Ctx == null)
        Lance_audioTX();
    CW_Messages_Gene();
})
$("#CW_Mem2").mousedown(function () {
    CW_Messages.On = 2;
    $("#CW_Mem2").removeClass('bt_off').addClass('bt_on');
    if (audioTX.Ctx == null)
        Lance_audioTX();
    CW_Messages_Gene();
})
function CW_Messages_Gene() {
    var PointLength = Math.floor(1200 / CW_para.wpm); //Ref PARIS = 50 symbols
    var T0 = 0;
    if (CW_play.length > 0) {
        T0 = CW_play[CW_play.length - 1].T + 7 * PointLength;
    }
    T0 = Math.max(Date.now(), T0);
    var message = (CW_Messages.On == 1) ? CW_Messages.M1 : CW_Messages.M2;
    for (var i = 0; i < message.length; i++) {
        var letter = message.substr(i, 1);
        letter = letter.toUpperCase()
            if (letter == " ") { //space
                T0 += 4 * PointLength;
            } else {
                var idx_letter = Alphabet.indexOf(letter);
                var code = Morse[idx_letter];
                for (var j = 0; j < code.length; j++) {
                    CW_play.push({
                        T: T0,
                        state: true
                    }); //Rising
                    var didah = code.substr(j, 1);
                    T0 += (didah.indexOf(".") == 0) ? PointLength : 3 * PointLength;
                    CW_play.push({
                        T: T0,
                        state: false
                    }); //Falling
                    T0 += PointLength;
                }
                T0 += 2 * PointLength;
            }
    }
}
console.log("End loading remote_Key.js");
