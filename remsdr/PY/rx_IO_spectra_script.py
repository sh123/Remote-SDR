#!/usr/bin/python3           # This is client.py file

#Collect spectral data to be passed to a web client via Node Server
#Recuperation des données  spectre de GNU_Radio et envoi vers le client web
import socket
import asyncio
import time

 
# get local machine name
host = 'localhost'                           


port_spectre_web = 8002
port_spectre_GR = 9002
Connected_to_GR = False
byte_array = bytearray(65536) #16*4096
packet_number=0
nb_erreur=0

def Connection_GR():
# connection to hostname on the port.
    global Connected_to_GR
    global GR_spectre
    global nb_erreur
    try :
        GR_spectre = socket.socket(socket.AF_INET,  socket.SOCK_STREAM) # create a socket object
        GR_spectre.connect((host, port_spectre_GR)) 
        Connected_to_GR = True
        print("Connecté à GR spectre")
        nb_erreur=0
    except :
        print("Erreur connection à GR spectre")
        time.sleep(1)
        Connected_to_GR = False
        
print("Bridge to pass Spectra from GNU Radio to  WEB server and client")


# Reception 4096 bytes du spectre 
async def read_GR_Spectre():
    global byte_array
    global packet_number
    global nb_erreur
    global Connected_to_GR
    global GR_spectre
    while True:
# DATA from  GNU-RADIO
        await asyncio.sleep(0.02)
        nb_erreur +=1
        
        if nb_erreur>100 :
            Connected_to_GR = False
            nb_erreur = 0
        if Connected_to_GR :       
            try:
                msg_spectre = GR_spectre.recv(4096)
                adr=packet_number*4096
                if len(msg_spectre)==4096 : #2048 beams * 2 bytes
                    for i in range(4096):
                        if i==2048 or i==2049 :
                            byte_array[adr]=255 #Synchro at the left of spectra. Signal non relevant
                        else :
                            byte_array[adr]=msg_spectre[i]
                        adr +=1
                    
                    packet_number=(packet_number+1)%16
                   
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
    pn_out=0
    adr0=0
    addr = writer.get_extra_info('peername')
    while True:
        while pn_out==packet_number :
            await asyncio.sleep(0.02)
        
        pn=packet_number
        adr1=pn*4096
        byte_array2 = bytearray()
        if adr1<adr0 :
            byte_array2[:]=byte_array[adr0:65536]
            byte_array2.extend(byte_array[0:adr1])
        else :
            byte_array2[:]=byte_array[adr0:adr1]
        
        writer.write(byte_array2)
        await writer.drain() 
        pn_out=pn
        adr0=adr1
        # writer.close() NEVER STOP
        await asyncio.sleep(0.02)    

async def main_Local_Server():
    
    server = await asyncio.start_server(handle_Local_Server, host, port_spectre_web)

    addr = server.sockets[0].getsockname()
    print(f'Serving on {addr}')

    async with server:        
        await server.serve_forever()		
		

loop = asyncio.get_event_loop()

loop.run_until_complete(asyncio.gather(main_Local_Server(),read_GR_Spectre()))
loop.run_forever()
loop.close()