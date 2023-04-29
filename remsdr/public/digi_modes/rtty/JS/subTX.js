//Page initialization
const InitPage = {
    MacroTitle: ["CQ", "cDEmm", "ccDEmmm", "DEmmm", "RST", "NAME", "QTH", "LOC", "M8", "M9", "M10", "M11", "BTU", "73", "SK", "RYRY"],
    MacroText: [
        "RYRY CQ CQ CQ DE %m %m %m PSE K ",
        "%c DE %m %m K ",
        "%c %c DE %m %m %m K ",
        "DE %m %m %m K ",
        "YOUR RST IS %r %r ",
        "MY NAME IS %s %s ",
        "MY QTH IS ",
        "MY LOC IS ",
        "T8 ",
        "T9 ",
        "T10 ",
        "T11 ",
        "BTU %c DE %m KN ",
        "73 %n %c DE %m ",
        "73 TU %n %c SK SK ",
        "RYRYRYRYRYRYRY "],
    TheMacros: function () {
        var S = '';
        for (var l = 0; l < 4; l++) {
            S += '<div class="mac_line">';
            for (var m = 0; m < 4; m++) {
                var n = l * 4 + m;
                S += '<input type=button" onchange="InitPage.MacTitre(' + n + ',this.value)" class="mac_but" value="' + this.MacroTitle[n] + '" ondblclick="InitPage.MacDbl(' + n + ')" onclick="InitPage.MacClick(' + n + ')" title="Double Click to Edit">';
            }
            S += '</div>';
        }

        $("#macros").html(S);
        $("#MyCall").val(RTTYstore.m);
        $("#MyName").val(RTTYstore.s);
        $("#HisCall").val(RTTYstore.c);
        $("#HisName").val(RTTYstore.n);
    },
    MacIdx: 0,
    MacClick: function (n) {
        this.MacClose();
        var Txt = this.MacroText[n];
        Txt = Txt.replace(/%m/g, RTTYstore.m);
        Txt = Txt.replace(/%s/g, RTTYstore.s);
        Txt = Txt.replace(/%c/g, RTTYstore.c);
        Txt = Txt.replace(/%n/g, RTTYstore.n);
        Txt = Txt.replace(/%r/g, $("#HisRST option:selected").text());
        RTTY_TX.Insert(Txt);

    },
    MacDbl: function (n) {
        this.MacIdx = n;
        $("#macrosText").css("display", "block");
        $("#macrosText").html(this.MacroText[n]);
        $(".macrosTextB").css("display", "block");
    },
    MacClose: function () {
        $("#macrosText").css("display", "none");
        $(".macrosTextB").css("display", "none");
    },
    MacChange: function () {
        this.MacroText[this.MacIdx] = $("#macrosText").text();
        Save_RTTY();
    },
    MacTitre: function (n, v) {
        this.MacroTitle[n] = v;
        Save_RTTY();
    },
    TheModes: function () {
        var S = '<div class="flex_c"><label for="ModeSelect">Baud : </label>';
        S += '<select name="ModeSelect" id="ModeSelect" onchange="newMode(this.value);">';
        for (var i = 0; i < modes.length; i++) {
            S += '<option value=' + i + '>' + modes[i].bauds + '</option>';
        }
        S += '</select></div>';
        S += '<div  class="flex_c"><label for="Shift">Shift : </label>';
        S += '<select name="Shift" id="Shift" onchange="newShift(this.value);">';
        for (var i = 0; i < shifts.length; i++) {
            S += '<option value=' + i + '>' + shifts[i] + '</option>';
        }
        S += '</select></div>';

        S += '<div  class="flex_c"><label for="FMark">TX F Mark :</label>';
        S += '<select name="FMark" id="FMark" onchange="newFmark(this.value);">';
        for (var i = 0; i < shifts.length; i++) {
            Fmarks.push(Fmarks[1] - shifts[i]); //List of F Mark
        }
        for (var i = 0; i < Fmarks.length; i++) {
            S += '<option value=' + i + '>' + Fmarks[i] + '</option>';
        }
        S += '</select></div>';
        S += '<div  class="flex_c"><label for="Inverse"> Inv: </label>';
        S += '<input type="checkbox" id="Inverse" onchange="ResetRTTY();"></div>';
        $("#modes").html(S);
        $("#Inverse").prop("checked", RTTYstore.inv);
        var S = '<table class="Table"><tr><td class="tdm" id="RXmode">USB/LSB</td><td class="tdm">F. Space</td><td class="tdm">F. Mark</td></tr>';
        S += '<tr><td class="tdm">HF<small> RX</small></td><td  class="tdr"><span id="FHFspace"></span><span> Hz</span></td><td  class="tdr"><span id="FHFmark"></span><span> Hz</span></td></tr>';
        S += '<tr><td class="tdm">Audio</td><td  class="tdr"><span id="FAspace"></span><span> Hz</span></td><td  class="tdr"><span id="FAmark"></span><span> Hz</span></td></tr>';
        S += '</table>';
        $("#FreqM").html(S);
        var editable = document.getElementById('macrosText');
        editable.addEventListener('input', function () {
            InitPage.MacChange();
        });
    }
}
//RTTY TX
const RTTY_TX = {
    TX_ON: false,
    Fmark: 0,
    Fspace: 0,
    Fduplex: false,
    startSel: 0,
    NbCar: 0,
    shift: false,
    indif: ["<", "\n", " ", "^"],
    idVTX: document.getElementById('VisuTX'),
    timer: 0,
    Init: function () {

        this.idVTX.addEventListener('keyup', function () {
            RTTY_TX.startSel = this.selectionStart;
            var end = this.selectionEnd;
            this.value = this.value.toUpperCase();
            this.setSelectionRange(RTTY_TX.startSel, end);

        });

        this.idVTX.addEventListener('mouseup', function () {
            RTTY_TX.startSel = this.selectionStart;

        });

    },
    Upper: function () {
        var S = $("#VisuTX").val();
        S = S.toUpperCase();
        while (S.length > 1500) {
            var p = 1 + S.indexOf(" ");
            p = Math.max(p, 1);
            S = S.substr(p);
        }
        $("#VisuTX").val(S);
        for (var i = 1; i < 10; i++) {
            this.idVTX.scrollIntoView(false);
        }
    },
    Insert: function (Txt) {

        var S = $("#VisuTX").val();
        var S1 = S.slice(0, this.startSel);
        var S2 = S.slice(this.startSel);
        var CR1 = "";
        var CR2 = "\n";
        if (this.startSel > 0) {
            if (S.slice(this.startSel - 1, this.startSel) != "\n") {
                CR1 = "\n";
                CR2 = "";

            }
        }
        S1 = S1 + CR1 + Txt + CR2;
        this.startSel = S1.length;
        $("#VisuTX").val(S1 + S2);
        RTTY_TX.Upper();

    },
    Clear: function () {
        $("#VisuTX").val("");
        this.startSel = 0;
    },
    TXon: function () {
        this.TX_ON = !this.TX_ON;
        Bcast.sendTXOn(); //Broadcast TX On/Off
        if (this.TX_ON) {
            $("#TXon").removeClass('bt_off').addClass('bt_on');
            $("#TXon").val("TX On");
            $("#FAspace").html(RTTY_TX.Fspace.toLocaleString());
            $("#FAmark").html(RTTY_TX.Fmark.toLocaleString());
            this.timer = 10;
            setTimeout("RTTY_TX.OutLS();RTTY_TX.Out1car();", 200); //wait to send first caracter
        } else {
            $("#TXon").removeClass('bt_on').addClass('bt_off');
            $("#TXon").val("TX Off");
            $("#FAspace").html(RTTY_RX.Fspace.toLocaleString());
            $("#FAmark").html(RTTY_RX.Fmark.toLocaleString());
        }
    },
    Out1car: function () {
        var S = $("#VisuTX").val();
        if (S.length > 0 && RTTY_TX.NbCar < 2) { //NbCar in the buffer to be transmitted
            var Sout = S.slice(0, 1);
            S = S.slice(1);
            $("#VisuTX").val(S);
            if (DetectAmp.DispOut)
                DetectAmp.TXcar(Sout);
            if (DetectPhase.DispOut)
                DetectPhase.TXcar(Sout);
            if (this.indif.indexOf(Sout) == -1) { //Test tye of caractere
                var CN = (Sout.charCodeAt() > 64) ? false : true;
                if (CN != this.shift) {
                    this.shift = CN
                        this.OutLS();
                }
            }

            var byte = Baudot.CarToByte(Sout);
            Bcast.sendTXData(byte);

        }
        if (this.TX_ON && S.length > 0) {
            setTimeout("RTTY_TX.Out1car();", 80);
            this.timer = 10; //To wait 10s after last caracter
        } else {
            this.timer -= 1;
            if (this.timer < 0) {
                this.TX_ON = true;
                this.TXon(); //Time to Stop
            } else {
                setTimeout("RTTY_TX.Out1car();", 1000);
            }
        }
    },
    OutLS: function () {
        if (this.shift) {
            Bcast.sendTXData(27); //Number-Symbols
        } else {
            Bcast.sendTXData(31); //Letter
        }

    }

}
