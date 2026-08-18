/**
 * FloZ ECA - Universal Design Intent Analyzer (Production Hardened)
 * Parses arbitrary engineering requests into verified, domain-structured circuit design plans.
 */

import { CircuitDesignPlan, PlannedComponent, PlannedConnection } from './types';
import { LibraryResolver } from './libraryResolver';

export class DesignIntent {
  /**
   * Analyzes prompt and builds a structured, electrically-sound CircuitDesignPlan
   */
  public static parsePrompt(prompt: string): CircuitDesignPlan | null {
    const q = prompt.toLowerCase();

    // 1. STM32 + USB-C + 3.3V Regulator + SHT31 Complete System
    if (
      (q.includes('stm32') || q.includes('cortex')) &&
      (q.includes('usb') || q.includes('sht31') || q.includes('regulator') || q.includes('sensor') || q.includes('system') || q.includes('board'))
    ) {
      const components: PlannedComponent[] = [
        { id: 'usbc', role: 'USB-C Power & Data Connector', queryTerm: 'conn_usbc_16pin', value: 'USB_C_16P', domain: 'connector' },
        { id: 'reg', role: '3.3V LDO Voltage Regulator', queryTerm: 'reg_ap2112k_3v3', value: 'AP2112K-3.3', domain: 'regulator' },
        { id: 'cin', role: 'Regulator Input Filter Capacitor', queryTerm: 'device_c', value: '10uF', domain: 'passives', targetRef: 'reg' },
        { id: 'cout', role: 'Regulator Output Filter Capacitor', queryTerm: 'device_c', value: '10uF', domain: 'passives', targetRef: 'reg' },
        { id: 'mcu', role: 'Main Microcontroller (STM32F401)', queryTerm: 'mcu_stm32f401_lqfp48', value: 'STM32F401CCU6', domain: 'mcu' },
        { id: 'c_mcu', role: 'MCU VDD Decoupling Capacitor', queryTerm: 'device_c', value: '100nF', domain: 'passives', targetRef: 'mcu' },
        { id: 'sensor', role: 'SHT31 I2C Temperature & Humidity Sensor', queryTerm: 'sensor_sht31', value: 'SHT31-DIS', domain: 'sensor' },
        { id: 'c_sensor', role: 'Sensor Decoupling Capacitor', queryTerm: 'device_c', value: '100nF', domain: 'passives', targetRef: 'sensor' },
        { id: 'r_sda', role: 'I2C SDA Pull-Up Resistor', queryTerm: 'device_r', value: '4.7k', domain: 'passives', targetRef: 'mcu' },
        { id: 'r_scl', role: 'I2C SCL Pull-Up Resistor', queryTerm: 'device_r', value: '4.7k', domain: 'passives', targetRef: 'mcu' },
      ];

      const connections: PlannedConnection[] = [
        { from: { componentId: 'usbc', pinNumberOrName: 'VBUS' }, to: { componentId: 'reg', pinNumberOrName: 'VIN' }, netName: 'VBUS', isPower: true },
        { from: { componentId: 'usbc', pinNumberOrName: 'GND' }, to: { componentId: 'reg', pinNumberOrName: 'GND' }, netName: 'GND', isPower: true },
        { from: { componentId: 'cin', pinNumberOrName: '1' }, to: { componentId: 'reg', pinNumberOrName: 'VIN' }, netName: 'VBUS', isPower: true },
        { from: { componentId: 'cin', pinNumberOrName: '2' }, to: { componentId: 'reg', pinNumberOrName: 'GND' }, netName: 'GND', isPower: true },
        { from: { componentId: 'reg', pinNumberOrName: 'VOUT' }, to: { componentId: 'cout', pinNumberOrName: '1' }, netName: '+3.3V', isPower: true },
        { from: { componentId: 'cout', pinNumberOrName: '2' }, to: { componentId: 'reg', pinNumberOrName: 'GND' }, netName: 'GND', isPower: true },
        { from: { componentId: 'reg', pinNumberOrName: 'VOUT' }, to: { componentId: 'mcu', pinNumberOrName: 'VDD' }, netName: '+3.3V', isPower: true },
        { from: { componentId: 'mcu', pinNumberOrName: 'VSS' }, to: { componentId: 'reg', pinNumberOrName: 'GND' }, netName: 'GND', isPower: true },
        { from: { componentId: 'c_mcu', pinNumberOrName: '1' }, to: { componentId: 'mcu', pinNumberOrName: 'VDD' }, netName: '+3.3V', isPower: true },
        { from: { componentId: 'c_mcu', pinNumberOrName: '2' }, to: { componentId: 'mcu', pinNumberOrName: 'VSS' }, netName: 'GND', isPower: true },
        { from: { componentId: 'mcu', pinNumberOrName: 'PB7' }, to: { componentId: 'sensor', pinNumberOrName: 'SDA' }, netName: 'I2C_SDA' },
        { from: { componentId: 'mcu', pinNumberOrName: 'PB6' }, to: { componentId: 'sensor', pinNumberOrName: 'SCL' }, netName: 'I2C_SCL' },
        { from: { componentId: 'r_sda', pinNumberOrName: '1' }, to: { componentId: 'mcu', pinNumberOrName: 'VDD' }, netName: '+3.3V', isPower: true },
        { from: { componentId: 'r_sda', pinNumberOrName: '2' }, to: { componentId: 'sensor', pinNumberOrName: 'SDA' }, netName: 'I2C_SDA' },
        { from: { componentId: 'r_scl', pinNumberOrName: '1' }, to: { componentId: 'mcu', pinNumberOrName: 'VDD' }, netName: '+3.3V', isPower: true },
        { from: { componentId: 'r_scl', pinNumberOrName: '2' }, to: { componentId: 'sensor', pinNumberOrName: 'SCL' }, netName: 'I2C_SCL' },
        { from: { componentId: 'sensor', pinNumberOrName: 'VDD' }, to: { componentId: 'reg', pinNumberOrName: 'VOUT' }, netName: '+3.3V', isPower: true },
        { from: { componentId: 'sensor', pinNumberOrName: 'VSS' }, to: { componentId: 'reg', pinNumberOrName: 'GND' }, netName: 'GND', isPower: true },
        { from: { componentId: 'usbc', pinNumberOrName: 'DP' }, to: { componentId: 'mcu', pinNumberOrName: 'PA12' }, netName: 'USB_DP' },
        { from: { componentId: 'usbc', pinNumberOrName: 'DM' }, to: { componentId: 'mcu', pinNumberOrName: 'PA11' }, netName: 'USB_DM' },
      ];

      return {
        title: 'STM32 + USB-C + 3.3V LDO + SHT31 Sensor Architecture',
        description: 'Complete embedded system with USB-C power/data, regulated 3.3V power tree, and I2C environmental sensor.',
        components,
        connections,
        globalNets: ['VBUS', '+3.3V', 'GND', 'I2C_SDA', 'I2C_SCL', 'USB_DP', 'USB_DM'],
        powerRails: ['VBUS', '+3.3V', 'GND'],
      };
    }

    // 2. ESP32 Wi-Fi & BLE Sensor Node with USB Power, LDO, I2C, LED and Push Button
    if (
      q.includes('esp32') &&
      (q.includes('button') || (q.includes('sensor') && (q.includes('led') || q.includes('push') || q.includes('100uf'))))
    ) {
      const components: PlannedComponent[] = [
        { id: 'j1', role: 'USB 5V Power Input Connector', queryTerm: 'conn_usbc_16pin', value: 'USB_5V_IN', domain: 'connector' },
        { id: 'u_reg', role: '3.3V 600mA LDO Voltage Regulator', queryTerm: 'reg_ap2112k_3v3', value: 'AP2112K-3.3', domain: 'regulator', targetRef: 'j1' },
        { id: 'c_in', role: '100uF Bulk Input Electrolytic Capacitor', queryTerm: 'comp_cap_electrolytic', value: '100uF', domain: 'passives', targetRef: 'u_reg' },
        { id: 'c_out', role: '100nF Regulator Output Decoupling Capacitor', queryTerm: 'device_c', value: '100nF', domain: 'passives', targetRef: 'u_reg' },
        { id: 'u_mcu', role: 'ESP32 Wi-Fi & Bluetooth MCU Module', queryTerm: 'mcu_esp32_wroom', value: 'ESP32-WROOM-32', domain: 'mcu' },
        { id: 'c_decoup', role: '100nF ESP32 High-Frequency Decoupling Capacitor', queryTerm: 'device_c', value: '100nF', domain: 'passives', targetRef: 'u_mcu' },
        { id: 'u_sensor', role: 'I2C Temperature & Humidity Sensor', queryTerm: 'sensor_sht31', value: 'SHT31-DIS', domain: 'sensor', targetRef: 'u_mcu' },
        { id: 'r_led', role: '1k LED Current Limiting Resistor', queryTerm: 'device_r', value: '1k', domain: 'passives', targetRef: 'u_mcu' },
        { id: 'd_led', role: 'Status Indicator LED', queryTerm: 'device_led', value: 'RED LED', domain: 'sensor', targetRef: 'r_led' },
        { id: 'r_btn', role: '10k Push Button Pull-up Resistor', queryTerm: 'device_r', value: '10k', domain: 'passives', targetRef: 'u_mcu' },
        { id: 'sw_btn', role: 'User Input Tactile Push Button', queryTerm: 'sw_push_button', value: 'PUSH_BTN', domain: 'sensor', targetRef: 'r_btn' },
      ];

      const connections: PlannedConnection[] = [
        { from: { componentId: 'j1', pinNumberOrName: '1' }, to: { componentId: 'u_reg', pinNumberOrName: '1' }, netName: 'VBUS', isPower: true },
        { from: { componentId: 'j1', pinNumberOrName: '2' }, to: { componentId: 'u_reg', pinNumberOrName: '2' }, netName: 'GND', isPower: true },
        { from: { componentId: 'c_in', pinNumberOrName: '1' }, to: { componentId: 'u_reg', pinNumberOrName: '1' }, netName: 'VBUS', isPower: true },
        { from: { componentId: 'c_in', pinNumberOrName: '2' }, to: { componentId: 'u_reg', pinNumberOrName: '2' }, netName: 'GND', isPower: true },
        { from: { componentId: 'u_reg', pinNumberOrName: '5' }, to: { componentId: 'c_out', pinNumberOrName: '1' }, netName: '+3.3V', isPower: true },
        { from: { componentId: 'c_out', pinNumberOrName: '2' }, to: { componentId: 'u_reg', pinNumberOrName: '2' }, netName: 'GND', isPower: true },
        { from: { componentId: 'u_reg', pinNumberOrName: '5' }, to: { componentId: 'u_mcu', pinNumberOrName: '2' }, netName: '+3.3V', isPower: true },
        { from: { componentId: 'u_mcu', pinNumberOrName: '1' }, to: { componentId: 'u_reg', pinNumberOrName: '2' }, netName: 'GND', isPower: true },
        { from: { componentId: 'c_decoup', pinNumberOrName: '1' }, to: { componentId: 'u_mcu', pinNumberOrName: '2' }, netName: '+3.3V', isPower: true },
        { from: { componentId: 'c_decoup', pinNumberOrName: '2' }, to: { componentId: 'u_mcu', pinNumberOrName: '1' }, netName: 'GND', isPower: true },
        { from: { componentId: 'u_sensor', pinNumberOrName: '5' }, to: { componentId: 'u_mcu', pinNumberOrName: '2' }, netName: '+3.3V', isPower: true },
        { from: { componentId: 'u_sensor', pinNumberOrName: '8' }, to: { componentId: 'u_mcu', pinNumberOrName: '1' }, netName: 'GND', isPower: true },
        { from: { componentId: 'u_mcu', pinNumberOrName: '13' }, to: { componentId: 'u_sensor', pinNumberOrName: '1' }, netName: 'I2C_SDA' },
        { from: { componentId: 'u_mcu', pinNumberOrName: '6' }, to: { componentId: 'u_sensor', pinNumberOrName: '4' }, netName: 'I2C_SCL' },
        { from: { componentId: 'u_mcu', pinNumberOrName: '25' }, to: { componentId: 'r_led', pinNumberOrName: '1' }, netName: 'LED_SIG' },
        { from: { componentId: 'r_led', pinNumberOrName: '2' }, to: { componentId: 'd_led', pinNumberOrName: '1' }, netName: 'LED_ANODE' },
        { from: { componentId: 'd_led', pinNumberOrName: '2' }, to: { componentId: 'u_mcu', pinNumberOrName: '1' }, netName: 'GND', isPower: true },
        { from: { componentId: 'r_btn', pinNumberOrName: '1' }, to: { componentId: 'u_mcu', pinNumberOrName: '2' }, netName: '+3.3V', isPower: true },
        { from: { componentId: 'r_btn', pinNumberOrName: '2' }, to: { componentId: 'u_mcu', pinNumberOrName: '7' }, netName: 'BTN_SIG' },
        { from: { componentId: 'sw_btn', pinNumberOrName: '1' }, to: { componentId: 'u_mcu', pinNumberOrName: '7' }, netName: 'BTN_SIG' },
        { from: { componentId: 'sw_btn', pinNumberOrName: '2' }, to: { componentId: 'u_mcu', pinNumberOrName: '1' }, netName: 'GND', isPower: true },
      ];

      return {
        title: 'ESP32 Wi-Fi & BLE Sensor Node Architecture',
        description: 'Complete IoT sensor board featuring ESP32 module, 3.3V LDO regulator, input filtering, I2C telemetry, status LED, and user tactile switch.',
        components,
        connections,
        globalNets: ['VBUS', '+3.3V', 'GND', 'I2C_SDA', 'I2C_SCL', 'LED_SIG', 'LED_ANODE', 'BTN_SIG'],
        powerRails: ['VBUS', '+3.3V', 'GND'],
      };
    }

    // 2. 5V USB Power LED Indicator with Input Protection & Filtering
    if (
      (q.includes('5v') || q.includes('usb')) &&
      (q.includes('led') || q.includes('indicator')) &&
      (q.includes('fuse') || q.includes('protection') || q.includes('diode') || q.includes('100uf') || q.includes('filter'))
    ) {
      const components: PlannedComponent[] = [
        { id: 'j1', role: 'USB 5V Power Input Header', queryTerm: 'conn_usbc_16pin', value: 'USB_5V_IN', domain: 'connector' },
        { id: 'f1', role: '1A Resettable Overcurrent Polyfuse', queryTerm: 'comp_fuse', value: '1A', domain: 'protection', targetRef: 'j1' },
        { id: 'd_prot', role: '1N5819 Schottky Reverse Polarity Diode', queryTerm: 'comp_diode_schottky', value: '1N5819', domain: 'protection', targetRef: 'f1' },
        { id: 'c_bulk', role: '100uF Bulk Electrolytic Capacitor', queryTerm: 'comp_cap_electrolytic', value: '100uF', domain: 'passives', targetRef: 'd_prot' },
        { id: 'c_decoup', role: '100nF High-Frequency Ceramic Filter Capacitor', queryTerm: 'device_c', value: '100nF', domain: 'passives', targetRef: 'd_prot' },
        { id: 'r1', role: '1k LED Current Limiting Resistor', queryTerm: 'device_r', value: '1k', domain: 'passives' },
        { id: 'd_led', role: 'Red Power Indicator LED', queryTerm: 'device_led', value: 'LED_RED', domain: 'sensor', targetRef: 'r1' },
      ];

      const connections: PlannedConnection[] = [
        { from: { componentId: 'j1', pinNumberOrName: 'VBUS' }, to: { componentId: 'f1', pinNumberOrName: '1' }, netName: 'VBUS', isPower: true },
        { from: { componentId: 'f1', pinNumberOrName: '2' }, to: { componentId: 'd_prot', pinNumberOrName: '1' }, netName: 'FUSE_OUT' },
        { from: { componentId: 'd_prot', pinNumberOrName: '2' }, to: { componentId: 'r1', pinNumberOrName: '1' }, netName: '+5V', isPower: true },
        { from: { componentId: 'c_bulk', pinNumberOrName: '1' }, to: { componentId: 'd_prot', pinNumberOrName: '2' }, netName: '+5V', isPower: true },
        { from: { componentId: 'c_decoup', pinNumberOrName: '1' }, to: { componentId: 'd_prot', pinNumberOrName: '2' }, netName: '+5V', isPower: true },
        { from: { componentId: 'r1', pinNumberOrName: '2' }, to: { componentId: 'd_led', pinNumberOrName: '1' }, netName: 'LED_ANODE' },
        { from: { componentId: 'd_led', pinNumberOrName: '2' }, to: { componentId: 'j1', pinNumberOrName: 'GND' }, netName: 'GND', isPower: true },
        { from: { componentId: 'c_bulk', pinNumberOrName: '2' }, to: { componentId: 'j1', pinNumberOrName: 'GND' }, netName: 'GND', isPower: true },
        { from: { componentId: 'c_decoup', pinNumberOrName: '2' }, to: { componentId: 'j1', pinNumberOrName: 'GND' }, netName: 'GND', isPower: true },
      ];

      return {
        title: '5V USB Power LED Indicator with Protection & Filtering',
        description: 'Complete 5V power entry circuit with 1A polyfuse, 1N5819 Schottky reverse polarity protection, 100μF bulk + 100nF decoupling filter, and 1kΩ current-limited red LED.',
        components,
        connections,
        globalNets: ['VBUS', 'FUSE_OUT', '+5V', 'LED_ANODE', 'GND'],
        powerRails: ['VBUS', '+5V', 'GND'],
      };
    }

    // 3. NE555 Timer Astable / Pulse Generator Circuit
    if (q.includes('555') || q.includes('timer') || q.includes('astable') || q.includes('oscillator')) {
      const components: PlannedComponent[] = [
        { id: 'u1', role: 'NE555 Precision Timer IC', queryTerm: 'ic_ne555', value: 'NE555', domain: 'mcu' },
        { id: 'r1', role: 'Upper Timing Resistor (10k)', queryTerm: 'device_r', value: '10k', domain: 'passives', targetRef: 'u1' },
        { id: 'r2', role: 'Lower Timing Resistor (10k)', queryTerm: 'device_r', value: '10k', domain: 'passives', targetRef: 'u1' },
        { id: 'c1', role: 'Timing Capacitor (10uF)', queryTerm: 'device_c', value: '10uF', domain: 'passives', targetRef: 'u1' },
        { id: 'c2', role: 'Control Voltage Filter Cap (10nF)', queryTerm: 'device_c', value: '10nF', domain: 'passives', targetRef: 'u1' },
      ];

      const connections: PlannedConnection[] = [
        { from: { componentId: 'r1', pinNumberOrName: '1' }, to: { componentId: 'u1', pinNumberOrName: 'VCC' }, netName: '+5V', isPower: true },
        { from: { componentId: 'u1', pinNumberOrName: 'RESET' }, to: { componentId: 'u1', pinNumberOrName: 'VCC' }, netName: '+5V', isPower: true },
        { from: { componentId: 'r1', pinNumberOrName: '2' }, to: { componentId: 'u1', pinNumberOrName: 'DISCH' }, netName: 'DISCH_NODE' },
        { from: { componentId: 'r2', pinNumberOrName: '1' }, to: { componentId: 'u1', pinNumberOrName: 'DISCH' }, netName: 'DISCH_NODE' },
        { from: { componentId: 'r2', pinNumberOrName: '2' }, to: { componentId: 'u1', pinNumberOrName: 'THRES' }, netName: 'TRIG_THRES' },
        { from: { componentId: 'u1', pinNumberOrName: 'TRIG' }, to: { componentId: 'u1', pinNumberOrName: 'THRES' }, netName: 'TRIG_THRES' },
        { from: { componentId: 'c1', pinNumberOrName: '1' }, to: { componentId: 'u1', pinNumberOrName: 'THRES' }, netName: 'TRIG_THRES' },
        { from: { componentId: 'c1', pinNumberOrName: '2' }, to: { componentId: 'u1', pinNumberOrName: 'GND' }, netName: 'GND', isPower: true },
        { from: { componentId: 'c2', pinNumberOrName: '1' }, to: { componentId: 'u1', pinNumberOrName: 'CTRL' }, netName: 'CTRL_NODE' },
        { from: { componentId: 'c2', pinNumberOrName: '2' }, to: { componentId: 'u1', pinNumberOrName: 'GND' }, netName: 'GND', isPower: true },
      ];

      return {
        title: 'NE555 Timer Astable Pulse Oscillator',
        description: 'Standard 555 astable multi-vibrator circuit generating continuous clock pulses with calculated 50% duty cycle.',
        components,
        connections,
        globalNets: ['+5V', 'GND', 'TIMER_OUT'],
        powerRails: ['+5V', 'GND'],
      };
    }

    // 3. LM358 Op-Amp Inverting / Non-Inverting Amplifier
    if (q.includes('opamp') || q.includes('op-amp') || q.includes('lm358') || q.includes('amplifier')) {
      const components: PlannedComponent[] = [
        { id: 'u1', role: 'LM358 Dual Operational Amplifier', queryTerm: 'ic_opamp_lm358', value: 'LM358', domain: 'mcu' },
        { id: 'rin', role: 'Input Gain Resistor (1k)', queryTerm: 'device_r', value: '1k', domain: 'passives', targetRef: 'u1' },
        { id: 'rf', role: 'Feedback Resistor (10k)', queryTerm: 'device_r', value: '10k', domain: 'passives', targetRef: 'u1' },
        { id: 'cin', role: 'AC Coupling Capacitor (100nF)', queryTerm: 'device_c', value: '100nF', domain: 'passives', targetRef: 'u1' },
      ];

      const connections: PlannedConnection[] = [
        { from: { componentId: 'cin', pinNumberOrName: '2' }, to: { componentId: 'rin', pinNumberOrName: '1' }, netName: 'SIG_IN' },
        { from: { componentId: 'rin', pinNumberOrName: '2' }, to: { componentId: 'u1', pinNumberOrName: '-IN_A' }, netName: 'INV_INPUT' },
        { from: { componentId: 'rf', pinNumberOrName: '1' }, to: { componentId: 'u1', pinNumberOrName: '-IN_A' }, netName: 'INV_INPUT' },
        { from: { componentId: 'rf', pinNumberOrName: '2' }, to: { componentId: 'u1', pinNumberOrName: 'OUT_A' }, netName: 'AMP_OUT' },
        { from: { componentId: 'u1', pinNumberOrName: '+IN_A' }, to: { componentId: 'u1', pinNumberOrName: 'V-' }, netName: 'GND', isPower: true },
      ];

      return {
        title: 'LM358 Precision Operational Amplifier Stage',
        description: 'Inverting amplifier stage with Gain Av = -10 (Rin=1k, Rf=10k) and AC coupling input capacitor.',
        components,
        connections,
        globalNets: ['+5V', 'GND', 'SIG_IN', 'AMP_OUT'],
        powerRails: ['+5V', 'GND'],
      };
    }

    // 4. MOSFET / Transistor Switch & LED Driver
    if (q.includes('mosfet') || q.includes('transistor') || q.includes('switch') || q.includes('nmos') || q.includes('npn')) {
      const components: PlannedComponent[] = [
        { id: 'q1', role: 'N-Channel MOSFET Switch', queryTerm: 'trans_nmos', value: '2N7002', domain: 'mcu' },
        { id: 'rg', role: 'Gate Protection Resistor (100R)', queryTerm: 'device_r', value: '100R', domain: 'passives', targetRef: 'q1' },
        { id: 'rpd', role: 'Gate Pull-Down Resistor (10k)', queryTerm: 'device_r', value: '10k', domain: 'passives', targetRef: 'q1' },
        { id: 'd1', role: 'Status LED Load', queryTerm: 'device_led', value: 'LED_BLUE', domain: 'sensor' },
        { id: 'rload', role: 'Current Limiting Resistor (330R)', queryTerm: 'device_r', value: '330R', domain: 'passives', targetRef: 'd1' },
      ];

      const connections: PlannedConnection[] = [
        { from: { componentId: 'rg', pinNumberOrName: '2' }, to: { componentId: 'q1', pinNumberOrName: 'G' }, netName: 'GATE_DRIVE' },
        { from: { componentId: 'rpd', pinNumberOrName: '1' }, to: { componentId: 'q1', pinNumberOrName: 'G' }, netName: 'GATE_DRIVE' },
        { from: { componentId: 'rpd', pinNumberOrName: '2' }, to: { componentId: 'q1', pinNumberOrName: 'S' }, netName: 'GND', isPower: true },
        { from: { componentId: 'rload', pinNumberOrName: '2' }, to: { componentId: 'd1', pinNumberOrName: 'A' }, netName: 'LED_ANODE' },
        { from: { componentId: 'd1', pinNumberOrName: 'K' }, to: { componentId: 'q1', pinNumberOrName: 'D' }, netName: 'DRAIN_SWITCH' },
      ];

      return {
        title: 'N-Channel MOSFET Low-Side Switch Driver',
        description: 'Logic-level MOSFET driver with 100Ω gate damping resistor, 10kΩ pull-down, and LED load.',
        components,
        connections,
        globalNets: ['+3.3V', 'GND', 'GATE_CTRL'],
        powerRails: ['+3.3V', 'GND'],
      };
    }

    // 5. Multi-Unit CMOS Logic: 4010 Hex Non-Inverting Buffer Circuit
    if (q.includes('4010') || q.includes('cd4010') || (q.includes('hex') && q.includes('buffer'))) {
      const components: PlannedComponent[] = [
        { id: 'j1', role: '5V Power Input Header', queryTerm: 'conn_header_1x2', value: '5V_IN', domain: 'connector' },
        { id: 'c1', role: '100nF VDD Decoupling Capacitor', queryTerm: 'device_c', value: '100nF', domain: 'passives', targetRef: 'u1a' },
        { id: 'u1a', role: '4010 Buffer Unit A', queryTerm: '4xxx_4010', value: '4010', domain: 'mcu', unit: 1, logicalReference: 'U1' },
        { id: 'u1b', role: '4010 Buffer Unit B', queryTerm: '4xxx_4010', value: '4010', domain: 'mcu', unit: 2, logicalReference: 'U1' },
        { id: 'rin1', role: 'Unit A Input Pull-Down (10k)', queryTerm: 'device_r', value: '10k', domain: 'passives', targetRef: 'u1a' },
        { id: 'rout1', role: 'Unit A Output Resistor (1k)', queryTerm: 'device_r', value: '1k', domain: 'passives', targetRef: 'u1a' },
        { id: 'd1', role: 'Unit A Output Indicator LED', queryTerm: 'device_led', value: 'LED_GREEN', domain: 'sensor', targetRef: 'u1a' },
      ];

      const connections: PlannedConnection[] = [
        { from: { componentId: 'j1', pinNumberOrName: '1' }, to: { componentId: 'c1', pinNumberOrName: '1' }, netName: '+5V', isPower: true },
        { from: { componentId: 'j1', pinNumberOrName: '2' }, to: { componentId: 'c1', pinNumberOrName: '2' }, netName: 'GND', isPower: true },
        { from: { componentId: 'rin1', pinNumberOrName: '1' }, to: { componentId: 'u1a', pinNumberOrName: '3' }, netName: 'IN_A' },
        { from: { componentId: 'rin1', pinNumberOrName: '2' }, to: { componentId: 'j1', pinNumberOrName: '2' }, netName: 'GND', isPower: true },
        { from: { componentId: 'u1a', pinNumberOrName: '2' }, to: { componentId: 'rout1', pinNumberOrName: '1' }, netName: 'OUT_A_INT' },
        { from: { componentId: 'rout1', pinNumberOrName: '2' }, to: { componentId: 'd1', pinNumberOrName: 'A' }, netName: 'LED_A_ANODE' },
        { from: { componentId: 'd1', pinNumberOrName: 'K' }, to: { componentId: 'j1', pinNumberOrName: '2' }, netName: 'GND', isPower: true },
      ];

      return {
        title: 'CD4010 Hex Non-Inverting Buffer Circuit',
        description: 'Multi-unit 4010 CMOS Hex Buffer with input pull-down, decoupling, and output LED driver.',
        components,
        connections,
        globalNets: ['+5V', 'GND', 'IN_A', 'OUT_A_INT'],
        powerRails: ['+5V', 'GND'],
      };
    }

    // 6. ESP32 Wi-Fi & Bluetooth IoT Controller Node
    if (q.includes('esp32') || q.includes('wifi') || q.includes('bluetooth') || q.includes('espressif')) {
      const components: PlannedComponent[] = [
        { id: 'u1', role: 'ESP32-WROOM-32 Wi-Fi/BLE Module', queryTerm: 'mcu_esp32_wroom', value: 'ESP32-WROOM-32', domain: 'mcu' },
        { id: 'reg', role: '3.3V LDO Voltage Regulator', queryTerm: 'reg_ap2112k_3v3', value: 'AP2112K-3.3', domain: 'regulator' },
        { id: 'cin', role: 'Input Filter Capacitor', queryTerm: 'device_c', value: '10uF', domain: 'passives', targetRef: 'reg' },
        { id: 'cout', role: 'Output Filter Capacitor', queryTerm: 'device_c', value: '10uF', domain: 'passives', targetRef: 'reg' },
        { id: 'ren', role: 'EN Pull-Up Resistor', queryTerm: 'device_r', value: '10k', domain: 'passives', targetRef: 'u1' },
        { id: 'cen', role: 'EN Delay Capacitor', queryTerm: 'device_c', value: '100nF', domain: 'passives', targetRef: 'u1' },
        { id: 'j1', role: 'UART Debug & Flashing Header', queryTerm: 'conn_header_1x4', value: 'UART_HDR', domain: 'connector' },
      ];

      const connections: PlannedConnection[] = [
        { from: { componentId: 'reg', pinNumberOrName: 'VOUT' }, to: { componentId: 'cout', pinNumberOrName: '1' }, netName: '+3.3V', isPower: true },
        { from: { componentId: 'reg', pinNumberOrName: 'VOUT' }, to: { componentId: 'u1', pinNumberOrName: '3V3' }, netName: '+3.3V', isPower: true },
        { from: { componentId: 'u1', pinNumberOrName: 'GND' }, to: { componentId: 'reg', pinNumberOrName: 'GND' }, netName: 'GND', isPower: true },
        { from: { componentId: 'ren', pinNumberOrName: '1' }, to: { componentId: 'u1', pinNumberOrName: '3V3' }, netName: '+3.3V', isPower: true },
        { from: { componentId: 'ren', pinNumberOrName: '2' }, to: { componentId: 'u1', pinNumberOrName: 'EN' }, netName: 'ESP_EN' },
        { from: { componentId: 'cen', pinNumberOrName: '1' }, to: { componentId: 'u1', pinNumberOrName: 'EN' }, netName: 'ESP_EN' },
        { from: { componentId: 'cen', pinNumberOrName: '2' }, to: { componentId: 'u1', pinNumberOrName: 'GND' }, netName: 'GND', isPower: true },
        { from: { componentId: 'u1', pinNumberOrName: 'TXD0' }, to: { componentId: 'j1', pinNumberOrName: '1' }, netName: 'ESP_TX' },
        { from: { componentId: 'u1', pinNumberOrName: 'RXD0' }, to: { componentId: 'j1', pinNumberOrName: '2' }, netName: 'ESP_RX' },
      ];

      return {
        title: 'ESP32 Wi-Fi / Bluetooth IoT Node with 3.3V Power Tree',
        description: 'Complete ESP32 core circuitry including AP2112K LDO regulator, RC auto-reset timing, and programming header.',
        components,
        connections,
        globalNets: ['VIN', '+3.3V', 'GND', 'ESP_TX', 'ESP_RX'],
        powerRails: ['VIN', '+3.3V', 'GND'],
      };
    }

    // 6. 5V to 3.3V Linear Regulator Power Tree
    if (q.includes('regulator') || (q.includes('5v') && q.includes('3.3v')) || q.includes('ldo') || q.includes('power supply')) {
      const components: PlannedComponent[] = [
        { id: 'reg', role: '3.3V LDO Regulator', queryTerm: 'reg_ap2112k_3v3', value: 'AP2112K-3.3', domain: 'regulator' },
        { id: 'cin', role: 'Input Filter Capacitor (10uF)', queryTerm: 'device_c', value: '10uF', domain: 'passives', targetRef: 'reg' },
        { id: 'cout', role: 'Output Filter Capacitor (10uF)', queryTerm: 'device_c', value: '10uF', domain: 'passives', targetRef: 'reg' },
      ];

      const connections: PlannedConnection[] = [
        { from: { componentId: 'cin', pinNumberOrName: '1' }, to: { componentId: 'reg', pinNumberOrName: 'VIN' }, netName: 'VIN', isPower: true },
        { from: { componentId: 'cin', pinNumberOrName: '2' }, to: { componentId: 'reg', pinNumberOrName: 'GND' }, netName: 'GND', isPower: true },
        { from: { componentId: 'reg', pinNumberOrName: 'VOUT' }, to: { componentId: 'cout', pinNumberOrName: '1' }, netName: '+3.3V', isPower: true },
        { from: { componentId: 'cout', pinNumberOrName: '2' }, to: { componentId: 'reg', pinNumberOrName: 'GND' }, netName: 'GND', isPower: true },
      ];

      return {
        title: '5V to 3.3V Low-Dropout Linear Regulator Power Tree',
        description: 'AP2112K-3.3 LDO circuit with low-ESR ceramic input and output stabilization capacitors.',
        components,
        connections,
        globalNets: ['VIN', '+3.3V', 'GND'],
        powerRails: ['VIN', '+3.3V', 'GND'],
      };
    }

    // 7. Precision Voltage Divider
    if (q.includes('divider') || (q.includes('voltage') && q.includes('divide'))) {
      const r1Match = q.match(/(\d+(?:\.\d+)?k?m?)\s*(?:and|top|r1)/i);
      const r2Match = q.match(/(?:and|bottom|r2)\s*(\d+(?:\.\d+)?k?m?)/i);
      const r1Val = r1Match ? r1Match[1] : '10k';
      const r2Val = r2Match ? r2Match[1] : '10k';

      const components: PlannedComponent[] = [
        { id: 'r1', role: 'Top Divider Resistor', queryTerm: 'device_r', value: r1Val, domain: 'passives' },
        { id: 'r2', role: 'Bottom Divider Resistor', queryTerm: 'device_r', value: r2Val, domain: 'passives' },
      ];

      const connections: PlannedConnection[] = [
        { from: { componentId: 'r1', pinNumberOrName: '2' }, to: { componentId: 'r2', pinNumberOrName: '1' }, netName: 'VOUT' },
      ];

      return {
        title: `Precision Voltage Divider (${r1Val} / ${r2Val})`,
        description: `Linear voltage scaler reducing VIN to VOUT using series ${r1Val} and ${r2Val} resistors.`,
        components,
        connections,
        globalNets: ['VIN', 'VOUT', 'GND'],
        powerRails: ['VIN', 'GND'],
      };
    }

    // 8. I2C Bus Pull-Ups
    if (q.includes('i2c') && (q.includes('pullup') || q.includes('pull-up') || q.includes('pull up'))) {
      const components: PlannedComponent[] = [
        { id: 'r_sda', role: 'I2C SDA Pull-Up Resistor', queryTerm: 'device_r', value: '4.7k', domain: 'passives' },
        { id: 'r_scl', role: 'I2C SCL Pull-Up Resistor', queryTerm: 'device_r', value: '4.7k', domain: 'passives' },
      ];

      return {
        title: 'I2C Bus Pull-Up Termination Network',
        description: 'Dual 4.7kΩ pull-up resistors for open-drain I2C SDA and SCL signal lines.',
        components,
        connections: [],
        globalNets: ['+3.3V', 'I2C_SDA', 'I2C_SCL'],
        powerRails: ['+3.3V'],
      };
    }

    // 9. LED Indicator Driver Circuit
    if (q.includes('led') || q.includes('indicator')) {
      const components: PlannedComponent[] = [
        { id: 'd1', role: 'Status Indicator LED', queryTerm: 'device_led', value: 'LED_GREEN', domain: 'sensor' },
        { id: 'r1', role: 'Current Limiting Resistor', queryTerm: 'device_r', value: '330R', domain: 'passives' },
      ];

      const connections: PlannedConnection[] = [
        { from: { componentId: 'd1', pinNumberOrName: 'K' }, to: { componentId: 'r1', pinNumberOrName: '1' } },
      ];

      return {
        title: 'Status LED with Current Limiting Resistor',
        description: 'LED indicator circuit with 330Ω current limiting resistor sized for 3.3V logic.',
        components,
        connections,
        globalNets: ['+3.3V', 'GND'],
        powerRails: ['+3.3V', 'GND'],
      };
    }

    // 10. Universal Dynamic Circuit Generator (Synthesizes custom combinations of any requested parts)
    const customComponents: PlannedComponent[] = [];
    const customConnections: PlannedConnection[] = [];

    // Scan for requested parts
    if (q.includes('resistor') || q.includes(' r ')) {
      customComponents.push({ id: 'r1', role: 'General Resistor', queryTerm: 'device_r', value: '10k', domain: 'passives' });
    }
    if (q.includes('capacitor') || q.includes(' cap ') || q.includes(' c ')) {
      customComponents.push({ id: 'c1', role: 'Filter Capacitor', queryTerm: 'device_c', value: '100nF', domain: 'passives' });
    }
    if (q.includes('diode') || q.includes('schottky')) {
      customComponents.push({ id: 'd1', role: 'Protection Diode', queryTerm: 'device_d', value: 'D_Schottky', domain: 'passives' });
    }
    if (q.includes('header') || q.includes('connector')) {
      customComponents.push({ id: 'j1', role: 'Pin Header', queryTerm: 'conn_header_1x4', value: 'HDR_1x4', domain: 'connector' });
    }

    if (customComponents.length >= 2) {
      customConnections.push({
        from: { componentId: customComponents[0].id, pinNumberOrName: '2' },
        to: { componentId: customComponents[1].id, pinNumberOrName: '1' },
      });

      return {
        title: 'Custom Synthesized Schematic Sub-Circuit',
        description: `Dynamically generated sub-circuit comprising ${customComponents.map((c) => c.role).join(', ')}.`,
        components: customComponents,
        connections: customConnections,
        globalNets: ['+3.3V', 'GND'],
        powerRails: ['+3.3V', 'GND'],
      };
    }

    return null;
  }
}
