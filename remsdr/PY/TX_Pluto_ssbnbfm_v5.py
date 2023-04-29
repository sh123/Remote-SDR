#!/usr/bin/env python3
# -*- coding: utf-8 -*-

#
# SPDX-License-Identifier: GPL-3.0
#
# GNU Radio Python Flow Graph
# Title: SSB NBFM Transmitter V5 - F1ATB - APRIL 2022
# Author: F1ATB - BUHART
# Copyright: GNU General Public Licence v3.0
# Description: TX SSB NBFM Adalm-Pluto
# GNU Radio version: v3.9.5.0-62-gf520c346

from gnuradio import analog
from gnuradio import blocks
from gnuradio import filter
from gnuradio.filter import firdes
from gnuradio import gr
from gnuradio.fft import window
import sys
import signal
from argparse import ArgumentParser
from gnuradio.eng_arg import eng_float, intx
from gnuradio import eng_notation
from gnuradio import network
from gnuradio import soapy
from xmlrpc.server import SimpleXMLRPCServer
import threading




class TX_Pluto_ssbnbfm_v5(gr.top_block):

    def __init__(self, SampRate=1200000, device=''):
        gr.top_block.__init__(self, "SSB NBFM Transmitter V5 - F1ATB - APRIL 2022", catch_exceptions=True)

        ##################################################
        # Parameters
        ##################################################
        self.SampRate = SampRate
        self.device = device

        ##################################################
        # Variables
        ##################################################
        self.samp_rate = samp_rate = SampRate
        self.LNUC = LNUC = 0
        self.G2 = G2 = 0
        self.G1 = G1 = 89
        self.Fsdr = Fsdr = 432100000

        ##################################################
        # Blocks
        ##################################################
        self.xmlrpc_server_0 = SimpleXMLRPCServer(('localhost', 9004), allow_none=True)
        self.xmlrpc_server_0.register_instance(self)
        self.xmlrpc_server_0_thread = threading.Thread(target=self.xmlrpc_server_0.serve_forever)
        self.xmlrpc_server_0_thread.daemon = True
        self.xmlrpc_server_0_thread.start()
        self.soapy_plutosdr_sink_0 = None
        dev = 'driver=plutosdr'
        stream_args = ''
        tune_args = ['']
        settings = ['']

        self.soapy_plutosdr_sink_0 = soapy.sink(dev, "fc32", 1, '',
                                  stream_args, tune_args, settings)
        self.soapy_plutosdr_sink_0.set_sample_rate(0, samp_rate)
        self.soapy_plutosdr_sink_0.set_bandwidth(0, 200000)
        self.soapy_plutosdr_sink_0.set_frequency(0, Fsdr)
        self.soapy_plutosdr_sink_0.set_gain(0, min(max(G1, 0.0), 89.0))
        self.rational_resampler_xxx_1_1 = filter.rational_resampler_ccc(
                interpolation=int(samp_rate/10000),
                decimation=1,
                taps=[],
                fractional_bw=0)
        self.rational_resampler_xxx_1_0 = filter.rational_resampler_ccc(
                interpolation=15,
                decimation=1,
                taps=[],
                fractional_bw=0)
        self.rational_resampler_xxx_1 = filter.rational_resampler_ccc(
                interpolation=int(samp_rate/10000),
                decimation=1,
                taps=[],
                fractional_bw=0)
        self.network_udp_source_0 = network.udp_source(gr.sizeof_short, 1, 9005, 0, 128, False, False, False)
        self.hilbert_fc_0 = filter.hilbert_fc(64, window.WIN_HAMMING, 6.76)
        self.hilbert_fc_0.set_min_output_buffer(10)
        self.hilbert_fc_0.set_max_output_buffer(10)
        self.blocks_short_to_float_0 = blocks.short_to_float(1, 32767)
        self.blocks_selector_1 = blocks.selector(gr.sizeof_gr_complex*1,abs(LNUC),0)
        self.blocks_selector_1.set_enabled(True)
        self.blocks_selector_0 = blocks.selector(gr.sizeof_float*1,0,abs(LNUC))
        self.blocks_selector_0.set_enabled(True)
        self.blocks_multiply_const_vxx_0 = blocks.multiply_const_ff(LNUC)
        self.blocks_float_to_complex_0_0 = blocks.float_to_complex(1)
        self.blocks_float_to_complex_0 = blocks.float_to_complex(1)
        self.blocks_complex_to_float_0 = blocks.complex_to_float(1)
        self.band_pass_filter_0_0 = filter.fir_filter_fff(
            1,
            firdes.band_pass(
                1,
                10000,
                300,
                3500,
                1200,
                window.WIN_HAMMING,
                6.76))
        self.band_pass_filter_0 = filter.fir_filter_ccc(
            1,
            firdes.complex_band_pass(
                1,
                10000,
                -1300+LNUC*1500,
                1300+LNUC*1500,
                200,
                window.WIN_HAMMING,
                6.76))
        self.analog_nbfm_tx_0 = analog.nbfm_tx(
        	audio_rate=10000,
        	quad_rate=int(samp_rate/15),
        	tau=75e-6,
        	max_dev=5e3,
        	fh=-1.0,
                )
        self.analog_const_source_x_1 = analog.sig_source_f(0, analog.GR_CONST_WAVE, 0, 0, 0)


        ##################################################
        # Connections
        ##################################################
        self.connect((self.analog_const_source_x_1, 0), (self.blocks_float_to_complex_0_0, 1))
        self.connect((self.analog_nbfm_tx_0, 0), (self.rational_resampler_xxx_1_0, 0))
        self.connect((self.band_pass_filter_0, 0), (self.rational_resampler_xxx_1, 0))
        self.connect((self.band_pass_filter_0_0, 0), (self.analog_nbfm_tx_0, 0))
        self.connect((self.blocks_complex_to_float_0, 0), (self.blocks_float_to_complex_0, 0))
        self.connect((self.blocks_complex_to_float_0, 1), (self.blocks_multiply_const_vxx_0, 0))
        self.connect((self.blocks_float_to_complex_0, 0), (self.band_pass_filter_0, 0))
        self.connect((self.blocks_float_to_complex_0_0, 0), (self.rational_resampler_xxx_1_1, 0))
        self.connect((self.blocks_multiply_const_vxx_0, 0), (self.blocks_float_to_complex_0, 1))
        self.connect((self.blocks_selector_0, 0), (self.band_pass_filter_0_0, 0))
        self.connect((self.blocks_selector_0, 2), (self.blocks_float_to_complex_0_0, 0))
        self.connect((self.blocks_selector_0, 1), (self.hilbert_fc_0, 0))
        self.connect((self.blocks_selector_1, 0), (self.soapy_plutosdr_sink_0, 0))
        self.connect((self.blocks_short_to_float_0, 0), (self.blocks_selector_0, 0))
        self.connect((self.hilbert_fc_0, 0), (self.blocks_complex_to_float_0, 0))
        self.connect((self.network_udp_source_0, 0), (self.blocks_short_to_float_0, 0))
        self.connect((self.rational_resampler_xxx_1, 0), (self.blocks_selector_1, 1))
        self.connect((self.rational_resampler_xxx_1_0, 0), (self.blocks_selector_1, 0))
        self.connect((self.rational_resampler_xxx_1_1, 0), (self.blocks_selector_1, 2))


    def get_SampRate(self):
        return self.SampRate

    def set_SampRate(self, SampRate):
        self.SampRate = SampRate
        self.set_samp_rate(self.SampRate)

    def get_device(self):
        return self.device

    def set_device(self, device):
        self.device = device

    def get_samp_rate(self):
        return self.samp_rate

    def set_samp_rate(self, samp_rate):
        self.samp_rate = samp_rate
        self.soapy_plutosdr_sink_0.set_sample_rate(0, self.samp_rate)

    def get_LNUC(self):
        return self.LNUC

    def set_LNUC(self, LNUC):
        self.LNUC = LNUC
        self.band_pass_filter_0.set_taps(firdes.complex_band_pass(1, 10000, -1300+self.LNUC*1500, 1300+self.LNUC*1500, 200, window.WIN_HAMMING, 6.76))
        self.blocks_multiply_const_vxx_0.set_k(self.LNUC)
        self.blocks_selector_0.set_output_index(abs(self.LNUC))
        self.blocks_selector_1.set_input_index(abs(self.LNUC))

    def get_G2(self):
        return self.G2

    def set_G2(self, G2):
        self.G2 = G2

    def get_G1(self):
        return self.G1

    def set_G1(self, G1):
        self.G1 = G1
        self.soapy_plutosdr_sink_0.set_gain(0, min(max(self.G1, 0.0), 89.0))

    def get_Fsdr(self):
        return self.Fsdr

    def set_Fsdr(self, Fsdr):
        self.Fsdr = Fsdr
        self.soapy_plutosdr_sink_0.set_frequency(0, self.Fsdr)



def argument_parser():
    description = 'TX SSB NBFM Adalm-Pluto'
    parser = ArgumentParser(description=description)
    parser.add_argument(
        "--SampRate", dest="SampRate", type=eng_float, default=eng_notation.num_to_str(float(1200000)),
        help="Set SampRate [default=%(default)r]")
    parser.add_argument(
        "--device", dest="device", type=str, default='',
        help="Set device [default=%(default)r]")
    return parser


def main(top_block_cls=TX_Pluto_ssbnbfm_v5, options=None):
    if options is None:
        options = argument_parser().parse_args()
    tb = top_block_cls(SampRate=options.SampRate, device=options.device)

    def sig_handler(sig=None, frame=None):
        tb.stop()
        tb.wait()

        sys.exit(0)

    signal.signal(signal.SIGINT, sig_handler)
    signal.signal(signal.SIGTERM, sig_handler)

    tb.start()

    tb.wait()


if __name__ == '__main__':
    main()
