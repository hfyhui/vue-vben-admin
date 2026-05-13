export function isDeviceUpdateAllSucceeded(
  res: unknown,
  canonSuccessMessage: string,
): boolean {
  if (!res || typeof res !== 'object') return false;
  const r = res as Record<string, unknown>;
  const code = Number(r.code);
  if (code !== 100000 && code !== 200) return false;
  return r.msg === canonSuccessMessage
}

export function resolveDeviceUpdateSuccessIds(res: unknown): Set<string> {
  if (!res || typeof res !== 'object') return new Set();
  const data = (res as Record<string, any>).data;
  const raw = data?.successIds;
  if (!Array.isArray(raw)) return new Set();
  return new Set(raw.map((id: unknown) => String(id)));
}

export function isDeviceUpdateRowSucceeded(
  res: unknown,
  deviceId: unknown,
  canonSuccessMessage: string,
): boolean {
  if (deviceId === undefined || deviceId === null) return false;
  if (isDeviceUpdateAllSucceeded(res, canonSuccessMessage)) return true;
  return resolveDeviceUpdateSuccessIds(res).has(deviceId);
}
