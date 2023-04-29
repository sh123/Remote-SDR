#!/usr/bin/python3           # This is client.py file

#Collect audio stream to be passed to a web client via a scrip CGI
#Recuperation des données  audio de GNU_Radio et envoi vers le client web
import socket
import asyncio
import time
import math



# get local machine name
host = 'localhost'                           


port_audio_web = 8001
port_audio_GR = 9001
Connected_to_GR = False
byte_array = bytearray(60000) #3s of signal
packet_number=0	
packet_size=1000 #4000 or 8000 seems a good value. Why?
nb_erreur=0
adr=0

def Connection_GR():
# connection to hostname on the port.
    global Connected_to_GR
    global GR_Audio
    global nb_erreur
    try :
        GR_Audio = socket.socket(socket.AF_INET,  socket.SOCK_STREAM) # create a socket object
        GR_Audio.connect((host, port_audio_GR)) 
        Connected_to_GR = True
        print("Connecté à GR audio")
        nb_erreur=0;
    except :
        Connected_to_GR = False
        print("Erreur connection à GR audio")
        time.sleep(1)
        
        
print("Bridge to pass Audio from GNU Radio to CGI and WEB client")


# Reception 4000 bytes du Audio Stream 
async def read_GR_Audio():
    global byte_array
    global packet_number
    global nb_erreur
    global Connected_to_GR
    global GR_Audio
    global adr
    while True:
# DATA from  GNU-RADIO
        await asyncio.sleep(0.02)
        nb_erreur +=1
        
        if nb_erreur>100 :
            Connected_to_GR = False
            nb_erreur = 0
        if Connected_to_GR :       
            try:
                
                msg_audio = GR_Audio.recv(packet_size) #Receive Max  bytes
                L=len(msg_audio)
                if L>0 :
                    for i in range(L):
                        byte_array[adr]=msg_audio[i]
                        adr =(1+adr)%60000
                    packet_number=math.floor(adr/packet_size)
                    nb_erreur = 0
                    
            except socket.error:
                nb_erreur +=1
                print("no data")
        else :    
            Connection_GR()
            
        

async def handle_Local_Server(reader, writer): 
  
    try :
       
        data = await reader.read(100)
        message_not_used = data.decode().strip() 
        await send_Packet(writer)
    except:
        print("erreur connection vers web server")
        await asyncio.sleep(0.2)
   
async def send_Packet(writer): 
    global packet_number
    global byte_array
    addr = writer.get_extra_info('peername')
    pn_out=0
    adr0=0
    while True:
        while pn_out==packet_number :
            await asyncio.sleep(0.02)
        
        pn=packet_number
        adr1=pn*packet_size
        byte_array2 = bytearray()
        if adr1<adr0 :
            byte_array2[:]=byte_array[adr0:60000]
            byte_array2.extend(byte_array[0:adr1])
        else :
            byte_array2[:]=byte_array[adr0:adr1]
        
        writer.write(byte_array2)
        await writer.drain() 
        pn_out=pn
        adr0=adr1
        # writer.close()   NEVER STOP 
        await asyncio.sleep(0.02)

async def main_Local_Server():
    
    server = await asyncio.start_server(handle_Local_Server, host, port_audio_web)

    addr = server.sockets[0].getsockname()
    print(f'Serving on {addr}')

    async with server:        
        await server.serve_forever()		
		

loop = asyncio.get_event_loop()

loop.run_until_complete(asyncio.gather(main_Local_Server(),read_GR_Audio()))
loop.run_forever()
loop.close()