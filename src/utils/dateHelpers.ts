/**
 * @notice Adds a specified number of hours to the current date and time
 * @dev This function can be used globally to manage time-related operations like token expiry
 * @param hours The number of hours to add to the current date
 * @return A new Date object with the added hours
 */
export function addHours(hours: number): Date {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
}
