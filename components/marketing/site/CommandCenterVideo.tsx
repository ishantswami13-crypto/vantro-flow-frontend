import { FilmPlayer } from "./FilmPlayer";

// The Command Center film (38 seconds, a cut of the collage film in
// scripts/film/introducing.html) in the launch-video player.
// Sample data on a fictional multinational group.
export function CommandCenterVideo() {
  return (
    <FilmPlayer
      src="/film/command-center"
      duration={38}
      label="Starlane Command Center, a 38 second film with music, made as a moving paper collage: the Starlane home for a fourteen-entity group, the agent reading six ledgers and four bank feeds, the words ledgers, invoices and bank lines resolving into Evidence, what it found for Meridian GmbH, and the CFO approving one dunning letter that is sent once and recorded."
      caption="Sample data on a fictional business"
    />
  );
}

// The homepage launch film (62 seconds, rendered from
// scripts/film/introducing.html), a moving paper collage: the home, the agents,
// giving an agent the close, its sources, what it found and produced, and the CFO approval.
export function IntroducingFilm() {
  return (
    <FilmPlayer
      src="/film/introducing"
      duration={62}
      label="Introducing Starlane Agents, a 62 second film with music, made as a moving paper collage: terms, ledgers and charcoal marks gather into the Starlane home for a fourteen-entity group, four agents appear around the Starlane mark, group finance asks for the October close across EMEA, the agent reads six ledgers and four bank feeds, the words ledgers, invoices and bank lines resolve into Evidence, the findings and the review, letters and CFO memo it produced appear, and the CFO approves one letter that is sent once and recorded."
    />
  );
}
