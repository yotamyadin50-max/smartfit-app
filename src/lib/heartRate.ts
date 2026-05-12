/**
 * Bluetooth Low Energy Heart Rate Service (UUID 0x180D)
 * Works in Chrome / Edge on Android, Windows, macOS, Linux.
 * NOT available on Safari / iOS (Apple blocks Web Bluetooth).
 *
 * Samsung Galaxy Watch 4+, Polar H10, Garmin chest straps, and many
 * BLE heart-rate monitors all advertise this standard GATT service.
 *
 * Apple Watch only works on macOS via Web Bluetooth.
 * On iOS the only real path is a native app + HealthKit.
 */

const HR_SERVICE     = 0x180D           // Heart Rate GATT service
const HR_MEASUREMENT = 0x2A37           // Heart Rate Measurement characteristic

type BluetoothRemoteGATTCharacteristic = EventTarget & {
  value?: DataView
  startNotifications: () => Promise<BluetoothRemoteGATTCharacteristic>
  stopNotifications: () => Promise<BluetoothRemoteGATTCharacteristic>
}

type BluetoothRemoteGATTServer = {
  connected: boolean
  connect: () => Promise<BluetoothRemoteGATTServer>
  disconnect: () => void
  getPrimaryService: (service: number) => Promise<{
    getCharacteristic: (characteristic: number) => Promise<BluetoothRemoteGATTCharacteristic>
  }>
}

type BluetoothDevice = EventTarget & {
  gatt?: BluetoothRemoteGATTServer
  name?: string
}

type Bluetooth = {
  requestDevice: (options: {
    acceptAllDevices?: boolean
    filters?: { services: number[] }[]
    optionalServices?: number[]
  }) => Promise<BluetoothDevice>
}

// ── Subscriber list ─────────────────────────────────────────────────────────

type HRListener = (bpm: number) => void
const listeners = new Set<HRListener>()

let _bpm      = 0
let _device: BluetoothDevice | null = null
let _char:   BluetoothRemoteGATTCharacteristic | null = null
let _connectedName = ''

function emit(bpm: number) {
  _bpm = bpm
  listeners.forEach(fn => fn(bpm))
}

// ── Public API ───────────────────────────────────────────────────────────────

/** True if the browser supports Web Bluetooth */
export function isBLESupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator
}

/** True if a device is currently connected */
export function isHRConnected(): boolean {
  return _device?.gatt?.connected ?? false
}

/** Latest HR reading (0 = no reading yet) */
export function getCurrentHR(): number {
  return _bpm
}

/** Name of the connected device, or '' */
export function getConnectedDeviceName(): string {
  return _connectedName
}

/**
 * Subscribe to heart rate updates.
 * Returns an unsubscribe function.
 */
export function onHeartRate(fn: HRListener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * Open the browser's Bluetooth device picker and connect to any
 * BLE device advertising the Heart Rate service.
 *
 * `mode`:
 *  - 'hr'  (default) — show only devices that advertise the HR service
 *  - 'any' — show ALL nearby BLE devices (broader scan), still reads HR if available
 *
 * Throws on user cancel or on unsupported browser.
 */
export async function connectBLEHeartRate(mode: 'hr' | 'any' = 'hr'): Promise<{ name: string }> {
  if (!isBLESupported()) {
    throw new Error('Web Bluetooth is not available in this browser or platform.')
  }

  // Ask the user to pick a BLE device
  const requestOptions = mode === 'any'
    ? { acceptAllDevices: true, optionalServices: [HR_SERVICE] }
    : { filters: [{ services: [HR_SERVICE] }] }

  const device = await (navigator as Navigator & { bluetooth: Bluetooth }).bluetooth.requestDevice(requestOptions)

  _device = device
  _connectedName = device.name ?? 'BLE Device'

  // Handle unexpected disconnection
  device.addEventListener('gattserverdisconnected', () => {
    _bpm = 0
    _connectedName = ''
    listeners.forEach(fn => fn(0))
  })

  const server = await device.gatt!.connect()
  const service = await server.getPrimaryService(HR_SERVICE)
  _char = await service.getCharacteristic(HR_MEASUREMENT)

  _char.addEventListener('characteristicvaluechanged', (event: Event) => {
    const val = (event.target as BluetoothRemoteGATTCharacteristic).value!
    // Byte 0 is flags: bit 0 = 0 → 8-bit BPM, bit 0 = 1 → 16-bit BPM
    const flags = val.getUint8(0)
    const bpm   = flags & 0x01 ? val.getUint16(1, true) : val.getUint8(1)
    emit(bpm)
  })

  await _char.startNotifications()
  return { name: _connectedName }
}

/** Gracefully disconnect and reset state */
export async function disconnectBLE() {
  try { await _char?.stopNotifications() } catch { /* ignore */ }
  try { if (_device?.gatt?.connected) _device.gatt.disconnect() } catch { /* ignore */ }
  _device = null
  _char   = null
  _bpm    = 0
  _connectedName = ''
}

// ── Heart-rate zone helpers ──────────────────────────────────────────────────

export type HRZone = 'rest' | 'easy' | 'fatburn' | 'cardio' | 'peak' | 'max'

/** Estimate max HR using Tanaka formula: 208 − 0.7 × age */
export function maxHR(age = 30): number {
  return Math.round(208 - 0.7 * Math.max(10, Math.min(100, age)))
}

export function getHRZone(bpm: number, age = 30): HRZone {
  if (bpm <= 0)  return 'rest'
  const max = maxHR(age)
  const pct = bpm / max
  if (pct < 0.50) return 'rest'
  if (pct < 0.60) return 'easy'
  if (pct < 0.70) return 'fatburn'
  if (pct < 0.80) return 'cardio'
  if (pct < 0.90) return 'peak'
  return 'max'
}

export const HR_ZONE_COLOR: Record<HRZone, string> = {
  rest:    '#64748b',
  easy:    '#22c55e',
  fatburn: '#84cc16',
  cardio:  '#f59e0b',
  peak:    '#f97316',
  max:     '#ef4444',
}

export const HR_ZONE_LABEL: Record<HRZone, { en: string; he: string }> = {
  rest:    { en: 'Rest',     he: 'מנוחה' },
  easy:    { en: 'Easy',     he: 'קל' },
  fatburn: { en: 'Fat Burn', he: 'שריפת שומן' },
  cardio:  { en: 'Cardio',   he: 'קרדיו' },
  peak:    { en: 'Peak',     he: 'שיא' },
  max:     { en: 'Max!',     he: 'מקסימום!' },
}
