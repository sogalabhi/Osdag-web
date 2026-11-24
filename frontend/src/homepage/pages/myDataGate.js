/**
 * What the saved-data page does for the current sign-in state: "wait" until the state is known,
 * "guest" when nobody is signed in (the page has nothing to show and its endpoint needs a
 * signed-in user), "fetch" for a signed-in user.
 */
export const myDataGate = ({ loading, isGuest }) => {
  if (loading) return "wait";
  return isGuest ? "guest" : "fetch";
};
