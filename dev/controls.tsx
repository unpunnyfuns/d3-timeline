import type { ReactNode } from 'react'
import type { LabelAlign } from '../src/core'

export interface Settings {
  rowHeight: number
  labelWidth: number
  axisHeight: number
  barInset: number
  labelPadding: number
  labelAlign: LabelAlign
  labelOffsetX: number
  labelOffsetY: number
  tickSpacing: number
  laneHeight: number
  tickFormat: 'default' | 'day' | 'iso'
  minimapPosition: 'top' | 'bottom' | 'none'
  zebra: boolean
  maxHeight: number
  manyLanes: boolean
  raiseSelected: boolean
  showDuration: boolean
}

export const defaultSettings: Settings = {
  rowHeight: 32,
  labelWidth: 160,
  axisHeight: 28,
  barInset: 4,
  labelPadding: 6,
  labelAlign: 'start',
  labelOffsetX: 0,
  labelOffsetY: 0,
  tickSpacing: 120,
  laneHeight: 6,
  tickFormat: 'default',
  minimapPosition: 'bottom',
  zebra: false,
  maxHeight: 0,
  manyLanes: false,
  raiseSelected: false,
  showDuration: false,
}

type NumericKey = {
  [K in keyof Settings]: Settings[K] extends number ? K : never
}[keyof Settings]

const ranges: Record<NumericKey, [number, number]> = {
  rowHeight: [16, 64],
  labelWidth: [0, 300],
  axisHeight: [16, 60],
  barInset: [0, 16],
  labelPadding: [0, 24],
  labelOffsetX: [-16, 16],
  labelOffsetY: [-8, 8],
  tickSpacing: [60, 300],
  laneHeight: [3, 16],
  maxHeight: [0, 600],
}

interface ControlsProps {
  value: Settings
  onChange: (next: Settings) => void
}

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="field">
    <span>{label}</span>
    {children}
  </label>
)

export const Controls = ({ value, onChange }: ControlsProps) => {
  const set = <K extends keyof Settings>(key: K, next: Settings[K]) =>
    onChange({ ...value, [key]: next })

  return (
    <div className="controls">
      {(Object.keys(ranges) as NumericKey[]).map((key) => (
        <Field
          key={key}
          label={`${key === 'laneHeight' ? 'minimap laneHeight' : key} (${key === 'maxHeight' && value[key] === 0 ? 'off' : value[key]})`}
        >
          <input
            type="range"
            min={ranges[key][0]}
            max={ranges[key][1]}
            value={value[key]}
            onChange={(event) => set(key, Number(event.target.value))}
          />
        </Field>
      ))}
      <Field label="labelAlign">
        <select
          value={value.labelAlign}
          onChange={(event) => set('labelAlign', event.target.value as LabelAlign)}
        >
          <option value="start">start</option>
          <option value="center">center</option>
          <option value="end">end</option>
        </select>
      </Field>
      <Field label="tickFormat">
        <select
          value={value.tickFormat}
          onChange={(event) => set('tickFormat', event.target.value as Settings['tickFormat'])}
        >
          <option value="default">d3 default</option>
          <option value="day">Day number</option>
          <option value="iso">ISO date</option>
        </select>
      </Field>
      <Field label="minimap position">
        <select
          value={value.minimapPosition}
          onChange={(event) =>
            set('minimapPosition', event.target.value as Settings['minimapPosition'])
          }
        >
          <option value="top">top</option>
          <option value="bottom">bottom</option>
          <option value="none">none</option>
        </select>
      </Field>
      <Field label="100 lanes">
        <input
          type="checkbox"
          checked={value.manyLanes}
          onChange={(event) => set('manyLanes', event.target.checked)}
        />
      </Field>
      <Field label="zebra lanes">
        <input
          type="checkbox"
          checked={value.zebra}
          onChange={(event) => set('zebra', event.target.checked)}
        />
      </Field>
      <Field label="onRender: raise selected">
        <input
          type="checkbox"
          checked={value.raiseSelected}
          onChange={(event) => set('raiseSelected', event.target.checked)}
        />
      </Field>
      <Field label="onRender: duration badge">
        <input
          type="checkbox"
          checked={value.showDuration}
          onChange={(event) => set('showDuration', event.target.checked)}
        />
      </Field>
      <button type="button" onClick={() => onChange(defaultSettings)}>
        Reset
      </button>
    </div>
  )
}
