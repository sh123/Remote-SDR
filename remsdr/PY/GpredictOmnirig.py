#!/usr/bin/python3           # This is client.py file

import asyncio
import json
import os
import sys
import socket
import socketio


from remote_Gpredict_para import *

#socket to Node manager
sio = socketio.AsyncClient() 
# get local machine name
host = 'localhost'                           


port_hamlib = 8006 # To communicate with Gpredict
port_OmniRig =  8008 # To communicate with OmniRig via network



# Variables for Gpredict (Doppler correction)
F_AudioRX=0
F_Gpredict=0



async def To_Node_Manager():
    global F_AudioRX
    global F_Gpredict
    global hamlib_socket
    global hamlib_client
 
    async for message_recu in websocket_p:
        
        F=json.loads(message_recu)
     
              
        if "F_AudioRX" in F :
              print(time.asctime(),"F_AudioRX ",F["F_AudioRX"])
              F_AudioRX = int(F["F_AudioRX"])  # Requested for Gpredict
              hamlib_client,F_Gpredict = hamlib_loop(hamlib_socket,hamlib_client,F_AudioRX)
              
        
        if "Omnirig" in F : # We send  to Omirig TX status on or off
            print(time.asctime(),"Omnirig ",F["Omnirig"])
            sout_OmniRig.sendto(str.encode(F["Omnirig"]), (addrClientWeb,port_OmniRig))
            
        response="OK"
        
        if F_Gpredict >0 :
            response = "F_Gpredict="+str(F_Gpredict)
            F_Gpredict = 0
        
        await websocket_p.send(response)


async def Main_OmniRig():
    global F_AudioRX

    global message

    while True:    
        try:	# Read any data from the socket
            data, addr = sin_OmniRig.recvfrom(1024)
            message=message + data.decode('utf8')
            addrClientWeb=addr[0]

            if ";" in message :
                if (The_Websocket!=None) :
                    await The_Websocket.send("Omnirig="+message)
                if message=="IF;"  : # Freeze return when Frequency changes              
                    F="0000000000000"+str(F_AudioRX)
                    L=len(F)         
                    Fs=F[L-12:L]   #RX frequency on 12 digits 
                    sout_OmniRig.sendto(str.encode("IF"+Fs+";"), (addrClientWeb,port_OmniRig))                
                else:
                    print(str.encode(";"),(addrClientWeb,port_OmniRig))
                    sout_OmniRig.sendto(str.encode(";"),(addrClientWeb,port_OmniRig))
                message = ""
        except :	
            pass            
        await asyncio.sleep(0.01) # 
        
    
        
    


#Interface to Omnirig - UDP

addrClientWeb=""
message=""
sout_OmniRig = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sin_OmniRig = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sin_OmniRig.bind(("0.0.0.0",port_OmniRig)) #Listen to Omirig
sin_OmniRig.settimeout(0.0)



#Interface to Gpredict
hamlib_client = ""
hamlib_socket = create_hamlib_socket(port_hamlib)
 


loop = asyncio.get_event_loop()

try:
    loop.run_until_complete(asyncio.gather(To_Node_Manager(),Main_OmniRig()))
    loop.run_forever()
   
    
    
    
except KeyboardInterrupt:
    print("Keyboard Interrupt")
finally:
    loop.close()
    print("Stop  service.")
        
