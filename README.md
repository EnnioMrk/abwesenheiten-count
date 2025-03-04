V = Verschlafen
K = Krank
K+E = Krank und Entschuldigt
S = Schulveranstaltung

IMPLEMENT:
New Browser page instead of new window

timetable gridentry status
REGULAR
CANCELLED
CHANGED
NO_DATA

ADDED
REMOVED

ottokarblue

Delete

create another page on the dashboard for absent recommender. It shows ONE bar chart that goes from left to right. It has an entry for a subject and shows 3 bars for the subject: total lesson count(total + cancelled), real lesson count(total) and absent count.

Use the lessons api: /api/data/lessons

It returns an object with two objects:

totalLessonsByMonth, cancelledLessonsByMonth

each object has a key with "YYYY-MM"

the key has an object with the lessons as keys and the numbers as values.

Nachrichten ob man schwänzen sollte oder nicht (fraktion ist fehlzeit. 1/3 ist maximale fehlzeit (sehr kritisch(sollte nicht erreicht werden)))

const attendanceWarnings = new Map([
["1/10", "Fehlzeiten minimal Schwänzen unbedenklich"],
["1/9", "Fehlzeiten sehr gering Schwänzen in Ordnung"],
["1/8", "Fehlzeiten leicht erhöht Vorsicht"],
["1/7", "Fehlzeiten deutlich Überdenken empfohlen"],
["1/6", "Fehlzeiten kritisch Schwänzen riskant"],
["1/5", "Fehlzeiten hoch Schwänzen nicht ratsam"],
["1/4", "Fehlzeiten sehr hoch Teilnahme notwendig"],
["1/3", "Fehlzeiten maximal Teilnahme zwingend"]
]);
