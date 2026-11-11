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
      duration={62}
      label="Introducing Starlane Agents, a 62 second film with music, made as a moving paper collage: terms, ledgers and charcoal marks gather into the Starlane home for a fourteen-entity group, four agents appear around the Starlane mark, group finance asks for the October close across EMEA, the agent reads six ledgers and four bank feeds, the words ledgers, invoices and bank lines resolve into Evidence, the findings and the review, letters and CFO memo it produced appear, and the CFO approves one letter that is sent once and recorded."
    />
  );
}
