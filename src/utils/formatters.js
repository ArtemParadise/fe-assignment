export function formatVolumeInMillions(volume) {
  if (typeof volume !== "number" || !Number.isFinite(volume)) {
    return null;
  }

  return volume / 1000000;
}

export function formatVolumeLabel(volume, decimals = 1) {
  const millions = formatVolumeInMillions(volume);

  return millions === null ? "N/A" : `${millions.toFixed(decimals)}M`;
}
