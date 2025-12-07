"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, DollarSign, Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface FilterControlsProps {
  amountRange: [number, number];
  onAmountRangeChange: (range: [number, number]) => void;
  selectedCountries: string[];
  onCountryChange: (countries: string[]) => void;
  selectedMerchants: string[];
  onMerchantChange: (merchants: string[]) => void;
  fraudOnly: boolean;
  onFraudOnlyChange: (value: boolean) => void;
  dateRange: { from: Date | undefined; to: Date | undefined };
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  onReset: () => void;
}

const COUNTRIES = ["US", "IN", "GB", "CA"];
const MERCHANTS = ["Amazon", "Uber", "Apple Store", "Walmart", "Target", "Netflix", "Steam"];

export default function FilterControls({
  amountRange,
  onAmountRangeChange,
  selectedCountries,
  onCountryChange,
  selectedMerchants,
  onMerchantChange,
  fraudOnly,
  onFraudOnlyChange,
  dateRange,
  onDateRangeChange,
  onReset,
}: FilterControlsProps) {
  const [localAmount, setLocalAmount] = useState<[number, number]>(amountRange);

  useEffect(() => {
    setLocalAmount(amountRange);
  }, [amountRange]);

  const toggleCountry = (country: string) => {
    if (selectedCountries.includes(country)) {
      onCountryChange(selectedCountries.filter((c) => c !== country));
    } else {
      onCountryChange([...selectedCountries, country]);
    }
  };

  const toggleMerchant = (merchant: string) => {
    if (selectedMerchants.includes(merchant)) {
      onMerchantChange(selectedMerchants.filter((m) => m !== merchant));
    } else {
      onMerchantChange([...selectedMerchants, merchant]);
    }
  };

  const handleSliderChange = (value: number[]) =>
    setLocalAmount(value as [number, number]);

  const handleSliderCommit = (value: number[]) =>
    onAmountRangeChange(value as [number, number]);

  const formatCurrency = (value: number) => `₹${value.toLocaleString("en-IN")}`;

  // helper: convert Date → yyyy-MM-dd string for <input type="date">
  const toInputValue = (d: Date | undefined) =>
    d ? format(d, "yyyy-MM-dd") : "";

  const handleFromChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? new Date(e.target.value) : undefined;
    const currentTo = dateRange.to;

    // if "to" is before new "from", push it forward
    const fixedTo =
      value && currentTo && currentTo < value ? value : currentTo;

    onDateRangeChange({ from: value, to: fixedTo });
  };

  const handleToChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? new Date(e.target.value) : undefined;
    const currentFrom = dateRange.from;

    // if "to" is set before "from", keep range valid
    const fixedTo =
      currentFrom && value && value < currentFrom ? currentFrom : value;

    onDateRangeChange({ from: currentFrom, to: fixedTo });
  };

  const dateRangeDisplay =
    dateRange.from && dateRange.to
      ? `${format(dateRange.from, "MMM dd")} - ${format(
          dateRange.to,
          "MMM dd, yyyy"
        )}`
      : dateRange.from
      ? format(dateRange.from, "MMM dd, yyyy")
      : "Pick a date range";

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl backdrop-blur">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
            <Filter className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-50">
              Advanced Filters
            </h3>
            <p className="text-xs text-slate-400">
              Filter transactions by date, amount, country, merchant & risk.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="border-red-500/70 text-red-300 hover:bg-red-500/10 hover:text-red-100"
        >
          <X className="mr-1.5 h-4 w-4" />
          Reset filters
        </Button>
      </div>

      {/* Filters grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Date Range (fixed version) */}
        <div className="space-y-3">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Date range
          </label>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <CalendarIcon className="h-4 w-4 text-blue-400" />
              <span className="truncate">{dateRangeDisplay}</span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wide text-slate-500">
                  From
                </span>
                <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5">
                  <input
                    type="date"
                    value={toInputValue(dateRange.from)}
                    onChange={handleFromChange}
                    className="w-full bg-transparent text-xs text-slate-100 outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wide text-slate-500">
                  To
                </span>
                <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5">
                  <input
                    type="date"
                    value={toInputValue(dateRange.to)}
                    onChange={handleToChange}
                    className="w-full bg-transparent text-xs text-slate-100 outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Amount Range */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            Amount range
          </label>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{formatCurrency(localAmount[0])}</span>
            <span className="text-slate-500">to</span>
            <span>{formatCurrency(localAmount[1])}</span>
          </div>
          <Slider
            value={localAmount}
            min={0}
            max={5000}
            step={100}
            onValueChange={handleSliderChange}
            onValueCommit={handleSliderCommit}
            className="mt-1"
          />
        </div>

        {/* Countries */}
        <div className="space-y-3">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Countries
          </label>
          <div className="flex flex-wrap gap-2">
            {COUNTRIES.map((country) => {
              const active = selectedCountries.includes(country);
              return (
                <Button
                  key={country}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  onClick={() => toggleCountry(country)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    active
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : "border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  {country}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Merchants */}
        <div className="space-y-3">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Merchants
          </label>
          <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
            {MERCHANTS.map((merchant) => {
              const active = selectedMerchants.includes(merchant);
              return (
                <Badge
                  key={merchant}
                  onClick={() => toggleMerchant(merchant)}
                  className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                  variant={active ? "default" : "outline"}
                >
                  {merchant}
                </Badge>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer: Fraud toggle + summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-4">
        <div className="flex items-center gap-3">
          <Switch
            checked={fraudOnly}
            onCheckedChange={onFraudOnlyChange}
            className="data-[state=checked]:bg-red-600"
          />
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-slate-100">
              {fraudOnly
                ? "Showing fraudulent transactions only"
                : "Showing all transactions"}
            </p>
            <p className="text-xs text-slate-400">
              Toggle to quickly focus on high-risk activity.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>Active filters:</span>
          {fraudOnly && (
            <Badge
              variant="outline"
              className="border-red-500/50 bg-red-500/10 text-red-300"
            >
              Fraud only
            </Badge>
          )}
          {selectedCountries.length > 0 && (
            <Badge
              variant="outline"
              className="border-sky-500/50 bg-sky-500/10 text-sky-200"
            >
              {selectedCountries.length} countries
            </Badge>
          )}
          {selectedMerchants.length > 0 && (
            <Badge
              variant="outline"
              className="border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
            >
              {selectedMerchants.length} merchants
            </Badge>
          )}
          {!fraudOnly &&
            selectedCountries.length === 0 &&
            selectedMerchants.length === 0 && (
              <span className="text-slate-500">None</span>
            )}
        </div>
      </div>
    </div>
  );
}
