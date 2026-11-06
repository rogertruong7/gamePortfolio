// The keys that pick or go on, wherever E does. Z works too, as it does in Undertale.
export function isActionKey(event) {
  const key = event.key.toLowerCase();
  return key === "e" || key === "z";
}
