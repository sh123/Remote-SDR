#!/usr/bin/env python3
# -*- coding: utf-8 -*-

#
# SPDX-License-Identifier: GPL-3.0
#
# GNU Radio Python Flow Graph
# Title: NBFM Transmitter V5 - F1ATB - MAY 2022
# Author: F1ATB - BUHART
# Copyright: GNU General Public Licence v3.0
# Description: TX NBFM Audio SDR = SA818
# GNU Radio version: v3.9.5.0-62-gf520c346

from gnuradio import audio
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




class TX_sa818_nbfm_v5(gr.top_block):

    def __init__(self):
        gr.top_block.__init__(self, "NBFM Transmitter V5 - F1ATB - MAY 2022", catch_exceptions=True)

        ##################################################
        # Variables
        ##################################################
        self.samp_rate = samp_rate = 16000

        ##################################################
        # Blocks
        ##################################################
        self.rational_resampler_xxx_0 = filter.rational_resampler_fff(
                interpolation=16,
                decimation=10,
                taps=[],
                fractional_bw=0)
        self.network_udp_source_0 = network.udp_source(gr.sizeof_short, 1, 9005, 0, 128, False, False, False)
        self.blocks_short_to_float_0 = blocks.short_to_float(1, 32767)
        self.audio_sink_0 = audio.sink(samp_rate, 'hw:0,0', True)


        ##################################################
        # Connections
        ##################################################
        self.connect((self.blocks_short_to_float_0, 0), (self.rational_resampler_xxx_0, 0))
        self.connect((self.network_udp_source_0, 0), (self.blocks_short_to_float_0, 0))
        self.connect((self.rational_resampler_xxx_0, 0), (self.audio_sink_0, 0))


    def get_samp_rate(self):
        return self.samp_rate

    def set_samp_rate(self, samp_rate):
        self.samp_rate = samp_rate




def main(top_block_cls=TX_sa818_nbfm_v5, options=None):
    tb = top_block_cls()

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
