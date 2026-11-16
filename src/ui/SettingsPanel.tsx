import type { Settings } from '../game/core/bus';

interface SettingsPanelProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
}

export default function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  return (
    <div className="settings-panel">
      <label className="field">
        <span>
          SENSIBILIDAD <strong>{settings.sensitivity.toFixed(2)}×</strong>
        </span>
        <input
          type="range"
          min={0.4}
          max={2.6}
          step={0.05}
          value={settings.sensitivity}
          onChange={(event) => onChange({ ...settings, sensitivity: Number(event.target.value) })}
        />
      </label>

      <label className="field field-row">
        <span>INVERTIR EJE VERTICAL</span>
        <input
          type="checkbox"
          checked={settings.invertY}
          onChange={(event) => onChange({ ...settings, invertY: event.target.checked })}
        />
      </label>

      <label className="field">
        <span>
          VOLUMEN <strong>{Math.round(settings.volume * 100)} %</strong>
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={settings.volume}
          onChange={(event) => onChange({ ...settings, volume: Number(event.target.value) })}
        />
      </label>

      <div className="field">
        <span>CALIDAD / RESOLUCIÓN INTERNA</span>
        <div className="segmented">
          {(
            [
              ['low', 'BAJA'],
              ['medium', 'MEDIA'],
              ['high', 'ALTA'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={settings.quality === value ? 'is-selected' : ''}
              onClick={() => onChange({ ...settings, quality: value })}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="tiny dim">
          La calidad baja reduce la resolución interna (más pixelado, más fotogramas en móvil).
        </p>
      </div>
    </div>
  );
}
