const udp = require('dgram')
const fs = require('fs');
var FRX_Omnirig = 0;
var T_RX = 0;
var  serverUDP,adrUDP;
var OM = {
    dataRX: "",
    initRX: function (ioS) {
		serverUDP = udp.createSocket('udp4');
		//const clientUDP = udp.createSocket('udp4');
		serverUDP.on('error', (err) => {
		  console.log(`serverUDP error:\n${err.stack}`);
		  serverUDP.close();
		});

		serverUDP.on('message', (msg, rinfo) => {
			adrUDP=rinfo.address;
		
		  OM.dataRX += msg;
                T_RX = Date.now();
               
				if (OM.dataRX.indexOf(";")>=0){
					 var message = OM.dataRX.split(';', 1);
					 if (message.length > 1) {
                        OM.dataRX = message[1]; //Follow on message
                    } else {
                        OM.dataRX = "";
                    }
					var m=message[0].trim();
					ioS.emit("Omnirig", m); // broadcast to all clients
					if (m=="IF") {//Freeze return when Frequency Changes
						var F="000000000000"+FRX_Omnirig;
						F=F.substr(-1,12) ; //Frequency on 12 digits
						
						serverUDP.send("IF"+F+";", 8008,adrUDP);
					} else {
						serverUDP.send(";", 8008,adrUDP);
					}
				}
		});

		serverUDP.on('listening', () => {
		  const address = serverUDP.address();
		 
		});

		serverUDP.bind(8008);
		
        
    }
}
function init(socket) {
    var OnOff = "Off";
    try {
        OnOff = fs.readFileSync('/remsdr/data/Omnirig.txt', 'utf8');
    } catch (e) {}
    if (OnOff.trim() == "On") {
        OM.initRX(socket);
    }
    return OnOff;
}
function RX(F_AudioRX) {
    FRX_Omnirig=F_AudioRX;

}
function ToOmnirig(m){
	serverUDP.send(m+";", 8008,adrUDP);
}
function SetOn(V) {
    fs.writeFileSync('/remsdr/data/Omnirig.txt', V);
}
module.exports = {
    init,
    RX,
    SetOn,
	ToOmnirig
};