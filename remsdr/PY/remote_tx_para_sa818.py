#!/usr/bin/python3           # This is client.py file

import os
import time
import asyncio
import serial_asyncio
import serial
import websockets
import json
import sys

from remote_Gpredict_para import *

# get local machine name
host = 'localhost'                           
port_para_Web = 8004
port_hamlib = 8007

#serial bus to SA818
uartSA818 = "/dev/ttyS5"
writeToSA818 = b'' 
CTCSS_channel="0000";


TX_On=False

# Variables for Gpredict (Doppler correction)
F_AudioTX=0
F_Gpredict=0

# Variable to inform main process that a web client is still connected
timer_client_connected = 0

print("Bridge to pass TX parameter from WEB cient to sa818 and set TX audio level")

os.system("sudo alsactl --file /var/www/html/PY/asound.state restore") # to fix audio level at the output of GNU Radio processing



# Open named port at “9600,8,N,1”, 1s timeout:
SA818 = serial.Serial(uartSA818, 9600, timeout=1)


            
def MessageToSA818() :
    global writeToSA818
    if  writeToSA818 !=b'':
        # print( "writeToSA818",writeToSA818 ) 
        SA818.write(writeToSA818  + b'\r\n' )
        writeToSA818=b''



async def consumer_handler(websocket_p, path):
    global writeToSA818
    global TX_On
    global CTCSS_channel
    global F_AudioTX
    global F_Gpredict
    global hamlib_socket
    global hamlib_client
    global timer_client_connected
    async for message_recu in websocket_p:
        F=json.loads(message_recu)
        
        if "Fr_TX" in F :
              txt = "{:.4f}"
              vf =txt.format(int(F["Fr_TX"])/1000000)
              print(time.asctime(),"Fr_TX SA818 :",vf)
              if TX_On == False :
                  writeToSA818 =bytes('AT+DMOSETGROUP=0,' +vf + ',' + vf +',' + CTCSS_channel + ',2,0000','ascii') # Message to SA818 to set frequency
                  MessageToSA818()
                          
       

        if "GRF_TX" in F :
              print(time.asctime(),"GainRF TX ",F["GRF_TX"])
      
              
        if "GIF_TX" in F :
              TX_On = False
              if int(F["GIF_TX"])>0 :
                TX_On = True
              print(time.asctime(),"GainIF TX ",F["GIF_TX"])
             	

        if "GBB_TX" in F :
              print(time.asctime(),"GainBB TX ",F["GBB_TX"])
             
        if "CTCSS_TX" in F :
            CTCSS_channel = "0000"
            if int(F["CTCSS_TX"])>0 :
                CTCSS_channel = "0000" + str(int(F["CTCSS_TX"]))
                CTCSS_channel = CTCSS_channel[-4:] 
                print(time.asctime(),"CTCSS_channel ",F["CTCSS_TX"])
                
        if "F_AudioTX" in F :
              print(time.asctime(),"F_AudioTX ",F["F_AudioTX"])
              F_AudioTX = int(F["F_AudioTX"])  # Requested for Gpredict
              hamlib_client,F_Gpredict = hamlib_loop(hamlib_socket,hamlib_client,F_AudioTX)
              timer_client_connected += 1
              if timer_client_connected >30 :
                os.system("python3 /var/www/html/cgi-bin/SelectRadio.py HelloTX") # inform main process client connected
                timer_client_connected = 0
            
        
        response="OK"
        if F_Gpredict >0 :
            response = "F_Gpredict="+str(F_Gpredict)
            F_Gpredict = 0        

        await websocket_p.send(response)		  
            
  
hamlib_client = ""
hamlib_socket = create_hamlib_socket(port_hamlib)


start_server_para = websockets.serve(consumer_handler, "", port_para_Web)

loop = asyncio.get_event_loop()

try:
    loop.run_until_complete(start_server_para)
    loop.run_forever()
except KeyboardInterrupt:
    print(time.asctime(),"Keyboard Interrupt")
finally:
    loop.close()
    print(time.asctime(),"Stop Para TX service.")
    
