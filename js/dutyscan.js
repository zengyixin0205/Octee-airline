// The Duty Free Security Scan rules, shared by the Duty Free page and JoelAI ("can I take a chainsaw on board?").
// Everything is refused, except peanuts. The reason depends on the words.
// The Security Scan: type anything. It is never allowed. The reason depends on the words.
export const SCAN = [
  [/\b(?:knife|knives|chainsaw|saws?|sword|blade|scissor|axe|saw|razor|dagger|needle|sharp)/, "It is sharp. The airport has a rule about sharp things, and the rule is also sharp."],
  [/\b(?:water|juice|drink|soup|milk|liquid|shampoo|perfume|paint|oil|sauce|cola|tea|coffee)/, "Liquids over 100 ml stay on the ground. Yours is over 100 ml. Everything is over 100 ml, at the gate."],
  [/\b(?:fire|match|lighter|flame|candle|firework|spark|bomb|dynamite|gas|petrol|explosive)/, "It is on fire, or it could be. Fire is for the ground. The ground is for fire."],
  [/\b(?:gun|pistol|weapon|rifle|grenade)/, "No. Not even for a laugh. Please move away from the desk. Joel is calling someone."],
  [/\b(?:battery|phone|laptop|charger|power ?bank|hoverboard)/, "It is a battery. Batteries are thinking about something, and we would rather not know."],
  [/\b(?:animal|dog|cat|snake|spider|bird|fish|eel|rat|hamster|cow)/, "It is alive and it did not buy a ticket. It may buy one at the gate, but the gate is not announced."],
  [/\b(?:cloud|rain|storm|lightning|thunder|snow|wind|fog)/, "It is weather. The aircraft has its own weather. It is delayed."],
  [/\b(?:anchor|weight|brick|piano|bowling|safe|statue|rock|stone)/, "It is heavy. The plane is only light because nobody told it."],
  [/\b(?:trombone|bagpipes?|tuba|vuvuzela|horn|whistle|drum|trumpet|speaker|alarm|siren|bell)/, "It is loud. The quiet is all we have, and the quiet is booked."],
  [/\b(?:peanut|nut)/, "It is the only thing that is allowed. It has never been checked. It checks us."],
  [/\b(?:joel)/, "Joel is not an item. Joel is also not allowed. Joel is the item you are standing next to."]
];
export const SCAN_ANY = ["It is not on the list. That is why it is not allowed. Things that are not on the list are on the other list.", "It is allowed, in theory, in a better world. This one is not that one.", "The scanner went 'hmm'. A scanner that goes 'hmm' is a scanner that says no.", "We could not find a reason, and in that case the reason is the lack of one."];
export const scanVerdict = (t) => { const w = String(t || "").toLowerCase(); const hit = SCAN.find(([re]) => re.test(w)); return hit ? hit[1] : SCAN_ANY[Math.floor(Math.random() * SCAN_ANY.length)]; };

export const scanAllowed = (t) => /peanut|nut/i.test(String(t || ""));
