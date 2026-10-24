export function isMetaTokenExpiry(error) {
  return error !== null && typeof error === "object" && (error.code === 190 || error.code === 102);
}
