# Recording script

Generated from the film's own dialogue, so it always matches the subtitles word for word.
After changing any line, regenerate it with `UPDATE_RECORDING_SCRIPT=1 node scripts/test.mjs src/scenes/recordingScript.test.ts`;
the test fails while this file and the film disagree.

## How to record

- **Who:** you record Tibik (including the letter, as his inner voice) and Karen; ElevenLabs makes the answering machine and the dispatcher.
- **Order:** batch by voice, in story order within each voice. Tibik first, Karen's shouting last. Before each take, read the cue (the line before it) to yourself so you are answering something.
- **One file per line**, named `<ID>_t<take>.wav`, e.g. `klingelsturm_05_karen_t2.wav`. Record two or three takes of each and keep them all; the ID stays the same if a line is reworded.
- **Format:** WAV, 48 kHz, 24-bit or 32-bit float, mono, no processing at all (no EQ, compression, noise removal or normalising; the mic's noise cancelling off). Peaks around -12 to -6 dB; lean back from the mic for Karen's shouts (32-bit float cannot clip in the file, but the capsule itself can still overload). Leave 0.5-1 s of silence before and after each line, and record 30-60 s of room silence once per session.
- **Pace:** your natural pace. The slot column is the line's current subtitle time, for orientation only; the scenes are retimed to your takes.
- **ElevenLabs:** export clean at the best quality on offer; the telephone sound is added in the mix so both phone voices match.
- **Where:** raw takes go in `assets/recordings/private/`, which is never committed. Finished takes (cut, cleaned, limited, no effects) go in `public/dialogue/de/` and `public/dialogue/en/`, one file per ID; after adding or replacing one, run `node scripts/measure-takes.mjs` so the film places it by its speech.
- **English (draft):** a US-English version of each line for an English edition (the 110 call would become 911); an alternative take follows a slash.

## Tibik (you): 10 lines

### Hausmüll

| File | Line | English (draft) | Direction | Cue (the line before) | Slot |
| --- | --- | --- | --- | --- | --- |
| `hausmuell_02_tibik` | Was darf ich nicht? | Can't do what? | calm, polite, unbothered | SIE DÜRFEN DAS NICHT!!!! | 1.3 s |
| `hausmuell_04_tibik` | Ich verwende den Karton nur wieder. | I'm just reusing the box. | calm, polite, unbothered | SIE KLAUEN DEN HAUSMÜLL! | 2.0 s |
| `hausmuell_05_tibik` | Das spart einen neuen und schont die Umwelt. | Saves buying a new one, and it's easier on the environment. | calm, polite, unbothered | Ich verwende den Karton nur wieder. | 2.6 s |
| `hausmuell_07_tibik` | Wer sind Sie überhaupt? | And who are you, exactly? | calm, polite, unbothered | ICH MELDE SIE DER HAUSVERWALTUNG! | 1.4 s |
| `hausmuell_10_tibik` | Haben Sie eine Weisungsbefugnis? | Are you even authorized to give me instructions? | calm, polite, unbothered | ICH WOHNE IHNEN GEGENÜBER! | 2.1 s |
| `hausmuell_12_tibik` | Schönen Tag noch, Frau Schulz. | Have a nice day, Mrs. Schulz. | calm, polite, unbothered | …WIE BITTE?! | 2.8 s |

### Klingelsturm

| File | Line | English (draft) | Direction | Cue (the line before) | Slot |
| --- | --- | --- | --- | --- | --- |
| `klingelsturm_01_tibik` | Ja bitte? | Yes? | calm, polite, unbothered | — | 0.8 s |
| `klingelsturm_04_tibik` | Worum geht es denn? | What's this about? | calm, polite, unbothered | SOFORT AUFMACHEN! | 1.2 s |
| `klingelsturm_07_tibik` | Der Umwelt zuliebe nicht. | Not for the environment's sake. | calm, polite, unbothered | KAUFEN SIE SICH GEFÄLLIGST EINEN NEUEN! | 1.3 s |

### Rundschreiben

| File | Line | English (draft) | Direction | Cue (the line before) | Slot |
| --- | --- | --- | --- | --- | --- |
| `rundschreiben_06_tibik` | Hä? | Huh? / Uhhh… | baffled, short, the moment he looks up from the letter; also record „Äääh…“; one is picked in post and the subtitle follows it | Die Entnahme von Kartons aus der Papiertonne (w/m/d) ist aus Umweltgründen nicht gestattet. | 0.6 s |

## Tibik's inner voice: the letter (you): 5 lines

### Rundschreiben

| File | Line | English (draft) | Direction | Cue (the line before) | Slot |
| --- | --- | --- | --- | --- | --- |
| `rundschreiben_01_tibik-inner` | Sehr geehrte Daminnen, sehr geehrte Herrinnen, sehr geehrter Tibik, | Dear Ladiesses, dear Gentlewomen, dear Tibik, | reading the letter to himself: deadpan, unhurried, close to the mic; every gendered form read straight. A soft echo is added in post | — | 4.1 s |
| `rundschreiben_02_tibik-inner` | wir sind stets bemüht, die Umwelt (m/w/d) zu schonen. | we always strive to protect the environment (m/f/d). | reading the letter to himself: deadpan, unhurried, close to the mic; every gendered form read straight. A soft echo is added in post | Sehr geehrte Daminnen, sehr geehrte Herrinnen, sehr geehrter Tibik, | 4.2 s |
| `rundschreiben_03_tibik-inner` | Sollten Sie einen Karton benötigen, ist dieser ausschließlich als Neuware käuflich zu erwerben. | Should you require a box, it is to be acquired exclusively as new merchandise, by purchase. | reading the letter to himself: deadpan, unhurried, close to the mic; every gendered form read straight. A soft echo is added in post | wir sind stets bemüht, die Umwelt (m/w/d) zu schonen. | 5.8 s |
| `rundschreiben_04_tibik-inner` | Der örtliche Baumarkt berät Sie gerne hinsichtlich der verfügbaren Größen und Bauformen. | Your local hardware store will be happy to advise you on the available sizes and designs. | reading the letter to himself: deadpan, unhurried, close to the mic; every gendered form read straight. A soft echo is added in post | Sollten Sie einen Karton benötigen, ist dieser ausschließlich als Neuware käuflich zu erwerben. | 4.8 s |
| `rundschreiben_05_tibik-inner` | Die Entnahme von Kartons aus der Papiertonne (w/m/d) ist aus Umweltgründen nicht gestattet. | For environmental reasons, the removal of boxes from the paper recycling bin (f/m/d) is not permitted. | reading the letter to himself: deadpan, unhurried, close to the mic; every gendered form read straight. A soft echo is added in post | Der örtliche Baumarkt berät Sie gerne hinsichtlich der verfügbaren Größen und Bauformen. | 5.0 s |

## Karen (you, last): 16 lines

### Papiertonnen

| File | Line | English (draft) | Direction | Cue (the line before) | Slot |
| --- | --- | --- | --- | --- | --- |
| `papiertonnen_01_karen` | EY! | HEY! | from far down the street, off screen: record it at full voice, the distance is added in post; shouted, furious; indignant | — | 0.8 s |

### Hausmüll

| File | Line | English (draft) | Direction | Cue (the line before) | Slot |
| --- | --- | --- | --- | --- | --- |
| `hausmuell_01_karen` | SIE DÜRFEN DAS NICHT!!!! | YOU CAN'T DO THAT!!!! | shouted, furious; indignant | — | 1.9 s |
| `hausmuell_03_karen` | SIE KLAUEN DEN HAUSMÜLL! | YOU'RE STEALING THE TRASH! | shouted, furious; indignant | Was darf ich nicht? | 1.9 s |
| `hausmuell_06_karen` | ICH MELDE SIE DER HAUSVERWALTUNG! | I'M REPORTING YOU TO PROPERTY MANAGEMENT! | shouted, furious; indignant | Das spart einen neuen und schont die Umwelt. | 2.5 s |
| `hausmuell_08_karen` | SCHULZ! | SCHULZ! | shouted, furious; indignant | Wer sind Sie überhaupt? | 0.8 s |
| `hausmuell_09_karen` | ICH WOHNE IHNEN GEGENÜBER! | I LIVE ACROSS THE HALL FROM YOU! | shouted, furious; indignant | SCHULZ! | 1.6 s |
| `hausmuell_11_karen` | …WIE BITTE?! | …EXCUSE ME?! | after a beat; shouted, furious; indignant | Haben Sie eine Weisungsbefugnis? | 1.1 s |
| `hausmuell_13_karen` | DAS HAT EIN NACHSPIEL! | YOU HAVEN'T HEARD THE LAST OF THIS! | shouted, furious; indignant | Schönen Tag noch, Frau Schulz. | 1.6 s |

### Klingelsturm

| File | Line | English (draft) | Direction | Cue (the line before) | Slot |
| --- | --- | --- | --- | --- | --- |
| `klingelsturm_02_karen` | EY! | HEY! | shouted, furious; indignant | Ja bitte? | 0.8 s |
| `klingelsturm_03_karen` | SOFORT AUFMACHEN! | OPEN THIS DOOR RIGHT NOW! | shouted, furious; indignant | EY! | 1.3 s |
| `klingelsturm_05_karen` | UM DEN KARTON! | THE BOX! | shouted, furious; indignant | Worum geht es denn? | 1.2 s |
| `klingelsturm_06_karen` | KAUFEN SIE SICH GEFÄLLIGST EINEN NEUEN! | GO BUY YOURSELF A NEW ONE LIKE EVERYBODY ELSE! | shouted, furious; indignant | UM DEN KARTON! | 2.1 s |
| `klingelsturm_11_karen` | DAS IST EIN NOTFALL! | THIS IS AN EMERGENCY! | shouted, furious; indignant | Bitte hinterlassen Sie eine Nachricht nach dem Signalton. | 1.3 s |
| `klingelsturm_12_karen` | MEIN NACHBAR HAT EINEN KARTON AUS DEM HAUSMÜLL GENOMMEN! | MY NEIGHBOR TOOK A BOX OUT OF THE TRASH! | shouted, furious; indignant | DAS IST EIN NOTFALL! | 3.0 s |
| `klingelsturm_14_karen` | …NÖ! | …NO. | after a beat; shouted, furious; indignant | Ist jemand verletzt oder in Gefahr? | 1.0 s |
| `klingelsturm_15_karen` | ABER ER SAGT: DER UMWELT ZULIEBE! | BUT HE SAYS: FOR THE ENVIRONMENT'S SAKE! | shouted, furious; indignant | …NÖ! | 2.2 s |

## The HWS answering machine (ElevenLabs): 3 lines

### Klingelsturm

| File | Line | English (draft) | Direction | Cue (the line before) | Slot |
| --- | --- | --- | --- | --- | --- |
| `klingelsturm_08_anrufbeantworter` | HWS Hausverwaltung. | HWS Property Management. | a recorded office announcement: friendly-neutral, a little bored | Der Umwelt zuliebe nicht. | 1.6 s |
| `klingelsturm_09_anrufbeantworter` | Sie rufen außerhalb unserer Sprechzeiten an. | You have reached us outside our office hours. | a recorded office announcement: friendly-neutral, a little bored | HWS Hausverwaltung. | 2.4 s |
| `klingelsturm_10_anrufbeantworter` | Bitte hinterlassen Sie eine Nachricht nach dem Signalton. | Please leave a message after the tone. | a recorded office announcement: friendly-neutral, a little bored | Sie rufen außerhalb unserer Sprechzeiten an. | 3.0 s |

## The police dispatcher (110) (ElevenLabs): 2 lines

### Klingelsturm

| File | Line | English (draft) | Direction | Cue (the line before) | Slot |
| --- | --- | --- | --- | --- | --- |
| `klingelsturm_13_leitstelle` | Ist jemand verletzt oder in Gefahr? | Is anyone hurt or in danger? | calm, professional, matter-of-fact | MEIN NACHBAR HAT EINEN KARTON AUS DEM HAUSMÜLL GENOMMEN! | 2.0 s |
| `klingelsturm_16_leitstelle` | Ein Karton ist kein Notfall. | A cardboard box is not an emergency. | calm, professional, matter-of-fact | ABER ER SAGT: DER UMWELT ZULIEBE! | 1.6 s |
