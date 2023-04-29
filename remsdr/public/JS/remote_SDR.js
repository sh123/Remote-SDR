// ***********************************
// *           REMOTE SDR v5         *
// *              F1ATB              *
// * GNU General Public Licence v3.0 *
// ***********************************

//Display
const FFT = 2048; //Taille FFT
var visus = {
    spectre_haut: 0.00026,
    spectre_bas: 0,
    spectre_col: 2,
    spectre_backcol: 11,
    spectre_lisse: true,
    water_haut: 0.0004,
    water_bas: 0,
    water_col: 10,
    disp_audio_left: 0,
    disp_audio_right: 1
};
var waterfall = {
    ligne: 0,
    bloc: false
};
//Page
var ecran = {
    large: true,
    largeur: 1,
    hauteur: 1,
    innerW: 1,
    innerH: 1,
    border: 5
};
var fenetres = {
    spectreW: 0,
    spectreH: 0,
    waterW: 10,
    waterH: 10,
    para_visus_visible: false
};
//Tracking Beacons/Balises
var balise = {
    nb: FFT,
    Voies: new Array(),
    F_Voies: new Array(),
    Freq: new Array(),
    Idx: new Array(),
    Idx_zone: new Array(),
    voie_recu: false,
    K: new Array(),
    meanDelta: 0
};
//Band Plan
var Liste_F = new Array();
var Liste_F_Perso = new Array();
//Digital Modes
var modeDigi = ["None", "RTTY"];
var RTTY = {
    win: null,
    on: false,
    TXon: false,
    PHImark: 0,
    PHIspace: 0,
    NbsampleBit: 0,
    NbCar: 0
}
//Zoom Frequency display
var ZoomFreq = {
    id: "",
    pos: 0,
    col: 0
};

//Scan
var RX_Scan = {
    on: false,
    areas: new Array(),
    idx: -1,
    level: 50,
    count: 0,
    idx_max: 0
};
var BeamsToScan = new Array();
//Storage
var Local_Storage = false;
var RX_Xtal_Errors = new Array(); //Errors Xtal frequency
//S Meter
var S_metre = {
    level: 0,
    RC_level: 0,
    large: false,
    bruit: 0,
    teta: 0
}
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
// CANVAS
//********
// Oscillo
const TraceAudio = {
    X: 0,
    Y: 50,
    Z: 50,
    H: 50,
    T0: 0,
    T: 0,
    OsciH: 70,
    OsciW: 100,
    ctx: null,
    TC: 0,
    Xold: 0,
    PlotCounter: 0,
    Plot: function () {
        this.PlotCounter = (1 + this.PlotCounter) % 10; //To reduce the number of Plots
        if (SDR_RX.gui_full && this.PlotCounter == 0) {
            this.Synchro();
            if (audioRX.Ctx != null) {
                this.ctx.beginPath();
                this.ctx.strokeStyle = "Aqua";
                if (Math.abs(audioRX.BufferSize - audioRX.BufferMax / 2) > audioRX.BufferMax / 2.2) {
                    this.ctx.strokeStyle = "Red";
                }
                this.ctx.moveTo(this.Xold, this.Y);
                this.Y = this.H - audioRX.BufferSize * this.H / audioRX.BufferMax;
                this.ctx.lineTo(this.X, this.Y); //Buffer en entrée ecriture
                this.ctx.stroke();
                this.Xold = this.X;
            }
        }
    },
    PlotSpectraIn: function () {
        if (SDR_RX.gui_full) {
            this.Synchro();
            this.ctx.beginPath();
            this.ctx.strokeStyle = "lightgreen";
            this.ctx.lineWidth = 4;
            this.ctx.moveTo(this.X, this.H + 2);
            this.ctx.lineTo(this.X, this.H + 7);
            this.ctx.stroke();
        }
    },
    PlotSpectraOut: function () {
        if (SDR_RX.gui_full) {
            this.Synchro();
            var canvasOscillo = document.getElementById("myOscillo");
            var ctx = canvasOscillo.getContext("2d");
            ctx.beginPath();
            ctx.strokeStyle = "yellow";
            ctx.lineWidth = 2;
            ctx.moveTo(this.X, this.H + 7);
            ctx.lineTo(this.X, this.H + 9);
            ctx.stroke();
        }
    },
    Synchro: function () {
        var canvasOscillo = document.getElementById("myOscillo");
        this.ctx = canvasOscillo.getContext("2d");
        this.ctx.lineWidth = 1;
        this.Tc = Date.now();
        if ((this.Tc - this.T0) > 2000) {
            this.OsciH = $("#Oscillo").innerHeight();
            this.OsciW = $("#Oscillo").innerWidth();
            this.H = this.OsciH - 30;
            this.T = this.OsciH - 10;
            this.T0 = this.Tc; // Synchro balayage X
            this.ctx.clearRect(0, 0, this.OsciW, this.OsciH);
            this.Xold = 0;
            this.ctx.beginPath();
            this.ctx.strokeStyle = "white";
            this.ctx.fillStyle = "White";
            for (var i = 1; i < 20; i = i + 2) {
                var X = i * this.OsciW / 20;
                this.ctx.moveTo(X, this.OsciH);
                this.ctx.lineTo(X, this.T);
                this.ctx.fillText(i / 10, X - this.OsciW / 40, this.T);
            }
            this.ctx.fillText("   s", X, this.T);
            this.ctx.stroke();
            let S = (audioRX.BufferMax / 10000).toPrecision(2);
            $("#inOscillo").html("Input Audio Buffer Size (max:" + S + "s)");
        }
        this.X = (this.Tc - this.T0) * this.OsciW / 2000;
    }
}
function Plot_the_Spectra() {
    Plot_.Spectra();
}
const Plot_ = {
    Mean: [],
    Min: [],
    Center: [],
    FrameCount: 0,
    FrameModulo: 8,
    FrameCountTot: 0,
    sortie: [],
    idx_sortie: 0,
    Spectra: function () {
        this.FrameCountTot += 1;
        var nb_reception = 0;
        while (ComRX.beam_buffer.length >= 4096) {
            var j = 0;
            var buf8 = ComRX.beam_buffer.splice(0, 4096);
            for (var i = 0; i < 2048; i++) { //Conversion byte to 16 bit integer unsigned
                var S = ((buf8[j + 1]) << 8) | (buf8[j]);
                if (S == 65535)
                    this.idx_sortie = 1024; //Re-Synchronisation if bad starting sequence
                if (S > 32767)
                    S = S - 65536; //Sometimes values can be negative
                this.sortie[this.idx_sortie] = S;
                this.idx_sortie = (1 + this.idx_sortie) % 2048;
                j += 2;
            }
            this.sortie[1024] = this.sortie[1025]; //Remove synchro word
            ComRX.dataSpectre = ComRX.dataSpectre.concat(this.sortie);
            //console.log(ComRX.dataSpectre.length)
            $("#RXonLed").css("background-color", "LightGreen");
            nb_reception++;
        }
        if (nb_reception > 0) {
            this.FrameModulo = 0.1 * this.FrameCountTot / nb_reception + 0.9 * this.FrameModulo;
            this.FrameCountTot = 0;
        }
        var L = ComRX.dataSpectre.length;
        //To count Frame between spectra packets
        var v = this.FrameCount;
        this.FrameCount = (this.FrameCount >= Math.floor(this.FrameModulo)) ? 1 : this.FrameCount + 1; //To slow down a burst of data
        if ((!audioTX.Transmit || SDR_TX.Fduplex) && L > 0 && this.FrameCount == 1) {
            this.Ascan(ComRX.dataSpectre.splice(0, FFT));
            this.Waterfall();
            TraceAudio.PlotSpectraOut();

        }
        var draw = requestAnimationFrame(Plot_the_Spectra);
    },
    Ascan: function (spectre) {
        var Sl = spectre.length;
        var Sl2 = spectre.length / 2;
        if (this.Mean.length < FFT) {
            for (var i = 0; i < FFT; i++) {
                this.Mean[i] = 0;
                this.Min[i] = 0;
            }
        }
        this.Center = [];
        let arr1 = spectre.slice(Sl2, Sl); // Array is shifted by 1/2 in GNU Radio Block FFT Mag Log
        let arr2 = spectre.slice(0, Sl2);
        this.Center = [...arr1, ...arr2];
        if (SDR_RX.gui_full) {
            var C = visus.spectre_col; //Color
            var X = 0;
            var dX = ecran.innerW / spectre.length;
            var H = fenetres.spectreH;
            var S = '<svg height="' + H + '" width="' + ecran.innerW + '" >'; //SVG type of drawing
            S += '<defs><linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">';
            S += '<stop offset="0%" style="stop-color:' + Colors[C][1] + ';stop-opacity:1" />';
            S += '<stop offset="50%" style="stop-color:' + Colors[C][2] + ';stop-opacity:1" />';
            S += '<stop offset="100%" style="stop-color:' + Colors[C][3] + ';stop-opacity:1" />';
            S += '</linearGradient>';
            S += '</defs>'
            S += '<polygon style="stroke:' + Colors[C][0] + ';stroke-width:1" points="0,256 ';
        }
        var Sm1 = Math.floor(0.3 * Sl); //Limits to look for minimum noise, except bad edges and middle
        var Sm2 = Math.floor(0.48 * Sl);
        var Sm3 = Math.floor(0.52 * Sl);
        var Sm4 = Math.floor(0.7 * Sl);
        var Beam_Sector = 12 * 20 / Rx.idxBW; //Half sector spatial filter (12 for a useful band of 2MHz or 2.4M SR. Increase if Bandwidth decrease
        if (Rx.IdxModul == 4)
            Beam_Sector = Beam_Sector * 8; //WBFM

        for (var i = 0; i < Sl; i++) {
            this.Mean[i] = 0.1 * this.Center[i] + 0.9 * this.Mean[i]; //Mean values - First Order Filter
            var BS = Beam_Sector;
            if (i < Sm1)
                BS = Math.floor(6 + (Beam_Sector - 6) * i / Sm1); // Lower signal at the band limits
            if (i > Sm4)
                BS = Math.floor(6 + (Beam_Sector - 6) * (Sl - i) / Sm1);
            var m = Math.min(Sl - BS, Math.max(0, i - BS)); //Sector to look for minimum
            var n = Math.max(BS, Math.min(Sl, i + BS));
            if (i <= Sl2 && n > Sm2)
                n = Math.max(i + 2, Sm2); //few beams perturbated in the center
            if (i > Sl2 && m < Sm3)
                m = Math.min(i - 2, Sm3);
            var sector = this.Mean.slice(m, n);
            this.Min[i] = Math.min(...sector);
            if (SDR_RX.gui_full) {
                if (visus.spectre_lisse) {
                    var Y = Math.floor(H * (1 - visus.spectre_haut * (this.Mean[i] - this.Min[i] + visus.spectre_bas)));
                } else {
                    var Y = Math.floor(H * (1 - visus.spectre_haut * (this.Center[i] - this.Min[i] + visus.spectre_bas)));
                }
                S += X + ',' + Y + ' ';
                X += dX;
            }
        }
        if (SDR_RX.gui_full) {
            S += X + ',256 0,256" fill="url(#grad1)"  /></svg>';
            $("#mySpectre").html(S);
            //Band Scan
            RX_Scan.count++; //+ per second
            if (RX_Scan.on && RX_Scan.count > 0) {
                RX_Scan.count = -1;
                var seuil_ = H * RX_Scan.level / 100;
                var seuil = ((1 - seuil_ / H) / visus.spectre_haut) - visus.spectre_bas;
                for (var i = 0; i < Sl; i++) {
                    var j = (i + RX_Scan.idx_max) % Sl;
                    if (BeamsToScan[j]) {
                        if (this.Mean[j] - this.Min[j] > seuil) {
                            RX_Scan.count = -50;
                            var Ffine = this.Estimate_Max_Freq(j); // j=Index voie qui a franchi le seuil
                            if (Rx.IdxModul == 0 || Rx.IdxModul == 5)
                                Ffine += 700; //  LSB  shift estimate or CW-LSB
                            if (Rx.IdxModul == 1 || Rx.IdxModul == 6)
                                Ffine += -700; //  USB or CW-USB
                            RX.Ffine = Ffine;
                            choix_freq_fine()
                            RX_Scan.idx_max = Math.floor(FFT * ((RX.Ffine + 10000) / SDR_RX.bande + 0.5)); // Next channel to scan 10 kHz at the right
                            Affiche_Curseur();
                            i = Sl;
                        }
                    }
                }
            }
            // S_metre Level
            var deltaF1 = RX_modes[Rx.IdxModul][1] / 2;
            var deltaF0 = -deltaF1;
            if (Rx.IdxModul == 0 || Rx.IdxModul == 5) {
                deltaF0 = 2 * deltaF0;
                deltaF1 = 0;
            } //  LSB
            if (Rx.IdxModul == 1 || Rx.IdxModul == 6) {
                deltaF1 = 2 * deltaF1;
                deltaF0 = 0;
            } //  USB
            var idx_audio0 = Math.floor(Sl * (0.5 + (RX.Ffine + deltaF0) / (SDR_RX.bande)));
            var idx_audio1 = Math.floor(Sl * (0.5 + (RX.Ffine + deltaF1) / (SDR_RX.bande)));
            S_metre.level = -100000;
            var Amp_min = 100000000000;
            for (var i = idx_audio0; i <= idx_audio1; i++) {
                var j = Math.max(0, i);
                j = Math.min(Sl - 1, j);
                S_metre.level = Math.max(S_metre.level, this.Mean[j]);
                Amp_min = Math.min(Amp_min, this.Min[j]);
            }
            S_metre.bruit = 0.9999 * Amp_min + 0.0001 * S_metre.bruit; //Noise level on horizon
            S_metre.RC_level = Math.max(S_metre.level, 0.05 * S_metre.level + 0.95 * S_metre.RC_level); //Montée rapide
            var Sdb = (S_metre.RC_level - S_metre.bruit) / 100;
            $("#Smetre_RC").html(Sdb.toFixed(1)); //dB au dessus du bruit
            var teta = S_metre.teta * (-1 + Sdb / 25);
            $("#SM_fleche").css("transform", "rotate(" + teta + "rad)");
            //Spectre Zoom autour audio +-5kHz
            var W = $("#zSpectre").innerWidth();
            var H = $("#zSpectre").innerHeight();
            var canvasZS = document.getElementById("zcSpectre");
            var ctx = canvasZS.getContext("2d");
            ctx.lineWidth = 1;
            ctx.clearRect(0, 0, W, H);
            ctx.beginPath();
            var my_gradient = ctx.createLinearGradient(0, 0, 0, H);
            my_gradient.addColorStop(0, Colors[C][0]);
            my_gradient.addColorStop(0.33, Colors[C][1]);
            my_gradient.addColorStop(0.66, Colors[C][2]);
            my_gradient.addColorStop(1, Colors[C][3]);
            ctx.fillStyle = my_gradient;
            var idx_audio_deb = Math.floor(Sl * (0.5 + (RX.Ffine - 5000) / (SDR_RX.bande)));
            var idx_audio_fin = Math.floor(Sl * (0.5 + (RX.Ffine + 5000) / (SDR_RX.bande)));
            ctx.moveTo(-1, H);
            var dX = W * (SDR_RX.bande) / Sl / 10000;
            var X = W * (((SDR_RX.bande) * (idx_audio_deb / Sl - 0.5) - RX.Ffine) / 10000 + 0.5);
            for (var idx = idx_audio_deb; idx <= idx_audio_fin; idx++) {
                if (idx >= 0 && idx < Sl) {
                    var Y = H * visus.spectre_haut * (this.Mean[idx] - this.Min[i] + visus.spectre_bas) + 1;
                    ctx.fillRect(X, H - Y, dX, H);
                }
                X = X + dX;
            }
            ctx.strokeStyle = "#f00"; //Curseur Audio au milieu
            ctx.moveTo(0.5 * W, H);
            ctx.lineTo(0.5 * W, 0);
            ctx.stroke();
            //Curseur beacons
            ctx.beginPath();
            ctx.strokeStyle = "DarkOrange";
            for (var i = 0; i < balise.Idx.length; i++) {
                if (balise.Idx[i] >= idx_audio_deb && balise.Idx[i] <= idx_audio_fin) {
                    var X = W * ((balise.Freq[i] - SDR_RX.Audio_RX) / 10000 + 0.5);
                    ctx.moveTo(X, H);
                    ctx.lineTo(X, 0);
                }
            }
            ctx.stroke();
            //Marqueur kHz
            ctx.beginPath();
            ctx.strokeStyle = "White";
            ctx.fillStyle = "White";
            for (var f = -4; f <= 4; f = f + 2) {
                var X = W * (f / 10 + 0.5);
                ctx.moveTo(X, H);
                ctx.lineTo(X, 0.9 * H);
                ctx.fillText(f, X, 0.9 * H);
            }
            ctx.fillText("kHz", W * 0.93, 0.9 * H);
            ctx.stroke();
        }
    },
    Estimate_Max_Freq: function (Idx0) {
        var dIdx = Math.floor(5 + FFT * RX_modes[Rx.IdxModul][1] / SDR_RX.bande); //Define search area according to bandwidth
        var idx_start = Math.max(0, Idx0 - dIdx);
        var idx_end = Math.min(FFT - 1, Idx0 + dIdx);
        var Vmax = -100000;
        for (var i = idx_start; i <= idx_end; i++) {
            if (this.Mean[i] > Vmax) {
                Idx0 = i; //Search maximum beam
                Vmax = this.Mean[i];
            }
        }
        Idx0 = Math.max(5, Math.min(FFT - 5, Idx0))
            var Vg = Math.pow(10, this.Mean[Idx0 - 1] / 10000); //Linear and not dB
        var Vc = Math.pow(10, this.Mean[Idx0] / 10000);
        var Vd = Math.pow(10, this.Mean[Idx0 + 1] / 10000);
        var dIdx = 5 * (Vd - Vg) / Vc;
        dIdx = Math.max(-0.5, Math.min(0.5, dIdx))
            var Freq_of_Max = ((Idx0 + dIdx + 0.5) / FFT - 0.5) * SDR_RX.bande; //Freq fine of the maximum
        return Freq_of_Max;
    },
    Waterfall: function () {
        if (waterfall.ligne == 0)
            waterfall.bloc = !waterfall.bloc;
        var L = fenetres.waterH - waterfall.ligne - 1;
        var p0 = -L + "px";
        var p1 = -L + fenetres.waterH + "px";
        if (waterfall.bloc) {
            $("#myWaterfall0").css("top", p0);
            $("#myWaterfall1").css("top", p1);
        } else {
            $("#myWaterfall0").css("top", p1);
            $("#myWaterfall1").css("top", p0);
        }
        var canvasWaterfall0 = document.getElementById("myWaterfall0");
        var ctxW0 = canvasWaterfall0.getContext("2d");
        var canvasWaterfall1 = document.getElementById("myWaterfall1");
        var ctxW1 = canvasWaterfall1.getContext("2d");
        var Sl = this.Center.length;
        if (waterfall.bloc) {
            var imgData = ctxW0.getImageData(0, L, FFT, 1);
        } else {
            var imgData = ctxW1.getImageData(0, L, FFT, 1);
        }
        var k = 0;
        for (var i = 0; i < Sl; i++) {
            var A = Math.floor(300 * Math.max(visus.water_haut * (this.Center[i] - this.Min[i] + visus.water_bas), 0));
            A = Math.min(A, 300);
            imgData.data[k] = Cpalette[A][0]; //Red
            imgData.data[k + 1] = Cpalette[A][1]; //Green
            imgData.data[k + 2] = Cpalette[A][2]; //Blue
            imgData.data[k + 3] = 255;
            k = k + 4;
        }
        if (waterfall.bloc) {
            ctxW0.putImageData(imgData, 0, L); //On modifie la ligne L
        } else {
            ctxW1.putImageData(imgData, 0, L);
        }
        waterfall.ligne = (waterfall.ligne + 1) % fenetres.waterH;
    }
}

function Trace_Echelle() { // Scale drawing
    var canvasEchelle = document.getElementById("myEchelle");
    var ctxE = canvasEchelle.getContext("2d");
    SDR_RX.min = parseInt(Rx.Fcentral) - 60000 * Rx.idxBW;
    SDR_RX.max = parseInt(Rx.Fcentral) + 60000 * Rx.idxBW;
    SDR_RX.bande = SDR_RX.max - SDR_RX.min; // Bande exacte à l'ecran
    ctxE.beginPath();
    ctxE.strokeStyle = "#FFFFFF";
    ctxE.fillStyle = "#FFFFFF";
    ctxE.lineWidth = 1;
    ctxE.clearRect(0, 0, ecran.innerW, 44);
    ctxE.font = "10px Arial";
    if (ecran.large)
        ctxE.font = "12px Arial";
    for (var f = SDR_RX.min; f <= SDR_RX.max; f = f + 10000) {
        var Fint = 10000 * Math.floor(f / 10000);
        var X = (Fint - SDR_RX.min) * ecran.innerW / (SDR_RX.bande);
        ctxE.moveTo(X, 0);
        var Y = 10;
        var Fintk = Fint / 1000;
        var Ytext = 25;
        if (ecran.large)
            Ytext = 30;
        if (ecran.large || (SDR_RX.max < SDR_RX.min + 1000001)) {
            if (Fint % 50000 == 0)
                Y = 15;
            if (Fint % 100000 == 0)
                ctxE.fillText(Fintk, X - ctxE.measureText(Fintk).width / 2, Ytext);
        } else {
            if (Fint % 100000 == 0)
                Y = 15;
            if (Fint % 500000 == 0)
                ctxE.fillText(Fintk, X - ctxE.measureText(Fintk).width / 2, Ytext);
        }
        ctxE.lineTo(X, Y); //traits
    }
    ctxE.stroke(); // Fin graduations
    //Draw coloured zones
    ctxE.lineWidth = 2;
    for (var i = 0; i < ConfRX.Zone.length; i++) {
        if ((ConfRX.Zone[i][0] >= SDR_RX.min && ConfRX.Zone[i][0] <= SDR_RX.max) || (ConfRX.Zone[i][1] >= SDR_RX.min && ConfRX.Zone[i][1] <= SDR_RX.max) || (ConfRX.Zone[i][0] < SDR_RX.min && ConfRX.Zone[i][1] > SDR_RX.max)) {
            ctxE.beginPath();
            ctxE.strokeStyle = ConfRX.Zone[i][2];
            var X0 = (ConfRX.Zone[i][0] - SDR_RX.min) * ecran.innerW / (SDR_RX.bande);
            var X1 = (ConfRX.Zone[i][1] - SDR_RX.min) * ecran.innerW / (SDR_RX.bande);
            ctxE.moveTo(X0, 0);
            ctxE.lineTo(X1, 0);
            ctxE.stroke();
        }
    }
    //Draw zones where processing perturbated
    ctxE.beginPath();
    ctxE.lineWidth = 1;
    ctxE.strokeStyle = "#f80";
    ctxE.moveTo(0, 2);
    ctxE.lineTo(0.08 * ecran.innerW, 2);
    ctxE.moveTo(0.92 * ecran.innerW, 2);
    ctxE.lineTo(ecran.innerW, 2);
    ctxE.moveTo(0.495 * ecran.innerW, 2);
    ctxE.lineTo(0.505 * ecran.innerW, 2);
    ctxE.stroke();
    //Ecriture Labels des Liste_F
    var S = "";
    for (var i = 0; i < Liste_F.length; i++) {
        if (Liste_F[i][0] >= SDR_RX.min && Liste_F[i][0] <= SDR_RX.max) {
            var X = (Liste_F[i][0] - SDR_RX.min) * ecran.innerW / (SDR_RX.bande);
            S += '<div style="left:' + X + 'px;" class="coral" onclick="Flabel(' + Liste_F[i][0] + ',event);">' + Liste_F[i][1] + '</div>';
        }
    }
    $("#echelle_Label").html(S);
    //Beacons tracking to compensate clock offset
    balise.nb = 0;
    var S = "";
    balise.Freq = new Array;
    balise.Idx = new Array;
    balise.F_Voies = new Array;
    balise.Voies = new Array;
    balise.K = new Array;
    balise.Idx_zone = new Array();
    var Fmin = Rx.Fcentral - SDR_RX.bande / 2.4;
    var Fmax = Rx.Fcentral + SDR_RX.bande / 2.4;
    for (var i = 0; i < ConfRX.BeaconSync.length; i++) {
        balise.Idx_zone[i] = [0, 0];
        if (ConfRX.BeaconSync[i][0] >= Fmin && ConfRX.BeaconSync[i][0] <= Fmax && Math.abs(ConfRX.BeaconSync[i][0] - Rx.Fcentral) > 4000) {
            var X = Math.floor((ConfRX.BeaconSync[i][0] - SDR_RX.min) * ecran.innerW / (SDR_RX.bande));
            S += '<div id="beacon' + i + '" style="left:' + X + 'px">^</div>';
            balise.Freq[balise.nb] = ConfRX.BeaconSync[i][0];
            balise.Idx[balise.nb] = Math.floor(FFT * (0.5 + (balise.Freq[balise.nb] - Rx.Fcentral) / (SDR_RX.bande))); //Voie centrale
            balise.Idx_zone[balise.nb][0] = Math.floor(FFT * (0.5 + (balise.Freq[balise.nb] - Rx.Fcentral - SDR_RX.WindowSearch) / (SDR_RX.bande))); //Voie bas zone recherche grossière
            balise.Idx_zone[balise.nb][1] = Math.floor(FFT * (0.5 + (balise.Freq[balise.nb] - Rx.Fcentral + SDR_RX.WindowSearch) / (SDR_RX.bande))); //Voie haute zone recherche grossière
            balise.Idx_zone[balise.nb][0] = Math.max(0, balise.Idx_zone[balise.nb][0]);
            balise.Idx_zone[balise.nb][1] = Math.min(2047, balise.Idx_zone[balise.nb][1]);
            balise.F_Voies[balise.nb] = Rx.Fcentral + (balise.Idx[balise.nb] + 0.5 - FFT / 2) * SDR_RX.bande / FFT; //Freq centre voie
            balise.Voies[balise.nb] = [0, 0, 0]; //Amplitude gauche,centre droite
            var Kc = 2 * FFT * (ConfRX.BeaconSync[i][0] - balise.F_Voies[balise.nb]) / (SDR_RX.bande); // Coef ponderation voie centrale
            if (ConfRX.BeaconSync[i][0] > balise.F_Voies[balise.nb]) {
                balise.K[balise.nb] = [Kc - 1, -Kc, 1]; //Coef gauche, centre,droite
            } else {
                balise.K[balise.nb] = [-1, -Kc, 1 + Kc];
            }

            balise.nb++;
        }
    }

    $("#echelle_track").html(S); //Marqueurs des beacons
    Audio_Bandwidth();
    //Scan Areas
    //**********
    //Remove scan zone overlapoverlap
    if (RX_Scan.areas.length > 1) {
        for (var i = 0; i < RX_Scan.areas.length - 1; i++) {
            var Area = RX_Scan.areas[i];
            for (var j = i + 1; j < RX_Scan.areas.length; j++) {
                var fmin = RX_Scan.areas[j].Fmin;
                var fmax = RX_Scan.areas[j].Fmax;
                if ((fmin >= Area.Fmin && fmin <= Area.Fmax) || (fmax >= Area.Fmin && fmax <= Area.Fmax)) { //Overlap
                    RX_Scan.areas[i].Fmin = Math.min(Area.Fmin, fmin); // fuse
                    RX_Scan.areas[i].Fmax = Math.max(Area.Fmax, fmax);
                    RX_Scan.areas[j].Fmin = 0;
                    RX_Scan.areas[j].Fmax = 0;
                }
            }
        }
        for (var i = RX_Scan.areas.length - 1; i >= 0; i--) {
            if (RX_Scan.areas[i].Fmin == 0) {
                RX_Scan.areas.splice(i, 1); //Remove overlap
            }
        }
    }
    for (var i = 0; i < FFT; i++) {
        BeamsToScan[i] = false;
    }
    S = "";
    var one_valid = false;
    for (var i = 0; i < RX_Scan.areas.length; i++) {
        var Area = RX_Scan.areas[i];
        if ((Area.Fmin >= SDR_RX.min && Area.Fmin <= SDR_RX.max) || (Area.Fmax >= SDR_RX.min && Area.Fmax <= SDR_RX.max)) { //Freq min et max de la zone
            var left = Math.floor((Area.Fmin - SDR_RX.min) * ecran.innerW / (SDR_RX.bande));
            var right = Math.floor((Area.Fmax - SDR_RX.min) * ecran.innerW / (SDR_RX.bande));
            var width = right - left;
            S += '<div class="Scan_area" onmousedown="RX_Scan.idx=' + i + ';" style="left:' + left + 'px;width:' + width + 'px;"></div>';
            RX_Scan.areas[i].left = left;
            RX_Scan.areas[i].right = right;
            RX_Scan.areas[i].width = width;
            var idx_left = Math.floor((Area.Fmin - SDR_RX.min) * FFT / (SDR_RX.bande));
            idx_left = Math.max(0, idx_left);
            idx_left = Math.min(FFT - 1, idx_left);
            var idx_right = Math.floor((Area.Fmax - SDR_RX.min) * FFT / (SDR_RX.bande));
            idx_right = Math.max(0, idx_right);
            idx_right = Math.min(FFT - 1, idx_right);
            idx_right = Math.max(idx_left, idx_right);
            for (var j = idx_left; j <= idx_right; j++) {
                BeamsToScan[j] = true;
            }
            one_valid = true;
        }
    }
    if (!one_valid) {
        RX_Scan.on = false;
        Scan_status();
    }
    $("#Scan_Zone").html(S);
    $("#Scan_Zone").css("top", RX_Scan.level * fenetres.spectreH / 100);
}
//Scan
$("#Scan").click(function () {
    //Scan button
    RX_Scan.on = !RX_Scan.on;
    if (RX_Scan.on)
        Scan_create_area();
    Scan_status();
    Save_SDR_Para();
})
function Scan_status() {
    //Scan button
    if (RX_Scan.on) {
        $("#Scan").removeClass('bt_off').addClass('bt_on');
        $("#Scan_Zone").css("display", "block");
    } else {
        $("#Scan").removeClass('bt_on').addClass('bt_off');
        $("#Scan_Zone").css("display", "none");
    }
}
function Add_Scan(ev) {
    ev.stopPropagation()
    Scan_create_area()
}
function Scan_create_area() {
    var Area = {
        Fmin: SDR_RX.Audio_RX - 50000,
        Fmax: SDR_RX.Audio_RX + 50000,
        left: 0,
        right: 0,
        width: 0,
        in_band: false
    }
    RX_Scan.areas.push(Area);
    Trace_Echelle();
}
function Scan_move(ev) {
    if (RX_Scan.idx >= 0) {
        ev = ev || window.event;
        ev.preventDefault();
        ev.stopPropagation();
        var pos_mouse = ev.clientX - ecran.border;
        var freq = Math.floor(SDR_RX.min + pos_mouse * SDR_RX.bande / ecran.innerW);
        freq = Math.max(SDR_RX.BandeRXmin, freq);
        freq = Math.min(SDR_RX.BandeRXmax, freq);
        if (RX_Scan.idx < RX_Scan.areas.length) {
            if (Math.abs(pos_mouse - RX_Scan.areas[RX_Scan.idx].left) < 2 + RX_Scan.areas[RX_Scan.idx].width / 2.5) {
                RX_Scan.areas[RX_Scan.idx].Fmin = freq;
                $("#Scan_Zone").css("pointer", "e-resize");
            }
            if (Math.abs(pos_mouse - RX_Scan.areas[RX_Scan.idx].right) < 2 + RX_Scan.areas[RX_Scan.idx].width / 2.5) {
                RX_Scan.areas[RX_Scan.idx].Fmax = freq;
                $("#Scan_Zone").css("pointer", "e-resize");
            }
            var pos_mouse = 100 * (ev.clientY - ecran.border - $("#spectre").offset().top) / fenetres.spectreH;
            pos_mouse = Math.max(0, pos_mouse);
            RX_Scan.level = Math.floor(Math.min(90, pos_mouse));
            if ((RX_Scan.areas[RX_Scan.idx].Fmax - RX_Scan.areas[RX_Scan.idx].Fmin) < 10000) {
                RX_Scan.areas.splice(RX_Scan.idx, 1); //Remove, too small
                RX_Scan.idx = -1;
            }
        }
        Trace_Echelle();
        Save_SDR_Para();
    }
}
function Stop_Move() {
    RX_Scan.idx = -1;
}
//Affichage - Display
//**************
function Affich_freq_Audio_RX() {
    // Shift in case of CW
    SDR_RX.CW_shiftRXTX = 0
        if (Rx.IdxModul == 5)
            SDR_RX.CW_shiftRXTX = -CW_para.pitch; //CW-LSB
        if (Rx.IdxModul == 6)
            SDR_RX.CW_shiftRXTX =  + CW_para.pitch; //CW-USB
        SDR_RX.Audio_RX = Math.floor(Rx.Fcentral + RX.Ffine);
    SDR_RX.Audio_RXaff = Math.floor(Rx.Fcentral + RX.Ffine + SDR_RX.CW_shiftRXTX);
    $("#Fsaisie").html(FkHz(SDR_RX.Audio_RXaff));
    Affich_freq_champs(SDR_RX.Audio_RXaff, "#FRX");
    $("#CentFreq").html(FkHz(Rx.Fcentral) + " kHz");
    if (ZoomFreq.id == "FRX")
        Affich_freq_champs(SDR_RX.Audio_RXaff, "#ZFr"); //Zoom display
    Save_RX_Para();
    Affiche_Curseur();
}
function Affich_freq_champs(F, id) {
    var Fr = "*              " + F.toString();
    for (var i = 1; i <= 12; i++) {
        $(id + i).html(Fr.substr(-i, 1));
    }
}
function Affiche_Curseur() {
    var p = ecran.innerW * (0.5 + (RX.Ffine + SDR_RX.CW_shiftRXTX) / (SDR_RX.bande)) - 10 + ecran.border;
    $("#curseur").css("left", p);
}
function smetreClick() {
    S_metre.large = !S_metre.large;
    if (S_metre.large) {
        $("#Smetre").css({
            "position": "fixed",
            "top": "5%",
            "height": "30%",
            "font-size": "100px",
            "border": "inset 4px white"
        });
        $("#Smetre_label").css("font-size", "18px");
        $("#Smetre_RC").css({
            "font-size": "100px",
            "width": "250px",
            "margin-left": "-125px"
        });
    } else {
        $("#Smetre").css({
            "position": "absolute",
            "top": "0%",
            "height": "100%",
            "font-size": "20px",
            "border": "0px"
        });
        $("#Smetre_label").css("font-size", "8px");
        $("#Smetre_RC").css({
            "font-size": "20px",
            "width": "50px",
            "margin-left": "-25px"
        });
    }
    resize_Smetre();
}
function Echelle_dB_Spectre() {
    var ctx = document.getElementById("myEchSpectre").getContext("2d");
    ctx.lineWidth = 1;
    ctx.clearRect(0, 0, fenetres.spectreW, fenetres.spectreH);
    ctx.beginPath();
    ctx.strokeStyle = "#ffffff";
    ctx.setLineDash([1, 15]);
    for (var level = -32000; level <= 32000; level = level + 1000) { //Step 10db
        var Y = Math.floor(fenetres.spectreH * (1 - visus.spectre_haut * (level + visus.spectre_bas)));
        if (Y > 0 && Y < fenetres.spectreH) {
            ctx.moveTo(0, Y);
            ctx.lineTo(fenetres.spectreW, Y);
        }
    }
    ctx.stroke();
}
function Affiche_ListeF() {
    //Trie liste
    var PasTrie = true;
    while (PasTrie && Liste_F.length > 1) {
        PasTrie = false;
        for (var i = 1; i < Liste_F.length; i++) {
            if (Liste_F[i][0] < Liste_F[i - 1][0]) {
                PasTrie = true;
                var A = Liste_F[i - 1];
                Liste_F[i - 1] = Liste_F[i];
                Liste_F[i] = A;
            }
        }
    }
    //Affichage liste frequences / Display Frequency list
    var S = "";
    for (var i = 0; i < Liste_F.length; i++) {
        if (SDR_RX.BandeRXmin <= Liste_F[i][0] && SDR_RX.BandeRXmax >= Liste_F[i][0]) {
            if (Liste_F[i][2]) { //Liste perso
                S += '<div><div class="hover DSaisie" onclick="Dsaisie(' + Liste_F[i][0] + ',\'' + Liste_F[i][1] + '\');" >x</div>';
            } else {
                S += "<div><div class='DSaisie' ></div>"
            }
            S += "<span class='hover' onclick='clickF(" + i + ");'>" + FkHz(Liste_F[i][0]) + " " + Liste_F[i][1] + "</span></div>";
        }
    }
    $("#ListeF").html(S);
    Trace_Echelle();
}
function FkHz(Fr) {
    return Math.floor(Fr / 1000).toLocaleString().trim();
}
function Ssaisie() {
    var V = $("#Tsaisie").val();
    var pat = /['"<>]/g;
    V = V.replace(pat, " ");
    $("#Tsaisie").val("");
    Liste_F.push([SDR_RX.Audio_RX, V, true]);
    Liste_F_Perso.push([SDR_RX.Audio_RX, V]);
    Save_SDR_Para();
    Affiche_ListeF();
}
function Dsaisie(f, n) { //Delete one record
    for (var i = 0; i < Liste_F.length; i++) {
        if (Liste_F[i][0] == f && Liste_F[i][1] == n) {
            Liste_F.splice(i, 1);
            break;
        }
    }
    for (var i = 0; i < Liste_F_Perso.length; i++) {
        if (Liste_F_Perso[i][0] == f && Liste_F_Perso[i][1] == n) {
            Liste_F_Perso.splice(i, 1);
            break;
        }
    }
    Save_SDR_Para();
    Affiche_ListeF();
}
function SpectreColour(V) {
    visus.spectre_col = V;
    Save_visus();
}
function SpectreBackColour(V) {
    visus.spectre_backcol = V;
    $("#spectre").css({
        background: "linear-gradient(" + Colors[V][2] + "," + Colors[V][1] + "," + Colors[V][3] + ")"
    });
    init_Audio_Plots();
    Save_visus();
}
function WaterColor(V) {
    visus.water_col = V;
    Save_visus();
    var CT = [];
    for (var c = 0; c < 3; c++) {
        CT.push([0, 0, 0]);
        for (var t = 0; t < 3; t++) {
            var C = Colors[visus.water_col][c + 1].substr(t + 1, 1);
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
}
//ANCIENS PARAMETRES - OLD parameters stored locally in browser
function Recall_SDR_Para() {
    if (Local_Storage) { // On a d'anciens parametres en local
        try {
            console.log(Date.now() - T0_remsdr, "Recall_SDR_Para()")
            Liste_F_Perso = JSON.parse(localStorage.getItem("Liste_F_Perso"));
            if (Liste_F_Perso.length > 0) {
                for (var i = 0; i < Liste_F_Perso.length; i++) {
                    Liste_F.push([Liste_F_Perso[i][0], Liste_F_Perso[i][1], true]);
                }
            }
            Affich_freq_Audio_RX();
            Affiche_Curseur();
            RX_Scan = JSON.parse(localStorage.getItem("RX_Scan"));
            RX_Scan.idx = -1;
            Scan_status();
            Trace_Echelle();
        } catch (e) {}
    }
}
function Save_SDR_Para() {
    localStorage.setItem("Liste_F_Perso", JSON.stringify(Liste_F_Perso));
    localStorage.setItem("RX_Scan", JSON.stringify(RX_Scan));
    localStorage.setItem("Local_Storage_", JSON.stringify(Version_Local_Storage));
}
function Recall_visus() {
    if (Local_Storage) {
        try {
            var visus_Old = JSON.parse(localStorage.getItem("Visus"));
            if (visus_Old != null)
                visus = visus_Old;
            $("#Spectre_average").prop("checked", visus.spectre_lisse);
            $("input:radio[name~='Spectre_color']").filter("[value='" + visus.spectre_col + "']").prop('checked', true);
            $("input:radio[name~='Spectre_colBack']").filter("[value='" + visus.spectre_backcol + "']").prop('checked', true);
            $("input:radio[name~='Water_co']").filter("[value='" + visus.water_col + "']").prop('checked', true);
        } catch (e) {}
    }
}
function Save_visus() {
    visus.spectre_lisse = $("#Spectre_average").prop("checked");
    localStorage.setItem("Visus", JSON.stringify(visus));
}
//RESIZE
//**********
function window_resize() {
    ecran.largeur = window.innerWidth; // parametre qui gere le changement des css'
    ecran.hauteur = window.innerHeight;
    var Fs = Math.min(1, ecran.largeur / ecran.hauteur / 1.6) * ecran.hauteur / 50;
    if (ecran.largeur <= 1200 || ecran.hauteur <= 600) {
        ecran.large = false;
        Fs = 16;
    } else {
        ecran.large = true;
    }
    SetGui();
    //Recup waterfall
    var canvasWaterfall0 = document.getElementById("myWaterfall0");
    var ctxW0 = canvasWaterfall0.getContext("2d");
    var imgData0 = ctxW0.getImageData(0, 0, fenetres.waterW, fenetres.waterH);
    var P0 = $("#myWaterfall0").position();
    var canvasWaterfall1 = document.getElementById("myWaterfall1");
    var ctxW1 = canvasWaterfall1.getContext("2d");
    var imgData1 = ctxW0.getImageData(0, 0, fenetres.waterW, fenetres.waterH);
    var P1 = $("#myWaterfall1").position();
    $("body").css("font-size", Fs); //Main Font-Size
    $("#fen_oscillo input").css("height", Fs);
    $("#fen_RX_main input").css("height", Fs);
    $("#fen_TX_main input").css("height", Fs);
    $("#spectre").css("border-width", ecran.border);
    $("#echelle").css("border-width", ecran.border);
    $("#echelle_track").css("left", ecran.border);
    $("#echelle_Label").css("left", ecran.border);
    $("#waterfall").css("border-width", ecran.border);
    ecran.innerW = $("#spectre").innerWidth();
    fenetres.spectreW = $("#spectre").innerWidth();
    fenetres.spectreH = Math.floor($("#spectre").innerHeight());
    fenetres.waterW = FFT;
    fenetres.waterH = Math.floor($("#waterfall").innerHeight());
    var Canvas = '<canvas id="myEchSpectre"  width="' + fenetres.spectreW + '" height="' + fenetres.spectreH + '" ></canvas>';
    $("#EchSpectre").html(Canvas);
    var Canvas = '<canvas id="myWaterfall0" class="myWaterfall" width="' + fenetres.waterW + '" height="' + fenetres.waterH + '" ></canvas>';
    Canvas = Canvas + '<canvas id="myWaterfall1" class="myWaterfall" width="' + fenetres.waterW + '" height="' + fenetres.waterH + '" ></canvas>';
    $("#waterfall_in").html(Canvas);
    //Ecriture ancien Waterfall dans nouveau canvas
    canvasWaterfall0 = document.getElementById("myWaterfall0");
    ctxW0 = canvasWaterfall0.getContext("2d");
    ctxW0.putImageData(imgData0, 0, 0);
    $("#myWaterfall0").css("top", P0.top);
    canvasWaterfall1 = document.getElementById("myWaterfall1");
    ctxW1 = canvasWaterfall1.getContext("2d");
    ctxW1.putImageData(imgData1, 0, 0);
    $("#myWaterfall1").css("top", P1.top);
    $("#echelle").html('<canvas id="myEchelle" width="' + ecran.innerW + '" height="43" ></canvas>');
    Trace_Echelle();
    Affiche_Curseur();
    $("#Oscillo").html('<canvas id="myOscillo" width="' + $("#Oscillo").innerWidth() + '" height="' + $("#Oscillo").innerHeight() + '" ></canvas>');
    init_Audio_Plots();
    $("#zSpectre").html('<canvas id="zcSpectre" width="' + $("#zSpectre").innerWidth() + '" height="' + $("#zSpectre").innerHeight() + '" ></canvas>');
    visus_click_slider("paraSpectre", false);
    visus_click_slider("paraWater", false);
    resize_Smetre();
    Echelle_dB_Spectre();
    resize_CW();
    SetIframe(0);
}
function SetGui() { //Complete GUI (User Interface) 5 zones or simplified 3zones
    $("#head_gui").css("background-image", SDR_RX.gui_full ? "url(/css/Image/gui3.png)" : "url(/css/Image/gui5.png)");
    $("#fen_oscillo").css("display", SDR_RX.gui_full ? "block" : "none");
    $("#spectre").css("display", SDR_RX.gui_full ? "block" : "none");
    $("#visus_TX").css("display", SDR_RX.gui_full ? "block" : "none");
    $("#Scan").css("display", SDR_RX.gui_full ? "block" : "none");
    $("#echelle").css("top", SDR_RX.gui_full ? "40%" : "0%");
    $("#echelle_track").css("top", SDR_RX.gui_full ? "48%" : "8%");
    $("#echelle_Label").css("top", SDR_RX.gui_full ? "48%" : "8%");
    $("#curseur_w").css("top", SDR_RX.gui_full ? "40%" : "9%");
    if (SDR_RX.gui_full) {
        $("#fen_RX_main").css({
            "left": "30%",
            "width": "35%"
        });
        $("#fen_TX_main").css({
            "left": "65%",
            "width": "35%"
        });
        $("#waterfall").css({
            "top": "50%",
            "height": "50%"
        });
    } else {
        $("#fen_RX_main").css({
            "left": "0%",
            "width": "50%"
        });
        $("#fen_TX_main").css({
            "left": "50%",
            "width": "50%"
        });
        $("#waterfall").css({
            "top": "10%",
            "height": "90%"
        });
        audioRX.F_Audio_Top = 0;
    }
    if (!ecran.large) {
        $("#fen_RX_main").css({
            "left": "0%",
            "width": "100%"
        });
        $("#fen_TX_main").css({
            "left": "0%",
            "width": "100%"
        });
    }
    fenetres.waterH = Math.floor($("#waterfall").innerHeight());
    Connect_RX_Nodes();
}
function sel_disp_audio(id) {
    if (id.indexOf("Left") > 0) {
        visus.disp_audio_left = (visus.disp_audio_left + 1) % 3;
        init_Audio_Plot("Disp_Audio_Left", visus.disp_audio_left);
    } else {
        visus.disp_audio_right = (visus.disp_audio_right + 1) % 3;
        init_Audio_Plot("Disp_Audio_Right", visus.disp_audio_right);
    }
    Save_visus();
}
function init_Audio_Plots() {
    init_Audio_Plot("Disp_Audio_Left", visus.disp_audio_left);
    init_Audio_Plot("Disp_Audio_Right", visus.disp_audio_right);
}
function init_Audio_Plot(id, type) { //Frame for FFT or temporal plot (0=time,1=spectrum,2=waterfall)
    if (type < 2) {
        var s = '<canvas class="myWaterfall" id="my' + id + '" width="' + $("#" + id).innerWidth() + '" height="' + $("#" + id).innerHeight() + '" ></canvas>';
        var C = visus.spectre_backcol;
        var S = 'linear-gradient(' + Colors[C][2] + ',' + Colors[C][1] + ',' + Colors[C][3] + ')';
        $("#" + id).css("background-image", S);
    }
    if (type == 2) {
        var s = '<canvas class="myWaterfall" id="Wa0' + id + '" width="' + $("#" + id).innerWidth() + '" height="' + $("#" + id).innerHeight() + '" ></canvas>';
        s += '<canvas class="myWaterfall" id="Wa1' + id + '" width="' + $("#" + id).innerWidth() + '" height="' + $("#" + id).innerHeight() + '" ></canvas>';
        s += '<canvas class="myWaterfall" id="Label_' + id + '" width="' + $("#" + id).innerWidth() + '" height="' + $("#" + id).innerHeight() + '" ></canvas>';
        $("#" + id).css("background-color", "black");
        $("#" + id).css("background-image", "none");
    }
    if (type >= 1) {
        s += '<div class="Audio_RX_fftT">	RX Audio FFT</div>';
    }
    $("#" + id).html(s);
}
function resize_Smetre() {
    var Ws = $("#Smetre_fond").innerWidth();
    var Hs = Math.max($("#Smetre_fond").innerHeight(), Ws);
    var Wr = 0.8 * Ws;
    var Hr = Math.max(0.8 * Hs, Hs - $("#Smetre_fond").innerHeight() / 4); ;
    $("#Smetre_fond").html('<canvas id="EchSmetre"  width="' + Ws + '" height="' + Hs + '" ></canvas>');
    var ctx = document.getElementById("EchSmetre").getContext("2d");
    ctx.lineWidth = 5;
    ctx.beginPath();
    S_metre.teta = Math.asin(Wr / (1.8 * Hr));
    ctx.strokeStyle = "white";
    ctx.arc(Ws / 2, Hs, Hr, -Math.PI / 2 - S_metre.teta, -Math.PI / 2 + S_metre.teta / 5); //cercle
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = "orange";
    ctx.arc(Ws / 2, Hs, Hr, -Math.PI / 2 + S_metre.teta / 5, -Math.PI / 2 + S_metre.teta); //cercle
    ctx.stroke();
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.font = "8px Arial";
    ctx.strokeStyle = "white";
    var Slabel = "";
    for (var level = 0; level <= 50; level = level + 10) { //Step 10db
        var t = level * 2 * S_metre.teta / 50 - S_metre.teta;
        var X1 = Ws / 2 + Hr * Math.sin(t);
        var Y1 = Hs - Hr * Math.cos(t);
        var X2 = Ws / 2 + (Hr + 10) * Math.sin(t);
        var Y2 = Hs - (Hr + 10) * Math.cos(t);
        ctx.moveTo(X1, Y1);
        ctx.lineTo(X2, Y2);
        Slabel += '<div style="top:' + Y2 + 'px;left:' + X2 + 'px;transform:rotate(' + t + 'rad);">' + level + " dB" + '</div>';
    }
    ctx.stroke();
    $("#Smetre_label").html(Slabel);
    $("#SM_fleche").css("height", 2 * Hr + "px");
    $("#SM_fleche").css("top", (Hs - Hr) + "px");
}
function Init_Sliders() {
    console.log("Init Sliders")
    $(function () {
        $("#slider_BW_RX").slider({
            value: Rx.idxBW,
            min: 2,
            max: SDR_RX.BWmax,
            step: 1, //Step of 100kHz bandwidth
            slide: function (event, ui) {
                Rx.idxBW = ui.value;
                Bandwidth();
                Recal_Freq_centrale();
                Save_RX_Para();
            }
        });
    });
    $(function () {
        $("#slider_Frequence_centrale_RX").slider({
            value: Rx.Fcentral,
            min: SDR_RX.BandeRXmin,
            max: SDR_RX.BandeRXmax,
            step: 10000,
            slide: function (event, ui) {
                var old_frequence_centrale_RX = Rx.Fcentral;
                Rx.Fcentral = ui.value;
                RX.Ffine = RX.Ffine - Rx.Fcentral + old_frequence_centrale_RX; //On essaye conserver
                var deltaF = (SDR_RX.bande) / 2.1;
                RX.Ffine = Math.max(RX.Ffine, -deltaF);
                RX.Ffine = Math.min(RX.Ffine, deltaF);
                GPredictRXcount = -6;
                choix_freq_fine();
                choix_freq_central();
                Affiche_Curseur();
                Save_RX_Para();
            }
        });
    });
    $(function () {
        $("#slider_Spectre_haut").slider({
            min: 0.00005,
            max: 0.0007,
            step: 0.00001,
            value: visus.spectre_haut,
            slide: function (event, ui) {
                visus.spectre_haut = ui.value;
                Save_visus();
                Echelle_dB_Spectre();
            }
        });
    });
    $(function () {
        $("#slider_Spectre_bas").slider({
            min: -1000,
            max: 1000,
            step: 10,
            value: visus.spectre_bas,
            slide: function (event, ui) {
                visus.spectre_bas = ui.value;
                Save_visus();
                Echelle_dB_Spectre();
            }
        });
    });
    $(function () {
        $("#slider_Water_haut").slider({
            min: 0.00005,
            max: 0.0007,
            step: 0.00001,
            value: visus.water_haut,
            slide: function (event, ui) {
                visus.water_haut = ui.value;
                Save_visus();
            }
        });
    });
    $(function () {
        $("#slider_Water_bas").slider({
            min: -2000,
            max: 1000,
            step: 10,
            value: visus.water_bas,
            slide: function (event, ui) {
                visus.water_bas = ui.value;
                Save_visus();
            }
        });
    });
    Rx.G1 = Math.max(RXsdr[SDR_RX.idxSdr].G1[1], Math.min(RXsdr[SDR_RX.idxSdr].G1[2], Rx.G1));
    $(function () {

        $("#slider_G1_RX").slider({
            min: RXsdr[SDR_RX.idxSdr].G1[1],
            max: RXsdr[SDR_RX.idxSdr].G1[2],
            step: RXsdr[SDR_RX.idxSdr].G1[3],
            value: Rx.G1,
            slide: function (event, ui) {
                Rx.G1 = ui.value;
                $("#G1RX").html(Rx.G1);
                RXdata.T_Rx = 0; //Accelerate transmission to SDR
            }
        });

    });
    $("#G1NRX").html(RXsdr[SDR_RX.idxSdr].G1[0]);
    $("#G1RX").html(Rx.G1);
    Rx.G2 = Math.max(RXsdr[SDR_RX.idxSdr].G2[1], Math.min(RXsdr[SDR_RX.idxSdr].G2[2], Rx.G2));
    $(function () {
        $("#slider_G2_RX").slider({
            min: RXsdr[SDR_RX.idxSdr].G2[1],
            max: RXsdr[SDR_RX.idxSdr].G2[2],
            step: RXsdr[SDR_RX.idxSdr].G2[3],
            value: Rx.G2,
            slide: function (event, ui) {
                Rx.G2 = ui.value;
                $("#G2RX").html(Rx.G2);
                RXdata.T_Rx = 0;
            }
        });

    });
    $("#G2NRX").html(RXsdr[SDR_RX.idxSdr].G2[0]);
    $("#G2RX").html(Rx.G2);
    Rx.G3 = Math.max(RXsdr[SDR_RX.idxSdr].G3[1], Math.min(RXsdr[SDR_RX.idxSdr].G3[2], Rx.G3));
    $(function () {
        $("#slider_G3_RX").slider({
            min: RXsdr[SDR_RX.idxSdr].G3[1],
            max: RXsdr[SDR_RX.idxSdr].G3[2],
            step: RXsdr[SDR_RX.idxSdr].G3[3],
            value: Rx.G3,
            slide: function (event, ui) {
                Rx.G3 = ui.value;
                $("#G3RX").html(Rx.G3);
                RXdata.T_Rx = 0;
            }
        });

    });
    $("#G3NRX").html(RXsdr[SDR_RX.idxSdr].G3[0]);
    $("#G3RX").html(Rx.G3);
    if (RXsdr[SDR_RX.idxSdr].G3[0] == "")
        $("#FGrx3").css("display", "none");
    $(function () {
        $("#slider_squelch").slider({
            min: -90,
            max: 0,
            value: Rx.Squelch,
            slide: function (event, ui) {
                Rx.Squelch = ui.value;
                RXdata.T_Rx = 0; //Accelerate transmission to SDR
                click_squelch();
            }
        });
    });
}
//Animations windows sliders
//***************************
function visus_click_slider(t, anim) {
    var x = $("#" + t).position();
    var w = $("#" + t).parent().width();
    var h = $("#" + t).parent().height();
    if (x.left < w / 2 + 10 || !anim) { // Bloc Rentre
        setTimeout(function () {
            fenetres.para_visus_visible = false;
        }, 200);
        if (anim) {
            $("#" + t).animate({
                left: w - 30,
                top: h - 30
            });
        } else {
            $("#" + t).css("top", h - 30);
            $("#" + t).css("left", w - 30);
        }
        $("#" + t + "_fleche").html("&#x1F87C");
    } else { //Bloc sort
        fenetres.para_visus_visible = true;
        $("#" + t).animate({
            left: w / 3,
            top: h / 5
        });
        $("#" + t + "_fleche").html("&#x1F886");
    }
}
// **********************
// * Socket and Initialisation SDR *
// **********************
function RXsocketConnected() {
    if (RXsocket.connected) {
        console.log(Date.now() - T0_remsdr, "RXsocket.io connected");
        UserF.CallConnectRX(); //Call for a user account
        ConfRX_F.read(Init_Page_SDR2); //Load RX and TX configuration parameters
    } else {
        console.log(Date.now() - T0_remsdr, "RXsocket.io NOT connected");
    }

}
function RXsocketDisConnected() {
    console.log(Date.now() - T0_remsdr, "RXsocket.io DISconnected");
    RXsocket.connect();
}
function TXsocketConnected() {
    if (TXsocket.connected) {

        console.log(Date.now() - T0_remsdr, "TXsocket.io connected");
        UserF.CallConnectTX(); //Call to obtain type of SDR
    }
}
function TXsocketDisConnected() {
    TXsocket.connect();
}
// **********************
// * Initialisation SDR *
// **********************

function Init_Page_SDR() {
    console.log(Date.now() - T0_remsdr, "Init_Page_SDR()");
    var V = "Remote SDR V" + Version + "<br><a href='https://f1atb.fr' target='_blank'>F1ATB</a> ";
    $("#f1atb").html(V);
    $("#MyPseudo").html(User.pseudo);
    //Wait for Init Socket end
}
function Init_Page_SDR2() {
    console.log(Date.now() - T0_remsdr, "RX configuration received");
    ConfTX_F.read(Init_Page_SDR3)
}
function Init_Page_SDR3() {
    console.log(Date.now() - T0_remsdr, "TX configuration received");

    //RX Bandes
    var S = '<div><label for="bandSelectRX">HF band:</label>';
    S += '<select name="bandSelectRX" id="bandSelectRX" onchange="newBandRX(this.value);">';
    for (var i = 0; i < ConfRX.Bandes.length; i++) {
        S += '<option value=' + i + '>' + ConfRX.Bandes[i][2] + '</option>';
        RX_Xtal_Errors[i] = 0;
    }
    S += '</select></div>';
    S += '<div><label for="digiSelectRX">Digital:</label>';
    S += '<select name="digiSelectRX" id="digiSelectRX" onchange="newDigiRX(this.value);">';
    for (var i = 0; i < modeDigi.length; i++) {
        S += '<option value=' + modeDigi[i] + '>' + modeDigi[i] + '</option>';
    }
    S += '</select></div>';
    $("#BandeRX").html(S);

    //Colors
    S = "";
    var B = "";
    var W = "";
    for (let i = 0; i < Colors.length; i++) {
        S += '<input  name="Spectre_color" value="' + i + '" onclick="SpectreColour(this.value);" type="radio">';
        B += '<input  name="Spectre_colBack" value="' + i + '" onclick="SpectreBackColour(this.value);" type="radio">';
        W += '<input  name="Water_co" value="' + i + '" onclick="WaterColor(this.value);" type="radio">';
    }
    $("#Spectre_Line").html(S);
    $("#Spectre_Back").html(B);
    $("#Water_Color").html(W);
    window_resize();
    //Local Storage
    if (localStorage.getItem("Local_Storage_") != null) { // We have an old storage
        var VersionOldStorage = JSON.parse(localStorage.getItem("Local_Storage_"));
        if (Version_Local_Storage == VersionOldStorage)
            Local_Storage = true;
        console.log(Date.now() - T0_remsdr, "Valide Local_Storage ", Local_Storage);
    }
    Recall_RX_Para();
    Recall_RX_Audio();
    Recall_SDR_Para();
    Recall_visus();
    Recall_ParaCW();
    choixBandeRX();

    Init_Sliders();
    Init_Sliders_RX_Audio();
    Init_champs_freq("FRX", "#Frequence_AudioRX");
    Init_champs_freq("OFS", "#offset");
    Init_champs_freq("DOF", "#Xtal_Error");
    Init_champs_freq("SFr", "#SDR_Freq");
    Init_champs_freq("ZFr", "#zoom_freq_in");
    //MouseWheel
    $('#visus').on('mousewheel', function (event) {
        Mouse_Freq(event)
    });
    for (var i = 1; i < 13; i++) {
        $('#FRX' + i).on('mousewheel', function (event) {
            Mouse_Freq_audioRX(event)
        });
        $('#FRX' + i).on('click', function (event) {
            OpenZoomFreq(event)
        });
        $('#DOF' + i).on('mousewheel', function (event) {
            Mouse_deltaOffset(event)
        });
        $('#DOF' + i).on('click', function (event) {
            OpenZoomFreq(event)
        });
        $('#ZFr' + i).on('mousewheel', function (event) {
            Mouse_Zoom_Freq(event)
        });
        $('#ZFr' + i).on('touchmove', function (event) {
            Touch_Zoom_Freq(event)
        });
        $('#ZFr' + i).on('touchstart', function (event) {
            StartTouch_Zoom_Freq(event)
        });
    }
    $('#zoom_freq').on('mousewheel', function (event) {
        event.stopPropagation()
    });
    $('#zoom_freq').on('touchmove', function (event) {
        event.stopPropagation()
    });
    Affich_freq_champs(0, "#ZFr");
    $('body').on('keydown', function (event) {
        Keyboard_Freq(event)
    });
    //Curseur Frequence Audio RX et Scan
    dragCurseur();
    dragScanZone();
    // Liste Frequences clé
    for (var i = 0; i < ConfRX.Label.length; i++) {
        Liste_F.push([ConfRX.Label[i][0], ConfRX.Label[i][1], false]);
    }
    Affiche_ListeF();
    Set_RX_GPIO();
    Save_SDR_Para();
    Save_visus();
    Save_RX_Audio();
    WaterColor(visus.water_col);
    SpectreBackColour(visus.spectre_backcol);
    window_resize();
    Plot_the_Spectra();
    //Next Inits
    Init_Page_RX();
    Init_Page_TX();
    Init_Page_Keys();
}
function Init_champs_freq(id, idParent) {
    //DIV Afficheurs Frequence
    var s = "";
    for (var i = 0; i < 13; i++) {
        s = "<div id='" + id + i + "'></div>" + s;
    }
    $(idParent).html(s);
    $("#" + id + "0").html("Hz");
}
function choixBandeRX() { //Suivant freq centrale RX defini les limites

    for (var i = 0; i < ConfRX.Bandes.length; i++) {
        if (ConfRX.Bandes[i][0] <= Rx.Fcentral && ConfRX.Bandes[i][1] >= Rx.Fcentral) {
            SDR_RX.bandeRX = i;
            SDR_RX.BandeRXmin = ConfRX.Bandes[i][0];
            SDR_RX.BandeRXmax = ConfRX.Bandes[i][1];
            SDR_RX.WindowSearch = ConfRX.Bandes[i][4] - ConfRX.Bandes[i][3];
            RX.Xtal_Error = RX_Xtal_Errors[i];
            if (RX.Xtal_Error < ConfRX.Bandes[i][3] || RX.Xtal_Error > ConfRX.Bandes[i][4])
                RX.Xtal_Error = Math.floor((ConfRX.Bandes[i][3] + ConfRX.Bandes[i][4]) / 2);
        }
    }
    $("#bandSelectRX option[value='" + SDR_RX.bandeRX + "']").prop('selected', true);
    ListRelay();
}
function newBandRX(t) {
    Rx.Fcentral = Math.floor((ConfRX.Bandes[t][0] + ConfRX.Bandes[t][1]) / 2);
    RX.Ffine = Math.min(ConfRX.Bandes[t][1] - Rx.Fcentral, RX.Ffine);
    RX.Ffine = Math.max(ConfRX.Bandes[t][0] - Rx.Fcentral, RX.Ffine);
    choixBandeRX();
    $("#slider_Frequence_centrale_RX").slider("option", "min", SDR_RX.BandeRXmin);
    $("#slider_Frequence_centrale_RX").slider("option", "max", SDR_RX.BandeRXmax);
    $("#slider_Frequence_centrale_RX").slider("option", "value", Rx.Fcentral);
    choix_freq_central();
    GPredictRXcount = -6;
    choix_freq_fine();
    Affiche_Curseur();
    Affiche_ListeF();
    if (SDR_TX.TXeqRX)
        rxvtx();
}
// FREQUENCY Cursor
//*****************
function Mouse_Freq(ev) {
    GPredictRXcount = -6; //To freeze doppler correction few seconds
    var step = RX_modes[Rx.IdxModul][2];
    RX.Ffine = RX.Ffine + step * ev.deltaY;
    choix_freq_fine();
    Affiche_Curseur();
}
function Mouse_Freq_audioRX(ev) { //modif des digits
    var p = parseInt(ev.target.id.substr(3)) - 1;
    var deltaF = ev.deltaY * Math.pow(10, p);
    var step = RX_modes[Rx.IdxModul][2];
    if (step >= 2500)
        deltaF = Math.sign(deltaF) * Math.max(step, Math.abs(deltaF)); // Minimum One step for NBFM or WBFM
    Recal_fine_centrale(deltaF);
}
function Keyboard_Freq(ev) {
    var actif = document.activeElement.tagName;
    if (actif != "INPUT" && actif != "SPAN") { //To reject input fiels and sliders
        GPredictRXcount = -6;
        var step = RX_modes[Rx.IdxModul][2];
        if (ev.keyCode == 37)
            step = -step;
        if (ev.keyCode != 39 && ev.keyCode != 37)
            step = 0;
        Recal_fine_centrale(step);
    }
}
function Recal_fine_centrale(deltaF) {
    var newFreq = SDR_RX.Audio_RX + deltaF;
    GPredictRXcount = -6;
    if (newFreq > SDR_RX.min + 10000 && newFreq < SDR_RX.max - 10000) { // On bouge la frequence fine
        RX.Ffine = RX.Ffine + deltaF;
        choix_freq_fine();
    } else { //gros saut en frequence
        Rx.Fcentral = newFreq;
        choix_freq_central();
    }
    Affiche_Curseur();
}
function Recal_Freq_centrale() {
    SDR_RX.min = parseInt(Rx.Fcentral) - 60000 * Rx.idxBW; //Total BW=Useful BW*1.2
    SDR_RX.max = parseInt(Rx.Fcentral) + 60000 * Rx.idxBW;
    SDR_RX.bande = SDR_RX.max - SDR_RX.min; // Bande exacte à l'ecran
    if (SDR_RX.Audio_RX < SDR_RX.min + 10000 || SDR_RX.Audio_RX > SDR_RX.max - 10000) { //  frequence audio en dehors
        RX.Ffine = 0;
        Rx.Fcentral = SDR_RX.Audio_RX;
    }
    choix_freq_central();
    GPredictRXcount = -6;
    choix_freq_fine();
    Affiche_Curseur();
}
function OpenZoomFreq(ev) {
    ZoomFreq.id = ev.target.id.substr(0, 3);
    var T = ZoomFreq.id;
    var F = 0;
    if (ZoomFreq.id == "FRX") {
        F = SDR_RX.Audio_RX;
        var T = "RX Audio";
    }
    if (ZoomFreq.id == "DOF") {
        F = RX.Xtal_Error;
        var T = "Manual Correction";
    }
    if (ZoomFreq.id == "FRT") { //Frequency TX
        F = SDR_TX.Freq;
        var T = "TX Frequency";
    }
    if (ZoomFreq.id == "OFT") { //Offset TX
        F = SDR_TX.Xtal_Error;
        var T = "TX Manual Correct.";
    }
    Affich_freq_champs(F, "#ZFr");
    $("#zoom_freq_title").html(T);
    $('#zoom_freq').css('display', 'block');
    $("body").css("height", "100%"); //To freeze the scroll
    $("body").css("overflow", "hidden");
}
function CloseZoomFreq() {
    $('#zoom_freq').css('display', 'none');
    $("body").css("height", "auto");
    $("body").css("overflow", "visible");
    ZoomFreq.id = "";
    ZoomFreq.col = 0;
}
function Mouse_Zoom_Freq(ev) { //modif des digits du zoom
    var F = 0;
    ev.stopPropagation();
    if (ZoomFreq.id == "FRX") {
        Mouse_Freq_audioRX(ev);
        F = SDR_RX.Audio_RX;
    }
    if (ZoomFreq.id == "DOF") {
        Mouse_deltaOffset(ev);
        F = RX.Xtal_Error;
    }
    if (ZoomFreq.id == "FRT") {
        Mouse_Freq_TX(ev);
        F = SDR_TX.Freq;
        if (SDR_TX.TXeqRX)
            txvrx();
    }
    if (ZoomFreq.id == "OFT") {
        Mouse_deltaOffsetTX(ev);
        F = SDR_TX.Xtal_Error;
    }
    Affich_freq_champs(F, "#ZFr");
}
function StartTouch_Zoom_Freq(ev) {
    if (ev.touches.length == 1) {
        ev.preventDefault();
        ZoomFreq.pos = ev.touches[0].clientY;
    }
}
function Touch_Zoom_Freq(ev) { //modif des digits
    ZoomFreq.col = parseInt(ev.target.id.substr(3)) - 1;
    var F = 0;
    ev.stopPropagation();
    if (ev.touches.length == 1) {
        ev.preventDefault();
        var pos = ev.touches[0].clientY;
        var deltaFreq = Math.pow(10, ZoomFreq.col) * Math.sign(ZoomFreq.pos - pos);
        ZoomFreq.pos = pos;
        if (ZoomFreq.id == "FRX") {
            Recal_fine_centrale(deltaFreq);
            F = SDR_RX.Audio_RX;
        }
        if (ZoomFreq.id == "DOF") {
            Recal_deltaOffset(deltaFreq);
            F = RX.Xtal_Error;
        }
        if (ZoomFreq.id == "FRT") {
            Recal_FTX(deltaFreq);
            F = SDR_TX.Freq;
        }
        if (ZoomFreq.id == "OFT") {
            Recal_OFT(deltaFreq);
            F = SDR_TX.Offset;
        }
        Affich_freq_champs(F, "#ZFr");
    }
}
function Mouse_deltaOffset(ev) { //modif des digits
    ZoomFreq.col = parseInt(ev.target.id.substr(3)) - 1;
    var deltaF = ev.deltaY * Math.pow(10, ZoomFreq.col);
    Recal_deltaOffset(deltaF);
}
function Recal_deltaOffset(deltaF) {
    RX.Xtal_Error = Math.floor(RX.Xtal_Error + deltaF);
    RX_Xtal_Errors[SDR_RX.bandeRX] = RX.Xtal_Error;
    choix_freq_central();
    Affiche_Curseur();
}
function dragCurseur() {
    var idCurseur = document.getElementById("curseur");
    var pos1 = 0,
    pos3 = 0,
    posDiv = 0;
    idCurseur.onmousedown = dragMouseDown;
    idCurseur.addEventListener('touchmove', onTouchMove, false);
    idCurseur.addEventListener('touchstart', onTouchStart, false);
    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        idCurseur.style.left = (pos3 - 10) + "px";
        posDiv = parseFloat(idCurseur.style.left);
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }
    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos3 = e.clientX;
        posDiv = posDiv - pos1;
        idCurseur.style.left = posDiv + "px";
        var new_pos = posDiv + 10 - ecran.border;
        RX.Ffine = Math.floor(SDR_RX.min + (SDR_RX.bande) * new_pos / ecran.innerW - Rx.Fcentral);
        GPredictRXcount = -6;
        choix_freq_fine();
    }
    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
    function onTouchStart(ev) {
        if (ev.touches.length == 1) {
            ev.preventDefault();
            pos3 = ev.touches[0].clientX;
            posDiv = parseFloat(idCurseur.style.left);
        }
    }
    function onTouchMove(ev) {
        if (ev.touches.length == 1) {
            ev.preventDefault();
            pos1 = pos3 - ev.touches[0].clientX;
            pos3 = ev.touches[0].clientX;
            posDiv = posDiv - pos1;
            idCurseur.style.left = posDiv + "px";
            var new_pos = posDiv + 10 - ecran.border;
            RX.Ffine = Math.floor(SDR_RX.min + (SDR_RX.bande) * new_pos / ecran.innerW - Rx.Fcentral);
            GPredictRXcount = -6;
            choix_freq_fine();
        }
    }
}
function clickFreq(e) {
    e = e || window.event;
    if (!fenetres.para_visus_visible) {
        e.preventDefault();
        // calculate the new cursor position:
        var new_pos = e.clientX - ecran.border;
        RX.Ffine = Math.floor(SDR_RX.min + (SDR_RX.bande) * new_pos / ecran.innerW - Rx.Fcentral);
        GPredictRXcount = -6;
        choix_freq_fine();
        Affiche_Curseur();
    }
}
function dragScanZone() {
    var idCurseur = document.getElementById("Scan_Zone");
    var pos1 = 0,
    pos3 = 0,
    posDiv = 0;
    idCurseur.addEventListener('touchmove', SZonTouchMove, false);
    idCurseur.addEventListener('touchstart', SZonTouchStart, false);
    function SZonTouchStart(ev) {
        if (ev.touches.length == 1) {
            ev.preventDefault();
            pos3 = ev.touches[0].clientY;
            posDiv = parseFloat(idCurseur.style.top);
        }
    }
    function SZonTouchMove(ev) {
        if (ev.touches.length == 1) {
            ev.preventDefault();
            pos1 = pos3 - ev.touches[0].clientY;
            pos3 = ev.touches[0].clientY;
            posDiv = posDiv - pos1;
            idCurseur.style.top = posDiv + "px";
            RX_Scan.level = 100 * posDiv / fenetres.spectreH;
            RX_Scan.level = Math.max(0, RX_Scan.level);
            if (RX_Scan.level > 90) {
                RX_Scan.areas.splice(0, RX_Scan.areas.length); // Clear all zones
                RX_Scan.level = 50;
            }
            RX_Scan.level = Math.floor(Math.min(90, RX_Scan.level));
        }
    }
}
function clearRX(step) { //Set frequenci to the closest kHz
    if (step == 5) {
        SDR_RX.Audio_RX = 5000 * Math.floor(SDR_RX.Audio_RX / 5000 + 0.5);
    } else {
        SDR_RX.Audio_RX = 10000 * Math.floor(SDR_RX.Audio_RX / 10000 + 0.5);
    }
    RX.Ffine = SDR_RX.Audio_RX - Rx.Fcentral;
    GPredictRXcount = -6;
    choix_freq_fine();
    Affiche_Curseur();
}
function clickF(i) { //Liste frequences en mémoire
    var deltaF = Liste_F[i][0] - SDR_RX.Audio_RX
        Recal_fine_centrale(deltaF)
}
function Flabel(f, e) {
    e = e || window.event;
    e.stopPropagation();
    SDR_RX.Audio_RX = f;
    RX.Ffine = SDR_RX.Audio_RX - Rx.Fcentral;
    GPredictRXcount = -6;
    choix_freq_fine();
    Affiche_Curseur();
}
//Digital Modes
function newDigiRX(v) {
    if (v == "RTTY") {
        RTTY.win = window.open("/digi_modes/rtty/rtty.html", "_blank", "location=no,toolbar=no,titlebar=no,status=no,scrollbars=yes,resizable=yes,top=50,left=50,width=900,height=750");
        RTTY.on = true;
    }
}

// Drawing
//**********
function Plot_Table(canvas_ID, tableau, SR, Fmax, couleur, Coef_Ampli, Trace_Axe, MaxF) { // waves plot in a small canvas
    var Ftop = 0;
    if (SDR_RX.gui_full) {
        var canvas = document.getElementById(canvas_ID);
        var ctx = canvas.getContext("2d");
        var Largeur = canvas.width;
        var Hauteur = canvas.height;
        ctx.clearRect(0, 0, Largeur, Hauteur);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'white';
        ctx.fillStyle = 'white';
        ctx.beginPath();
        var longT = tableau.length;
        if (Fmax > 0) { // C'est une FFT. On limite l'axe des F
            longT = Math.floor(longT * 2 * Fmax / SR);
            if (Trace_Axe) {
                var FMX = Fmax / 1000;
                for (var f = 0; f < FMX; f++) {
                    var x = Largeur * f / FMX;
                    ctx.moveTo(x, Hauteur);
                    ctx.lineTo(x, 0.95 * Hauteur);
                    ctx.fillText(f + "kHz", x, 0.95 * Hauteur);
                }
            }
        } else { //time domain
            longT = Math.floor(longT / 10); //moitie du tableau pour dilater axe dex x
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.strokeStyle = couleur;
        ctx.fillStyle = couleur;
        var sliceWidth = Largeur / longT;
        var x = 0;
        var Vtop = -1000;
        var Itop = 0;
        for (var i = 0; i < longT; i++) {
            var v = (tableau[i] - 128) / (128 * Coef_Ampli);
            var y = -1 + Hauteur / 2 * (1 - v);
            if (v > Vtop) { //Recherche du max
                Vtop = v;
                Itop = i;
            }
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.font = "12px Arial";
        if (Fmax > 0 && MaxF) { // C'est une FFT. On affiche le max
            var I = Itop;
            if (Itop > 1 && Itop < longT - 2) { //Recherche X par interpollation
                I = Itop + (tableau[Itop + 1] - tableau[Itop - 1]) / (1 + tableau[Itop]) * 0.5;
            }
            Ftop = Math.floor(I * Fmax / longT);
            ctx.fillText(Ftop + "Hz", 0.05 * Largeur, 0.25 * Hauteur);
        }
        ctx.stroke();
    }
    return Ftop;
};
//
//Iframe for External pages or Frequencies memory
function SetIframe(I) {
    if (ConfRX.Iframes.length > 0) {
        var s = '<div id="ong0" class="onglet_If coral"  onclick= "SetIframe(0);">Memories</div>';
        for (var i = 0; i < ConfRX.Iframes.length; i++) {
            var j = i + 1;
            s += '<div id ="ong' + j + '" class="onglet_If coral" onclick= "SetIframe(' + j + ');" >' + ConfRX.Iframes[i][1] + '</div>'
        }
        $("#menu_Iframe").html(s);
        $("#menu_Iframe").css("height", "19px");
        $("#In_Iframe").css("top", "17px");
        j = 1 + ConfRX.Iframes.length;
        $(".onglet_If").css("width", 90 / j + "%")
    } else {
        $("#menu_Iframe").css("height", "0px");
        $("#In_Iframe").css("top", "0px");
    }
    $("#ong" + I).css("border-bottom", "2px solid black");
    if (I == 0) {
        $("#BandPlan").css("display", "block");
        $("#Iframe").css("display", "none");
    } else {
        var s = '<iframe style="width:100%;height:100%;" src="' + ConfRX.Iframes[I - 1][0] + '" frameBorder="0"></iframe>';
        $("#Iframe").html(s);
        $("#BandPlan").css("display", "none");
        $("#Iframe").css("display", "block");
    }
}
//
// Log
function Add_To_Log(M) {
    var S = $("#in_fen_log").html();
    var S = S + "<br>" + M;
    $("#in_fen_log").html(S);
}
//BroadcastChannels to RTTY or other web pages
const Bcast = {
    AudioData: new BroadcastChannel('AudioData'),
    RTTY_RXdata: new BroadcastChannel('RTTY_RXdata'),
    sendRXData: function () {
        if (RTTY.on) {
            var message = {
                mode: RX_modes[Rx.IdxModul][0],
                Faudio: SDR_RX.Audio_RX,
                Fduplex: SDR_TX.Fduplex
            };
            message = JSON.stringify(message);
            Bcast.RTTY_RXdata.postMessage(message);
        }
    },
    RTTY_TXdata: new BroadcastChannel('RTTY_TXdata'),
    sendTXData: function () {
        if (RTTY.TXon) {
            var message = {
                NbCar: RTTY.NbCar
            };
            message = JSON.stringify(message);
            Bcast.RTTY_TXdata.postMessage(message);
        }
    }
}
Bcast.RTTY_TXdata.addEventListener('message', (event) => {
    var TX_Data = JSON.parse(event.data);
    if (TX_Data.TXOn != null) {
        RTTY.TXon = TX_Data.TXOn;
        RTTY.PHImark = TX_Data.PHImark;
        RTTY.PHIspace = TX_Data.PHIspace;
        RTTY.NbsampleBit = TX_Data.NbsampleBit;
        RTTY.NbCar = 0;
        if (audioTXnode.process_out) {
            Transmit_On_Off(RTTY.TXon);
            RTTYpara_To_Audioprocessor();
        }
    }
    if (TX_Data.TXcar != null && audioTXnode.process_out && RTTY.TXon) {
        audioTXnode.process_out.port.postMessage({
            RTTY_TXcar: TX_Data.TXcar
        });
    }
});
console.log("End loading remote_SDR.js");
