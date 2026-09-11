export function formatVolumeInMillions(volume, decimals = 1) {
  return (volume / 1000000).toFixed(decimals);
}
