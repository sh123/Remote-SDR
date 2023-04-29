#!/usr/bin/env python3
# -*- coding: utf-8 -*-

#
# SPDX-License-Identifier: GPL-3.0
#
# GNU Radio Python Flow Graph
# Title: Adalm-Pluto SSB AM NBFN WBFM  Receiver V5- F1ATB - APRIL 2022
# Author: F1ATB - BUHART
# Copyright: GNU General Public Licence v3.0
# Description: RX for Adalm-Pluto
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
from gnuradio.fft import logpwrfft
from xmlrpc.server import SimpleXMLRPCServer
import threading




class RX_Pluto_sanw_v5(gr.top_block):

    def __init__(self, SampRate=1200000, device=''):
        gr.top_block.__init__(self, "Adalm-Pluto SSB AM NBFN WBFM  Receiver V5- F1ATB - APRIL 2022", catch_exceptions=True)

        ##################################################
        # Parameters
        ##################################################
        self.SampRate = SampRate
        self.device = device

        ##################################################
        # Variables
        ##################################################
        self.samp_rate = samp_rate = SampRate
        self.Modulation = Modulation = 0
        self.Largeur_filtre_WBFM = Largeur_filtre_WBFM = 150000
        self.Largeur_filtre_SSB = Largeur_filtre_SSB = 3800
        self.Largeur_filtre_NBFM = Largeur_filtre_NBFM = 10000
        self.Largeur_filtre_AM = Largeur_filtre_AM = 7500
        self.xlate_filter_taps_WBFM = xlate_filter_taps_WBFM = firdes.low_pass(1, samp_rate, Largeur_filtre_WBFM/2, 25000)
        self.xlate_filter_taps_SSB = xlate_filter_taps_SSB = firdes.low_pass(1, samp_rate, Largeur_filtre_SSB/2, 760)
        self.xlate_filter_taps_NBFM = xlate_filter_taps_NBFM = firdes.low_pass(1, samp_rate, Largeur_filtre_NBFM/2, 2000)
        self.xlate_filter_taps_AM = xlate_filter_taps_AM = firdes.low_pass(1, samp_rate, Largeur_filtre_AM/2, 1500)
        self.decim_LP = decim_LP = 27
        self.Squelch = Squelch = -80
        self.ModulSelect = ModulSelect = max(0,Modulation -1)
        self.LSB_USB = LSB_USB = min(1,Modulation)
        self.G3 = G3 = 20
        self.G2 = G2 = -20
        self.G1 = G1 = 0
        self.Fsdr = Fsdr = 432000000
        self.Ffine = Ffine = 0

        ##################################################
        # Blocks
        ##################################################
        self.xmlrpc_server_0 = SimpleXMLRPCServer(('localhost', 9003), allow_none=True)
        self.xmlrpc_server_0.register_instance(self)
        self.xmlrpc_server_0_thread = threading.Thread(target=self.xmlrpc_server_0.serve_forever)
        self.xmlrpc_server_0_thread.daemon = True
        self.xmlrpc_server_0_thread.start()
        self.soapy_plutosdr_source_0 = None
        dev = 'driver=plutosdr'
        stream_args = ''
        tune_args = ['']
        settings = ['']

        self.soapy_plutosdr_source_0 = soapy.source(dev, "fc32", 1, '',
                                  stream_args, tune_args, settings)
        self.soapy_plutosdr_source_0.set_sample_rate(0, samp_rate)
        self.soapy_plutosdr_source_0.set_bandwidth(0, 2000000)
        self.soapy_plutosdr_source_0.set_gain_mode(0, G1)
        self.soapy_plutosdr_source_0.set_frequency(0, Fsdr)
        self.soapy_plutosdr_source_0.set_gain(0, min(max(G2, 0.0), 73.0))
        self.network_tcp_sink_0_0 = network.tcp_sink(gr.sizeof_short, 1, '127.0.0.1', 9001,2)
        self.network_tcp_sink_0 = network.tcp_sink(gr.sizeof_short, 2048, '127.0.0.1', 9002,2)
        self.mmse_resampler_xx_0 = filter.mmse_resampler_cc(0, decim_LP)
        self.low_pass_filter_0 = filter.fir_filter_ccf(
            1,
            firdes.low_pass(
                1,
                decim_LP*10000,
                4333,
                1200,
                window.WIN_HAMMING,
                6.76))
        self.logpwrfft_x_0 = logpwrfft.logpwrfft_c(
            sample_rate=10000,
            fft_size=2048,
            ref_scale=0.0000000001,
            frame_rate=10000/2048,
            avg_alpha=1.0,
            average=False,
            shift=False)
        self.freq_xlating_fir_filter_xxx_0_2 = filter.freq_xlating_fir_filter_ccc(int(samp_rate/200000), xlate_filter_taps_WBFM, Ffine, samp_rate)
        self.freq_xlating_fir_filter_xxx_0_1 = filter.freq_xlating_fir_filter_ccc(int(samp_rate/10000), xlate_filter_taps_AM, Ffine, samp_rate)
        self.freq_xlating_fir_filter_xxx_0_0 = filter.freq_xlating_fir_filter_ccc(int(samp_rate/40000), xlate_filter_taps_NBFM, Ffine, samp_rate)
        self.freq_xlating_fir_filter_xxx_0 = filter.freq_xlating_fir_filter_ccc(int(samp_rate/10000), xlate_filter_taps_SSB, Ffine-Largeur_filtre_SSB/2+LSB_USB*Largeur_filtre_SSB-100+LSB_USB*200, samp_rate)
        self.dc_blocker_xx_0 = filter.dc_blocker_cc(1024, True)
        self.blocks_selector_1 = blocks.selector(gr.sizeof_float*1,ModulSelect,0)
        self.blocks_selector_1.set_enabled(True)
        self.blocks_selector_0 = blocks.selector(gr.sizeof_gr_complex*1,0,ModulSelect)
        self.blocks_selector_0.set_enabled(True)
        self.blocks_multiply_xx_0_0 = blocks.multiply_vff(1)
        self.blocks_multiply_xx_0 = blocks.multiply_vff(1)
        self.blocks_multiply_const_vxx_0 = blocks.multiply_const_ff(1-2*LSB_USB)
        self.blocks_keep_m_in_n_0 = blocks.keep_m_in_n(gr.sizeof_gr_complex, int(2048*decim_LP), 2048*int(samp_rate/10000), 0)
        self.blocks_float_to_short_1 = blocks.float_to_short(2048, 100)
        self.blocks_float_to_short_0 = blocks.float_to_short(1, 16000)
        self.blocks_complex_to_mag_0 = blocks.complex_to_mag(1)
        self.blocks_complex_to_float_0_0 = blocks.complex_to_float(1)
        self.blocks_complex_to_float_0 = blocks.complex_to_float(1)
        self.blocks_add_xx_0 = blocks.add_vff(1)
        self.analog_wfm_rcv_0 = analog.wfm_rcv(
        	quad_rate=200000,
        	audio_decimation=20,
        )
        self.analog_simple_squelch_cc_0_1 = analog.simple_squelch_cc(Squelch, 1)
        self.analog_simple_squelch_cc_0_0 = analog.simple_squelch_cc(Squelch, 1)
        self.analog_simple_squelch_cc_0 = analog.simple_squelch_cc(Squelch, 1)
        self.analog_sig_source_x_0 = analog.sig_source_c(10000, analog.GR_COS_WAVE, Largeur_filtre_SSB/2+100, 1, 0, 0)
        self.analog_nbfm_rx_0 = analog.nbfm_rx(
        	audio_rate=10000,
        	quad_rate=40000,
        	tau=75e-6,
        	max_dev=5e3,
          )
        self.analog_agc_xx_0 = analog.agc_cc(1e-4, 1.0, 1.0)
        self.analog_agc_xx_0.set_max_gain(20000)
        self.analog_agc2_xx_0 = analog.agc2_cc(0.1, 0.01, 1.0, 1.0)
        self.analog_agc2_xx_0.set_max_gain(100)


        ##################################################
        # Connections
        ##################################################
        self.connect((self.analog_agc2_xx_0, 0), (self.blocks_complex_to_float_0, 0))
        self.connect((self.analog_agc_xx_0, 0), (self.analog_simple_squelch_cc_0_0, 0))
        self.connect((self.analog_nbfm_rx_0, 0), (self.blocks_selector_1, 2))
        self.connect((self.analog_sig_source_x_0, 0), (self.blocks_complex_to_float_0_0, 0))
        self.connect((self.analog_simple_squelch_cc_0, 0), (self.analog_nbfm_rx_0, 0))
        self.connect((self.analog_simple_squelch_cc_0_0, 0), (self.blocks_complex_to_mag_0, 0))
        self.connect((self.analog_simple_squelch_cc_0_1, 0), (self.analog_wfm_rcv_0, 0))
        self.connect((self.analog_wfm_rcv_0, 0), (self.blocks_selector_1, 3))
        self.connect((self.blocks_add_xx_0, 0), (self.blocks_selector_1, 0))
        self.connect((self.blocks_complex_to_float_0, 0), (self.blocks_multiply_const_vxx_0, 0))
        self.connect((self.blocks_complex_to_float_0, 1), (self.blocks_multiply_xx_0_0, 0))
        self.connect((self.blocks_complex_to_float_0_0, 0), (self.blocks_multiply_xx_0, 0))
        self.connect((self.blocks_complex_to_float_0_0, 1), (self.blocks_multiply_xx_0_0, 1))
        self.connect((self.blocks_complex_to_mag_0, 0), (self.blocks_selector_1, 1))
        self.connect((self.blocks_float_to_short_0, 0), (self.network_tcp_sink_0_0, 0))
        self.connect((self.blocks_float_to_short_1, 0), (self.network_tcp_sink_0, 0))
        self.connect((self.blocks_keep_m_in_n_0, 0), (self.low_pass_filter_0, 0))
        self.connect((self.blocks_multiply_const_vxx_0, 0), (self.blocks_multiply_xx_0, 1))
        self.connect((self.blocks_multiply_xx_0, 0), (self.blocks_add_xx_0, 0))
        self.connect((self.blocks_multiply_xx_0_0, 0), (self.blocks_add_xx_0, 1))
        self.connect((self.blocks_selector_0, 0), (self.freq_xlating_fir_filter_xxx_0, 0))
        self.connect((self.blocks_selector_0, 2), (self.freq_xlating_fir_filter_xxx_0_0, 0))
        self.connect((self.blocks_selector_0, 1), (self.freq_xlating_fir_filter_xxx_0_1, 0))
        self.connect((self.blocks_selector_0, 3), (self.freq_xlating_fir_filter_xxx_0_2, 0))
        self.connect((self.blocks_selector_1, 0), (self.blocks_float_to_short_0, 0))
        self.connect((self.dc_blocker_xx_0, 0), (self.blocks_keep_m_in_n_0, 0))
        self.connect((self.dc_blocker_xx_0, 0), (self.blocks_selector_0, 0))
        self.connect((self.freq_xlating_fir_filter_xxx_0, 0), (self.analog_agc2_xx_0, 0))
        self.connect((self.freq_xlating_fir_filter_xxx_0_0, 0), (self.analog_simple_squelch_cc_0, 0))
        self.connect((self.freq_xlating_fir_filter_xxx_0_1, 0), (self.analog_agc_xx_0, 0))
        self.connect((self.freq_xlating_fir_filter_xxx_0_2, 0), (self.analog_simple_squelch_cc_0_1, 0))
        self.connect((self.logpwrfft_x_0, 0), (self.blocks_float_to_short_1, 0))
        self.connect((self.low_pass_filter_0, 0), (self.mmse_resampler_xx_0, 0))
        self.connect((self.mmse_resampler_xx_0, 0), (self.logpwrfft_x_0, 0))
        self.connect((self.soapy_plutosdr_source_0, 0), (self.dc_blocker_xx_0, 0))


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
        self.set_xlate_filter_taps_AM(firdes.low_pass(1, self.samp_rate, self.Largeur_filtre_AM/2, 1500))
        self.set_xlate_filter_taps_NBFM(firdes.low_pass(1, self.samp_rate, self.Largeur_filtre_NBFM/2, 2000))
        self.set_xlate_filter_taps_SSB(firdes.low_pass(1, self.samp_rate, self.Largeur_filtre_SSB/2, 760))
        self.set_xlate_filter_taps_WBFM(firdes.low_pass(1, self.samp_rate, self.Largeur_filtre_WBFM/2, 25000))
        self.blocks_keep_m_in_n_0.set_n(2048*int(self.samp_rate/10000))
        self.soapy_plutosdr_source_0.set_sample_rate(0, self.samp_rate)

    def get_Modulation(self):
        return self.Modulation

    def set_Modulation(self, Modulation):
        self.Modulation = Modulation
        self.set_LSB_USB(min(1,self.Modulation))
        self.set_ModulSelect(max(0,self.Modulation -1))

    def get_Largeur_filtre_WBFM(self):
        return self.Largeur_filtre_WBFM

    def set_Largeur_filtre_WBFM(self, Largeur_filtre_WBFM):
        self.Largeur_filtre_WBFM = Largeur_filtre_WBFM
        self.set_xlate_filter_taps_WBFM(firdes.low_pass(1, self.samp_rate, self.Largeur_filtre_WBFM/2, 25000))

    def get_Largeur_filtre_SSB(self):
        return self.Largeur_filtre_SSB

    def set_Largeur_filtre_SSB(self, Largeur_filtre_SSB):
        self.Largeur_filtre_SSB = Largeur_filtre_SSB
        self.set_xlate_filter_taps_SSB(firdes.low_pass(1, self.samp_rate, self.Largeur_filtre_SSB/2, 760))
        self.analog_sig_source_x_0.set_frequency(self.Largeur_filtre_SSB/2+100)
        self.freq_xlating_fir_filter_xxx_0.set_center_freq(self.Ffine-self.Largeur_filtre_SSB/2+self.LSB_USB*self.Largeur_filtre_SSB-100+self.LSB_USB*200)

    def get_Largeur_filtre_NBFM(self):
        return self.Largeur_filtre_NBFM

    def set_Largeur_filtre_NBFM(self, Largeur_filtre_NBFM):
        self.Largeur_filtre_NBFM = Largeur_filtre_NBFM
        self.set_xlate_filter_taps_NBFM(firdes.low_pass(1, self.samp_rate, self.Largeur_filtre_NBFM/2, 2000))

    def get_Largeur_filtre_AM(self):
        return self.Largeur_filtre_AM

    def set_Largeur_filtre_AM(self, Largeur_filtre_AM):
        self.Largeur_filtre_AM = Largeur_filtre_AM
        self.set_xlate_filter_taps_AM(firdes.low_pass(1, self.samp_rate, self.Largeur_filtre_AM/2, 1500))

    def get_xlate_filter_taps_WBFM(self):
        return self.xlate_filter_taps_WBFM

    def set_xlate_filter_taps_WBFM(self, xlate_filter_taps_WBFM):
        self.xlate_filter_taps_WBFM = xlate_filter_taps_WBFM
        self.freq_xlating_fir_filter_xxx_0_2.set_taps(self.xlate_filter_taps_WBFM)

    def get_xlate_filter_taps_SSB(self):
        return self.xlate_filter_taps_SSB

    def set_xlate_filter_taps_SSB(self, xlate_filter_taps_SSB):
        self.xlate_filter_taps_SSB = xlate_filter_taps_SSB
        self.freq_xlating_fir_filter_xxx_0.set_taps(self.xlate_filter_taps_SSB)

    def get_xlate_filter_taps_NBFM(self):
        return self.xlate_filter_taps_NBFM

    def set_xlate_filter_taps_NBFM(self, xlate_filter_taps_NBFM):
        self.xlate_filter_taps_NBFM = xlate_filter_taps_NBFM
        self.freq_xlating_fir_filter_xxx_0_0.set_taps(self.xlate_filter_taps_NBFM)

    def get_xlate_filter_taps_AM(self):
        return self.xlate_filter_taps_AM

    def set_xlate_filter_taps_AM(self, xlate_filter_taps_AM):
        self.xlate_filter_taps_AM = xlate_filter_taps_AM
        self.freq_xlating_fir_filter_xxx_0_1.set_taps(self.xlate_filter_taps_AM)

    def get_decim_LP(self):
        return self.decim_LP

    def set_decim_LP(self, decim_LP):
        self.decim_LP = decim_LP
        self.blocks_keep_m_in_n_0.set_m(int(2048*self.decim_LP))
        self.low_pass_filter_0.set_taps(firdes.low_pass(1, self.decim_LP*10000, 4333, 1200, window.WIN_HAMMING, 6.76))
        self.mmse_resampler_xx_0.set_resamp_ratio(self.decim_LP)

    def get_Squelch(self):
        return self.Squelch

    def set_Squelch(self, Squelch):
        self.Squelch = Squelch
        self.analog_simple_squelch_cc_0.set_threshold(self.Squelch)
        self.analog_simple_squelch_cc_0_0.set_threshold(self.Squelch)
        self.analog_simple_squelch_cc_0_1.set_threshold(self.Squelch)

    def get_ModulSelect(self):
        return self.ModulSelect

    def set_ModulSelect(self, ModulSelect):
        self.ModulSelect = ModulSelect
        self.blocks_selector_0.set_output_index(self.ModulSelect)
        self.blocks_selector_1.set_input_index(self.ModulSelect)

    def get_LSB_USB(self):
        return self.LSB_USB

    def set_LSB_USB(self, LSB_USB):
        self.LSB_USB = LSB_USB
        self.blocks_multiply_const_vxx_0.set_k(1-2*self.LSB_USB)
        self.freq_xlating_fir_filter_xxx_0.set_center_freq(self.Ffine-self.Largeur_filtre_SSB/2+self.LSB_USB*self.Largeur_filtre_SSB-100+self.LSB_USB*200)

    def get_G3(self):
        return self.G3

    def set_G3(self, G3):
        self.G3 = G3

    def get_G2(self):
        return self.G2

    def set_G2(self, G2):
        self.G2 = G2
        self.soapy_plutosdr_source_0.set_gain(0, min(max(self.G2, 0.0), 73.0))

    def get_G1(self):
        return self.G1

    def set_G1(self, G1):
        self.G1 = G1
        self.soapy_plutosdr_source_0.set_gain_mode(0, self.G1)

    def get_Fsdr(self):
        return self.Fsdr

    def set_Fsdr(self, Fsdr):
        self.Fsdr = Fsdr
        self.soapy_plutosdr_source_0.set_frequency(0, self.Fsdr)

    def get_Ffine(self):
        return self.Ffine

    def set_Ffine(self, Ffine):
        self.Ffine = Ffine
        self.freq_xlating_fir_filter_xxx_0.set_center_freq(self.Ffine-self.Largeur_filtre_SSB/2+self.LSB_USB*self.Largeur_filtre_SSB-100+self.LSB_USB*200)
        self.freq_xlating_fir_filter_xxx_0_0.set_center_freq(self.Ffine)
        self.freq_xlating_fir_filter_xxx_0_1.set_center_freq(self.Ffine)
        self.freq_xlating_fir_filter_xxx_0_2.set_center_freq(self.Ffine)



def argument_parser():
    description = 'RX for Adalm-Pluto'
    parser = ArgumentParser(description=description)
    parser.add_argument(
        "--SampRate", dest="SampRate", type=eng_float, default=eng_notation.num_to_str(float(1200000)),
        help="Set SampRate [default=%(default)r]")
    parser.add_argument(
        "--device", dest="device", type=str, default='',
        help="Set device [default=%(default)r]")
    return parser


def main(top_block_cls=RX_Pluto_sanw_v5, options=None):
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
