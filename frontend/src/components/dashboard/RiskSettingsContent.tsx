"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { ToggleSwitch } from "@/components/dashboard/ToggleSwitch";
import {
  defaultRiskSettings,
  type RiskSettings,
} from "@/data/dashboard";
import { getRiskSettings, updateRiskSettings } from "@/lib/api";
import { getErrorMessage } from "@/lib/api-types";

function cloneSettings(settings: RiskSettings): RiskSettings {
  return {
    ...settings,
    rules: settings.rules.map((rule) => ({ ...rule })),
  };
}

export function RiskSettingsContent() {
  const [settings, setSettings] = useState<RiskSettings>(() =>
    cloneSettings(defaultRiskSettings),
  );
  const [baseline, setBaseline] = useState<RiskSettings>(() =>
    cloneSettings(defaultRiskSettings),
  );
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRiskSettings()
      .then((current) => {
        if (cancelled) return;
        const next = cloneSettings(current);
        setSettings(next);
        setBaseline(cloneSettings(current));
        setError(null);
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(getErrorMessage(caught, "Unable to load risk settings."));
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateThreshold = (
    key: "highRiskThreshold" | "mediumRiskThreshold" | "amountAlert",
    value: number,
  ) => {
    setSaved(false);
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    setPending(true);
    setError(null);
    try {
      const savedSettings = await updateRiskSettings(settings);
      const next = cloneSettings(savedSettings);
      setSettings(next);
      setBaseline(cloneSettings(savedSettings));
      setSaved(true);
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to save risk settings."));
      setSaved(false);
    } finally {
      setPending(false);
    }
  };

  const handleReset = () => {
    setSaved(false);
    setError(null);
    setSettings(cloneSettings(baseline));
  };

  return (
    <Container>
      <PageHeader
        title="Risk Configuration"
        description="Customize detection thresholds and focus areas used by Claude during statement analysis."
        actions={
          <>
            <ActionButton
              type="button"
              variant="secondary"
              disabled={!ready || pending}
              onClick={handleReset}
            >
              Reset
            </ActionButton>
            <ActionButton
              type="button"
              disabled={!ready || pending}
              onClick={() => void handleSave()}
            >
              {pending ? "Saving…" : "Save Changes"}
            </ActionButton>
          </>
        }
      />

      {!ready ? (
        <p className="mt-5 text-[14px] font-light text-subtle">Loading risk settings…</p>
      ) : null}

      {error ? (
        <p className="mt-5 text-sm text-[#9f1239]" role="alert">
          {error}
        </p>
      ) : null}

      {saved ? (
        <p className="mt-5 rounded-[12px] border border-primary-pale bg-sunken px-4 py-3 text-[14px] font-medium text-primary-deep">
          Settings saved. New statement analyses will use these thresholds and enabled rules in the
          Claude prompt.
        </p>
      ) : null}

      <Panel className="mt-8 p-5 sm:p-6">
        <h2 className="text-[18px] font-bold text-ink">Risk Score Thresholds</h2>
        <p className="mt-1.5 text-[14px] font-light text-subtle">
          Define severity bands and amount alerts that Claude applies when judging findings
        </p>

        <div className="mt-6 space-y-7">
          <ThresholdField
            label="High Risk Threshold"
            valueLabel={`${settings.highRiskThreshold}%`}
            hint="Findings at or above this confidence band should be treated as high severity"
            min={1}
            max={100}
            value={settings.highRiskThreshold}
            onChange={(value) => updateThreshold("highRiskThreshold", value)}
          />
          <ThresholdField
            label="Medium Risk Threshold"
            valueLabel={`${settings.mediumRiskThreshold}%`}
            hint="Findings at or above this confidence band should be treated as medium severity"
            min={1}
            max={100}
            value={settings.mediumRiskThreshold}
            onChange={(value) => updateThreshold("mediumRiskThreshold", value)}
          />
          <ThresholdField
            label="Transaction Amount Alert"
            valueLabel={`$${settings.amountAlert.toLocaleString()}`}
            hint="Ask Claude to scrutinize amounts at or above this value"
            min={100}
            max={20000}
            step={50}
            value={settings.amountAlert}
            onChange={(value) => updateThreshold("amountAlert", value)}
          />
        </div>
      </Panel>

      <Panel className="mt-5 p-5 sm:p-6">
        <h2 className="text-[18px] font-bold text-ink">Detection Rules</h2>
        <p className="mt-1.5 text-[14px] font-light text-subtle">
          Enable or disable focus areas included in the analysis prompt
        </p>

        <ul className="mt-5 divide-y divide-hairline">
          {settings.rules.map((rule) => (
            <li
              key={rule.id}
              className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div>
                <p className="text-[15px] font-semibold text-ink">{rule.title}</p>
                <p className="mt-1 text-[13.5px] font-light text-subtle">
                  {rule.description}
                </p>
              </div>
              <ToggleSwitch
                checked={rule.enabled}
                label={rule.title}
                onChange={(checked) => {
                  setSaved(false);
                  setSettings((current) => ({
                    ...current,
                    rules: current.rules.map((item) =>
                      item.id === rule.id ? { ...item, enabled: checked } : item,
                    ),
                  }));
                }}
              />
            </li>
          ))}
        </ul>
      </Panel>
    </Container>
  );
}

type ThresholdFieldProps = {
  label: string;
  valueLabel: string;
  hint: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
};

function ThresholdField({
  label,
  valueLabel,
  hint,
  min,
  max,
  step = 1,
  value,
  onChange,
}: ThresholdFieldProps) {
  const progress = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <label className="text-[15px] font-semibold text-ink">{label}</label>
        <span className="text-[18px] font-bold text-primary">{valueLabel}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{
          background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${progress}%, var(--line) ${progress}%, var(--line) 100%)`,
        }}
        className="range-primary mt-3 h-2 w-full cursor-pointer appearance-none rounded-full"
      />
      <p className="mt-2 text-[13.5px] font-light text-subtle">{hint}</p>
    </div>
  );
}
