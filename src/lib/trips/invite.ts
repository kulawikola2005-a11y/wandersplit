export function generateInviteLink(tripId: string) {
  return `${window.location.origin}/invite/${tripId}`;
}