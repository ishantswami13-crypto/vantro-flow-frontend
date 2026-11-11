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
// watching it run across a multi-entity group, the review it produced, and a two-step approval.
export function IntroducingFilm() {
  return (
    <FilmPlayer
      src="/film/introducing"
      duration={66}
      label="Introducing Starlane Agents, a 66 second film with music: the Command Center for a fourteen-entity group fills in across regions and currencies, group finance gives an agent the EMEA overdue review, the agent reads six ledgers and the bank feeds step by step and returns a review, dunning letters and a CFO memo, the team opens Meridian GmbH with the evidence behind each figure, and the CFO gives the second approval before one letter is sent and recorded."
    />
  );
}
