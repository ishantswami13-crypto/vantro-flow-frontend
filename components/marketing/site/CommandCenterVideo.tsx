import { FilmPlayer } from "./FilmPlayer";

// The Command Center film (38 seconds, rendered from
// scripts/film/command-center.html) in the launch-video player.
// Sample data on a fictional business.
export function CommandCenterVideo() {
  return (
    <FilmPlayer
      src="/film/command-center"
      duration={38}
      label="Starlane Command Center, a 38 second product film: Starlane reviews twelve overdue invoices, opens Gupta Traders with the evidence behind each figure, a collections agent prepares a reminder, and the owner approves it once."
      caption="Sample data on a fictional business"
    />
  );
}

// The homepage launch film (60 seconds, rendered from
// scripts/film/introducing.html): the Command Center, giving an agent work and
// watching it run, the review it produced, and the owner's approval.
export function IntroducingFilm() {
  return (
    <FilmPlayer
      src="/film/introducing"
      duration={60}
      label="Introducing Starlane Agents, a 60 second film with music: the Command Center fills in, the owner gives an agent a piece of work, the agent reads the records step by step and returns a review, reminder drafts and a memo, the owner opens Gupta Traders with the evidence behind each figure, and approves one reminder."
    />
  );
}
