// ***********************************
// *           REMOTE SDR v3         *
// *              F1ATB              *
// * GNU General Public Licence v3.0 *
// ***********************************

const Version_Local_Storage = "5.0";
//RX configuration
var ConfRX = {
	Version:"",
    Bandes: [], //Bandes.[Fmin,Fmax,"Text"];
    FixedOffset: [], //Band limits Fmin and Fmax in which an offset is applicable
    // Freq._to_SDR = Math.abs(Freq.RX + Offset) .
    // Negative value for (Freq.RX + Offset) is allowed. It adresses down/up converters which invert the spectrum.
    // RX_FixedOffset.[Fmin,Fmax,Offset]
    Label: [], //Label[Frequency,"Text"]
    Zone: [], //Zone[Fmin,Fmax,"CSS colour"]
    BeaconSync: [], //BeaconSync[Frequency,"Info Text"];
    GPIO: [], //GPIO[Fmin,Fmax,NumGPIO,state,RX_Mode,TX_Mode]
    Iframes: [], //["Page address","Title"]
}
//TX configuration
var ConfTX = {
	Version:"",
    Bandes: [], //Bandes[Fmin,Fmax,"Text",Offset(F_TX- F_RX)];
    FixedOffset: [], //Band limits Fmin and Fmax in which an offset is applicable
    // Freq._to_SDR = Math.abs(Freq.TX + Offset) .
    // Negative value for (Freq.TX + Offset) is allowed. It adresses down/up converters which invert the spectrum.
    // RX_FixedOffset.[Fmin,Fmax,Offset]
    Label: [], //Label[Frequency,"Text"]
    Zone: [], //Zone[Fmin,Fmax,"CSS colour"]
    Relays: [], //Relays[RX Frequency,TX shift,CTCSS freq,"Name"]
    GPIO: [], //GPIO[Fmin,Fmax,NumGPIO,state,RX_Mode,TX_Mode]
 
}
//Read RX Configuration
const ConfRX_F = {
    send: function () {
		
        var data = JSON.stringify(ConfRX);
        RXsocket.emit("writeConfRX", data);
    },
    read: function (Callback) {
        RXsocket.emit("readConfRX", (response) => {
            ConfRX = JSON.parse(response)
                Callback();
        });
    }
}
//Read TX Configuration
const ConfTX_F = {
    send: function () {
		
        var data = JSON.stringify(ConfTX);
        TXsocket.emit("writeConfTX", data);
    },
    read: function (Callback) {
        TXsocket.emit("readConfTX", (response) => {
            ConfTX = JSON.parse(response)
                Callback();
        });
    }
}
//Users
var User = {
    pseudo: "",
    AccessKey: "",
    AccessOk: false,
    RXidx: -1,
    RXpilot: false,
    TXpilot: false,
    RXlastM: 0,
    TXlastM: 0,
    ToLaunch: ""
}
const UserF = {
    save: function () {
        localStorage.setItem("User", JSON.stringify(User));
        $("#pseudo").val(User.pseudo);
        $("#AccessKey").val(User.AccessKey);
    },
    update: function (t) {
        User.pseudo = t.value.trim();
        UserF.save();
    },
    Recall: function () {
        var User_old = JSON.parse(localStorage.getItem("User"));
        if (User_old == null) { //Create a User pseudo
            var S = "";
            for (i = 0; i < 5; i++) {
                var K = 0;
                while ((K < 48) || (K > 39 && K < 65) || (K > 90 && K < 97) || K > 122) {
                    K = Math.floor(47 + 80 * Math.random());
                }
                S = S + String.fromCharCode(K);
            }
            User.pseudo = S;
        } else {
            User = User_old;
        }
        console.log(Date.now() - T0_remsdr, "User Defined : " + User.pseudo);
        User.RXidx = -1;
        User.RXpilot = false;
        User.TXpilot = false;
        User.AccessOk = false;
        this.save();
        //User pseudo Random
    },
    CallConnectRX: function () {
        User.ToLaunch = "RX";
        RXsocket.emit("CallConnect", JSON.stringify(User), (response) => {
            var data = JSON.parse(response);
            User.RXidx = data.idx;
            User.RXpilot = data.RXpilot;
            User.TXpilot = data.TXpilot;
            User.AccessOk = data.AccessOk;
            User.RXlastM = Date.now();
            SDR_RX.SDRrx = data.SDRrx;
            SDR_RX.BWmax = data.BWmax;
			var  GpredictOnOff=data.GpredictOnOff;
			var  OmnirigOnOff=data.OmnirigOnOff;
			var Bwm=parseInt(data.BWmax) /10;
            var M = "CPU : " + data.CPUshort + "<br> RX SDR: " + data.SDRrx + "<br> Sampling Rate : " + data.SampRate + "<br> Bandwidth Max : " + Bwm + " MHz";
            M +="<br>Gpredict : "+ GpredictOnOff+"<br>Omnirig : "+OmnirigOnOff;
			Add_To_Log(M);
            if (ProcIP.SameIP) {
                User.TXlastM = Date.now();
                SDR_TX.SDRtx = data.SDRtx;
				
                this.IdxTXsdr();
                if (SDR_TX.SDRtx == "pluto") {
                    setTimeout("UserF.CallConnectTX();", 2000); //TX Pluto cannot be launched simultaneously with the RX
                } else {
                    this.CallConnectTX(); //To launch Gnu Radio for the TX
                }
            }
			var pathname = location.pathname;
            if (pathname.indexOf("remote_sdr")>=0) { 
                for (var i = 0; i < RXsdr.length; i++) {
                    if (RXsdr[i].name == SDR_RX.SDRrx)
                        SDR_RX.idxSdr = i; //Received RX SDR model
                }
				Set_RX_GPIO();
            }
			if (pathname.indexOf("settings")>=0) { 
				if (GpredictOnOff=="On")
                $("#Gpredict").prop("checked", true);
				if (OmnirigOnOff=="On")
                $("#Omnirig").prop("checked", true);
            }
        });
    },
    IdxTXsdr: function () {
        if (typeof(TXsdr) != "undefined") { //Not uses in setting page
            for (var i = 0; i < TXsdr.length; i++) {
                if (TXsdr[i].name == SDR_TX.SDRtx)
                    SDR_TX.idxSdr = i; //Received TX SDR model
            }
        }
    },
    CallConnectTX: function () {
        User.ToLaunch = "TX";
        TXsocket.emit("CallConnect", JSON.stringify(User), (response) => {
            var data = JSON.parse(response);
            User.TXlastM = Date.now();
            SDR_TX.SDRtx = data.SDRtx;			
			var M = "TX SDR:" + data.SDRtx ;
            Add_To_Log(M);
            this.IdxTXsdr();
			var pathname = location.pathname;
			if (pathname.indexOf("remote_sdr")>=0) { 
				Set_TX_GPIO();
            }
        });
    },
    ForcePilot: function () {
        if (!User.RXpilot && User.AccessOk) {
            this.CallConnectRX();
            if (!ProcIP.SameIP)
                this.CallConnectTX();
        }
    },
    AccessKey: function (t) {
        User.AccessKey = t.value.trim();
        UserF.save();
        window.stop();
        location.reload();
    }
}
// Processors IP adresses and IO sockets
//************************
var RXsocket;
var TXsocket;
function Init_Common_IO() {
	console.log(Date.now() - T0_remsdr, "Init_Common_IO()");
    UserF.Recall();
    RXsocket = io();
    RXsocket.on("connect", () => {
        if (RXsocket.connected)
			console.log(Date.now() - T0_remsdr, "RXsocket.connected");
        ProcIP_F.Recall();
        RXsocketConnected();
    });
    RXsocket.on("disconnect", () => {
        RXsocketDisConnected();
    });
	RXsocket.on("Omnirig", (data) => {
		var pathname = location.pathname;
            if (pathname.indexOf("remote_sdr")>=0) { 
                MessageFromOmnirig(data)
            }
	  
	});
}
var ProcIP = {
    MY: "",
    RX: "",
    TX: "",
    Protocol: "",
    SameIP: false
}
const ProcIP_F = {
    Recall: function () {
        console.log(Date.now() - T0_remsdr, "Define IP adresses");
        var ProcIP_old = JSON.parse(localStorage.getItem("ProcIP"));
		 
        this.MY = window.location.host;
        if (ProcIP_old == null) {
            ProcIP.RX = this.MY;
            ProcIP.TX = this.MY;
        } else {
            if (ProcIP_old.RX.length > 3) {
                ProcIP.RX = ProcIP_old.RX;
            } else {
                ProcIP.RX = this.MY;
            }
            ProcIP.TX = ProcIP_old.TX;
        }
        ProcIP.Protocol = window.location.protocol; // http or https
        ProcIP.SameIP = true;
        if (ProcIP.RX == ProcIP.TX) {
            TXsocket = RXsocket;
        } else {
            if (ProcIP.TX.length > 3) {
                TXsocket = io(ProcIP.Protocol + "//" + ProcIP.TX); //Separate socket to the TX
                TXsocket.on("connect", () => {
                    if (TXsocket.connected)
                        console.log("TXsocket.connected");
                    TXsocketConnected();
                });
                TXsocket.on("disconnect", () => {
                    TXsocketDisConnected();
                });
            }
            ProcIP.SameIP = false;
        }
        this.save();
    },
    save: function () {
        localStorage.setItem("ProcIP", JSON.stringify(ProcIP));
    },
    IPTX: function (t) {
        ProcIP.TX = t.value.trim();
        ProcIP_F.save();
        window.stop();
        location.reload();
    }
}
//Page FULL SCREEN
//****************
const Screen = {
    FS_On: false,
    switch_page: function () {
        this.FS_On = !this.FS_On;
        var elem = document.documentElement;
        if (this.FS_On) {
            /* View in fullscreen */
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.mozRequestFullScreen) { /* Firefox */
                elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) { /* IE/Edge */
                elem.msRequestFullscreen();
            }
        } else {
            /* Close fullscreen */
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) { /* Firefox */
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { /* IE/Edge */
                document.msExitFullscreen();
            }
        }
    }
}
//Conversion to dB
function VtoDB(V) {
    return 20 * Math.log10(V);
}
function DBtoV(d) {
    return Math.pow(10, d / 20);
}
// Log
function Add_To_Log(M){
		var S=$("#in_fen_log").html();
		var S=S+"<br>"+M;
		$("#in_fen_log").html(S);
}
console.log("End loading Common.js");
