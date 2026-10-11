const WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen", "twenty",
];

/**
 * Section heading that follows the real number of published departments, so
 * the page never claims a fixed count. With seven departments it reads
 * exactly "Seven departments, one institutional mandate."
 */
export function departmentHeading(count: number): string {
  if (count <= 0) return "Our departments, one institutional mandate.";
  const word = count < WORDS.length ? WORDS[count] : String(count);
  const subject = count === 1 ? "department" : "departments";
  return `${word.charAt(0).toUpperCase()}${word.slice(1)} ${subject}, one institutional mandate.`;
}
