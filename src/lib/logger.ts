// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function logStructured(event: string, data: Record<string, any>) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    ...data
  }));
}
