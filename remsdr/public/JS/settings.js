// ****************
// * REMOTE SDR   *
// *    F1ATB     *
// ****************
const SDR_RX = {
    SDRrx: "",
    idxSdr: 0
}
const SDR_TX = {
    SDRtx: "",
    idxSdr: 0
}
//RESIZE
//**********
function window_resize() {
    var W = window.innerWidth; // parametre qui gere le changement des css'
    var Fs = Math.min(Math.max(10, W / 100), 16);
    $("body").css("font-size", Fs); //Main Font-Size
};
function Init_Page_Settings() {
    window_resize();
}
function RXsocketConnected() {
    if (RXsocket.connected) {
        $("#protRX").html(ProcIP.Protocol);
        $("#protTX").html(ProcIP.Protocol);
        $("#IP_RX").html(ProcIP.RX);
        $("#IP_TX").val(ProcIP.TX);
        $("[name='SDRrx']").attr("disabled", true);
        $("[name='SDRtx']").attr("disabled", true);
        if (ProcIP.RX.length > 3)
            Info_CPU(ProcIP.Protocol, ProcIP.RX, "cpuRX", "sdrsRX", "R");
        ConfRX_F.read(Plot.RX);
        if (ProcIP.SameIP)
            ConfTX_F.read(Plot.TX);
        UserF.CallConnectRX();
        if (ProcIP.SameIP)
            Info_CPU(ProcIP.Protocol, ProcIP.TX, "cpuTX", "sdrsTX", "T");
    }
}
function RXsocketDisConnected() {
    RXsocket.connect();
}
function TXsocketConnected() {
    if (TXsocket.connected) {
        Info_CPU(ProcIP.Protocol, ProcIP.TX, "cpuTX", "sdrsTX", "T");
        ConfTX_F.read(Plot.TX);
        UserF.CallConnectTX();
    }
}
function TXsocketDisConnected() {
    TXsocket.connect();
}
const Plot = {
    RX: function () {
        var S = '';
        var Comment = "Frequencies in Hz<br>";
        Comment += "In case of any error on the frequency reference (Xtal), set a frequency window for the compensation";
        S += Plot.table("Frequency Bands", Comment, ["F min", "F max", "Name", "Error min", "Error max"], "FGTXY", ConfRX.Bandes, "RXBand");
        Comment = "<p class='left'>Band limits Fmin and Fmax in which an offset is applicable ";
        Comment += "<br>Freq._to_SDR = Math.abs(Freq.RX + Offset) .<br>";
        Comment += "Negative value for (Freq.RX + Offset) is allowed. It addresses down/up converters which invert the spectrum.</p>";
        S += Plot.table("Band Frequency Offsets", Comment, ["F min", "F max", "Offset"], "FGI", ConfRX.FixedOffset, "RXOffset");
        S += Plot.table("Labels", "", ["Frequency", "Label"], "IT", ConfRX.Label, "RXLabel");
        S += Plot.table("Sub-Bands Colour", "Colours are defines as in HTML/CSS", ["F min", "F max", "Colour"], "FGT", ConfRX.Zone, "RXZone");
        S += Plot.table("Beacon Frequencies", "Beacons used to compensate Frequency drift", ["Frequency", "Title"], "IT", ConfRX.BeaconSync, "RXBeac");
        var Comment = "<p class='left'>GPIO of the Orange PI or RPI4 in charge of the receiver<br>";
        Comment += "Set to switch any device while RX or while TX, according to SDR RX frequency<br>";
        Comment += "----------------------------------------------------------------------------<br>";
        Comment += "NumGPIO		Pin Opi One Plus	Pin Opi Zero2<br>";
        Comment += "69					24					13<br>";
        Comment += "71					18					22<br>";
        Comment += "72					16					15<br>";
        Comment += "73					12					7    Reserved for FAN control when the CPU overheats . 1 = overheat (65°C)<br>";
        Comment += "74										26   Reserved for Transmit security Oscillator on Opi Zero 2<br>";
        Comment += "227					26					10   Reserved for Transmit security Oscillator on Opi One Plus<br>";
        Comment += "228					7					5<br>";
        Comment += "229					5					3<br>";
        Comment += "230					3					23<br>";
        Comment += "Other NumGPIO available but not common to One Plus and Zero2. See documentation<br>";
        Comment += "<br>Raspberry 4B<br>";
        Comment += " NumGPIO 4 or pin 7 reserved fo Fan control. 1 = overheat (65°C)<br>";
        Comment += " NumGPIO 7 or pin 26 reserved for Transmit security Oscillator<br>";
        Comment += "<br>Fmin,Fmax in Hz, Output  state 0 or 1. , While RX true or false, While TX true or false<br>";
        Comment += "Ex : 1000000,150000000,71,0,true,false<br>";
        Comment += "Ex : 1000000,150000000,71,1,false,true<br>";
        Comment += "Ex : 0,150000000,230,0,true,false<br>";
        Comment += "Ex : 0,150000000,230,1,false,true<br>";
        Comment += "Ex : 150000000,500000000,230,1,true,true<br>";
        Comment += "<br>For a Raspberry 4B, type in a terminal 'pinout' to have the correspondance GPIO number and pin number.<br>";
        Comment += "1000000,150000000,21,0,true,false<br>";
        Comment += "1000000,150000000,21,1,false,true</p>";
        S += Plot.table("GPIO pins", Comment, ["F min", "F max", "NumGPIO", "State <small>(0 or 1)</small>", "While RX<small>(true or false)</small>", "While TX<small>(true or false)</small>"], "FGIBSS", ConfRX.GPIO, "RXGPIO");
        var Comment = "<p class='left'>External web pages displayed in an iframe<br>";
        Comment += "Ex : '/iframes/gs232/html/rotator.html', GS 232 Rotator for GS 232 Rotator control<br>";
        Comment += "Ex :'/iframes/HFpropag/index.html', HF Propagation <br>";
        Comment += "Ex :'http://.....', A web page address </p>";
        S += Plot.table("Included External Pages", Comment, ["Page address", "Title"], "TT", ConfRX.Iframes, "RXIfr");
        $("#zone_RX_para").html(S);
    },
    TX: function () {
        var S = '';
        S += Plot.table("Frequency Bands", "Frequencies in Hz", ["F min", "F max", "Name", "Offset(F_TX- F_RX)"], "FGTI", ConfTX.Bandes, "TXBand");
        var Comment = "<p class='left'>Band limits Fmin and Fmax in which an offset is applicable ";
        Comment += "<br>Freq._to_SDR = Math.abs(Freq.TX + Offset) .<br>";
        Comment += "Negative value for (Freq.TX + Offset) is allowed. It addresses down/up converters which invert the spectrum.</p>";
        S += Plot.table("Band Frequency Offsets", Comment, ["F min", "F max", "Offset"], "FGI", ConfTX.FixedOffset, "TXOffset");
        S += Plot.table("Labels", "", ["Frequency", "Label"], "IT", ConfTX.Label, "TXLabel");
        S += Plot.table("Sub-Bands Colour", "Colours are defines as in HTML/CSS", ["F min", "F max", "Colour"], "FGT", ConfTX.Zone, "TXZone");
        S += Plot.table("Relays", "Radio Relays", ["RX Frequency", "TX Shift frequency", "CTSS frequency", "Name"], "IIIT", ConfTX.Relays, "TXRelay");
        var Comment = "<p class='left'>GPIO of the Orange PI or RPI4 in charge of the transmitter exclusively<br>";
        Comment += "Don't set if the RX SDR and TX SDR are connected to the same computer board.<br>";
        Comment += "Set to switch any device while RX or while TX, according to SDR TX frequency<br>";
        Comment += "----------------------------------------------------------------------------<br>";
        Comment += "NumGPIO		Pin Opi One Plus	Pin Opi Zero2<br>";
        Comment += "69					24					13<br>";
        Comment += "71					18					22<br>";
        Comment += "72					16					15<br>";
        Comment += "73					12					7    Reserved for FAN control when the CPU overheats . 1 = overheat (65°C)<br>";
        Comment += "74										26   Reserved for Transmit security Oscillator on Opi Zero 2<br>";
        Comment += "227					26					10   Reserved for Transmit security Oscillator on Opi One Plus<br>";
        Comment += "228					7					5<br>";
        Comment += "229					5					3<br>";
        Comment += "230					3					23<br>";
        Comment += "Other NumGPIO available but not common to One Plus and Zero2. See documentation<br>";
        Comment += "<br>Raspberry 4B<br>";
        Comment += " NumGPIO 4 or pin 7 reserved fo Fan control. 1 = overheat (65°C)<br>";
        Comment += " NumGPIO 7 or pin 26 reserved for Transmit security Oscillator<br>";
        Comment += "<br>Fmin,Fmax in Hz, Output  state 0 or 1, While RX true or false, While TX true or false<br>";
        Comment += "Ex : 1000000,150000000,71,0,true,false<br>";
        Comment += "Ex : 1000000,150000000,71,1,false,true<br>";
        Comment += "Ex : 0,150000000,230,0,true,false<br>";
        Comment += "Ex : 0,150000000,230,1,false,true<br>";
        Comment += "Ex : 150000000,500000000,230,1,true,true<br>";
        Comment += "<br>For a Raspberry 4B, type in a terminal 'pinout' to have the correspondance GPIO number and pin number.<br>";
        Comment += "1000000,150000000,21,0,true,false<br>";
        Comment += "1000000,150000000,21,1,false,true</p>";
        S += Plot.table("GPIO pins", Comment, ["F min", "F max", "NumGPIO", "State <small>(0 or 1)</small>", "While RX<small>(true or false)</small>", "While TX<small>(true or false)</small>"], "FGIBSS", ConfTX.GPIO, "TXGPIO");
        $("#zone_TX_para").html(S);
    },
    table: function (Titre, Comment, Colonne, Type_, Data, table_id) {
        var L = Data.length;
        var C = Colonne.length;
        var S = '<br><h4>' + Titre + '</h4>';
        S += '<div class="tab_tit">' + Comment + '</div>';
        var Wtot = 0;
        var Types = Type_.split("");
        var Width = []
        for (var i = 0; i < C; i++) {
            switch (Types[i]) {
            case "B":
                Width.push(3);
                Wtot += 3;
                break;
            case "S":
                Width.push(6);
                Wtot += 6;
                break;
            case "T":
                Width.push(8);
                Wtot += 8;
                break;
            default:
                Width.push(5);
                Wtot += 5;
            }
        }
        Wtot += 0.3;
        S += '<div class="tab_col">';
        for (var i = 0; i < C; i++) {
            var w = Math.floor(100 * Width[i] / Wtot) + "%";
            S += '<div class="th" style="width:' + w + ';">' + Colonne[i] + '</div>';
        }
        S += '</div>';
        for (var i = 0; i < L; i++) {
            var p = i % 2;
            S += '<div class="tab_ligne' + p + '">'
            for (var j = 0; j < C; j++) {
                var w = Math.floor(100 * Width[j] / Wtot) + "%";
                S += '<div class="td" id="' + table_id + i + '_' + j + '" style="width:' + w + ';">' + Data[i][j] + '</div>';
            }
            S += '</div>';
        }
        S += '<div id="' + table_id + 'New" style="visibility:hidden" >' //Additional line for inputs
        for (var j = 0; j < C; j++) {
            var w = Math.floor(100 * Width[j] / Wtot) + "%";
            S += '<div class="td" id="' + table_id + L + '_' + j + '"  style="height:24px;width:' + w + ';"></div>';
        }
        S += '</div>';
        var who = "'" + table_id + "'";
        var T = "'" + Type_ + "'";
        S += '<div class="ButtonRight">';
        S += '<button onclick="Plot.update(' + who + ',' + L + ',' + C + ');" id="upd_' + table_id + '">Modify</button>';
        S += '<button style="display:none;" onclick="Plot.submit(' + who + ',' + L + ',' + C + ',' + T + ');" id="sub_' + table_id + '">Submit</button>';
        S += '<button style="visibility:hidden;" onclick="Plot.cancel(' + who + ');" id="can_' + table_id + '">Cancel</button>';
        S += '</div>';
        return S;
    },
    update: function (table_id, L, C) {
        for (var i = 0; i <= L; i++) {
            for (var j = 0; j < C; j++) {
                var id = table_id + i + "_" + j;
                $("#" + id).attr("contenteditable", true);
                $("#" + id).css("border", "1px solid grey");
            }
        }
        $("#" + table_id + "New").css("visibility", "visible");
        $("#upd_" + table_id).css("display", "none");
        $("#can_" + table_id).css("visibility", "visible");
        $("#sub_" + table_id).css("display", "inline-block");
    },
    submit: function (table_id, L, C, Type) {
        var NewTable = [];
        var Error = false;
        Type = Type.split("");
        for (var i = 0; i <= L; i++) {
            var NewLigne = [];
            var NotEmpty = false;
            var Fmin = 0;
            var Fmax = 0;
            var FMin = 0;
            var FMax = 0;
            for (var j = 0; j < C; j++) {
                var id = table_id + i + "_" + j;
                var V = $("#" + id).text();
                V = V.trim();
                if (V.length > 0)
                    NotEmpty = true;
                if (Type[j] == "I" || Type[j] == "F" || Type[j] == "G" || Type[j] == "B" || Type[j] == "X" || Type[j] == "Y")
                    V = parseInt(V);
                if (Type[j] == "F")
                    Fmin = V;
                if (Type[j] == "G")
                    Fmax = V;
                if (Type[j] == "X")
                    FMin = V;
                if (Type[j] == "Y")
                    FMax = V;
                if (Type[j] == "S" && V != "true" && V != "false" && V != "") {
                    Error = true;
                    $("#" + id).text("Error");
                }
                NewLigne.push(V);
            }
            if (Fmax < Fmin ) {
                Error = true;
                id = table_id + i + "_0";
                $("#" + id).text("Error");
            }
			if (FMax < FMin) {
                Error = true;
                id = table_id + i + "_3";
                $("#" + id).text("Error");
            }
            if (!Error && NotEmpty) {
                NewTable.push(NewLigne);
            }
        }
        if (!Error) {
            switch (table_id) {
            case "RXBand":
                ConfRX.Bandes = this.ordering(NewTable);
                break;
            case "RXOffset":
                ConfRX.FixedOffset = this.ordering(NewTable);
                break;
            case "RXLabel":
                ConfRX.Label = this.ordering(NewTable);
                break;
            case "RXZone":
                ConfRX.Zone = this.ordering(NewTable);
                break;
            case "RXBeac":
                ConfRX.BeaconSync = this.ordering(NewTable);
                break;
            case "RXGPIO":
                ConfRX.GPIO = this.ordering(NewTable);
                break;
            case "RXIfr":
                ConfRX.Iframes = NewTable;
                break;
            case "TXBand":
                ConfTX.Bandes = this.ordering(NewTable);
                break;
            case "TXOffset":
                ConfTX.FixedOffset = this.ordering(NewTable);
                break;
            case "TXLabel":
                ConfTX.Label = this.ordering(NewTable);
                break;
            case "TXZone":
                ConfTX.Zone = this.ordering(NewTable);
                break;
            case "TXRelay":
                ConfTX.Relays = this.ordering(NewTable);
                break;
            case "TXGPIO":
                ConfTX.GPIO = this.ordering(NewTable);
                break;
            }
            this.cancel(table_id);
            if (table_id.indexOf("RX") >= 0) {
                ConfRX_F.send(); //Storage
            } else {
                ConfTX_F.send();
            }
        }
    },
    cancel: function (table_id) {
        if (table_id.indexOf("RX") >= 0) {
            this.RX();
        } else {
            this.TX();
        }
    },
    ordering: function (table) {
        if (table.length > 1) {
            var notOrdered = true;
            while (notOrdered) {
                notOrdered = false;
                for (var i = 0; i < table.length - 1; i++) {
                    if (table[i][0] > table[i + 1][0]) {
                        notOrdered = true;
                        var V = table[i];
                        table[i] = table[i + 1];
                        table[i + 1] = V;
                    }
                }
            }
        }
        return table;
    }
}
function Info_CPU(prot, ip, idc, idsdr, RT) {
    var url_ = prot + "//" + ip + "/info_CPU";
    $.get(url_, function (data, status) {
        var Info = JSON.parse(data);
        var Sdr = "";
        var v = "";
        for (var i = 0; i < Info.SDRs.length; i++) {
            var nom = Info.SDRs[i].split("|");
            if (RT == "R" || nom[0].indexOf("pluto") == 0 || nom[0].indexOf("hackrf") == 0) {
                Sdr += v + ' ' + nom[1] + '<input type="radio" name="' + RT + 'selsdr" id="' + RT + nom[0] + '" value="' + nom[0] + '"   onclick="choix' + RT + 'XSDR(this);">';
                v = ',';
            }
        }
		if (Info.CPUshort=="opiz2" && RT=="T"){
		Sdr += v + ' ' + 'SA818<input type="radio" name="' + RT + 'selsdr" id="' + RT + 'SA818" value="SA818"    onclick="choix' + RT + 'XSDR(this);">';
		v = ',';
		}
	   Sdr += v + ' ' + 'None<input type="radio" name="' + RT + 'selsdr" id="' + RT + 'none" value="none"   checked onclick="choix' + RT + 'XSDR(this);">';
        $("#" + idsdr).html(Sdr); //List of SDR connected
        $("#" + idc).html(Info.Model);
        if (RT == "R") {
            var SdrSelected = Info.SDRrx;
        } else {
            var SdrSelected = Info.SDRtx;
        }
        $("#" + RT + SdrSelected).prop("checked", true);
    });
}
function choixRXSDR(t) {
    var data = {
        SDRrx: t.value
    }
    if (User.AccessOk) RXsocket.emit("choice_SDR_IF", JSON.stringify(data), (response) => {});
}
function choixTXSDR(t) {
    var data = {
        SDRtx: t.value
    }
    if (User.AccessOk) TXsocket.emit("choice_SDR_IF", JSON.stringify(data), (response) => {});
}
function choixGpredict(t) {
    var data = {
        Gpredict: t.checked ? "On" : "Off"
    }
	if(User.AccessOk) {
    RXsocket.emit("choice_SDR_IF", JSON.stringify(data), (response) => {});
    if (!ProcIP.SameIP)
        TXsocket.emit("choice_SDR_IF", JSON.stringify(data), (response) => {});
	}
}
function choixOmnirig(t) {
    var data = {
        Omnirig: t.checked ? "On" : "Off"
    }
	if (User.AccessOk) {
    RXsocket.emit("choice_SDR_IF", JSON.stringify(data), (response) => {});
    if (!ProcIP.SameIP)
        TXsocket.emit("choice_SDR_IF", JSON.stringify(data), (response) => {});
	}
}
function UserStatus() {
    T = Date.now() - 6000;
    if (User.RXlastM > T) { //Still some exchanges with the server
        var data = {
            MyIdx: User.RXidx
        }
        RXsocket.emit("UserStatus", JSON.stringify(data), (response) => {
            var data = JSON.parse(response);
            User.RXpilot = data.RXpilot;
            User.RXlastM = Date.now();
            User.AccessOk = data.AccessOk
                if (ProcIP.SameIP) {
                    User.TXpilot = data.TXpilot;
                    User.TXlastM = Date.now();
                }
                $(".ButtonRight").css('display', User.AccessOk ? "block" : "none");
            $("[name='SDRrx']").attr("disabled", User.AccessOk ? false : true);
            $("[name='SDRtx']").attr("disabled", User.AccessOk ? false : true);
        });
    }
    if (!ProcIP.SameIP && User.TXlastM > T && ProcIP.TX.length > 3) {
        var data = {
            MyIdx: User.TXidx
        }
        TXsocket.emit("UserStatus", JSON.stringify(data), (response) => {
            var data = JSON.parse(response);
            User.TXpilot = data.TXpilot;
            User.TXlastM = Date.now();
            console.log("UserTX Status", User)
        });
    }
}
setInterval(UserStatus, 2000);