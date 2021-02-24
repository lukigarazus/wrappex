export const isCapitalized = (str: string) => !!str.match(/^[A-Z].*$/);

export const uncapitalize = (str: string) =>
  typeof str === "string"
    ? str
      ? str[0].toLowerCase() + str.slice(1)
      : str
    : "";

export const capitalize = (str: string) =>
  typeof str === "string"
    ? str
      ? str[0].toUpperCase() + str.slice(1)
      : str
    : "";
