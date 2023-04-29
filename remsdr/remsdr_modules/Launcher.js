const cp = require('child_process');
var rx_IO_spectra_script = cp.spawn("python3", ["/remsdr/PY/rx_IO_spectra_script.py"], {
    stdio: 'ignore'
});
var rx_IO_audio_script = cp.spawn("python3", ["/remsdr/PY/rx_IO_audio_script.py"], {
    stdio: 'ignore'
});
var rx_GR_script = null;
var tx_GR_script = null;
var tx_SA818_script = null;
var rx_sdr_name = null;
var tx_sdr_name = null;
var rxSampRate = 0;
var txSampRate = 0;
var BWmaxF = 16.6666; //16.6*100kHz
function RXlaunchGR(CPUshort, SDRrx) {
	if(rx_sdr_name!=null && SDRrx.indexOf(rx_sdr_name)<0) killer(); //SDR changed
    if (rx_GR_script == null) {
		rx_sdr_name=SDRrx;
		if (rx_sdr_name.indexOf("hackrf")==0) {
			rx_sdr_name="hackrf";
			var sn=SDRrx.substr(6); //Serial Number
		}
		
        switch (rx_sdr_name) {
			
        case "hackrf":
            rxSampRate = 2000000; //Values for Opizero 2
            if (CPUshort == "RPI4")
                rxSampRate = 3000000; //If we change this value, change also the Decim_LP in the process to size the buffer to the max
            BWmaxF = rxSampRate / 100000 / 1.2; // Ex 16= (16.666*100kHz) ; //Bandwidth max
            rx_GR_script = cp.spawn("python3", ["/remsdr/PY/RX_Hack_sanw_v5.py", "--SampRate=" + rxSampRate,"--device=serial="+sn], {
                stdio: 'ignore'
            }); //stdio:Ignore to avoid IO buffer saturation which blocks parameters update
            break;
        case "rtlsdr":
            rxSampRate = 2048000; //Values for Opizero 2
            if (CPUshort == "RPI4")
                rxSampRate = 3200000; //Lost PLL synchro for higher values
            BWmaxF = rxSampRate / 100000 / 1.2; // Ex 16= (16.666*100kHz) ; //Bandwidth max
            rx_GR_script = cp.spawn("python3", ["/remsdr/PY/RX_RTL_sanw_v5.py", "--SampRate=" + rxSampRate], {
                stdio: 'ignore'
            }); //stdio:Ignore to avoid IO buffer saturation which blocks parameters update
            break;
        case "sdrplay":
            rxSampRate = 2000000; //Values for Opizero 2
            if (CPUshort == "RPI4")
                rxSampRate = 3000000; //If we change this value, change also the Decim_LP in the process to size the buffer to the max
            BWmaxF = rxSampRate / 100000 / 1.2; // Ex 16= (16.666*100kHz) ; //Bandwidth max
            rx_GR_script = cp.spawn("python3", ["/remsdr/PY/RX_SdrPlay_sanw_v5.py", "--SampRate=" + rxSampRate], {
                stdio: 'ignore'
            }); //stdio:Ignore to avoid IO buffer saturation which blocks parameters update
            break;
        case "pluto":
            rxSampRate = 900000; //Values for Opizero 2
			 if (CPUshort == "RPI4")
                rxSampRate = 1200000; 
            //If we change this value, change also the Decim_LP in the process to size the buffer to the max
            BWmaxF = rxSampRate / 100000 / 1.2; // Ex 16= (16.666*100kHz) ; //Bandwidth max
            rx_GR_script = cp.spawn("python3", ["/remsdr/PY/RX_Pluto_sanw_v5.py", "--SampRate=" + rxSampRate], {
                stdio: 'ignore'
            }); //stdio:Ignore to avoid IO buffer saturation which blocks parameters update
            break;
        }
		console.log("launch",rx_sdr_name,"rxSampRate",rxSampRate);
    }
    var response = {
        CPUshort: CPUshort,
        BWmaxF: BWmaxF,
        SampRate: rxSampRate
    };
    return response;
}
function TXlaunchGR(CPUshort, SDRtx) {
	if(tx_sdr_name!=null && SDRtx.indexOf(tx_sdr_name)<0) killer(); //SDR changed
    if (tx_GR_script == null) {
		tx_sdr_name=SDRtx;
		if (tx_sdr_name.indexOf("hackrf")==0) {
			tx_sdr_name="hackrf";
			var sn=SDRtx.substr(6); //Serial Number
			
		}
        switch (tx_sdr_name) {
        case "hackrf":
            txSampRate = 2000000; //Values for Opizero 2 and RPI4
            tx_GR_script = cp.spawn("python3", ["/remsdr/PY/TX_Hack_ssbnbfm_v5.py", "--SampRate=" + txSampRate,"--device=serial="+sn], {
                stdio: 'ignore'
            }); //stdio:Ignore to avoid IO buffer saturation which blocks parameters update
            break;
        case "pluto":
            txSampRate = 900000; //Values for Opizero 2   and RPI4. Must be eual with RX Sample Rate
			if (CPUshort == "RPI4")
                txSampRate = 1200000; 
            tx_GR_script = cp.spawn("python3", ["/remsdr/PY/TX_Pluto_ssbnbfm_v5.py", "--SampRate=" + txSampRate], {
                stdio: 'ignore'
            }); //stdio:Ignore to avoid IO buffer saturation which blocks parameters update
            break;
        case "SA818": // Opizero 2 Only
            tx_GR_script = cp.spawn("python3", ["/remsdr/PY/TX_sa818_nbfm_v5.py"], {
                stdio: 'ignore'
            }); //stdio:Ignore to avoid IO buffer saturation which blocks parameters update
            tx_SA818_script= cp.spawn("python3", ["/remsdr/PY/TX_sa818_para.py"], {
                stdio: 'ignore'
            }); // To send via serial port Frequency and CTCSS channel
			break;
        }
    }
}
function killer() {
    if (rx_GR_script != null)
        rx_GR_script.kill();
    rx_GR_script = null;
	rx_sdr_name=null;
    if (tx_GR_script != null)
        tx_GR_script.kill();
	if (tx_SA818_script != null)
        tx_SA818_script.kill();
    tx_GR_script = null;
	tx_sdr_name=null;
	tx_SA818_script=null;
}
module.exports = {
    RXlaunchGR,
    TXlaunchGR,
    killer
};