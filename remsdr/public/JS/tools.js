// ****************
// * REMOTE SDR   *
// *    F1ATB     *
// ****************
var ecran = {
    large: true,
    largeur: 1,
    hauteur: 1,
    innerW: 1,
    innerH: 1,
    border: 5
};

var audioTX = {
    Ctx: null,
    mic_stream: null,
    node_gain: null,
    node_proces_sortie: null,
    node_proces_analyse: null,
    node_analyseur: null,
    node_filtre: null
};

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
function Init_Page_Tools() {
    ProcIP_F.Recall();

    $("#RX_IP").html(ProcIP.RX);
    $("#TX_IP").html(ProcIP.TX);
    $("#RT_IP").html(ProcIP.RX);
    if (ProcIP.RX == ProcIP.TX) {
        $(".RX").css("display", "none");
        $(".TX").css("display", "none");
        Info_CPU(ProcIP.Protocol, ProcIP.RX, "Temp_RT", "CPU_RT")

    } else {
        $(".RT").css("display", "none");
        if (ProcIP.RX.length > 3) {
            Info_CPU(ProcIP.Protocol, ProcIP.RX, "Temp_RX", "CPU_RX")

        } else {
            $(".RX").css("display", "none");
        }
        if (ProcIP.TX.length > 3) {
            Info_CPU(ProcIP.Protocol, ProcIP.TX, "Temp_TX", "CPU_TX")

        } else {
            $(".TX").css("display", "none");
        }
    }
    if (ProcIP.RX == ProcIP.MY) {
        $(".actif_dis").css({
            "background-color": "#bbb",
            color: "grey",
            "border-color": "grey"
        });
    }
    if (ProcIP.TX == ProcIP.MY) {
        $(".actif_dis").css({
            "background-color": "#bbb",
            color: "grey",
            "border-color": "grey"
        });
    }
    window_resize();

}
function RXsocketConnected() {
    User.ToLaunch = "No";
    RXsocket.emit("CallConnect", JSON.stringify(User), (response) => {
        var data = JSON.parse(response);
        User.RXidx = data.idx;
        User.RXpilot = data.RXpilot;
        User.TXpilot = data.TXpilot;
        User.AccessOk = data.AccessOk;
        SDR_RX.SDRrx = data.SDRrx;
        var GpredictOnOff = data.GpredictOnOff;
        var OmnirigOnOff = data.OmnirigOnOff;
        var c = "none";
        if (User.AccessOk)
            c = "table-row"
                $(".Acces").css("display", c);

        console.log("User.AccessOk =", data.AccessOk)
    });

}
function RXsocketDisConnected() {
    RXsocket.connect();
}
function TXsocketConnected() {}
function TXsocketDisConnected() {
    TXsocket.connect();
}

function Info_CPU(prot, ip, idt, idc) {
    var url_ = prot + "//" + ip + "/info_CPU";
    $.get(url_, function (data, status) {
        var Info = JSON.parse(data);
        $("#" + idt).html(Info.Temperature + "&nbsp;&nbsp;&nbsp;Fan : " + Info.Fan_State);
        $("#" + idc).html(Info.Model);

    });
}
function test_version() {}
function Display(sdr, x) {

    if (x == "ChangesLog") {
        var EN = "Changes Log";
        var FR = "Journal des modifications";
    }
    if (x == "PlutoHelp") {
        var EN = "List of Pluto commands (ip: 192.168.2.1) to test its response";
        var FR = "Liste des commandes Pluto (ip: 192.168.2.1) pour tester sa réponse";
    }
    if (x == "PlutoReboot") {
        var EN = "Adalm-Pluto reboot (ip: 192.168.2.1). Please wait 10s.";
        var FR = "Reboot de l'Adalm Pluto (ip: 192.168.2.1). Patientez 10s.";
    }
    if (x == "PlutoSoapy") {
        var EN = "Informations on Adalm-Pluto SDR.";
        var FR = "Informations l'Adalm-Pluto.";
    }

    if (x == "USB") {
        var EN = "The name of the connected SDR must appear in the list of USB devices";
        var FR = "Le nom du SDR connecté doit apparaitre dans la liste des appareils USB";
    }
    if (x == "HackRFinfo") {
        var EN = "Info on HackRF(s) One SDR connected to USB. All infos available only if Remote SDR never starts after a boot.";
        var FR = "Info sur le HackRF One connecté à l'USB. Infos disponibles si Remote SDR n'a pas été actif après le boot.";
    }
    if (x == "HackRFSoapy") {
        var EN = "Info on HackRF(s) One SDR connected to USB.";
        var FR = "Info sur le HackRF One connecté à l'USB. ";
    }
    if (x == "RTLSDRinfo") {
        var EN = "Infos on RTL-SDR connected to USB. All infos available only if Remote SDR never starts after a boot.";
        var FR = "Infos sur le RTL-SDR connecté à l'USB.  Infos disponibles si Remote SDR n'a pas été actif après le boot";
    }
    if (x == "RTLSDRSoapy") {
        var EN = "Infos on RTL-SDR connected to USB. ";
        var FR = "Infos sur le RTL-SDR connecté à l'USB.  ";
    }
    if (x == "SDRPLAYSoapy") {
        var EN = "Infos on SDR-PLAY type (RSP1..) of SDR connected to USB. ";
        var FR = "Infos sur les SDR de type SDR-PLAY (RSP1...) connecté à l'USB.  ";
    }
    if (x == "testpin26") {
        var EN = "50Hz square Oscillator on pin 26 or pin 10 for 10s (wait)";
        var FR = "Oscillateur signal carré de 50Hz pendant 10s sur la pin 26 ou la pin 10 (patientez)";
    }
    if (x == "RebootOPI") {
        var EN = "Reboot Orange PI or Raspberry PI";
        var FR = "Reboot Orange PI ou Raspberry PI";
    }
    if (x == "Shutdown") {
        var EN = "Shutdown Orange PI or Raspberry PI";
        var FR = "Arrêt Orange PI ou Raspberry PI";
    }
    if (x == "SA818test") {
        var EN = "Test communication to SA818. Response should be :b'+DMOCONNECT:0'";
        var FR = "Test communication avec le SA818. La réponse doit être : b'+DMOCONNECT:0'";
    }
    if (x == "RxGpredict") {
        var EN = "Test communication with Gpredixt on RX frequency.<br>Click on 'Engage' in Gpredict and wait 10s.";
        var FR = "Test communication avec Gpredict pour la frequence du RX.<br> Cliquez sur 'Engage' dans Gpredict et patientez 10s.";
    }
    if (x == "TxGpredict") {
        var EN = "Test communication with Gpredixt on TX frequency.<br>Click on 'Engage' in Gpredict and wait 10s.";
        var FR = "Test communication avec Gpredict pour la frequence du TX.<br> Cliquez sur 'Engage' dans Gpredict et patientez 10s.";
    }
    if (x == "OmniRigTest") {
        var EN = "Start OmniRig Test. Listen on port 8008.<br>";
        EN += "Messages from Omnirig are passed to the RX Raspberry/Orange pi and returned here to the web browser.";
        EN += "Messages as 'INIT;', 'FA;', 'TX;' should be displayed.";
        EN += "The Omnirig application must be on and visible."
        EN += "<br>Wait 10s, please.";
        var FR = "Lancement du test sur OmniRig. Ecoute du port 8008.<br>";
        FR += "Les messages d'Omnirig sont transmis  au Raspberry/Orange pi du RX puis retournés vers le navigateur web.";
        FR += "Messages attendus : 'INIT;', 'FA;', 'TX;'.";
        FR += "La fenetre du logiciel Omnirig doit être visible."
        FR += "<br>Attendez 10s , s'il vous plait."
    }

    if (x == "TestVersion") {
        var EN = "Check if update for Remote SDR available.";
        var FR = "Verifie si une mise à jour de Remote SDR existe.";
    }
    $("#info_en").html(EN);
    $("#info_fr").html(FR);
    if (x == "TestVersion") {
        url_version = ProcIP.Protocol + "//" + ProcIP.RX + "/Version";
        if (sdr == "Tx")
            url_version = ProcIP.Protocol + "//" + ProcIP.TX + "/Version";
        var page = 'Remote SDR running version : <span id="InCpu"></span><br><br>';
        page += 'Remote SDR available version : <span id="LastV"></span><br>';
        $("#terminal").html(page);
        Call_Version();

    } else {
        setTimeout(function () {

            var url_ = ProcIP.Protocol + "//" + ProcIP.RX + "/Ajax/tools.ejs?" + x;
            if (sdr == "Tx")
                url_ = ProcIP.Protocol + "//" + ProcIP.TX + "/Ajax/tools.ejs?" + x;

            var r = true;
            if (x == "RebootOPI")
                r = confirm("Confirm Orange/Raspberry Pi Reboot!");
            if (x == "Shutdown")
                r = confirm("Confirm Orange/Raspberry Pi Shutdown!");
            if (r == true) {
                $("#terminal").html("<iframe src='" + url_ + "' style='width:100%;position:absolute;top:0px;height:100%;'></iframe>"); //Allow access even in cross origin
            } else {
                $("#info_en").html("");
                $("#info_fr").html("");
            }

        }, 10);
    }
}
var url_version = "";
function Call_Version() { //Asyncronuous due to call f1atb.fr site
    $.get(url_version + "?info", function (data, status) {
        var Info = JSON.parse(data);
        $("#InCpu").html(parseFloat(Info.InCpu).toPrecision(3));
        $("#LastV").html(parseFloat(Info.Last).toPrecision(3));
        if (parseFloat(Info.InCpu) > 4 && parseFloat(Info.Last) > 4 && parseFloat(Info.InCpu) < parseFloat(Info.Last))
            setTimeout("demand_upgrade()", 100);

    });
}
function demand_upgrade() {
    r = confirm("Do you want to upgrade Remote SDR ?");
    if (r) {
        $.get(url_version + "?upgrade", function (data, status) {
            var Info = JSON.parse(data);
            var page = Info + '. Upgrade In Progress<br><br>'

                $("#terminal").html(page);
            call_progress();
        });
    }
}
function call_progress() {
    console.log("call_progress()");
    $.get(url_version + "?progress", function (data, status) {
        var Info = JSON.parse(data);
        var page = $("#terminal").html() + Info;
        $("#terminal").html(page);
        if (page.indexOf("All Files Uploaded") < 0)
            setTimeout("call_progress();", 1000);

    });
}

function window_resize() {
    ecran.largeur = window.innerWidth; // parametre qui gere le changement des css'
    ecran.hauteur = window.innerHeight;
    var Fs = Math.max(12, ecran.largeur / 100);
    $("body").css("font-size", Fs); //Main Font-Size
}
//Traitement Audio du Microphone
function test_micro() {
    var EN = "Test access to the microphone. Requires the Orange/Raspberry PI site to be declared secure or https.";
    var FR = "Test l'accès au microphone. Nécessite d'avoir le site de l'Orange/Raspberry PI déclaré sécurisé ou https.";
    $("#info_en").html(EN);
    $("#info_fr").html(FR);
    $("#terminal").html("");
    audioTX.Ctx = new AudioContext({
        sampleRate: 10000
    }); // On force 10kHz pour le micro
    if (!navigator.getUserMedia)
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia || navigator.msGetUserMedia;
    if (navigator.getUserMedia) {
        //On se connecte à l'audio input par defaut, le micro
        navigator.getUserMedia({
            audio: true
        },
            function (stream) {
            start_microphone(stream);
        },
            function (e) {
            alert('Error capturing audio.May be no microphone connected');
        });
    } else {
        alert('getUserMedia not supported in this browser or access to a non secure server(not https)');
    }
}
function start_microphone(stream) {
    console.log("stream", stream);
    //Flux du micro
    audioTX.mic_stream = audioTX.Ctx.createMediaStreamSource(stream);
    //Creation des Nodes de traitement
    audioTX.node_gain = audioTX.Ctx.createGain();
    audioTX.node_filtre = audioTX.Ctx.createBiquadFilter();
    audioTX.node_filtre.type = "lowpass";
    audioTX.node_filtre.frequency.value = 3500; //Fc de 3500Hz
    //Connection des Nodes entre eux.
    audioTX.mic_stream.connect(audioTX.node_gain);
    audioTX.node_gain.connect(audioTX.node_filtre);
    audioTX.node_filtre.connect(audioTX.Ctx.destination); //Pour s'ecouter
    audioTX.node_gain.gain.value = 0.1;
}
function reset_storage() {
    var EN = "Reset of all parameters. Back to initial configuration.";
    var FR = "RAZ des paramètres. Retour à la configuration de base.";
    $("#info_en").html(EN);
    $("#info_fr").html(FR);
    setTimeout(function () {
        var r = true;
        r = confirm("Confirm Local Storage reset!");
        if (r == true) {
            localStorage.setItem("Local_Storage_", JSON.stringify(null));
            localStorage.setItem("date_Last_Check", JSON.stringify(null));
            localStorage.setItem("RTTYstore", JSON.stringify(null));
            localStorage.setItem("ProcIP", JSON.stringify(null));
            localStorage.setItem("User", JSON.stringify(null));
            localStorage.setItem("Visus", JSON.stringify(null));
            localStorage.setItem("Liste_F_Perso", JSON.stringify(null));
            localStorage.setItem("RX_Scan", JSON.stringify(null));
        }
    }, 10);
}
//Serial USB
var USB = {
    port: undefined,
    lineBuffer: ''
};
function test_USBserial() {
    var EN = "Test USB interface for Rotating Knob (F+,F-), Transmitt push Button (B0,B1) and CW keyer (L0,L1,R0,R1). Responses should be F+, F-, B0, B1,L0, L1, R0 or R1 ";
    var FR = "Test de l'interafece USB pour le bouton rotatif (F+,F-), le poussoir de transmission (B0,B1) et le manipulateur Morse (L0,L1,R0,R1). Les résponses doivent être F+, F-, B0, B1,L0, L1, R0 ou R1";
    $("#info_en").html(EN);
    $("#info_fr").html(FR);
    if (USB.port) {
        USB.port.close();
        USB.port = undefined;
    } else {
        console.log("Look for Serial Port")
        getReader();
    }
}
//Asynchronus reader of the Serial port on USB
async function getReader() {
    USB.port = await navigator.serial.requestPort({});
    await USB.port.open({
        baudRate: 115200
    });
    const appendStream = new WritableStream({ //Messages from Erduino
        write(chunk) {
            USB.lineBuffer += chunk;
            var lines = USB.lineBuffer.split('\n');
            while (lines.length > 1) {
                var message = lines.shift();
                var old_message = $("#terminal").html();
                $("#terminal").html(old_message + message);
            }
            USB.lineBuffer = lines.pop();
        }
    });
    USB.port.readable
    .pipeThrough(new TextDecoderStream())
    .pipeTo(appendStream);
}
