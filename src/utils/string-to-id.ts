export const stringToId = (name: string) => {
  const hash = Array.from(name).reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) >>> 0;
  }, 0);

  return hash.toString(36).padStart(8, '0').slice(0, 8);
};
