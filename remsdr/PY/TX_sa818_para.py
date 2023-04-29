from xmlrpc.server import SimpleXMLRPCServer
from xmlrpc.server import SimpleXMLRPCRequestHandler
import os
import serial
import time

#serial bus to SA818
uartSA818 = "/dev/ttyS5"
writeToSA818 = b'' 
CTCSS_channel="0000";

TX_On=False

os.system("sudo alsactl --file /remsdr/PY/asound.state restore") # to fix audio level at the output of GNU Radio processing

# Open named port at “9600,8,N,1”, 1s timeout:
SA818 = serial.Serial(uartSA818, 9600, timeout=1)


def MessageToSA818() :
    global writeToSA818
    if  writeToSA818 !=b'':
        SA818.write(writeToSA818  + b'\r\n' )
        writeToSA818=b''

# Restrict to a particular path.
class RequestHandler(SimpleXMLRPCRequestHandler):
    rpc_paths = ('/',)

# Create server
with SimpleXMLRPCServer(('localhost', 9004),
                        requestHandler=RequestHandler) as server:
    class MyFuncs:        
        def set_Fsdr(self,F):
            global writeToSA818
            global CTCSS_channel
            txt = "{:.4f}"
            vf =txt.format(int(F)/1000000)
            if TX_On == False :
              writeToSA818 =bytes('AT+DMOSETGROUP=0,' +vf + ',' + vf +',' + CTCSS_channel + ',2,0000','ascii') # Message to SA818 to set frequency
              MessageToSA818()
            
        def set_LNUC(self,F):
            pass
        def set_G1(self,F):
            pass       
        def set_G2(self,F):
            pass
        def set_CTCSS(self,channel):
            global CTCSS_channel
            CTCSS_channel = "0000"
            if int(channel)>0 :
                CTCSS_channel = "0000" + str(channel)
                CTCSS_channel = CTCSS_channel[-4:] 
                
    server.register_instance(MyFuncs())
    # Run the server's main loop
    server.serve_forever()


